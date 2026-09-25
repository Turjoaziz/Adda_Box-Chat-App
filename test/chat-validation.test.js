import test from "node:test";
import assert from "node:assert/strict";

import {
  MAX_MESSAGE_LENGTH,
  normalizeRoomName,
  normalizeMessageBody,
  canSendToRoom
} from "../src/socket.js";

test("room names are trimmed and restricted to safe characters", () => {
  assert.equal(normalizeRoomName("  general  "), "general");
  assert.equal(normalizeRoomName("study_room-2"), "study_room-2");
  assert.equal(normalizeRoomName(""), null);
  assert.equal(normalizeRoomName("room with spaces"), null);
  assert.equal(normalizeRoomName("../admin"), null);
  assert.equal(normalizeRoomName("a".repeat(51)), null);
  assert.equal(normalizeRoomName(123), null);
});

test("message bodies are trimmed and length-limited", () => {
  assert.equal(normalizeMessageBody("  hello world  "), "hello world");
  assert.equal(normalizeMessageBody("   "), null);
  assert.equal(normalizeMessageBody("a".repeat(MAX_MESSAGE_LENGTH)), "a".repeat(MAX_MESSAGE_LENGTH));
  assert.equal(normalizeMessageBody("a".repeat(MAX_MESSAGE_LENGTH + 1)), null);
  assert.equal(normalizeMessageBody({ body: "hello" }), null);
});

test("server-side room membership is required before sending", () => {
  const socket = { rooms: new Set(["socket-id", "general"]) };

  assert.equal(canSendToRoom(socket, "general"), true);
  assert.equal(canSendToRoom(socket, "private-room"), false);
  assert.equal(canSendToRoom({}, "general"), false);
});
