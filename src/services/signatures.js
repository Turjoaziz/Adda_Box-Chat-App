import { createHash, webcrypto } from "node:crypto";

const { subtle } = webcrypto;
const encoder = new TextEncoder();

export const MAX_KEY_ENVELOPES = 200;

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

export function isValidEcPublicJwk(jwk) {
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

export const isValidSigningPublicJwk = isValidEcPublicJwk;
export const isValidEncryptionPublicJwk = isValidEcPublicJwk;

export function canonicalKeyBinding({
  userId,
  deviceId,
  encryptionPublicJwk
}) {
  return JSON.stringify({
    userId: String(userId || ""),
    deviceId: String(deviceId || ""),
    encryptionPublicJwk: canonicalPublicJwk(encryptionPublicJwk)
  });
}

export async function verifyEncryptionKeyBinding(
  signingPublicJwk,
  {
    userId,
    deviceId,
    encryptionPublicJwk,
    encryptionKeySignature
  }
) {
  if (!isValidSigningPublicJwk(signingPublicJwk)) return false;
  if (!isValidEncryptionPublicJwk(encryptionPublicJwk)) return false;
  if (
    typeof encryptionKeySignature !== "string" ||
    encryptionKeySignature.length < 40 ||
    encryptionKeySignature.length > 1000
  ) {
    return false;
  }

  try {
    const key = await subtle.importKey(
      "jwk",
      signingPublicJwk,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"]
    );

    return subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      Buffer.from(encryptionKeySignature, "base64"),
      encoder.encode(
        canonicalKeyBinding({
          userId,
          deviceId,
          encryptionPublicJwk
        })
      )
    );
  } catch {
    return false;
  }
}

function canonicalEnvelope(envelope = {}) {
  return {
    userId: String(envelope.userId || ""),
    deviceId: String(envelope.deviceId || ""),
    wrapIv: String(envelope.wrapIv || ""),
    wrappedKey: String(envelope.wrappedKey || "")
  };
}

export function canonicalSignedMessage(payload = {}) {
  if (Number(payload.encryptionVersion) === 1) {
    const keyEnvelopes = Array.isArray(payload.keyEnvelopes)
      ? payload.keyEnvelopes
          .map(canonicalEnvelope)
          .sort((a, b) =>
            (a.userId + ":" + a.deviceId).localeCompare(b.userId + ":" + b.deviceId)
          )
      : [];

    return JSON.stringify({
      encryptionVersion: 1,
      room: String(payload.room || ""),
      ciphertext: String(payload.ciphertext || ""),
      iv: String(payload.iv || ""),
      keyEnvelopes,
      clientMessageId: String(payload.clientMessageId || ""),
      signedAt: String(payload.signedAt || ""),
      deviceId: String(payload.deviceId || "")
    });
  }

  return JSON.stringify({
    room: String(payload.room || ""),
    body: String(payload.body || ""),
    clientMessageId: String(payload.clientMessageId || ""),
    signedAt: String(payload.signedAt || ""),
    deviceId: String(payload.deviceId || "")
  });
}

export function isValidSignedMessageMetadata(payload = {}) {
  if (
    typeof payload.deviceId !== "string" ||
    payload.deviceId.length < 16 ||
    payload.deviceId.length > 100
  ) {
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

export function isValidEncryptedMessagePayload(payload = {}) {
  if (Number(payload.encryptionVersion) !== 1) return false;

  if (
    typeof payload.ciphertext !== "string" ||
    payload.ciphertext.length < 16 ||
    payload.ciphertext.length > 12000
  ) {
    return false;
  }

  if (
    typeof payload.iv !== "string" ||
    payload.iv.length < 12 ||
    payload.iv.length > 64
  ) {
    return false;
  }

  if (
    !Array.isArray(payload.keyEnvelopes) ||
    payload.keyEnvelopes.length < 1 ||
    payload.keyEnvelopes.length > MAX_KEY_ENVELOPES
  ) {
    return false;
  }

  const seen = new Set();

  for (const envelope of payload.keyEnvelopes) {
    if (
      !envelope ||
      typeof envelope.userId !== "string" ||
      !/^[a-f0-9]{24}$/i.test(envelope.userId) ||
      typeof envelope.deviceId !== "string" ||
      envelope.deviceId.length < 16 ||
      envelope.deviceId.length > 100 ||
      typeof envelope.wrapIv !== "string" ||
      envelope.wrapIv.length < 12 ||
      envelope.wrapIv.length > 64 ||
      typeof envelope.wrappedKey !== "string" ||
      envelope.wrappedKey.length < 16 ||
      envelope.wrappedKey.length > 1000
    ) {
      return false;
    }

    const key = envelope.userId + ":" + envelope.deviceId;
    if (seen.has(key)) return false;
    seen.add(key);
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
