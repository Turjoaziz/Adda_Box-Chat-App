export function extractBearerToken(value) {
  if (typeof value !== "string") return null;

  const match = /^Bearer ([^\s]+)$/i.exec(value);
  if (!match) return null;

  const token = match[1];
  if (token === "null" || token === "undefined") return null;

  return token;
}
