import test from "node:test";
import assert from "node:assert/strict";
import { apiErrorHandler, apiNotFound } from "../src/middleware/api-errors.js";

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    headersSent: false,
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

test("unknown API routes return a JSON 404 response", () => {
  const res = responseRecorder();

  apiNotFound({}, res);

  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, { error: "API route not found." });
});

test("unexpected API errors return a generic JSON 500 without leaking details", () => {
  const res = responseRecorder();
  const secretDetail = "database password should never appear";
  const originalError = console.error;
  console.error = () => {};

  try {
    apiErrorHandler(new Error(secretDetail), {}, res, () => {
      throw new Error("next should not be called");
    });
  } finally {
    console.error = originalError;
  }

  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, { error: "Internal server error." });
  assert.equal(JSON.stringify(res.body).includes(secretDetail), false);
});

test("API errors delegate when response headers were already sent", () => {
  const res = responseRecorder();
  res.headersSent = true;
  const error = new Error("already streaming");
  let delegated = null;

  apiErrorHandler(error, {}, res, err => {
    delegated = err;
  });

  assert.equal(delegated, error);
  assert.equal(res.body, null);
});
