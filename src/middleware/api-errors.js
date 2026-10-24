export function apiNotFound(req, res) {
  return res.status(404).json({
    error: "API route not found."
  });
}

export function apiErrorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  // express.json() labels malformed request bodies as entity.parse.failed.
  // Treat bad client JSON as a 400 instead of reporting a server failure.
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({
      error: "Invalid JSON body."
    });
  }

  // Express/body-parser rejects JSON above its configured request limit with
  // entity.too.large. Keep this a client error and do not expose parser details.
  if (err?.type === "entity.too.large") {
    return res.status(413).json({
      error: "Request body is too large."
    });
  }

  console.error("Unhandled API error:", err?.message || "Unknown error");

  return res.status(500).json({
    error: "Internal server error."
  });
}
