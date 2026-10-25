const JSON_BODY_METHODS = new Set(["POST", "PUT", "PATCH"]);

function isJsonMediaType(value) {
  const mediaType = String(value || "")
    .split(";")[0]
    .trim()
    .toLowerCase();

  return (
    mediaType === "application/json" ||
    (mediaType.startsWith("application/") && mediaType.endsWith("+json"))
  );
}

export function requireJsonBody(req, res, next) {
  const method = String(req?.method || "").toUpperCase();

  if (!JSON_BODY_METHODS.has(method)) {
    return next();
  }

  const contentType = req?.headers?.["content-type"] || req?.get?.("content-type");

  if (!isJsonMediaType(contentType)) {
    return res.status(415).json({
      error: "Content-Type must be application/json."
    });
  }

  return next();
}
