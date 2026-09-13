import { randomUUID } from "node:crypto";

import type {
    NewPostInput,
    Post,
    PostStatus,
    RawAnalyticsData,
} from "../types/index.js";

import { db } from "../db/index.js";
import { embedAndUpsertPost, deletePostVector } from "./vector.service.js";

interface PostRow {
    id: string;
    user_id: string;
    title: string;
    content: string;
    tags: string;
    status: PostStatus;
    slug: string | null;
    meta_title: string | null;
    meta_description: string | null;
    created_at: string;
    updated_at: string;
    publish_at: string | null;
}

type SqlValue = string | number | bigint | null | Uint8Array;

function rowToPost(row: PostRow): Post {
    let tags: string[] = [];

    try {
        const parsed = JSON.parse(row.tags || "[]");

        if (Array.isArray(parsed)) {
            tags = parsed.map(String);
        }
    } catch {
        tags = [];
    }

    return {
        id: row.id,
        user_id: row.user_id,
        title: row.title,
        content: row.content,
        tags,
        status: row.status,
        slug: row.slug ?? undefined,
        meta_title: row.meta_title ?? undefined,
        meta_description: row.meta_description ?? undefined,
        created_at: row.created_at,
        updated_at: row.updated_at,
        publish_at: row.publish_at ?? undefined,
    };
}

function toIsoString(value?: Date | string): string | null {
    if (value === undefined || value === null || value === "") {
        return null;
    }

    if (value instanceof Date) {
        return value.toISOString();
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        throw new Error(`Invalid date value: ${value}`);
    }

    return date.toISOString();
}

export async function createPost(
    data: NewPostInput,
): Promise<Post> {
    const id = randomUUID();

    db.prepare(`
        INSERT INTO posts (
            id,
            user_id,
            title,
            content,
            tags,
            status,
            slug,
            meta_title,
            meta_description,
            publish_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        id,
        data.user_id,
        data.title,
        data.content,
        JSON.stringify(data.tags ?? []),
        data.status ?? "draft",
        data.slug ?? null,
        data.meta_title ?? null,
        data.meta_description ?? null,
        toIsoString(data.publish_at),
    );

    const post = await getPost(id);

    if (!post) {
        throw new Error(`Failed to create post ${id}`);
    }

    if (post.status === "published") {
        await embedAndUpsertPost(post);
    }

    return post;
}

export async function getPost(
    id: string,
): Promise<Post | null> {
    const row = db.prepare(`
        SELECT
            id,
            user_id,
            title,
            content,
            tags,
            status,
            slug,
            meta_title,
            meta_description,
            created_at,
            updated_at,
            publish_at
        FROM posts
        WHERE id = ?
        LIMIT 1
    `).get(id) as unknown as PostRow | undefined;

    return row ? rowToPost(row) : null;
}

export async function listPosts(
    filter: {
        status?: PostStatus;
        limit?: number;
    } = {},
): Promise<Post[]> {
    const requestedLimit = filter.limit ?? 50;

    const limit = Math.min(
        Math.max(Math.floor(requestedLimit), 1),
        100,
    );

    let rows: PostRow[];

    if (filter.status) {
        rows = db.prepare(`
            SELECT
                id,
                user_id,
                title,
                content,
                tags,
                status,
                slug,
                meta_title,
                meta_description,
                created_at,
                updated_at,
                publish_at
            FROM posts
            WHERE status = ?
            ORDER BY created_at DESC
            LIMIT ${limit}
        `).all(filter.status) as unknown as PostRow[];
    } else {
        rows = db.prepare(`
            SELECT
                id,
                user_id,
                title,
                content,
                tags,
                status,
                slug,
                meta_title,
                meta_description,
                created_at,
                updated_at,
                publish_at
            FROM posts
            ORDER BY created_at DESC
            LIMIT ${limit}
        `).all() as unknown as PostRow[];
    }

    return rows.map(rowToPost);
}

export async function updatePost(
    id: string,
    data: Partial<Post>,
): Promise<Post> {
    const existing = await getPost(id);

    if (!existing) {
        throw new Error(`Post not found: ${id}`);
    }

    const fields: string[] = [];
    const values: SqlValue[] = [];

    if (data.title !== undefined) {
        fields.push("title = ?");
        values.push(data.title);
    }

    if (data.content !== undefined) {
        fields.push("content = ?");
        values.push(data.content);
    }

    if (data.tags !== undefined) {
        fields.push("tags = ?");
        values.push(JSON.stringify(data.tags));
    }

    if (data.status !== undefined) {
        fields.push("status = ?");
        values.push(data.status);
    }

    if (data.slug !== undefined) {
        fields.push("slug = ?");
        values.push(data.slug ?? null);
    }

    if (data.meta_title !== undefined) {
        fields.push("meta_title = ?");
        values.push(data.meta_title ?? null);
    }

    if (data.meta_description !== undefined) {
        fields.push("meta_description = ?");
        values.push(data.meta_description ?? null);
    }

    if (data.publish_at !== undefined) {
        fields.push("publish_at = ?");
        values.push(toIsoString(data.publish_at));
    }

    if (fields.length === 0) {
        return existing;
    }

    fields.push("updated_at = CURRENT_TIMESTAMP");

    values.push(id);

    db.prepare(`
        UPDATE posts
        SET ${fields.join(", ")}
        WHERE id = ?
    `).run(...values);

    const updated = await getPost(id);

    if (!updated) {
        throw new Error(
            `Post disappeared after update: ${id}`,
        );
    }

    if (
        existing.status !== "published" &&
        updated.status === "published"
    ) {
        await embedAndUpsertPost(updated);
    }

    return updated;
}

export async function deletePost(
    id: string,
): Promise<boolean> {
    const result = db.prepare(`
        DELETE FROM posts
        WHERE id = ?
    `).run(id);

    const deleted = Number(result.changes) > 0;

    if (deleted) {
        await deletePostVector(id);
    }

    return deleted;
}

export async function updatePostStatus(
    id: string,
    status: PostStatus,
    publishAt?: Date,
): Promise<Post> {
    const existing = await getPost(id);

    if (!existing) {
        throw new Error(`Post not found: ${id}`);
    }

    const publishAtValue =
        status === "scheduled"
            ? toIsoString(publishAt)
            : null;

    db.prepare(`
        UPDATE posts
        SET
            status = ?,
            publish_at = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).run(
        status,
        publishAtValue,
        id,
    );

    const updated = await getPost(id);

    if (!updated) {
        throw new Error(
            `Post disappeared after status update: ${id}`,
        );
    }

    if (
        existing.status !== "published" &&
        updated.status === "published"
    ) {
        await embedAndUpsertPost(updated);
    }

    return updated;
}

