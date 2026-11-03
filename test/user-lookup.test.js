import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_USER_LOOKUP_IDS,
  normalizeUserLookupIds
} from "../src/services/user-lookup.js";

const ID_A = "507f1f77bcf86cd799439011";
const ID_B = "507f191e810c19729de860ea";

test("user lookup accepts valid MongoDB ObjectIds", () => {
  assert.deepEqual(
    normalizeUserLookupIds([ID_A, ID_B]),
    { ids: [ID_A, ID_B] }
  );
});

test("user lookup trims, normalizes, and deduplicates IDs", () => {
  assert.deepEqual(
    normalizeUserLookupIds([
      `  ${ID_A.toUpperCase()}  `,
      ID_A,
      ID_B
    ]),
    { ids: [ID_A, ID_B] }
  );
});

test("user lookup rejects malformed or non-string IDs", () => {
  for (const value of [
    ["not-an-object-id"],
    ["507f1f77bcf86cd79943901"],
    [123],
    [null],
    [{}]
  ]) {
    const result = normalizeUserLookupIds(value);
    assert.equal(result.ids.length, 0);
    assert.match(result.error, /valid MongoDB ObjectIds/);
  }
});

test("user lookup caps the number of requested IDs", () => {
  const tooMany = Array.from(
    { length: MAX_USER_LOOKUP_IDS + 1 },
    (_, index) => index.toString(16).padStart(24, "0")
  );

  const result = normalizeUserLookupIds(tooMany);

  assert.equal(result.ids.length, 0);
  assert.match(result.error, new RegExp(String(MAX_USER_LOOKUP_IDS)));
});

test("missing or empty ID lists preserve the empty-result behavior", () => {
  assert.deepEqual(normalizeUserLookupIds(undefined), { ids: [] });
  assert.deepEqual(normalizeUserLookupIds(null), { ids: [] });
  assert.deepEqual(normalizeUserLookupIds([]), { ids: [] });
});
