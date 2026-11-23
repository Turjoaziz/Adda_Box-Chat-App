export function parseCorsOrigins(value) {
  if (typeof value !== "string") return [];

  return value
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);
}

export function isCorsOriginAllowed(origin, allowedOrigins = []) {
  // Requests without an Origin header are non-browser/same-origin style
  // requests such as curl, health probes, and some server-to-server clients.
  if (!origin) return true;

  return allowedOrigins.includes(origin);
}
