import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import * as aiService from "../../services/ai.service.js";
import * as postService from "../../services/post.service.js";

export async function createDraftFromNotes({ rawInput }: { rawInput: string }) {
  return aiService.generateDraft(rawInput);
}

export async function manageSeo({
  post_id,
  slug,
  meta_title,
  meta_description,
}: {
  post_id: string;
  slug?: string;
  meta_title?: string;
  meta_description?: string;
}) {
	const post = await postService.getPost(post_id);
	if (!post) {
		throw new Error(`Post not found: ${post_id}`);
	}

	const metadata = await aiService.generateSeoTags(post.content);

	return postService.updatePost(post_id, {
		...metadata,
		...(slug !== undefined ? { slug } : {}),
		...(meta_title !== undefined ? { meta_title } : {}),
		...(meta_description !== undefined ? { meta_description } : {}),
	});
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

  server.tool(
    "manage_seo",
    "Generate and persist SEO metadata for an existing post using the configured Google AI Studio model.",
    {
      id: z.string().min(1, "Post ID is required"),
      slug: z.string().optional(),
      meta_title: z.string().optional(),
      meta_description: z.string().optional(),
    },
    async ({ id, slug, meta_title, meta_description }) => {
      try {
        const updated = await manageSeo({ post_id: id, slug, meta_title, meta_description });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  message: "SEO metadata updated successfully.",
                  post: updated,
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
                  error: "Failed to update SEO metadata.",
                  id,
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
