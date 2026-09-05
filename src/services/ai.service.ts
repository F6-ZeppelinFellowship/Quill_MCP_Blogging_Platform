import Anthropic from "@anthropic-ai/sdk";
import type { RawAnalyticsData } from "../types/index.js";

const DEFAULT_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_TEMPERATURE = 0.2;
const MAX_TOKENS = 4096;

const DRAFT_SYSTEM_PROMPT =
  "You are Quill's technical editor. Transform the supplied notes into a clear, useful Markdown blog post. Return only valid JSON with string fields title and content, and a tags array of concise lowercase strings.";
const SEO_SYSTEM_PROMPT =
  "You are Quill's SEO editor. Create accurate search metadata from the supplied Markdown. Return only valid JSON with string fields meta_title, meta_description, and slug. Do not claim facts absent from the source.";
const ANALYTICS_SYSTEM_PROMPT =
  "You are Quill's analytics advisor. Interpret the supplied analytics object and return concise, actionable insights. Mention meaningful trends or limitations, and do not invent metrics.";

let client: Anthropic | undefined;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is required for LLM workflows");
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

function getTemperature(): number {
  const configured = Number(process.env.ANTHROPIC_TEMPERATURE);
  return Number.isFinite(configured) && configured >= 0 && configured <= 1
    ? configured
    : DEFAULT_TEMPERATURE;
}

function parseJsonResponse(response: string): unknown {
  const cleaned = response
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        // Fall through to the consistent malformed-response error below.
      }
    }
    throw new Error("LLM returned malformed JSON");
  }
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`LLM response field '${field}' must be a non-empty string`);
  }
  return value.trim();
}

async function requestText(system: string, input: string): Promise<string> {
  const response = await getClient().messages.create({
    model: process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL,
    max_tokens: MAX_TOKENS,
    temperature: getTemperature(),
    system,
    messages: [{ role: "user", content: input }],
  });
  const text = response.content.find((block) => block.type === "text");
  if (!text || text.type !== "text") {
    throw new Error("LLM returned no text content");
  }
  return text.text;
}

export async function generateDraft(
  rawInput: string,
): Promise<{ title: string; content: string; tags: string[] }> {
  const parsed = parseJsonResponse(await requestText(DRAFT_SYSTEM_PROMPT, rawInput));
  if (!parsed || typeof parsed !== "object") {
    throw new Error("LLM draft response must be a JSON object");
  }
  const draft = parsed as Record<string, unknown>;
  if (!Array.isArray(draft.tags) || draft.tags.some((tag) => typeof tag !== "string")) {
    throw new Error("LLM response field 'tags' must be an array of strings");
  }
  return {
    title: requireString(draft.title, "title"),
    content: requireString(draft.content, "content"),
    tags: draft.tags.map((tag) => tag.trim()).filter(Boolean),
  };
}

export async function generateSeoTags(
  postContent: string,
): Promise<{ meta_title: string; meta_description: string; slug: string }> {
  const parsed = parseJsonResponse(await requestText(SEO_SYSTEM_PROMPT, postContent));
  if (!parsed || typeof parsed !== "object") {
    throw new Error("LLM SEO response must be a JSON object");
  }
  const metadata = parsed as Record<string, unknown>;
  return {
    meta_title: requireString(metadata.meta_title, "meta_title"),
    meta_description: requireString(metadata.meta_description, "meta_description"),
    slug: requireString(metadata.slug, "slug"),
  };
}

export async function summarizeAnalytics(metrics: RawAnalyticsData): Promise<string> {
  return requireString(
    await requestText(ANALYTICS_SYSTEM_PROMPT, JSON.stringify(metrics)),
    "summary",
  );
}