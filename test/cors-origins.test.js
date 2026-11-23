import test from "node:test";
import assert from "node:assert/strict";
import {
  isCorsOriginAllowed,
  parseCorsOrigins
} from "../src/services/cors-origins.js";

test("CORS origin parser trims, filters, and preserves multiple allowed origins", () => {
  assert.deepEqual(
    parseCorsOrigins(" https://app.example.com,https://admin.example.com ,, "),
    ["https://app.example.com", "https://admin.example.com"]
  );
});

test("CORS allows configured browser origins and rejects unlisted origins", () => {
  const allowed = [
    "https://app.example.com",
    "https://admin.example.com"
  ];

  assert.equal(isCorsOriginAllowed("https://app.example.com", allowed), true);
  assert.equal(isCorsOriginAllowed("https://admin.example.com", allowed), true);
  assert.equal(isCorsOriginAllowed("https://evil.example.com", allowed), false);
});

test("empty CORS configuration fails closed for cross-origin browsers", () => {
  assert.equal(isCorsOriginAllowed("https://evil.example.com", []), false);
});

test("requests without an Origin header remain allowed", () => {
  assert.equal(isCorsOriginAllowed(undefined, []), true);
  assert.equal(isCorsOriginAllowed("", []), true);
});
