import test from "node:test";
import assert from "node:assert/strict";
import { auditMiddleware } from "../src/middleware/audit.js";

test("audit middleware is available", () => {
    assert.equal(typeof auditMiddleware, "function");
});
