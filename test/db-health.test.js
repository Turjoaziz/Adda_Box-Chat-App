import test from "node:test";
import assert from "node:assert/strict";
import { isDatabaseReady } from "../src/config/db.js";

test("database health reports ready only for a connected mongoose state", () => {
  assert.equal(isDatabaseReady({ readyState: 1 }), true);

  for (const readyState of [0, 2, 3, 99, undefined]) {
    assert.equal(isDatabaseReady({ readyState }), false);
  }
});

test("database health safely handles a missing connection object", () => {
  assert.equal(isDatabaseReady(null), false);
  assert.equal(isDatabaseReady(undefined), false);
});
