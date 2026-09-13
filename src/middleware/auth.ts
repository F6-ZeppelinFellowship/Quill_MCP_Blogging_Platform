import type { NextFunction, Request, Response } from "express";

import { db } from "../db/index.js";

export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
    };
}

export function setAuthCookie(res: Response, userId: string): void {
    res.cookie("quill_session", userId, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 1000 * 60 * 60 * 24 * 7,
        path: "/",
    });
}

export function clearAuthCookie(res: Response): void {
    res.clearCookie("quill_session", { path: "/" });
}

export function requireAuth(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
): void {
    const userId = req.cookies?.quill_session as string | undefined;

    if (!userId) {
        res.status(401).json({ error: "Unauthorized: please log in first." });
        return;
    }

    const user = db.prepare(`
        SELECT id, email
        FROM users
        WHERE id = ?
        LIMIT 1
    `).get(userId) as { id: string; email: string } | undefined;

    if (!user) {
        clearAuthCookie(res);
        res.status(401).json({ error: "Unauthorized: session is invalid." });
        return;
    }

    req.user = {
        id: user.id,
        email: user.email,
    };

    next();
}
