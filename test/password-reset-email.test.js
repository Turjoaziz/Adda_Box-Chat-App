import test from "node:test";
import assert from "node:assert/strict";
import {
  passwordResetBaseUrl,
  passwordResetEmailProvider,
  isPasswordResetEmailConfigured
} from "../src/services/password-reset-email.js";

const ENV_KEYS = [
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",
  "RESEND_API_KEY",
  "RESET_EMAIL_FROM",
  "PASSWORD_RESET_BASE_URL",
  "CORS_ORIGIN"
];

function withEnv(values, fn) {
  const prior = Object.fromEntries(ENV_KEYS.map(key => [key, process.env[key]]));

  for (const key of ENV_KEYS) delete process.env[key];

  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) process.env[key] = value;
  }

  try {
    return fn();
  } finally {
    for (const key of ENV_KEYS) {
      if (prior[key] === undefined) delete process.env[key];
      else process.env[key] = prior[key];
    }
  }
}

test("gmail smtp is preferred when gmail and resend are both configured", () => {
  withEnv(
    {
      SMTP_USER: "sender@example.com",
      SMTP_PASS: "abcd efgh ijkl mnop",
      PASSWORD_RESET_BASE_URL: "https://example.com/",
      RESEND_API_KEY: "re_test",
      RESET_EMAIL_FROM: "Adda Box <no-reply@example.com>"
    },
    () => {
      assert.equal(passwordResetEmailProvider(), "gmail-smtp");
      assert.equal(isPasswordResetEmailConfigured(), true);
      assert.equal(passwordResetBaseUrl(), "https://example.com");
    }
  );
});

test("resend remains available as a fallback provider", () => {
  withEnv(
    {
      RESEND_API_KEY: "re_test",
      RESET_EMAIL_FROM: "Adda Box <no-reply@example.com>",
      PASSWORD_RESET_BASE_URL: "https://example.com"
    },
    () => {
      assert.equal(passwordResetEmailProvider(), "resend");
      assert.equal(isPasswordResetEmailConfigured(), true);
    }
  );
});

test("email reset is unconfigured when no delivery credentials exist", () => {
  withEnv(
    { PASSWORD_RESET_BASE_URL: "https://example.com" },
    () => {
      assert.equal(passwordResetEmailProvider(), null);
      assert.equal(isPasswordResetEmailConfigured(), false);
    }
  );
});

test("cors origin is used as the reset base url when no explicit url exists", () => {
  withEnv(
    {
      SMTP_USER: "sender@example.com",
      SMTP_PASS: "abcdefghijklmnop",
      CORS_ORIGIN: "https://chat.example.com, https://other.example.com"
    },
    () => {
      assert.equal(passwordResetBaseUrl(), "https://chat.example.com");
      assert.equal(passwordResetEmailProvider(), "gmail-smtp");
    }
  );
});
