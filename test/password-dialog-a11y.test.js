import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");

test("password dialogs expose useful descriptions to assistive technology", () => {
  assert.match(
    html,
    /id="forgotPasswordModal"[^>]*aria-describedby="forgotPasswordCopy"/
  );
  assert.match(
    html,
    /id="forgotPasswordCopy"[^>]*>Enter your Adda Box email\./
  );
  assert.match(
    html,
    /id="resetPasswordModal"[^>]*aria-describedby="resetPasswordRequirements"/
  );
  assert.match(
    html,
    /id="resetPasswordRequirements"[^>]*>Use 8\+ characters/
  );
});

test("new and confirmation password fields reference the real requirements", () => {
  assert.match(
    html,
    /id="resetPasswordNew"[^>]*aria-describedby="resetPasswordRequirements"/
  );
  assert.match(
    html,
    /id="resetPasswordConfirm"[^>]*aria-describedby="resetPasswordRequirements"/
  );
  assert.doesNotMatch(
    html,
    /id="resetPasswordNew"[^>]*aria-describedby="resetPasswordTitle"/
  );
});

test("decorative password-dialog icons are hidden from screen readers", () => {
  assert.match(
    html,
    /class="password-modal-icon" aria-hidden="true">\?/
  );
  assert.match(
    html,
    /class="password-modal-icon" aria-hidden="true">↻/
  );
});
