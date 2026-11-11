import test from "node:test";
import assert from "node:assert/strict";
import { extractBearerToken } from "../src/services/bearer-token.js";

test("bearer token parser accepts exactly one token", () => {
  assert.equal(
    extractBearerToken("Bearer header.payload.signature"),
    "header.payload.signature"
  );
  assert.equal(
    extractBearerToken("bearer header.payload.signature"),
    "header.payload.signature"
  );
});

test("bearer token parser rejects missing or placeholder tokens", () => {
  for (const value of [
    undefined,
    null,
    "",
    "Bearer ",
    "Bearer null",
    "Bearer undefined"
  ]) {
    assert.equal(extractBearerToken(value), null);
  }
});

test("bearer token parser rejects extra whitespace or trailing values", () => {
  for (const value of [
    " Bearer token",
    "Bearer  token",
    "Bearer token ",
    "Bearer token extra",
    "Basic token",
    "token"
  ]) {
    assert.equal(extractBearerToken(value), null);
  }
});
