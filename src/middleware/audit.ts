import { randomUUID } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { db } from "../db/index.js";

export interface AuditRequest extends Request {
    user?: {
        id: string;
        email: string;
    };
}

export function auditMiddleware(
    req: AuditRequest,
    res: Response,
    next: NextFunction,
): void {
    const startTime = Date.now();

    res.on("finish", () => {
        const latencyMs = Date.now() - startTime;

        const toolName =
            req.body?.tool_name ??
            req.params?.tool_name ??
            req.path;

        const status =
            res.statusCode >= 200 && res.statusCode < 400
                ? "success"
                : "error";

        let parameters: string | null = null;

        try {
            parameters = JSON.stringify(req.body ?? {});
        } catch {
            parameters = null;
        }

        try {
            db.prepare(`
                INSERT INTO audit_logs (
                    id,
                    user_id,
                    tool_name,
                    parameters,
                    status,
                    latency_ms,
                    agent
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(
                randomUUID(),
                req.user?.id ?? null,
                String(toolName),
                parameters,
                status,
                latencyMs,
                req.headers["user-agent"] ?? null,
            );
        } catch (error) {
            console.error(
                "Failed to write audit log:",
                error,
            );
        }
    });

    next();
}
