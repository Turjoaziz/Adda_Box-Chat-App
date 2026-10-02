import nodemailer from "nodemailer";

let smtpTransport = null;
let smtpTransportKey = "";

export function passwordResetBaseUrl() {
  const explicit = process.env.PASSWORD_RESET_BASE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const firstOrigin = (process.env.CORS_ORIGIN || "")
    .split(",")
    .map(value => value.trim())
    .find(Boolean);

  return firstOrigin ? firstOrigin.replace(/\/$/, "") : "";
}

function smtpUser() {
  return process.env.SMTP_USER?.trim() || "";
}

function smtpPassword() {
  // Google displays app passwords in groups; tolerate users pasting spaces.
  return (process.env.SMTP_PASS || "").replace(/\s+/g, "");
}

function smtpConfigured() {
  return Boolean(smtpUser() && smtpPassword() && passwordResetBaseUrl());
}

function resendConfigured() {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() &&
    process.env.RESET_EMAIL_FROM?.trim() &&
    passwordResetBaseUrl()
  );
}

export function passwordResetEmailProvider() {
  if (smtpConfigured()) return "gmail-smtp";
  if (resendConfigured()) return "resend";
  return null;
}

export function isPasswordResetEmailConfigured() {
  return Boolean(passwordResetEmailProvider());
}

function passwordResetUrl({ to, token }) {
  return (
    passwordResetBaseUrl() +
    "/?resetToken=" + encodeURIComponent(token) +
    "&resetEmail=" + encodeURIComponent(to)
  );
}

function passwordResetHtml(resetUrl) {
  return (
    '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#20222c">' +
    '<h2 style="margin-bottom:8px">Reset your Adda Box password</h2>' +
    '<p style="line-height:1.6">We received a request to reset your password. This link expires in 15 minutes and can only be used once.</p>' +
    '<p style="margin:28px 0"><a href="' + resetUrl + '" style="background:#7c2df4;color:white;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">Reset password</a></p>' +
    '<p style="font-size:13px;color:#777b88;line-height:1.5">If you did not request this, you can ignore this email. Your password will remain unchanged.</p>' +
    '</div>'
  );
}

function getSmtpTransport() {
  const user = smtpUser();
  const pass = smtpPassword();
  const key = user + ":" + pass;

  if (!smtpTransport || smtpTransportKey !== key) {
    smtpTransport = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass }
    });
    smtpTransportKey = key;
  }

  return smtpTransport;
}

async function sendWithGmail({ to, resetUrl }) {
  const user = smtpUser();
  const from =
    process.env.SMTP_FROM?.trim() ||
    `Adda Box <${user}>`;

  await getSmtpTransport().sendMail({
    from,
    to,
    subject: "Reset your Adda Box password",
    html: passwordResetHtml(resetUrl)
  });
}

async function sendWithResend({ to, resetUrl }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + process.env.RESEND_API_KEY.trim(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: process.env.RESET_EMAIL_FROM.trim(),
      to: [to],
      subject: "Reset your Adda Box password",
      html: passwordResetHtml(resetUrl)
    })
  });

  if (!response.ok) {
    let detail = "";
    try {
      const data = await response.json();
      detail = data?.message || data?.error || "";
    } catch {}

    throw new Error(
      detail
        ? "Reset email could not be sent: " + detail
        : "Reset email could not be sent."
    );
  }
}

export async function sendPasswordResetEmail({ to, token }) {
  const provider = passwordResetEmailProvider();

  if (!provider) {
    throw new Error("Password reset email is not configured.");
  }

  const resetUrl = passwordResetUrl({ to, token });

  if (provider === "gmail-smtp") {
    await sendWithGmail({ to, resetUrl });
    return;
  }

  await sendWithResend({ to, resetUrl });
}
