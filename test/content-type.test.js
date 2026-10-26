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

test("JSON object API writes continue to route handlers", () => {
  const { res, nextCalls } = run({
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: { email: "person@example.com" }
  });

  assert.equal(nextCalls, 1);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body, null);
});

test("structured +json media types are accepted for object bodies", () => {
  const { nextCalls } = run({
    method: "PATCH",
    headers: { "content-type": "application/merge-patch+json" },
    body: { name: "Updated" }
  });

  assert.equal(nextCalls, 1);
});

test("write requests with unsupported content types return 415", () => {
  for (const request of [
    { method: "POST", headers: { "content-type": "text/plain" }, body: {} },
    { method: "PUT", headers: { "content-type": "application/x-www-form-urlencoded" }, body: {} },
    { method: "PATCH", headers: {}, body: {} }
  ]) {
    const { res, nextCalls } = run(request);

    assert.equal(nextCalls, 0);
    assert.equal(res.statusCode, 415);
    assert.deepEqual(res.body, {
      error: "Content-Type must be application/json."
    });
  }
});

test("write requests reject non-object JSON bodies with 400", () => {
  for (const body of [null, [], "text", 42, true, undefined]) {
    const { res, nextCalls } = run({
      method: "POST",
      headers: { "content-type": "application/json" },
      body
    });

    assert.equal(nextCalls, 0);
    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, {
      error: "JSON body must be an object."
    });
  }
});

test("read-only API methods do not require a JSON body", () => {
  const { nextCalls } = run({
    method: "GET",
    headers: {}
  });

  assert.equal(nextCalls, 1);
});
