export type PostStatus = "draft" | "published" | "scheduled";

export interface Post {
  id: string;
  user_id: string;
  title: string;
  content: string;
  tags: string[];
  status: PostStatus;
  slug?: string;
  meta_title?: string;
  meta_description?: string;
  created_at: string;
  updated_at: string;
  publish_at?: string;
}

export interface NewPostInput {
  user_id: string;
  title: string;
  content: string;
  tags?: string[];
  status?: PostStatus;
  slug?: string;
  meta_title?: string;
  meta_description?: string;
  publish_at?: Date | string;
}

export interface PostSummary {
  id: string;
  title: string;
  slug?: string;
  status: PostStatus;
  score?: number;
}

export interface User {
  id: string;
}

export interface McpToolRequest {
  [key: string]: unknown;
}

export interface LLMResult {
  content: string;
  model: string;
}

export type RawAnalyticsData = Record<string, unknown>;
