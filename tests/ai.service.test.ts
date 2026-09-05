import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { generateSeoTags } from "../src/services/ai.service.js";

test("generateSeoTags extracts metadata from a Markdown post", async () => {
  const markdown = await readFile(new URL("./fixtures/sample-post.md", import.meta.url), "utf8");
  const previousApiKey = process.env.ANTHROPIC_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.ANTHROPIC_API_KEY = "test-key";
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        id: "msg_test",
        type: "message",
        role: "assistant",
        model: "claude-sonnet-4-20250514",
        content: [
          {
            type: "text",
            text: JSON.stringify({
              meta_title: "Reliable MCP Tools: A Practical Guide",
              meta_description:
                "Learn how explicit inputs and service boundaries make MCP tools easier to operate.",
              slug: "reliable-mcp-tools",
            }),
          },
        ],
        stop_reason: "end_turn",
        stop_sequence: null,
        usage: { input_tokens: 10, output_tokens: 20 },
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
      delete process.env.ANTHROPIC_API_KEY;
    } else {
      process.env.ANTHROPIC_API_KEY = previousApiKey;
    }
  }
});