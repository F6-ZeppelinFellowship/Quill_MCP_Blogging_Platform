import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/**
 * Register all Content CRUD Tools to the MCP Server
 */
export function registerPostTools(server: McpServer): void {

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
      // TODO (Member 3 Integration): Replace with await postService.createPost(...)
      const mockCreatedPost = {
        id: `post_${Date.now()}`,
        title,
        content,
        tags,
        status: "draft" as const,
        createdAt: new Date().toISOString(),
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                message: "Post created successfully.",
                post: mockCreatedPost,
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
      // TODO (Member 3 Integration): Replace with await postService.getPost(id)
      const mockPost = {
        id,
        title: "Sample Blog Post Title",
        content: "# Sample Blog Post\n\nThis is a placeholder post body.",
        tags: ["engineering", "mcp"],
        status: "draft" as const,
        createdAt: new Date().toISOString(),
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ post: mockPost }, null, 2),
          },
        ],
      };
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
      status: z.enum(["draft", "published", "scheduled"]).optional(),
      limit: z.number().int().positive().optional().default(10),
    },
    async ({ status, limit }) => {
      // TODO (Member 3 Integration): Replace with await postService.listPosts({ status, limit })
      const mockPosts = [
        {
          id: "post_101",
          title: "Getting Started with MCP Architecture",
          status: status || "draft",
          tags: ["mcp", "express"],
        },
        {
          id: "post_102",
          title: "Building Modern Developer Platforms",
          status: status || "published",
          tags: ["architecture"],
        },
      ].slice(0, limit);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                count: mockPosts.length,
                filterApplied: { status, limit },
                posts: mockPosts,
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
      // TODO (Member 3 Integration): Replace with await postService.updatePost(id, { title, content, tags })
      const mockUpdatedPost = {
        id,
        title: title || "Updated Blog Post Title",
        content: content || "Updated post content.",
        tags: tags || ["updated"],
        updatedAt: new Date().toISOString(),
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                message: "Post updated successfully.",
                post: mockUpdatedPost,
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
      // TODO (Member 3 Integration): Replace with await postService.deletePost(id)
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
    }
  );
}