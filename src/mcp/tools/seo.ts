import * as aiService from "../../services/ai.service.js";
import * as postService from "../../services/post.service.js";

export async function manageSeo({ post_id }: { post_id: string }) {
	const post = await postService.getPost(post_id);
	if (!post) {
		throw new Error(`Post not found: ${post_id}`);
	}

	const metadata = await aiService.generateSeoTags(post.content);
	return postService.updatePost(post_id, metadata);
}
