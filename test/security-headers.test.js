import test from "node:test";
import assert from "node:assert/strict";
import { noStore, securityHeaders } from "../src/middleware/security-headers.js";

function responseRecorder() {
  const headers = new Map();

  return {
    headers,
    response: {
      setHeader(name, value) {
        headers.set(name.toLowerCase(), value);
      }
    }
  };
}

test("security headers are applied and middleware continues", () => {
  const { headers, response } = responseRecorder();
  let nextCalls = 0;

  securityHeaders({}, response, () => {
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

test("API no-store middleware prevents sensitive response caching", () => {
  const { headers, response } = responseRecorder();
  let nextCalls = 0;

  noStore({}, response, () => {
    nextCalls += 1;
  });

  assert.equal(headers.get("cache-control"), "no-store, max-age=0");
  assert.equal(headers.get("pragma"), "no-cache");
  assert.equal(nextCalls, 1);
});
