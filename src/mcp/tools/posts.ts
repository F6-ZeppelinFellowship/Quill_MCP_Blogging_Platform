import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import {
  createPost,
  getPost,
  listPosts,
  updatePost,
  deletePost,
} from "../../services/post.service.js";

/**
 * Register all Content CRUD Tools to the MCP Server
 *
 * Member 3 integration:
 * MCP tools use the existing post.service.ts implementation.
 *
 * Note:
 * The current MCP server uses a mock user context:
 * user_mock_123
 *
 * This allows the MCP tools to work with the existing
 * post.service.ts without changing Member 1 or Member 2 files.
 */
export function registerPostTools(server: McpServer): void {
  /**
   * MCP user context.
   *
   * This matches the current temporary user context
   * used in src/mcp/server.ts.
   */
  const contextUserId = "2d76d06a-3d20-4388-890c-ad74d4344465";

  /**
   * 1. create_post
   * Allows the agent to draft or create a new blog post.
   */
  server.tool(
    "create_post",
    "Create a new blog post draft or document. Accepts title, content, and optional tags.",
    {
      title: z.string().min(1, "Title is required"),
      content: z.string().min(1, "Content is required"),
      tags: z.array(z.string()).optional().default([]),
    },
    async ({ title, content, tags }) => {
      try {
        const post = await createPost({
          user_id: contextUserId,
          title,
          content,
          tags,
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
                    error instanceof Error
                      ? error.message
                      : String(error),
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
   * 2. get_post
   * Retrieves a specific post by its unique ID.
   */
  server.tool(
    "get_post",
    "Retrieve the full details and Markdown content of a blog post by its post ID.",
    {
      id: z.string().min(1, "Post ID is required"),
    },
    async ({ id }) => {
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

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  post,
                },
                null,
                2
              ),
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
                    error instanceof Error
                      ? error.message
                      : String(error),
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
   * 3. list_posts
   * Lists posts filtered by status and limit.
   */
  server.tool(
    "list_posts",
    "List existing blog posts with optional filters for status (draft, published, scheduled) and result limit.",
    {
      status: z
        .enum(["draft", "published", "scheduled"])
        .optional(),
      limit: z.number().int().positive().optional().default(10),
    },
    async ({ status, limit }) => {
      try {
        const posts = await listPosts({
          status,
          limit,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  count: posts.length,
                  filterApplied: {
                    status,
                    limit,
                  },
                  posts,
                },
                null,
                2
              ),
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
                    error instanceof Error
                      ? error.message
                      : String(error),
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
    },
    async ({ id, title, content, tags }) => {
      try {
        const post = await updatePost(id, {
          title,
          content,
          tags,
        });

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
                    error instanceof Error
                      ? error.message
                      : String(error),
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
   * Deletes a post permanently by ID.
   */
  server.tool(
    "delete_post",
    "Permanently delete a blog post by its post ID.",
    {
      id: z.string().min(1, "Post ID is required"),
    },
    async ({ id }) => {
      try {
        const deleted = await deletePost(id);

        if (!deleted) {
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

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  message: `Post ${id} deleted successfully.`,
                  deletedId: id,
                },
                null,
                2
              ),
            },
          ],
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
                    error instanceof Error
                      ? error.message
                      : String(error),
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