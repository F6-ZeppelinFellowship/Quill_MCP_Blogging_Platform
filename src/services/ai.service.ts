import type { RawAnalyticsData } from "../types/index.js";

const DEFAULT_MODEL = "gemini-2.0-flash";
const DEFAULT_TEMPERATURE = 0.2;
const MAX_TOKENS = 4096;

const DRAFT_SYSTEM_PROMPT =
  "You are Quill's technical editor. Transform the supplied notes into a clear, useful Markdown blog post. Return only valid JSON with string fields title and content, and a tags array of concise lowercase strings.";
const SEO_SYSTEM_PROMPT =
  "You are Quill's SEO editor. Create accurate search metadata from the supplied Markdown. Return only valid JSON with string fields meta_title, meta_description, and slug. Do not claim facts absent from the source.";
const ANALYTICS_SYSTEM_PROMPT =
  "You are Quill's analytics advisor. Interpret the supplied analytics object and return concise, actionable insights. Mention meaningful trends or limitations, and do not invent metrics.";

function getApiKey(): string {
  const apiKey =
    process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY ?? process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GOOGLE_API_KEY or GEMINI_API_KEY is required for LLM workflows. Add your Google AI Studio key to the environment.",
    );
  }

  return apiKey;
}

function getModel(): string {
  return (
    process.env.GOOGLE_MODEL ??
    process.env.GEMINI_MODEL ??
    process.env.ANTHROPIC_MODEL ??
    DEFAULT_MODEL
  );
}

function getTemperature(): number {
  const configured = Number(
    process.env.ANTHROPIC_TEMPERATURE ?? process.env.GOOGLE_TEMPERATURE,
  );
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

function normalizeApiKeyError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);

  if (
    /api[-_ ]key|authentication|unauthorized|invalid key|401|403|UNAUTHENTICATED/i.test(
      message,
    )
  ) {
    return new Error(
      "GOOGLE_API_KEY or GEMINI_API_KEY is invalid or expired. Please verify the environment variable and credentials.",
    );
  }

  return new Error(`LLM request failed: ${message}`);
}

async function requestText(system: string, input: string): Promise<string> {
  try {
    const apiKey = getApiKey();
    const model = getModel();

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: `${system}\n\n${input}` }],
            },
          ],
          generationConfig: {
            temperature: getTemperature(),
            maxOutputTokens: MAX_TOKENS,
          },
        }),
      },
    );

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        payload?.error?.message ??
        payload?.message ??
        `HTTP ${response.status}`;
      throw normalizeApiKeyError(new Error(message));
    }

    const text = payload?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? "")
      .join("")
      .trim();

    if (!text) {
      throw new Error("LLM returned no text content");
    }

    return text;
  } catch (error) {
    if (error instanceof Error && /GOOGLE_API_KEY|GEMINI_API_KEY|LLM request failed/i.test(error.message)) {
      throw error;
    }
    throw normalizeApiKeyError(error);
  }
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