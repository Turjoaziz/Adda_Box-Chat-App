export function apiNotFound(req, res) {
  return res.status(404).json({
    error: "API route not found."
  });
}

export function apiErrorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  console.error("Unhandled API error:", err?.message || "Unknown error");

  return res.status(500).json({
    error: "Internal server error."
  });
}
