import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import {
  getPost,
  updatePostStatus,
} from "../../services/post.service.js";

/**
 * Register all Lifecycle & Workflow Tools to the MCP Server
 */
export function registerLifecycleTools(server: McpServer): void {

  /**
   * 1. publish_post
   * Transitions a draft post to 'published' status with an explicit safety guardrail.
   */
  server.tool(
    "publish_post",
    "Publish a blog post draft immediately to make it visible publicly. Requires confirmation.",
    {
      id: z.string().min(1, "Post ID is required"),
      confirm: z
        .boolean()
        .optional()
        .default(false)
        .describe("Must be explicitly set to true to execute the publication action."),
    },
    async ({ id, confirm }) => {
      // Safety Guardrail: Intercept unconfirmed publishing calls
      if (!confirm) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  status: "requires_confirmation",
                  message:
                    `Publishing post '${id}' will make it publicly accessible on the web. ` +
                    `Please re-run 'publish_post' with parameter 'confirm: true' to confirm this action.`,
                  postId: id,
                },
                null,
                2
              ),
            },
          ],
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

        const post = await updatePostStatus(id, "published");

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  message: `Post ${id} has been published successfully.`,
                  post,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        console.error("[MCP publish_post] Error:", error);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  error: "Failed to publish post.",
                  id,
                  details: error instanceof Error ? error.message : String(error),
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
   * 2. schedule_post
   * Schedules a post to be automatically published at a future ISO date/time.
   */
  server.tool(
    "schedule_post",
    "Schedule a blog post to be published automatically at a specified future date and time.",
    {
      id: z.string().min(1, "Post ID is required"),
      publishAt: z
        .string()
        .datetime({ message: "publishAt must be a valid ISO-8601 date-time string" }),
    },
    async ({ id, publishAt }) => {
      const scheduledTime = new Date(publishAt);

      if (scheduledTime.getTime() <= Date.now()) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  error: "Invalid schedule time. 'publishAt' must be a date/time in the future.",
                },
                null,
                2
              ),
            },
          ],
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

        const post = await updatePostStatus(id, "scheduled", scheduledTime);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  message: `Post ${id} scheduled for release at ${scheduledTime.toISOString()}.`,
                  post,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        console.error("[MCP schedule_post] Error:", error);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  error: "Failed to schedule post.",
                  id,
                  details: error instanceof Error ? error.message : String(error),
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
   * 3. unpublish_post
   * Reverts a published or scheduled post back to draft status.
   */
  server.tool(
    "unpublish_post",
    "Revert a published or scheduled post back to draft status, hiding it from public view.",
    {
      id: z.string().min(1, "Post ID is required"),
    },
    async ({ id }) => {
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

        const post = await updatePostStatus(id, "draft");

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  message: `Post ${id} has been unpublished and reverted to draft status.`,
                  post,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        console.error("[MCP unpublish_post] Error:", error);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  error: "Failed to unpublish post.",
                  id,
                  details: error instanceof Error ? error.message : String(error),
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