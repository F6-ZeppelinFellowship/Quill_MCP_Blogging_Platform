import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import {
  getPost,
  updatePost,
} from "../../services/post.service.js";

/**
 * Register available Content CRUD Tools to the MCP Server
 */
export function registerPostTools(server: McpServer): void {
  /**
   * 1. get_post
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
   * 2. update_post
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
        } as any);

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