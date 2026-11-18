import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const serverSource = readFileSync(
  new URL("../src/server.js", import.meta.url),
  "utf8"
);

test("health endpoint disables caching before reporting readiness", () => {
  assert.match(
    serverSource,
    /app\.get\("\/healthz",\s*noStore,\s*\(req, res\) => \{/
  );
});

test("health endpoint still reports database readiness", () => {
  assert.match(
    serverSource,
    /if \(!isDatabaseReady\(\)\) \{[\s\S]*?res\.status\(503\)\.json\(\{ ok: false \}\)[\s\S]*?res\.json\(\{ ok: true \}\)/
  );
});
