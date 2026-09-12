import { Router } from "express";
import { searchSimilarPosts } from "../services/vector.service.js";

export const publicRouter = Router();

// GET /api/posts
publicRouter.get("/posts", async (req, res) => {
  const query = (req.query.q as string) || "";
  
  if (query) {
    const results = await searchSimilarPosts(query);
    return res.json({ posts: results });
  }

  res.json({ message: "Posts endpoint active", posts: [] });
});