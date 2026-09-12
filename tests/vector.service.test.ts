import test from "node:test";
import assert from "node:assert/strict";
import { getPostEmbeddingText } from "../src/services/vector.service.js";

test("post embedding text contains searchable post fields", () => {
    const post = {
        id: "test-post",
        user_id: "test-user",
        title: "Vector Search",
        content: "Testing semantic search.",
        tags: ["AI", "RAG"],
        status: "published" as const,
        slug: "vector-search",
        meta_title: "Vector Search",
        meta_description: "Semantic search test",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    const text = getPostEmbeddingText(post);

    assert.match(text, /Vector Search/);
    assert.match(text, /semantic search/);
    assert.match(text, /AI/);
    assert.match(text, /RAG/);
});
