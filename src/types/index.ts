export interface Post {
  id: string;
  title: string;
  content: string;
  tags?: string[];
  status?: "draft" | "published" | "scheduled";
  meta_title?: string;
  meta_description?: string;
  slug?: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PostSummary {
  id: string;
  title: string;
  slug?: string;
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