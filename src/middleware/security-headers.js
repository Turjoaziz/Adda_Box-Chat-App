// Lightweight security headers that do not interfere with the current
// Tailwind CDN or Socket.IO setup.
export function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
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
