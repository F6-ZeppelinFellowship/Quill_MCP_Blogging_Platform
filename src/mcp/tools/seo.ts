import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import * as aiService from "../../services/ai.service.js";
import * as postService from "../../services/post.service.js";

export async function createDraftFromNotes({ rawInput }: { rawInput: string }) {
  return aiService.generateDraft(rawInput);
}

export async function manageSeo({ post_id }: { post_id: string }) {
	const post = await postService.getPost(post_id);
	if (!post) {
		throw new Error(`Post not found: ${post_id}`);
	}

	const metadata = await aiService.generateSeoTags(post.content);
	return postService.updatePost(post_id, metadata);
}

export function registerSeoTools(server: McpServer): void {
  server.tool(
    "create_draft_from_notes",
    "Transform raw notes or git diff text into a structured Markdown blog draft.",
    {
      rawInput: z.string().min(1, "rawInput is required"),
    },
    async ({ rawInput }) => {
      try {
        const draft = await createDraftFromNotes({ rawInput });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  message: "Draft generated successfully.",
                  draft,
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
                  error: "Failed to generate draft from notes.",
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
