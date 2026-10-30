import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createPasswordResetCooldown } from "../src/services/password-reset-cooldown.js";

const TEST_SECRET = "test-only-password-reset-cooldown-secret";

test("password reset cooldown blocks repeated requests inside the window", () => {
  const shouldThrottle = createPasswordResetCooldown({
    cooldownMs: 60_000,
    secret: TEST_SECRET
  });

  assert.equal(shouldThrottle("person@example.com", 1_000), false);
  assert.equal(shouldThrottle("person@example.com", 30_000), true);
  assert.equal(shouldThrottle("person@example.com", 61_000), false);
});

test("password reset cooldown normalizes email case and whitespace", () => {
  const shouldThrottle = createPasswordResetCooldown({
    cooldownMs: 60_000,
    secret: TEST_SECRET
  });

  assert.equal(shouldThrottle(" Person@Example.com ", 1_000), false);
  assert.equal(shouldThrottle("person@example.com", 2_000), true);
});

test("password reset cooldown keeps different emails independent", () => {
  const shouldThrottle = createPasswordResetCooldown({
    cooldownMs: 60_000,
    secret: TEST_SECRET
  });

  assert.equal(shouldThrottle("one@example.com", 1_000), false);
  assert.equal(shouldThrottle("two@example.com", 2_000), false);
  assert.equal(shouldThrottle("one@example.com", 3_000), true);
});

test("password reset cooldown stays bounded under many unique emails", () => {
  const shouldThrottle = createPasswordResetCooldown({
    cooldownMs: 60_000,
    maxEntries: 2,
    secret: TEST_SECRET
  });

  assert.equal(shouldThrottle("one@example.com", 1_000), false);
  assert.equal(shouldThrottle("two@example.com", 2_000), false);
  assert.equal(shouldThrottle("three@example.com", 3_000), false);

  // The oldest entry is evicted once the bounded cache is full.
  assert.equal(shouldThrottle("one@example.com", 4_000), false);
});

test("password reset cooldown uses a keyed digest instead of plain email hashing", () => {
  const source = readFileSync(
    new URL("../src/services/password-reset-cooldown.js", import.meta.url),
    "utf8"
  );

  assert.match(source, /createHmac\("sha256", secret\)/);
  assert.doesNotMatch(source, /createHash\("sha256"\)/);
});

test("different cooldown secrets still preserve independent request tracking", () => {
  const first = createPasswordResetCooldown({
    cooldownMs: 60_000,
    secret: "secret-one"
  });
  const second = createPasswordResetCooldown({
    cooldownMs: 60_000,
    secret: "secret-two"
  });

  assert.equal(first("person@example.com", 1_000), false);
  assert.equal(first("person@example.com", 2_000), true);

  assert.equal(second("person@example.com", 2_000), false);
  assert.equal(second("person@example.com", 3_000), true);
});
