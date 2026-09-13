import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import * as aiService from "../../services/ai.service.js";
import * as postService from "../../services/post.service.js";

export async function getAnalytics({
	post_id,
	range,
}: {
	post_id?: string;
	range?: string;
}): Promise<string> {
	const metrics = await postService.getAnalyticsMetrics(post_id, range);
	return aiService.summarizeAnalytics(metrics);
}

export function registerAnalyticsTools(server: McpServer): void {
  server.tool(
    "get_analytics",
    "Summarize analytics for a post or the whole blog using the configured Google AI Studio model.",
    {
      post_id: z.string().optional(),
      range: z.enum(["7d", "30d", "all"]).optional().default("30d"),
    },
    async ({ post_id, range }) => {
      try {
        const summary = await getAnalytics({ post_id, range });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  message: "Analytics summary generated successfully.",
                  summary,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  error: "Failed to generate analytics summary.",
                  details: error instanceof Error ? error.message : String(error),
                },
                null,
                2,
              ),
            },
          ],
          isError: true,
        };
      }
    },
  );
}
