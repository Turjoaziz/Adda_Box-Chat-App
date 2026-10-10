import test from "node:test";
import assert from "node:assert/strict";
import { securityHeaders } from "../src/middleware/security-headers.js";

test("security headers are applied and middleware continues", () => {
  const headers = new Map();
  let nextCalls = 0;

  const res = {
    setHeader(name, value) {
      headers.set(name.toLowerCase(), value);
    }
  };

  securityHeaders({}, res, () => {
    nextCalls += 1;
  });

  assert.equal(headers.get("x-content-type-options"), "nosniff");
  assert.equal(headers.get("x-frame-options"), "DENY");
  assert.equal(headers.get("referrer-policy"), "no-referrer");
  assert.equal(
    headers.get("permissions-policy"),
    "camera=(), microphone=(), geolocation=()"
  );
  assert.equal(nextCalls, 1);
});
