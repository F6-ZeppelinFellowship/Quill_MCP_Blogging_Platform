import { QdrantClient } from "@qdrant/js-client-rest";

import type {
    Post,
    PostSummary,
} from "../types/index.js";

export interface VectorConfig {
    qdrantUrl: string;
    qdrantApiKey?: string;
    collectionName: string;
    embeddingModel: string;
    ollamaUrl: string;
    scoreThreshold: number;
}

interface OllamaEmbedResponse {
    embeddings: number[][];
}

function getVectorConfig(): VectorConfig {
    return {
        qdrantUrl:
            process.env.QDRANT_URL ??
            "http://localhost:6333",

        qdrantApiKey:
            process.env.QDRANT_API_KEY ||
            undefined,

        collectionName:
            process.env.QDRANT_COLLECTION ??
            "quill_posts",

        embeddingModel:
            process.env.EMBEDDING_MODEL ??
            "all-minilm",

        ollamaUrl:
            process.env.OLLAMA_URL ??
            "http://localhost:11434",

        scoreThreshold:
            Number(
                process.env.VECTOR_SCORE_THRESHOLD ??
                "0.50",
            ),
    };
}

function getQdrantClient(
    config: VectorConfig,
): QdrantClient {
    return new QdrantClient({
        url: config.qdrantUrl,
        apiKey: config.qdrantApiKey,
    });
}

/**
 * Convert a blog post into the text used for embedding.
 */
export function getPostEmbeddingText(
    post: Post,
): string {
    const tags =
        post.tags.length > 0
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
 * Generate an embedding using local Ollama.
 */
async function generateEmbedding(
    text: string,
): Promise<number[]> {
    const config = getVectorConfig();

    const response = await fetch(
        `${config.ollamaUrl}/api/embed`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: config.embeddingModel,
                input: text,
            }),
        },
    );

    if (!response.ok) {
        const errorText =
            await response.text();

        throw new Error(
            `Ollama embedding request failed ` +
            `(${response.status}): ${errorText}`,
        );
    }

    const data =
        await response.json() as OllamaEmbedResponse;

    const embedding =
        data.embeddings?.[0];

    if (
        !embedding ||
        !Array.isArray(embedding) ||
        embedding.length === 0
    ) {
        throw new Error(
            "Ollama returned an empty embedding.",
        );
    }

    return embedding;
}

/**
 * Create the Qdrant collection if it does not exist.
 */
async function ensureCollection(
    client: QdrantClient,
    collectionName: string,
    vectorSize: number,
): Promise<void> {
    try {
        await client.getCollection(
            collectionName,
        );

        return;
    } catch {
        // Collection does not exist.
    }

    try {
        await client.createCollection(
            collectionName,
            {
                vectors: {
                    size: vectorSize,
                    distance: "Cosine",
                },
            },
        );

        console.log(
            `[vector] Created collection "${collectionName}" ` +
            `with ${vectorSize} dimensions.`,
        );
    } catch (error) {
        // Another process may have created the
        // collection between the two operations.
        try {
            await client.getCollection(
                collectionName,
            );
        } catch {
            throw error;
        }
    }
}

/**
 * Embed a published post and upsert it into Qdrant.
 */
export async function embedAndUpsertPost(
    post: Post,
): Promise<void> {
    if (post.status !== "published") {
        return;
    }

    const config = getVectorConfig();

    const client =
        getQdrantClient(config);

    const text =
        getPostEmbeddingText(post);

    console.log(
        `[vector] Embedding post ${post.id} ` +
        `using ${config.embeddingModel}...`,
    );

    const embedding =
        await generateEmbedding(text);

    await ensureCollection(
        client,
        config.collectionName,
        embedding.length,
    );

    const payload: Record<string, unknown> = {
        postId: post.id,
        userId: post.user_id,
        title: post.title,
        slug: post.slug,
        status: post.status,
        tags: post.tags,
    };

    await client.upsert(
        config.collectionName,
        {
            wait: true,
            points: [
                {
                    id: post.id,
                    vector: embedding,
                    payload,
                },
            ],
        },
    );

    console.log(
        `[vector] Post ${post.id} upserted successfully.`,
    );
}

/**
 * Search Qdrant for semantically similar posts.
 */
export async function searchSimilarPosts(
    query: string,
    limit = 5,
): Promise<PostSummary[]> {
    if (!query.trim()) {
        return [];
    }

    const config = getVectorConfig();

    const safeLimit = Math.min(
        Math.max(Math.floor(limit), 1),
        50,
    );

    const client =
        getQdrantClient(config);

    console.log(
        `[vector] Searching for: "${query}"`,
    );

    const queryEmbedding =
        await generateEmbedding(
            query.trim(),
        );

    await ensureCollection(
        client,
        config.collectionName,
        queryEmbedding.length,
    );

    const results =
        await client.query(
            config.collectionName,
            {
                query: queryEmbedding,
                limit: safeLimit,
                with_payload: true,
                score_threshold:
                    config.scoreThreshold,
            },
        );

    const posts: PostSummary[] = [];

    for (const result of results.points) {
        const payload =
            result.payload as
            Record<string, unknown> | null;

        if (
            !payload ||
            typeof payload.postId !== "string"
        ) {
            continue;
        }

        const post: PostSummary = {
            id: payload.postId,
            title:
                typeof payload.title === "string"
                    ? payload.title
                    : "",
            status:
                typeof payload.status === "string"
                    ? payload.status as PostSummary["status"]
                    : "published",
            score: result.score,
        };

        if (typeof payload.slug === "string") {
            post.slug = payload.slug;
        }

        posts.push(post);
    }

    return posts;
}

/**
 * Remove a post's vector from Qdrant.
 */
export async function deletePostVector(
    postId: string,
): Promise<void> {
    const config = getVectorConfig();

    const client =
        getQdrantClient(config);

    try {
        await client.delete(
            config.collectionName,
            {
                wait: true,
                points: [postId],
            },
        );
    } catch {
        // Nothing to delete if the collection
        // does not exist yet.
    }
}