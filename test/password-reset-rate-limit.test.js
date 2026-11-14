import test from "node:test";
import assert from "node:assert/strict";
import { createPasswordResetBurstLimiter } from "../src/services/password-reset-rate-limit.js";

test("password reset burst limiter allows requests below the limit", () => {
  const shouldThrottle = createPasswordResetBurstLimiter({
    windowMs: 60_000,
    maxRequests: 3
  });

  assert.equal(shouldThrottle(1_000), false);
  assert.equal(shouldThrottle(2_000), false);
  assert.equal(shouldThrottle(3_000), false);
});

test("password reset burst limiter blocks requests once the window is full", () => {
  const shouldThrottle = createPasswordResetBurstLimiter({
    windowMs: 60_000,
    maxRequests: 2
  });

  assert.equal(shouldThrottle(1_000), false);
  assert.equal(shouldThrottle(2_000), false);
  assert.equal(shouldThrottle(3_000), true);
});

test("password reset burst limiter allows traffic again after the window expires", () => {
  const shouldThrottle = createPasswordResetBurstLimiter({
    windowMs: 60_000,
    maxRequests: 2
  });

  assert.equal(shouldThrottle(1_000), false);
  assert.equal(shouldThrottle(2_000), false);
  assert.equal(shouldThrottle(61_000), false);
  assert.equal(shouldThrottle(61_001), false);
});

test("throttled requests do not extend the burst window", () => {
  const shouldThrottle = createPasswordResetBurstLimiter({
    windowMs: 10_000,
    maxRequests: 1
  });

  assert.equal(shouldThrottle(1_000), false);
  assert.equal(shouldThrottle(5_000), true);
  assert.equal(shouldThrottle(11_000), false);
});

test("password reset burst limiter validates its configuration", () => {
  assert.throws(
    () => createPasswordResetBurstLimiter({ windowMs: 0 }),
    /windowMs must be a positive number/
  );
  assert.throws(
    () => createPasswordResetBurstLimiter({ maxRequests: 0 }),
    /maxRequests must be a positive integer/
  );
});
