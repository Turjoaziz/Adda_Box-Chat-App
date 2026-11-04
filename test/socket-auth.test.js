import test from "node:test";
import assert from "node:assert/strict";
import { socketAuthToken } from "../src/socket.js";

test("socket auth accepts a non-empty token from the auth payload", () => {
  assert.equal(
    socketAuthToken({ auth: { token: "  signed.jwt.token  " } }),
    "signed.jwt.token"
  );
});

test("socket auth ignores query-string tokens", () => {
  assert.equal(
    socketAuthToken({
      auth: {},
      query: { token: "should-not-be-accepted" }
    }),
    null
  );
});

test("socket auth rejects missing, empty, or non-string tokens", () => {
  for (const handshake of [
    {},
    { auth: {} },
    { auth: { token: "" } },
    { auth: { token: "   " } },
    { auth: { token: 123 } },
    { auth: { token: null } }
  ]) {
    assert.equal(socketAuthToken(handshake), null);
  }
});
