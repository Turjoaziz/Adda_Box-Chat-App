import test from "node:test";
import assert from "node:assert/strict";
import { tokenPredatesPasswordChange } from "../src/services/auth-token.js";

test("tokens remain valid when the password has never changed", () => {
  assert.equal(
    tokenPredatesPasswordChange({ iat: 1_000 }, { passwordChangedAt: null }),
    false
  );
});

test("tokens without an issued-at time are rejected after a password change", () => {
  assert.equal(
    tokenPredatesPasswordChange({}, { passwordChangedAt: new Date(2_000_000) }),
    true
  );
});

test("tokens clearly issued before a password change are rejected", () => {
  assert.equal(
    tokenPredatesPasswordChange(
      { iat: 1_000 },
      { passwordChangedAt: new Date(1_001_001) }
    ),
    true
  );
});

test("one-second JWT precision tolerance is preserved at the reset boundary", () => {
  assert.equal(
    tokenPredatesPasswordChange(
      { iat: 1_000 },
      { passwordChangedAt: new Date(1_001_000) }
    ),
    false
  );
});

test("tokens issued after the password change remain valid", () => {
  assert.equal(
    tokenPredatesPasswordChange(
      { iat: 1_002 },
      { passwordChangedAt: new Date(1_001_500) }
    ),
    false
  );
});
