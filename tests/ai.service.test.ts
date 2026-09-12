import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { generateDraft, generateSeoTags } from "../src/services/ai.service.js";

test("generateSeoTags extracts metadata from a Markdown post", async () => {
  const markdown = await readFile(new URL("./fixtures/sample-post.md", import.meta.url), "utf8");
  const previousApiKey = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.GOOGLE_API_KEY = "test-key";
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    meta_title: "Reliable MCP Tools: A Practical Guide",
                    meta_description:
                      "Learn how explicit inputs and service boundaries make MCP tools easier to operate.",
                    slug: "reliable-mcp-tools",
                  }),
                },
              ],
            },
          },
        ],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );

  try {
    const metadata = await generateSeoTags(markdown);
    assert.deepEqual(metadata, {
      meta_title: "Reliable MCP Tools: A Practical Guide",
      meta_description:
        "Learn how explicit inputs and service boundaries make MCP tools easier to operate.",
      slug: "reliable-mcp-tools",
    });
  } finally {
    globalThis.fetch = previousFetch;
    if (previousApiKey === undefined) {
      delete process.env.GOOGLE_API_KEY;
    } else {
      process.env.GOOGLE_API_KEY = previousApiKey;
    }
  }
});

test("generateDraft transforms raw notes into a structured draft", async () => {
  const previousApiKey = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.GOOGLE_API_KEY = "test-key";
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    title: "Working Draft",
                    content: "# Working Draft\n\nA useful post body.",
                    tags: ["notes", "draft"],
                  }),
                },
              ],
            },
          },
        ],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );

  try {
    const draft = await generateDraft("Raw notes for a new post");
    assert.deepEqual(draft, {
      title: "Working Draft",
      content: "# Working Draft\n\nA useful post body.",
      tags: ["notes", "draft"],
    });
  } finally {
    globalThis.fetch = previousFetch;
    if (previousApiKey === undefined) {
      delete process.env.GOOGLE_API_KEY;
    } else {
      process.env.GOOGLE_API_KEY = previousApiKey;
    }
  }
});

test("generateDraft surfaces a clear invalid API key error", async () => {
  const previousApiKey = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.GOOGLE_API_KEY = "invalid-key";
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        error: {
          code: 400,
          message: "API key not valid. Please pass a valid API key.",
        },
      }),
      { status: 400, headers: { "content-type": "application/json" } },
    );

  try {
    await assert.rejects(
      () => generateDraft("A short note that should trigger the live API call."),
      /GOOGLE_API_KEY|GEMINI_API_KEY/i,
    );
  } finally {
    globalThis.fetch = previousFetch;
    if (previousApiKey === undefined) {
      delete process.env.GOOGLE_API_KEY;
    } else {
      process.env.GOOGLE_API_KEY = previousApiKey;
    }
  }
});