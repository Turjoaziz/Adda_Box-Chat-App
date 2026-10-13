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
  assert.equal(headers.has("strict-transport-security"), false);
  assert.equal(nextCalls, 1);
});

test("HTTPS requests receive HSTS, including requests behind a TLS proxy", () => {
  for (const request of [
    { secure: true },
    { headers: { "x-forwarded-proto": "https" } },
    { headers: { "x-forwarded-proto": "https, http" } }
  ]) {
    const { headers, response } = responseRecorder();

    securityHeaders(request, response, () => {});

    assert.equal(
      headers.get("strict-transport-security"),
      "max-age=31536000; includeSubDomains"
    );
  }
});

test("plain HTTP requests do not receive HSTS", () => {
  const { headers, response } = responseRecorder();

  securityHeaders(
    { secure: false, headers: { "x-forwarded-proto": "http" } },
    response,
    () => {}
  );

  assert.equal(headers.has("strict-transport-security"), false);
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
