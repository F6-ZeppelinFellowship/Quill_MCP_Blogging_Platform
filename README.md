# Quill — MCP-Native Blogging Platform

> **F6 Zeppelin Fellowship — Capstone Project**  
> *Your blog dashboard is your editor. Talk to your blog the way you talk to your code.*

Quill is an **MCP-first, headless blogging platform** built for developers and technical writers who live in their IDEs. Instead of context-switching to a web CMS, Quill exposes its full management lifecycle—drafting, editing, SEO optimization, publishing, and analytics—as a lightweight **Model Context Protocol (MCP)** server.

Manage your entire blog using natural-language requests inside your AI coding agent (Cursor, Claude Code, Windsurf), while relying on a server-rendered web dashboard for external access and a fast, read-only public blog for readers.

---

## 🌟 Key Features

* **IDE-Centric Workflow:** Create, revise, or publish posts directly from git commits, PRs, or local markdown files using your AI coding agent.
* **Dual-Surface Consistency:** Powered by a unified backend API—actions taken via MCP tools and the web dashboard share the exact same state without drift.
* **Dual-Credential Auth Architecture:** 
  * **Session Passwords:** Authenticate humans into the web dashboard.
  * **Hashed API Keys:** Authenticate AI agents via unique MCP endpoint URLs (`/mcp?key=...`).
* **Zero-External-Dependency Persistence:** Operates on Node 22's native `node:sqlite` for single-process deployments with seamless migration paths to PostgreSQL.
* **Built-in Analytics & SEO:** Track views, top referrers, and manage meta properties (`slug`, `meta_title`, `meta_description`) directly through agent tools.

---

## 🏗️ System Architecture

Quill runs as a single, containerized Node.js process serving three distinct client surfaces over a shared data access layer:

```text
┌───────────────────────────────────┐
│     IDE / AI Agent Client         │
│  (Cursor, Claude Code, Windsurf)  │
└─────────────────┬─────────────────┘
                  │ MCP over HTTP (API Key Auth)
                  ▼
┌────────────────────────────────────────────────────────┐
│               Unified Node.js Backend                  │
│  ┌─────────────────┬────────────────┬────────────────┐ │
│  │   MCP Server    │ Web Dashboard  │ Public Blog    │ │
│  │ (Tool Handlers) │  (SSR Pages)   │ (Read-Only)    │ │
│  └────────┬────────┴───────┬────────┴───────┬────────┘ │
│           └────────────────┼────────────────┘          │
│                            ▼                           │
│                   Data Access Layer                    │
└────────────────────────────┬───────────────────────────┘
                             │
                             ▼
              ┌─────────────────────────────┐
              │  SQLite DB (node:sqlite)    │
              │  • users      • posts       │
              │  • api_keys   • analytics   │
              └─────────────────────────────┘
```
---

## 🔌 MCP Tool Surface

When connected to an IDE, Quill registers the following tools with your AI agent. All operations are strictly isolated to the authenticated `user_id` derived from the API key.

| Tool | Action | Key Parameters |
|---|---|---|
| `create_post` | Create a new Markdown draft | `title`, `content`, `tags?` |
| `update_post` | Edit an existing draft or published post | `id`, `title?`, `content?`, `tags?` |
| `delete_post` | Permanently remove a post | `id` |
| `list_posts` | Fetch posts filtered by state | `status` (`draft` \| `published` \| `scheduled`), `limit?` |
| `get_post` | Retrieve full post content and metadata | `id` |
| `publish_post` | Publish a draft post immediately | `id` |
| `schedule_post` | Schedule a post for future publication | `id`, `publish_at` |
| `unpublish_post` | Revert a published post back to draft | `id` |
| `manage_seo` | Set search engine metadata | `id`, `slug?`, `meta_title?`, `meta_description?` |
| `get_analytics` | Query traffic performance and referrers | `post_id?`, `range` (`7d` \| `30d` \| `all`) |

---

## 🛠️ Tech Stack

* **Runtime:** Node.js (v22+)
* **Language:** TypeScript
* **Database:** SQLite (`node:sqlite` native module)
* **MCP Protocol:** `@modelcontextprotocol/sdk` (Streamable HTTP Transport)
* **Web Server & Dashboard:** Express / Hono with Server-Rendered HTML Templates
* **Containerization:** Docker with volume-mounted persistence

---

## ⚡ Quick Start

### 1. Local Setup

```bash
# Clone the repository
git clone https://github.com/F6-ZeppelinFellowship/Quill_MCP_Blogging_Platform.git
cd Quill_MCP_Blogging_Platform

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env

# Run database migrations and launch dev server
npm run db:migrate
npm run dev
```

### 2. Connect to Your IDE

1. Open `http://localhost:3000/signup` in your browser and create an account.
2. Copy your unique **MCP Server URL** provided in your account dashboard:  
   `http://localhost:3000/mcp?key=YOUR_API_KEY`
3. Add the server to your IDE's MCP configuration file (e.g., `cursor.json`, `claude_desktop_config.json`, or `.windsurf/mcp.json`):

```json
{
  "mcpServers": {
    "quill": {
      "url": "http://localhost:3000/mcp?key=YOUR_API_KEY"
    }
  }
}
```

4. Test the integration by prompting your agent inside your IDE:
   > *"Draft a new blog post in Quill titled 'Building with MCP' using notes from my current workspace."*

---

## 🚢 Deployment

Quill is packaged as a single containerized unit designed for platforms like Fly.io, Railway, or Render.

```bash
# Build the production Docker image
docker build -t quill-blog .

# Run container with persistent database volume
docker run -d \
  -p 3000:3000 \
  -v quill_data:/app/data \
  -e DATABASE_URL="/app/data/quill.db" \
  --name quill \
  quill-blog
```
