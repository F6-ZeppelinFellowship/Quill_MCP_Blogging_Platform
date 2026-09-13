import test from "node:test";
import assert from "node:assert/strict";

import {
    hashApiKey,
    verifyApiKey,
} from "../src/services/auth.service.js";

test("auth service can hash and verify an API key", async () => {
    const rawKey = "quill_test_api_key_123";

    const hash = await hashApiKey(rawKey);

    assert.ok(hash.length > 0);
    assert.ok(hash !== rawKey);

    const verified = await verifyApiKey(rawKey, hash);

    assert.equal(verified, true);

    const rejected = await verifyApiKey("different-key", hash);

    assert.equal(rejected, false);
});
