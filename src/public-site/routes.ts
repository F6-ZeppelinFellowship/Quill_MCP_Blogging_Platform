import { Router } from "express";
import { getPost, listPosts } from "../services/post.service.js";
import { searchSimilarPosts } from "../services/vector.service.js";

export const publicRouter = Router();

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderBlogPage(posts: Array<{ id: string; title: string; slug?: string; content: string; created_at: string; status: string }>): string {
  const cards = posts.length
    ? posts
        .map(
          (post) => `
            <article class="post-card">
              <span class="badge">${escapeHtml(post.status)}</span>
              <h2><a href="/blog/${encodeURIComponent(post.slug ?? post.id)}">${escapeHtml(post.title)}</a></h2>
              <p class="meta">${new Date(post.created_at).toLocaleDateString()}</p>
              <p>${escapeHtml(post.content.slice(0, 180))}${post.content.length > 180 ? "..." : ""}</p>
            </article>
          `,
        )
        .join("")
    : '<p class="empty">No published posts yet.</p>';

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Quill Blog</title>
    <style>
      :root {
        --bg: #0b1020;
        --panel: #121a2b;
        --panel-2: #1a2440;
        --text: #edf2ff;
        --muted: #a9b5d0;
        --accent: #7dd3fc;
        --accent-2: #c084fc;
        --border: rgba(255,255,255,0.08);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Arial, Helvetica, sans-serif;
        background: linear-gradient(180deg, #0b1020 0%, #111827 100%);
        color: var(--text);
      }
      a { color: var(--accent); text-decoration: none; }
      .wrap { max-width: 1100px; margin: 0 auto; padding: 32px 20px 60px; }
      .topbar {
        display: flex; justify-content: space-between; align-items: center;
        gap: 16px; padding: 18px 0 24px; border-bottom: 1px solid var(--border);
      }
      .brand { font-size: 1.5rem; font-weight: 700; }
      .nav { display: flex; gap: 16px; flex-wrap: wrap; }
      .hero {
        padding: 32px 0 20px;
      }
      .hero h1 {
        font-size: clamp(2rem, 5vw, 3.5rem);
        margin: 0 0 12px;
      }
      .hero p {
        color: var(--muted);
        font-size: 1.06rem;
        max-width: 700px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 20px;
        margin-top: 28px;
      }
      .post-card {
        background: rgba(18, 26, 43, 0.9);
        border: 1px solid var(--border);
        border-radius: 18px;
        padding: 20px;
        box-shadow: 0 20px 40px rgba(15, 23, 42, 0.3);
      }
      .post-card h2 { margin-top: 12px; font-size: 1.5rem; }
      .post-card p { color: var(--muted); }
      .badge {
        display: inline-block;
        padding: 6px 10px;
        border-radius: 999px;
        background: rgba(125, 211, 252, 0.15);
        border: 1px solid rgba(125, 211, 252, 0.35);
        color: var(--accent);
        font-size: 0.74rem;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }
      .meta {
        font-size: 0.85rem;
        color: var(--muted);
      }
      .empty { color: var(--muted); }
      .post-shell {
        background: rgba(18, 26, 43, 0.9);
        border: 1px solid var(--border);
        border-radius: 18px;
        padding: 28px;
      }
      .post-shell h1 { margin-top: 10px; }
      .post-shell .body {
        white-space: pre-wrap;
        line-height: 1.7;
        color: var(--text);
      }
      .back-link { display: inline-block; margin-top: 20px; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="topbar">
        <div class="brand">Quill</div>
        <nav class="nav">
          <a href="/blog">Blog</a>
          <a href="/dashboard">Dashboard</a>
        </nav>
      </div>

      <section class="hero">
        <h1>Quill public blog</h1>
        <p>
          Read the published posts from your MCP-native blogging platform.
        </p>
      </section>

      <div class="grid">
        ${cards}
      </div>
    </div>
  </body>
</html>`;
}

function renderPostDetail(post: { id: string; title: string; slug?: string; content: string; created_at: string; status: string }): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(post.title)} | Quill</title>
    <style>
      :root { --bg: #0b1020; --panel: #121a2b; --text: #edf2ff; --muted: #a9b5d0; --border: rgba(255,255,255,0.08); }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: Arial, Helvetica, sans-serif; background: linear-gradient(180deg, #0b1020 0%, #111827 100%); color: var(--text); }
      a { color: #7dd3fc; text-decoration: none; }
      .wrap { max-width: 900px; margin: 0 auto; padding: 32px 20px 60px; }
      .topbar { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 18px 0 24px; border-bottom: 1px solid var(--border); }
      .brand { font-size: 1.5rem; font-weight: 700; }
      .nav { display: flex; gap: 16px; }
      .post-shell { background: rgba(18, 26, 43, 0.9); border: 1px solid var(--border); border-radius: 18px; padding: 28px; margin-top: 28px; }
      .post-shell h1 { margin: 0 0 12px; }
      .meta { color: var(--muted); margin-bottom: 20px; }
      .body { white-space: pre-wrap; line-height: 1.8; }
      .back-link { display: inline-block; margin-top: 18px; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="topbar">
        <div class="brand">Quill</div>
        <nav class="nav">
          <a href="/blog">Blog</a>
          <a href="/dashboard">Dashboard</a>
        </nav>
      </div>

      <article class="post-shell">
        <h1>${escapeHtml(post.title)}</h1>
        <div class="meta">Published ${new Date(post.created_at).toLocaleDateString()}</div>
        <div class="body">${escapeHtml(post.content)}</div>
      </article>

      <a class="back-link" href="/blog">← Back to blog</a>
    </div>
  </body>
</html>`;
}

// GET /api/posts
publicRouter.get("/posts", async (req, res) => {
  const query = (req.query.q as string) || "";

  if (query) {
    const results = await searchSimilarPosts(query);
    return res.json({ posts: results });
  }

  const posts = (await listPosts({ limit: 100 })).filter((post) => post.status === "published");
  return res.json({ posts });
});

publicRouter.get("/blog", async (_req, res) => {
  const posts = (await listPosts({ limit: 100 })).filter((post) => post.status === "published");
  res.type("html").send(renderBlogPage(posts));
});

publicRouter.get("/blog/:slug", async (req, res) => {
  const posts = (await listPosts({ limit: 100 })).filter((post) => post.status === "published");
  const targetSlug = req.params.slug;
  const post = posts.find((item) => (item.slug ?? item.id) === targetSlug);

  if (!post) {
    res.status(404).type("html").send("<h1>Post not found</h1>");
    return;
  }

  const fullPost = await getPost(post.id);

  if (!fullPost || fullPost.status !== "published") {
    res.status(404).type("html").send("<h1>Post not found</h1>");
    return;
  }

  res.type("html").send(renderPostDetail(fullPost));
});