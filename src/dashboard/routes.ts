import { Router } from "express";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path, { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { listPosts, getAnalyticsMetrics } from "../services/post.service.js";
import { db } from "../db/index.js";
import {
    hashApiKey,
    hashPassword,
    verifyPassword,
} from "../services/auth.service.js";
import {
    clearAuthCookie,
    requireAuth,
    setAuthCookie,
    type AuthRequest,
} from "../middleware/auth.js";

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceLayoutPath = resolve(
    process.cwd(),
    "src",
    "dashboard",
    "views",
    "layout.html",
);

const fallbackLayoutPath = resolve(
    __dirname,
    "..",
    "src",
    "dashboard",
    "views",
    "layout.html",
);

function renderAuthPage(title: string, action: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
</head>
<body>
    <h1>${title}</h1>
    <form action="/dashboard/${action}" method="post">
        <div>
            <label for="email">Email</label>
            <input id="email" name="email" type="email" required />
        </div>
        <div>
            <label for="password">Password</label>
            <input id="password" name="password" type="password" required />
        </div>
        <button type="submit">Submit</button>
    </form>
    <p>
        ${action === "signup" ? '<a href="/dashboard/login">Already have an account? Login</a>' : '<a href="/dashboard/signup">Create an account</a>'}
    </p>
</body>
</html>`;
}

router.get("/", async (_req, res) => {
    try {
        const html = await readFile(
            sourceLayoutPath,
            "utf8",
        );

        res.type("html").send(html);
    } catch (error) {
        console.error("Dashboard error:", error);
        res.status(500).json({ error: "Dashboard unavailable" });
    }
});

router.get("/signup", (_req, res) => {
    res.type("html").send(renderAuthPage("Sign up", "signup"));
});

router.get("/login", (_req, res) => {
    res.type("html").send(renderAuthPage("Login", "login"));
});

router.post("/signup", async (req, res) => {
    try {
        const email = String(req.body?.email ?? "").trim().toLowerCase();
        const password = String(req.body?.password ?? "").trim();

        if (!email || !password) {
            res.status(400).json({ error: "Email and password are required." });
            return;
        }

        const existing = db.prepare(`
            SELECT id
            FROM users
            WHERE email = ?
            LIMIT 1
        `).get(email) as { id: string } | undefined;

        if (existing) {
            res.status(409).json({ error: "A user with that email already exists." });
            return;
        }

        const userId = randomUUID();
        const passwordHash = await hashPassword(password);

        db.prepare(`
            INSERT INTO users (id, email, password_hash)
            VALUES (?, ?, ?)
        `).run(userId, email, passwordHash);

        setAuthCookie(res, userId);

        res.status(201).json({
            message: "Account created successfully.",
            user: {
                id: userId,
                email,
            },
        });
    } catch (error) {
        console.error("Dashboard signup error:", error);
        res.status(500).json({ error: "Failed to create account." });
    }
});

router.post("/login", async (req, res) => {
    try {
        const email = String(req.body?.email ?? "").trim().toLowerCase();
        const password = String(req.body?.password ?? "").trim();

        if (!email || !password) {
            res.status(400).json({ error: "Email and password are required." });
            return;
        }

        const user = db.prepare(`
            SELECT id, email, password_hash
            FROM users
            WHERE email = ?
            LIMIT 1
        `).get(email) as { id: string; email: string; password_hash: string } | undefined;

        if (!user) {
            res.status(401).json({ error: "Invalid email or password." });
            return;
        }

        const isValid = await verifyPassword(password, user.password_hash);

        if (!isValid) {
            res.status(401).json({ error: "Invalid email or password." });
            return;
        }

        setAuthCookie(res, user.id);

        res.json({
            message: "Login successful.",
            user: {
                id: user.id,
                email: user.email,
            },
        });
    } catch (error) {
        console.error("Dashboard login error:", error);
        res.status(500).json({ error: "Failed to log in." });
    }
});

router.post("/logout", (_req, res) => {
    clearAuthCookie(res);
    res.json({ message: "Logged out successfully." });
});

router.get("/me", requireAuth, (req: AuthRequest, res) => {
    res.json({
        user: {
            id: req.user?.id,
            email: req.user?.email,
        },
    });
});

router.get("/account", requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ error: "Unauthorized." });
            return;
        }

        const keys = db.prepare(`
            SELECT id, created_at, revoked_at
            FROM api_keys
            WHERE user_id = ?
            ORDER BY created_at DESC
        `).all(userId) as Array<{
            id: string;
            created_at: string;
            revoked_at: string | null;
        }>;

        res.json({
            user: {
                id: req.user?.id,
                email: req.user?.email,
            },
            apiKeys: keys,
        });
    } catch (error) {
        console.error("Dashboard account error:", error);
        res.status(500).json({ error: "Failed to load account details." });
    }
});

router.post("/api-keys", requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ error: "Unauthorized." });
            return;
        }

        const rawApiKey = `quill_${randomUUID().replace(/-/g, "")}`;
        const keyHash = await hashApiKey(rawApiKey);
        const keyId = randomUUID();

        db.prepare(`
            INSERT INTO api_keys (id, user_id, key_hash)
            VALUES (?, ?, ?)
        `).run(keyId, userId, keyHash);

        res.status(201).json({
            message: "API key created successfully.",
            apiKey: rawApiKey,
            key: {
                id: keyId,
                user_id: userId,
                created_at: new Date().toISOString(),
                revoked_at: null,
            },
        });
    } catch (error) {
        console.error("Dashboard API key creation error:", error);
        res.status(500).json({ error: "Failed to create API key." });
    }
});

router.post("/api-keys/:id/revoke", requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.user?.id;
        const keyId = req.params.id;

        if (!userId) {
            res.status(401).json({ error: "Unauthorized." });
            return;
        }

        const result = db.prepare(`
            UPDATE api_keys
            SET revoked_at = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ? AND revoked_at IS NULL
        `).run(keyId, userId);

        if (Number(result.changes) === 0) {
            res.status(404).json({ error: "API key not found." });
            return;
        }

        res.json({
            message: "API key revoked successfully.",
            id: keyId,
        });
    } catch (error) {
        console.error("Dashboard API key revoke error:", error);
        res.status(500).json({ error: "Failed to revoke API key." });
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
