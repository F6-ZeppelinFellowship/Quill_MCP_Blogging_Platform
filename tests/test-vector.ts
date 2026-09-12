import {
  getPostEmbeddingText,
  embedAndUpsertPost,
  searchSimilarPosts,
} from "../src/services/vector.service.js";
import type { Post } from "../src/types/index.js";

// Mock post objects for testing
const publishedPost: Post = {
  id: "post_123",
  user_id: "user_456",
  title: "Building RESTful APIs with TypeScript",
  slug: "building-restful-apis-typescript",
  content: "This is a full guide on building production-ready APIs with TypeScript and Express or Fastify.",
  tags: ["typescript", "backend", "api"],
  status: "published",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const draftPost: Post = {
  ...publishedPost,
  id: "post_999",
  status: "draft",
};

async function runTests() {
  console.log("=== TEST 1: Text Preparation ===");
  const formattedText = getPostEmbeddingText(publishedPost);
  console.log("Formatted Output:\n", formattedText);
  console.log("\n-----------------------------------\n");

  console.log("=== TEST 2: Embed & Upsert (Published) ===");
  await embedAndUpsertPost(publishedPost);
  console.log("\n-----------------------------------\n");

  console.log("=== TEST 3: Embed & Upsert (Draft - Should Skip) ===");
  await embedAndUpsertPost(draftPost);
  console.log("(If no [vector] logs appeared above, draft skipping works correctly!)");
  console.log("\n-----------------------------------\n");

  console.log("=== TEST 4: Search Similar Posts (Valid Query) ===");
  const searchResults = await searchSimilarPosts("backend development", 3);
  console.log("Search Return Value:", searchResults);
  console.log("\n-----------------------------------\n");

  console.log("=== TEST 5: Search Similar Posts (Empty Query) ===");
  const emptyResults = await searchSimilarPosts("   ", 5);
  console.log("Empty Query Return Value (should be []):", emptyResults);
}

runTests().catch(console.error);