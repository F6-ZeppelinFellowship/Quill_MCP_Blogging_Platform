import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

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

      // TODO (Member 3 Integration): Replace with await postService.updatePostStatus(id, "published")
      // Note: Member 3's service automatically triggers vector embedding (embedAndUpsertPost) on 'published'
      const mockPublishedPost = {
        id,
        status: "published" as const,
        publishedAt: new Date().toISOString(),
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                message: `Post ${id} has been published successfully.`,
                post: mockPublishedPost,
              },
              null,
              2
            ),
          },
        ],
      };
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

      // TODO (Member 3 Integration): Replace with await postService.updatePostStatus(id, "scheduled", scheduledTime)
      const mockScheduledPost = {
        id,
        status: "scheduled" as const,
        publishAt: scheduledTime.toISOString(),
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                message: `Post ${id} scheduled for release at ${scheduledTime.toISOString()}.`,
                post: mockScheduledPost,
              },
              null,
              2
            ),
          },
        ],
      };
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
      // TODO (Member 3 Integration): Replace with await postService.updatePostStatus(id, "draft")
      const mockUnpublishedPost = {
        id,
        status: "draft" as const,
        updatedAt: new Date().toISOString(),
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                message: `Post ${id} has been unpublished and reverted to draft status.`,
                post: mockUnpublishedPost,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}