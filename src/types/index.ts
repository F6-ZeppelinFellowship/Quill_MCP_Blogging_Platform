export interface Post {
  id: string;
  content: string;
  meta_title?: string;
  meta_description?: string;
  slug?: string;
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