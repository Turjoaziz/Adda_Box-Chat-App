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

test("password reset burst limiter expires requests individually across the sliding window", () => {
  const shouldThrottle = createPasswordResetBurstLimiter({
    windowMs: 60_000,
    maxRequests: 2
  });

  assert.equal(shouldThrottle(1_000), false);
  assert.equal(shouldThrottle(2_000), false);

  // At 61s the first request has expired, so one new request is allowed.
  assert.equal(shouldThrottle(61_000), false);

  // The second original request is still inside the window until 62s.
  assert.equal(shouldThrottle(61_001), true);
  assert.equal(shouldThrottle(62_000), false);
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
