import { createHash, webcrypto } from "node:crypto";

const { subtle } = webcrypto;
const encoder = new TextEncoder();

export function canonicalPublicJwk(jwk = {}) {
  return JSON.stringify({
    kty: jwk.kty,
    crv: jwk.crv,
    x: jwk.x,
    y: jwk.y
  });
}

export function fingerprintPublicJwk(jwk) {
  return createHash("sha256")
    .update(canonicalPublicJwk(jwk))
    .digest("hex");
}

export function isValidSigningPublicJwk(jwk) {
  return Boolean(
    jwk &&
    typeof jwk === "object" &&
    jwk.kty === "EC" &&
    jwk.crv === "P-256" &&
    typeof jwk.x === "string" &&
    typeof jwk.y === "string" &&
    !jwk.d
  );
}

export function canonicalSignedMessage({
  room,
  body,
  clientMessageId,
  signedAt,
  deviceId
}) {
  return JSON.stringify({
    room: String(room || ""),
    body: String(body || ""),
    clientMessageId: String(clientMessageId || ""),
    signedAt: String(signedAt || ""),
    deviceId: String(deviceId || "")
  });
}

export function isValidSignedMessageMetadata(payload = {}) {
  if (typeof payload.deviceId !== "string" || payload.deviceId.length < 16 || payload.deviceId.length > 100) {
    return false;
  }

  if (
    typeof payload.clientMessageId !== "string" ||
    payload.clientMessageId.length < 16 ||
    payload.clientMessageId.length > 100
  ) {
    return false;
  }

  if (typeof payload.signedAt !== "string") return false;
  const signedAt = new Date(payload.signedAt);
  if (Number.isNaN(signedAt.getTime())) return false;

  const clockDifference = Math.abs(Date.now() - signedAt.getTime());
  if (clockDifference > 10 * 60 * 1000) return false;

  if (
    typeof payload.signature !== "string" ||
    payload.signature.length < 40 ||
    payload.signature.length > 1000
  ) {
    return false;
  }

  return true;
}

export async function verifySignedMessage(publicJwk, payload) {
  if (!isValidSigningPublicJwk(publicJwk)) return false;

  try {
    const key = await subtle.importKey(
      "jwk",
      publicJwk,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"]
    );

    const signature = Buffer.from(payload.signature, "base64");
    const canonical = canonicalSignedMessage(payload);

    return subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      signature,
      encoder.encode(canonical)
    );
  } catch {
    return false;
  }
}
