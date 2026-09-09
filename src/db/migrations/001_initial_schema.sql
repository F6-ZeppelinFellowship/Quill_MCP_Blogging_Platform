-- Quill — Initial Database Schema
-- Member 3: Data Layer
-- SQLite / node:sqlite

PRAGMA foreign_keys = ON;

-- ============================================================
-- Users
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- MCP API Keys
-- ============================================================

CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at TEXT,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id
    ON api_keys(user_id);

CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash
    ON api_keys(key_hash);

-- ============================================================
-- Blog Posts
-- ============================================================

CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,

    title TEXT NOT NULL,
    content TEXT NOT NULL,

    -- Stored as a JSON array, e.g. ["AI", "SQLite", "MCP"]
    tags TEXT NOT NULL DEFAULT '[]',

    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'scheduled')),

    slug TEXT UNIQUE,
    meta_title TEXT,
    meta_description TEXT,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    publish_at TEXT,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_posts_user_id
    ON posts(user_id);

CREATE INDEX IF NOT EXISTS idx_posts_status
    ON posts(status);

CREATE INDEX IF NOT EXISTS idx_posts_slug
    ON posts(slug);

CREATE INDEX IF NOT EXISTS idx_posts_created_at
    ON posts(created_at);

-- ============================================================
-- Analytics
-- ============================================================

CREATE TABLE IF NOT EXISTS analytics (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,

    views INTEGER NOT NULL DEFAULT 0,
    referrer TEXT,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (post_id)
        REFERENCES posts(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_analytics_post_id
    ON analytics(post_id);

CREATE INDEX IF NOT EXISTS idx_analytics_created_at
    ON analytics(created_at);

-- ============================================================
-- MCP Audit Logs
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,

    user_id TEXT,
    tool_name TEXT NOT NULL,

    -- JSON representation of the MCP request parameters
    parameters TEXT,

    status TEXT NOT NULL
        CHECK (status IN ('success', 'error')),

    latency_ms INTEGER NOT NULL DEFAULT 0,

    -- Agent/client information, e.g. Cursor, Claude Code, etc.
    agent TEXT,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
    ON audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tool_name
    ON audit_logs(tool_name);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
    ON audit_logs(created_at);
