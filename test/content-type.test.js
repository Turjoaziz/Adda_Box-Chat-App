import test from "node:test";
import assert from "node:assert/strict";
import { requireJsonBody } from "../src/middleware/content-type.js";

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

function run(request) {
  const res = responseRecorder();
  let nextCalls = 0;

  requireJsonBody(request, res, () => {
    nextCalls += 1;
  });

  return { res, nextCalls };
}

test("JSON API writes continue to route handlers", () => {
  const { res, nextCalls } = run({
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" }
  });

  assert.equal(nextCalls, 1);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body, null);
});

test("structured +json media types are accepted", () => {
  const { nextCalls } = run({
    method: "PATCH",
    headers: { "content-type": "application/merge-patch+json" }
  });

  assert.equal(nextCalls, 1);
});

test("write requests with unsupported content types return 415", () => {
  for (const request of [
    { method: "POST", headers: { "content-type": "text/plain" } },
    { method: "PUT", headers: { "content-type": "application/x-www-form-urlencoded" } },
    { method: "PATCH", headers: {} }
  ]) {
    const { res, nextCalls } = run(request);

    assert.equal(nextCalls, 0);
    assert.equal(res.statusCode, 415);
    assert.deepEqual(res.body, {
      error: "Content-Type must be application/json."
    });
  }
});

test("read-only API methods do not require a JSON content type", () => {
  const { nextCalls } = run({
    method: "GET",
    headers: {}
  });

  assert.equal(nextCalls, 1);
});
