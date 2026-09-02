# System Architecture & Team Module Breakdown

This document outlines the finished product specifications, system contracts, module distribution, and team ownership for **Quill — MCP-Native Blogging Platform**.

---

## 1. Finished Product Capabilities

When all 3 modules are integrated, Quill runs as a single Express server (`src/app.ts`) backed by `node:sqlite` and Qdrant:

* **The IDE Experience (Cursor / Claude Code / Windsurf):**
  * *"Draft a post based on my latest git commits."* $\rightarrow$ Member 1's `create_post` tool triggers Member 2's Contextual Drafting Engine (`ai.service.ts`) to synthesize raw git diffs into Markdown.
  * *"Optimize the SEO for post 3."* $\rightarrow$ Member 2's LLM engine processes post content and executes `manage_seo`.
  * *"Find my previous posts about SQLite."* $\rightarrow$ Member 3's Vector Embedding Engine (`vector.service.ts`) executes `search_similar_posts` against Qdrant.
* **The Web Dashboard:** Developers log in via password (`/login`), view drafts/published posts, and generate/rotate hashed MCP API keys.
* **The Audit Trail:** Every incoming tool call passes through Member 3's tracing middleware to record timestamps, latency, tool execution status, and agent details.

---

## 2. Interface Contracts

### Contract A — Data Access Layer (`src/services/post.service.ts`)
*Owned by Member 3. Consumed by Members 1 & 2.*

Required functions to export:
* `createPost(data: NewPostInput): Promise<Post>`
* `getPost(id: string): Promise<Post | null>`
* `updatePost(id: string, data: Partial<Post>): Promise<Post>`
* `deletePost(id: string): Promise<boolean>`
* `listPosts(filter: { status?: PostStatus; limit?: number }): Promise<Post[]>`
* `updatePostStatus(id: string, status: 'draft' | 'published' | 'scheduled', publishAt?: Date): Promise<Post>`
* `getAnalyticsMetrics(postId?: string, range?: string): Promise<RawAnalyticsData>`

### Contract B — Unified AI Engine (`src/services/ai.service.ts`)
*Owned by Member 2. Consumed by Members 1 & 3.*

Required functions to export:
* `generateDraft(rawInput: string): Promise<{ title: string; content: string; tags: string[] }>`
  * *Note: Receives raw strings (e.g., git diff text, unstructured notes) passed from Member 1's tool payloads.*
* `generateSeoTags(postContent: string): Promise<{ meta_title: string; meta_description: string; slug: string }>`
* `summarizeAnalytics(metrics: RawAnalyticsData): Promise<string>`

### Contract C — Vector Engine & Auto-Sync (`src/services/vector.service.ts`)
*Owned by Member 3.*

* `embedAndUpsertPost(post: Post): Promise<void>`
  * *Execution Rule: Member 3 must automatically call this inside `post.service.ts` whenever a post's status changes to `published`.*
* `searchSimilarPosts(query: string, limit?: number): Promise<PostSummary[]>`

---

## 3. Team Division & File Ownership

### Member 1: MCP Server Core & Tool Surface
**Focus:** Native MCP protocol integration, tool schema validation, and IDE agent interaction mechanics.

* **Prerequisites Needed to Start:**
  * Must wait for Member 3 to commit `src/types/index.ts` and stub out `post.service.ts` (Contract A) to execute full end-to-end tool integration tests.
  * Can build tool schemas, Zod validation, and MCP server setup locally in parallel using mock return values.
* **Primary Deliverables:**
  * `src/mcp/server.ts`: Streamable HTTP MCP server setup using `@modelcontextprotocol/sdk`. Extract API keys from request parameters (`/mcp?key=...`) and enforce `user_id` scoping.
  * `src/mcp/tools/posts.ts`: Zod schema definitions and execution logic for content operations (`create_post`, `update_post`, `delete_post`, `list_posts`, `get_post`).
  * `src/mcp/tools/lifecycle.ts`: Publishing workflow tools (`publish_post`, `schedule_post`, `unpublish_post`) featuring a `"requires_confirmation"` state payload to prevent runaway agent execution.
* **Assigned Directories:** `src/mcp/`

---

### Member 2: Server-Side LLM Workflows & Generation Engine
**Focus:** Prompt engineering, OpenRouter/Anthropic SDK integration, automated SEO pipelines, and performance analytics.

