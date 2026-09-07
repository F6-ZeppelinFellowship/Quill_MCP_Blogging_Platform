import type { Post, RawAnalyticsData } from "../types/index.js";

export async function getPost(id: string): Promise<Post | null> {
	throw new Error(`postService.getPost is not implemented for post ${id}`);
}

export async function updatePost(id: string, data: Partial<Post>): Promise<Post> {
	throw new Error(`postService.updatePost is not implemented for post ${id}`);
}

export async function getAnalyticsMetrics(
	postId?: string,
	range?: string,
): Promise<RawAnalyticsData> {
	throw new Error(
		`postService.getAnalyticsMetrics is not implemented for ${postId ?? "all posts"} (${range ?? "default range"})`,
	);
}
