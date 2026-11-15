import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(
  new URL("../public/index.html", import.meta.url),
  "utf8"
);

function extractFunction(name) {
  const pattern = new RegExp(
    `function ${name}\\(\\)\\{([\\s\\S]*?)\\n    \\}`
  );
  const match = html.match(pattern);

  assert.ok(match, `${name} should exist in public/index.html`);
  return `function ${name}(){${match[1]}\\n    }`;
}

test("reset URL scrubber removes query credentials but preserves path and hash", () => {
  const source = extractFunction("clearSensitiveResetUrl");
  const calls = [];

  const windowMock = {
    location: {
      pathname: "/reset",
      search: "?resetToken=secret-token&resetEmail=person%40example.com",
      hash: "#chat"
    },
    history: {
      replaceState(state, title, url) {
        calls.push({ state, title, url });
      }
    }
  };
  const documentMock = { title: "Adda Box" };

  new Function(
    "window",
    "document",
    `${source}; clearSensitiveResetUrl();`
  )(windowMock, documentMock);

  assert.deepEqual(calls, [
    {
      state: {},
      title: "Adda Box",
      url: "/reset#chat"
    }
  ]);
  assert.doesNotMatch(calls[0].url, /resetToken|resetEmail|secret-token/);
});

test("reset URL scrubber safely does nothing when history replacement is unavailable", () => {
  const source = extractFunction("clearSensitiveResetUrl");

  assert.doesNotThrow(() => {
    new Function(
      "window",
      "document",
      `${source}; clearSensitiveResetUrl();`
    )(
      { location: { pathname: "/", search: "?resetToken=secret", hash: "" } },
      { title: "Adda Box" }
    );
  });
});

test("reset-link credentials are scrubbed immediately after opening the reset dialog", () => {
  assert.match(
    html,
    /if\(resetToken && resetEmail\)\{[\s\S]*?openResetPassword\(resetToken,resetEmail\);[\s\S]*?clearSensitiveResetUrl\(\);[\s\S]*?\}/
  );
});