* **Prerequisites Needed to Start:**
  * Must wait for Member 3 to commit `src/types/index.ts` and stub out `getPost()` / `updatePost()` in `post.service.ts` (Contract A) so `manage_seo` can read content and save SEO tags.
  * Must wait for Member 3's `getAnalyticsMetrics()` stub to process data in `get_analytics`.
* **Primary Deliverables:**
  * `src/services/ai.service.ts`: Centralized LLM client handling model initialization, system prompts, temperature management, and structured response parsing.
  * `src/mcp/tools/seo.ts`: Implementation of the `manage_seo` tool handler utilizing LLM calls to extract `meta_title`, `meta_description`, and `slug`.
  * Contextual Drafting Pipeline: Logic that transforms raw user inputs (git diffs, release notes, raw outlines) into structured Markdown drafts.
  * `src/mcp/tools/analytics.ts`: Implementation of the `get_analytics` tool handler using LLMs to convert pageview metrics into actionable insights.
  * `src/mcp/tools/seo.ts` Execution Flow: Member 2's tool handler receives a `post_id`, calls `postService.getPost(id)`, sends `post.content` to `aiService.generateSeoTags()`, and then persists the result using `postService.updatePost()`.
* **Assigned Directories:** `src/mcp/tools/seo.ts`, `src/mcp/tools/analytics.ts`, `src/services/ai.service.ts`

---

### Member 3: AI Auditability, Vector Search & Dual-Auth Platform
**Focus:** Data layer implementation, vector embeddings, tool auditing, web session security, and dashboard rendering.

* **Prerequisites Needed to Start:**
  * **Day 1 Blocker Task (MUST COMPLETE FIRST):** Commit `src/types/index.ts` and export stubbed functions for `src/services/post.service.ts` (Contract A). Members 1 and 2 are blocked until these interface signatures are in Git.
* **Primary Deliverables:**
  * `src/db/`: Schema definitions and migration runner using `node:sqlite` (`users`, `api_keys`, `posts`, `audit_logs`).
  * `src/services/post.service.ts`: Core data access methods powering the backend.
  * `src/services/vector.service.ts`: Vector embedding pipeline and Qdrant integration powering the `search_similar_posts` tool.
  * `src/middleware/audit.ts`: Tracing middleware capturing tool executions, execution times, and parameters.
  * `src/dashboard/` & `src/public-site/`: Express routes and SSR views for authentication, post management, key rotation, and public blog rendering.
  * `src/middleware/audit.ts` Hook: Member 3 applies this directly as an Express middleware on the `/mcp` route (e.g., `app.use('/mcp', auditMiddleware)`). Member 1 does not need to add tracing code inside individual tool functions.
* **Assigned Directories:** `src/db/`, `src/services/vector.service.ts`, `src/middleware/`, `src/dashboard/`, `src/public-site/`

---

## 4. Responsibility Matrix

| Metric / Boundary | Member 1 | Member 2 | Member 3 |
| :--- | :--- | :--- | :--- |
| **Primary AI Domain** | MCP Protocol & Tool Schemas | LLM Prompting & Auto-Drafting | Vector Embeddings & Agent Tracing |
| **SDK / Library Owned** | `@modelcontextprotocol/sdk` | Anthropic / OpenRouter SDK | Qdrant Client / `node:sqlite` |
| **Hard Boundary (Exclusions)** | Does **not** write raw LLM prompts | Does **not** execute direct DB calls | Does **not** write MCP tool schemas |

---

## 5. Testing & Integration Guardrails

1. **Shared Types First (`src/types/index.ts`):** Standard interfaces for `Post`, `User`, `McpToolRequest`, and `LLMResult` must be committed by Member 3 prior to module development.
2. **Module Unit Testing Requirements:**
   * **Member 1:** Test that all tool schemas strictly validate Zod types and emit valid MCP responses.
   * **Member 2:** Test that `ai.service.ts` correctly extracts structured SEO metadata from sample Markdown files.
   * **Member 3:** Test database CRUD operations and ensure search queries correctly execute vector score filtering.
3. **Service-Bound PR Reviews:** Pull requests introducing new features must include the corresponding service functions without relying on cross-member code adjustments.