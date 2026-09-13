import { Router } from "express";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listPosts, getAnalyticsMetrics } from "../services/post.service.js";
import { db } from "../db/index.js";

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const viewsDir = path.join(__dirname, "views");

router.get("/", async (_req, res) => {
    try {
        const html = await readFile(
            path.join(viewsDir, "layout.html"),
            "utf8",
        );

        res.type("html").send(html);
    } catch (error) {
        console.error("Dashboard error:", error);
        res.status(500).json({ error: "Dashboard unavailable" });
    }
});

router.get("/posts", async (_req, res) => {
    try {
        const posts = await listPosts({ limit: 100 });
        res.json({ posts });
    } catch (error) {
        console.error("Dashboard posts error:", error);
        res.status(500).json({ error: "Failed to load posts" });
    }
});

router.get("/analytics", async (_req, res) => {
    try {
        const analytics = await getAnalyticsMetrics();
        res.json(analytics);
    } catch (error) {
        console.error("Dashboard analytics error:", error);
        res.status(500).json({ error: "Failed to load analytics" });
    }
});

router.get("/audit", (_req, res) => {
    try {
        const logs = db.prepare(`
            SELECT
                id,
                user_id,
                tool_name,
                status,
                latency_ms,
                agent,
                created_at
            FROM audit_logs
            ORDER BY created_at DESC
            LIMIT 100
        `).all();

        res.json({ logs });
    } catch (error) {
        console.error("Dashboard audit error:", error);
        res.status(500).json({ error: "Failed to load audit logs" });
    }
});

export { router as dashboardRouter };
