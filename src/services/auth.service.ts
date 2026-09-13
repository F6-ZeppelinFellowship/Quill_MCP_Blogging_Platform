import bcrypt from "bcrypt";

import { db } from "../db/index.js";

export async function hashPassword(password: string): Promise<string> {
    const normalized = password.trim();

    if (!normalized) {
        throw new Error("Password is required.");
    }

    return bcrypt.hash(normalized, 10);
}

export async function verifyPassword(
    password: string,
    hash: string,
): Promise<boolean> {
    const normalized = password.trim();

    if (!normalized) {
        return false;
    }

    try {
        return await bcrypt.compare(normalized, hash);
    } catch {
        return false;
    }
}

export async function hashApiKey(apiKey: string): Promise<string> {
    const normalized = apiKey.trim();

    if (!normalized) {
        throw new Error("API key is required.");
    }

    return bcrypt.hash(normalized, 10);
}

export async function verifyApiKey(
    apiKey: string,
    hash: string,
): Promise<boolean> {
    const normalized = apiKey.trim();

    if (!normalized) {
        return false;
    }

    try {
        return await bcrypt.compare(normalized, hash);
    } catch {
        return false;
    }
}

export async function findUserIdByApiKey(
    apiKey: string,
): Promise<string | null> {
    const normalized = apiKey.trim();

    if (!normalized) {
        return null;
    }

    const rows = db.prepare(`
        SELECT user_id, key_hash
        FROM api_keys
        WHERE revoked_at IS NULL
    `).all() as Array<{
        user_id: string;
        key_hash: string;
    }>;

    for (const row of rows) {
        if (await verifyApiKey(normalized, row.key_hash)) {
            return row.user_id;
        }
    }

    return null;
}
