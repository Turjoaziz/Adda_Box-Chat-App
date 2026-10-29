import test from "node:test";
import assert from "node:assert/strict";
import { createPasswordResetCooldown } from "../src/services/password-reset-cooldown.js";

test("password reset cooldown blocks repeated requests inside the window", () => {
  const shouldThrottle = createPasswordResetCooldown({ cooldownMs: 60_000 });

  assert.equal(shouldThrottle("person@example.com", 1_000), false);
  assert.equal(shouldThrottle("person@example.com", 30_000), true);
  assert.equal(shouldThrottle("person@example.com", 61_000), false);
});

test("password reset cooldown normalizes email case and whitespace", () => {
  const shouldThrottle = createPasswordResetCooldown({ cooldownMs: 60_000 });

  assert.equal(shouldThrottle(" Person@Example.com ", 1_000), false);
  assert.equal(shouldThrottle("person@example.com", 2_000), true);
});

test("password reset cooldown keeps different emails independent", () => {
  const shouldThrottle = createPasswordResetCooldown({ cooldownMs: 60_000 });

  assert.equal(shouldThrottle("one@example.com", 1_000), false);
  assert.equal(shouldThrottle("two@example.com", 2_000), false);
  assert.equal(shouldThrottle("one@example.com", 3_000), true);
});

test("password reset cooldown stays bounded under many unique emails", () => {
  const shouldThrottle = createPasswordResetCooldown({
    cooldownMs: 60_000,
    maxEntries: 2
  });

  assert.equal(shouldThrottle("one@example.com", 1_000), false);
  assert.equal(shouldThrottle("two@example.com", 2_000), false);
  assert.equal(shouldThrottle("three@example.com", 3_000), false);

  // The oldest entry is evicted once the bounded cache is full.
  assert.equal(shouldThrottle("one@example.com", 4_000), false);
});
