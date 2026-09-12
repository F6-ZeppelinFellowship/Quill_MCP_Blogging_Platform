import test from "node:test";
import assert from "node:assert/strict";
import {
    createPost,
    getPost,
    listPosts,
    updatePost,
    deletePost,
} from "../src/services/post.service.js";

test("post CRUD lifecycle", async () => {
    const userId = "2d76d06a-3d20-4388-890c-ad74d4344465";

    const post = await createPost({
        user_id: userId,
        title: "Member 3 Test Post",
        content: "Testing Quill post CRUD.",
        tags: ["test", "member3"],
        status: "draft",
    });

    assert.ok(post.id);
    assert.equal(post.title, "Member 3 Test Post");

    const fetched = await getPost(post.id);

    assert.ok(fetched);
    assert.equal(fetched?.id, post.id);

    const posts = await listPosts({ limit: 100 });

    assert.ok(
        posts.some((item) => item.id === post.id),
    );

    const updated = await updatePost(post.id, {
        title: "Updated Member 3 Test Post",
    });

    assert.ok(updated);
    assert.equal(
        updated?.title,
        "Updated Member 3 Test Post",
    );

    const deleted = await deletePost(post.id);

    assert.equal(deleted, true);

    const afterDelete = await getPost(post.id);

    assert.equal(afterDelete, null);
});
