// Lightweight security headers that do not interfere with the current
// Tailwind CDN or Socket.IO setup.
function isSecureRequest(req) {
  if (req?.secure === true) return true;

  const forwarded =
    req?.get?.("x-forwarded-proto") ??
    req?.headers?.["x-forwarded-proto"] ??
    "";

  return String(forwarded)
    .split(",")[0]
    .trim()
    .toLowerCase() === "https";
}

export function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  // Render terminates TLS at its proxy, so forwarded-proto is checked as well
  // as Express's native secure flag. Do not send HSTS during local HTTP use.
  if (isSecureRequest(req)) {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
  }

  next();
}

// API responses can contain JWTs, private group data, device public-key
// metadata, password-reset responses, and chat history. Prevent browsers and
// shared intermediaries from retaining those responses.
export function noStore(req, res, next) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
  next();
}
