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
