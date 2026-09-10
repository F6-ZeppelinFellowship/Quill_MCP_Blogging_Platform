import type { Post, PostSummary } from "../types/index.js";

/**
 * Member 3 — Vector Service
 *
 * SQLite remains the source of truth for posts.
 * This service provides the interface for embedding posts,
 * storing vectors in Qdrant, and performing similarity search.
 *
 * Qdrant/embedding configuration will be connected once
 * the team confirms the provider and model.
 */

export interface VectorConfig {
    qdrantUrl?: string;
    collectionName?: string;
    embeddingModel?: string;
}

function getVectorConfig(): VectorConfig {
    return {
        qdrantUrl: process.env.QDRANT_URL,
        collectionName:
            process.env.QDRANT_COLLECTION ?? "quill_posts",
        embeddingModel: process.env.EMBEDDING_MODEL,
    };
}

/**
 * Prepare the text that should be embedded for a post.
 */
export function getPostEmbeddingText(post: Post): string {
    const tags = post.tags.length > 0
        ? `Tags: ${post.tags.join(", ")}`
        : "";

    return [
        `Title: ${post.title}`,
        tags,
        `Content: ${post.content}`,
    ]
        .filter(Boolean)
        .join("\n\n");
}

/**
 * Embed a published post and upsert its vector into Qdrant.
 *
 * TODO:
 * - Generate embedding using the team's selected provider.
 * - Connect to Qdrant.
 * - Upsert the vector using post.id as the point ID.
 * - Store post metadata such as user_id, title, slug and status.
 */
export async function embedAndUpsertPost(
    post: Post,
): Promise<void> {
    if (post.status !== "published") {
        return;
    }

    const config = getVectorConfig();
    const text = getPostEmbeddingText(post);

    console.log(
        `[vector] Preparing post ${post.id} for vector upsert.`,
    );

    console.log(
        `[vector] Collection: ${config.collectionName}`,
    );

    console.log(
        `[vector] Embedding model: ${
            config.embeddingModel ?? "not configured"
        }`,
    );

    console.log(
        `[vector] Text length: ${text.length} characters`,
    );

    /*
     * Qdrant integration will be added here after the team
     * confirms the embedding provider and vector dimensions.
     */
}

/**
 * Search for posts similar to a text query.
 *
 * TODO:
 * - Generate an embedding for the query.
 * - Search Qdrant.
 * - Read matching post IDs.
 * - Retrieve authoritative post data from SQLite.
 */
export async function searchSimilarPosts(
    query: string,
    limit = 5,
): Promise<PostSummary[]> {
    if (!query.trim()) {
        return [];
    }

    const safeLimit = Math.min(
        Math.max(limit, 1),
        50,
    );

    const config = getVectorConfig();

    console.log(
        `[vector] Similar-post search requested: "${query}"`,
    );

    console.log(
        `[vector] Limit: ${safeLimit}`,
    );

    console.log(
        `[vector] Qdrant collection: ${config.collectionName}`,
    );

    /*
     * Qdrant search will be implemented once the team
     * confirms the embedding provider and vector dimensions.
     */

    return [];
}
