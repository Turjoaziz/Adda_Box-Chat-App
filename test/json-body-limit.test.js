import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const serverSource = readFileSync(
  new URL("../src/server.js", import.meta.url),
  "utf8"
);

const errorSource = readFileSync(
  new URL("../src/middleware/api-errors.js", import.meta.url),
  "utf8"
);

test("API JSON parsing uses an explicit 32 KB request limit", () => {
  assert.match(
    serverSource,
    /app\.use\(express\.json\(\{ limit: "32kb" \}\)\);/
  );
});

test("oversized JSON still maps to the generic 413 response", () => {
  assert.match(errorSource, /err\?\.type === "entity\.too\.large"/);
  assert.match(errorSource, /res\.status\(413\)\.json\(\{/);
  assert.match(errorSource, /error: "Request body is too large\."/);
});
