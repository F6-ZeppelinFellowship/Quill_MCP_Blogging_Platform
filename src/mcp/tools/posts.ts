import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import {
  createPost,
  deletePost,
  getPost,
  listPosts,
  updatePost,
} from "../../services/post.service.js";
import { getActiveUserId } from "../session.js";

/**
 * Register available Content CRUD Tools to the MCP Server
 */
export function registerPostTools(server: McpServer): void {
  /**
   * 1. create_post
   * Creates a new blog post draft.
   */
  server.tool(
    "create_post",
    "Create a new blog post draft.",
    {
      title: z.string().min(1, "Title is required"),
      content: z.string().min(1, "Content is required"),
      tags: z.array(z.string()).optional(),
      status: z.enum(["draft", "published", "scheduled"]).optional(),
      slug: z.string().optional(),
      meta_title: z.string().optional(),
      meta_description: z.string().optional(),
      publish_at: z
        .string()
        .datetime({ message: "publish_at must be a valid ISO-8601 date-time string" })
        .optional(),
    },
    async ({ title, content, tags, status, slug, meta_title, meta_description, publish_at }) => {
      const userId = getActiveUserId();

      if (!userId) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  error: "Unauthorized: missing authenticated user context.",
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      try {
        const post = await createPost({
          user_id: userId,
          title,
          content,
          tags,
          status,
          slug,
          meta_title,
          meta_description,
          publish_at,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  message: "Post created successfully.",
                  post,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        console.error("[MCP create_post] Error:", error);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  error: "Failed to create post.",
                  details:
                    error instanceof Error ? error.message : String(error),
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    }
  );

  /**
   * 2. list_posts
   * Retrieves posts filtered by status.
   */
  server.tool(
    "list_posts",
    "List blog posts for the authenticated user, optionally filtered by status.",
    {
      status: z.enum(["draft", "published", "scheduled"]).optional(),
      limit: z.number().int().min(1).max(100).optional(),
    },
    async ({ status, limit }) => {
      const userId = getActiveUserId();

      if (!userId) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  error: "Unauthorized: missing authenticated user context.",
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      try {
        const posts = await listPosts({ status, limit });
        const filteredPosts = posts.filter((post) => post.user_id === userId);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ posts: filteredPosts }, null, 2),
            },
          ],
        };
      } catch (error) {
        console.error("[MCP list_posts] Error:", error);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  error: "Failed to list posts.",
                  details:
                    error instanceof Error ? error.message : String(error),
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    }
  );

  /**
   * 3. get_post
   * Retrieves a specific post by its unique ID.
   */
  server.tool(
    "get_post",
    "Retrieve the full details and Markdown content of a blog post by its post ID.",
    {
      id: z.string().min(1, "Post ID is required"),
    },
    async ({ id }) => {
      const userId = getActiveUserId();

      if (!userId) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  error: "Unauthorized: missing authenticated user context.",
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      try {
        const post = await getPost(id);

        if (!post) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    error: "Post not found.",
                    id,
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }

        if (post.user_id !== userId) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    error: "Forbidden: post does not belong to the authenticated user.",
                    id,
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ post }, null, 2),
            },
          ],
        };
      } catch (error) {
        console.error("[MCP get_post] Error:", error);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  error: "Failed to retrieve post.",
                  id,
                  details:
                    error instanceof Error ? error.message : String(error),
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    }
  );

  /**
   * 4. update_post
   * Modifies an existing blog post's title, content, or tags.
   */
  server.tool(
    "update_post",
    "Update an existing blog post's title, content, or tags by post ID.",
    {
      id: z.string().min(1, "Post ID is required"),
      title: z.string().optional(),
      content: z.string().optional(),
      tags: z.array(z.string()).optional(),
      status: z.enum(["draft", "published", "scheduled"]).optional(),
      slug: z.string().optional(),
      meta_title: z.string().optional(),
      meta_description: z.string().optional(),
      publish_at: z
        .string()
        .datetime({ message: "publish_at must be a valid ISO-8601 date-time string" })
        .optional(),
    },
    async ({ id, title, content, tags, status, slug, meta_title, meta_description, publish_at }) => {
      const userId = getActiveUserId();

      if (!userId) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  error: "Unauthorized: missing authenticated user context.",
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      try {
        const existing = await getPost(id);

        if (!existing) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    error: "Post not found.",
                    id,
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }

        if (existing.user_id !== userId) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    error: "Forbidden: post does not belong to the authenticated user.",
                    id,
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }

        const post = await updatePost(id, {
          title,
          content,
          tags,
          status,
          slug,
          meta_title,
          meta_description,
          publish_at,
        } as any);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  message: "Post updated successfully.",
                  post,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        console.error("[MCP update_post] Error:", error);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  error: "Failed to update post.",
                  id,
                  details:
                    error instanceof Error ? error.message : String(error),
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    }
  );

  /**
   * 5. delete_post
   * Permanently removes a blog post by its unique ID.
   */
  server.tool(
    "delete_post",
    "Delete a blog post by its post ID.",
    {
      id: z.string().min(1, "Post ID is required"),
    },
    async ({ id }) => {
      const userId = getActiveUserId();

      if (!userId) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  error: "Unauthorized: missing authenticated user context.",
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      try {
        const existing = await getPost(id);

        if (!existing) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    error: "Post not found.",
                    id,
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }

        if (existing.user_id !== userId) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    error: "Forbidden: post does not belong to the authenticated user.",
                    id,
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }

        const deleted = await deletePost(id);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  message: deleted
                    ? "Post deleted successfully."
                    : "Post not found.",
                  id,
                },
                null,
                2
              ),
            },
          ],
          isError: !deleted,
        };
      } catch (error) {
        console.error("[MCP delete_post] Error:", error);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  error: "Failed to delete post.",
                  id,
                  details:
                    error instanceof Error ? error.message : String(error),
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    }
  );
}