export async function getAnalyticsMetrics(
    postId?: string,
    range?: string,
): Promise<RawAnalyticsData> {
    const normalizedRange = range ?? "30d";

    let days: number | null = 30;

    if (normalizedRange.toLowerCase() === "all") {
        days = null;
    } else {
        const match = normalizedRange.match(/^(\\d+)d?$/i);

        if (match) {
            days = Math.max(
                Number(match[1]),
                1,
            );
        }
    }

    const dateParameter: string | null =
        days === null
            ? null
            : `-${days} days`;

    let summary: Record<string, unknown>;

    if (postId) {
        if (days === null) {
            summary = db.prepare(`
                SELECT
                    COALESCE(SUM(views), 0) AS total_views,
                    COUNT(*) AS analytics_entries
                FROM analytics
                WHERE post_id = ?
            `).get(postId) as Record<string, unknown>;
        } else {
            summary = db.prepare(`
                SELECT
                    COALESCE(SUM(views), 0) AS total_views,
                    COUNT(*) AS analytics_entries
                FROM analytics
                WHERE post_id = ?
                  AND created_at >= datetime('now', ?)
            `).get(
                postId,
                dateParameter,
            ) as Record<string, unknown>;
        }
    } else {
        if (days === null) {
            summary = db.prepare(`
                SELECT
                    COALESCE(SUM(views), 0) AS total_views,
                    COUNT(*) AS analytics_entries
                FROM analytics
            `).get() as Record<string, unknown>;
        } else {
            summary = db.prepare(`
                SELECT
                    COALESCE(SUM(views), 0) AS total_views,
                    COUNT(*) AS analytics_entries
                FROM analytics
                WHERE created_at >= datetime('now', ?)
            `).get(
                dateParameter,
            ) as Record<string, unknown>;
        }
    }

    let referrerRows: Array<Record<string, unknown>>;

    if (postId) {
        if (days === null) {
            referrerRows = db.prepare(`
                SELECT
                    COALESCE(referrer, 'direct') AS referrer,
                    COALESCE(SUM(views), 0) AS views
                FROM analytics
                WHERE post_id = ?
                GROUP BY referrer
                ORDER BY views DESC
            `).all(postId) as Array<Record<string, unknown>>;
        } else {
            referrerRows = db.prepare(`
                SELECT
                    COALESCE(referrer, 'direct') AS referrer,
                    COALESCE(SUM(views), 0) AS views
                FROM analytics
                WHERE post_id = ?
                  AND created_at >= datetime('now', ?)
                GROUP BY referrer
                ORDER BY views DESC
            `).all(
                postId,
                dateParameter,
            ) as Array<Record<string, unknown>>;
        }
    } else {
        if (days === null) {
            referrerRows = db.prepare(`
                SELECT
                    COALESCE(referrer, 'direct') AS referrer,
                    COALESCE(SUM(views), 0) AS views
                FROM analytics
                GROUP BY referrer
                ORDER BY views DESC
            `).all() as Array<Record<string, unknown>>;
        } else {
            referrerRows = db.prepare(`
                SELECT
                    COALESCE(referrer, 'direct') AS referrer,
                    COALESCE(SUM(views), 0) AS views
                FROM analytics
                WHERE created_at >= datetime('now', ?)
                GROUP BY referrer
                ORDER BY views DESC
            `).all(
                dateParameter,
            ) as Array<Record<string, unknown>>;
        }
    }

    return {
        postId: postId ?? null,
        range: normalizedRange,
        totalViews: Number(
            summary.total_views ?? 0,
        ),
        analyticsEntries: Number(
            summary.analytics_entries ?? 0,
        ),
        byReferrer: referrerRows,
    };
}
