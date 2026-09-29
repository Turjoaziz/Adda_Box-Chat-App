import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import {
  canonicalKeyBinding,
  canonicalSignedMessage,
  fingerprintPublicJwk,
  isValidEncryptedMessagePayload,
  isValidSignedMessageMetadata,
  verifyEncryptionKeyBinding,
  verifySignedMessage
} from "../src/services/signatures.js";

const encoder = new TextEncoder();

async function signingFixture() {
  const pair = await webcrypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  );

  const publicJwk = await webcrypto.subtle.exportKey("jwk", pair.publicKey);
  return { pair, publicJwk };
}

async function signedFixture() {
  const { pair, publicJwk } = await signingFixture();

  const payload = {
    room: "general",
    body: "Signed hello",
    clientMessageId: "test_message_1234567890",
    signedAt: new Date().toISOString(),
    deviceId: "web_test_device_1234567890"
  };

  const signature = await webcrypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    pair.privateKey,
    encoder.encode(canonicalSignedMessage(payload))
  );

  return {
    publicJwk,
    payload: {
      ...payload,
      signature: Buffer.from(signature).toString("base64")
    }
  };
}

async function encryptedSignedFixture() {
  const { pair, publicJwk } = await signingFixture();

  const payload = {
    encryptionVersion: 1,
    room: "general",
    ciphertext: Buffer.from("ciphertext-placeholder").toString("base64"),
    iv: Buffer.alloc(12, 7).toString("base64"),
    keyEnvelopes: [
      {
        userId: "507f1f77bcf86cd799439011",
        deviceId: "web_recipient_device_123456",
        wrapIv: Buffer.alloc(12, 3).toString("base64"),
        wrappedKey: Buffer.alloc(48, 9).toString("base64")
      }
    ],
    clientMessageId: "encrypted_message_1234567890",
    signedAt: new Date().toISOString(),
    deviceId: "web_sender_device_1234567890"
  };

  const signature = await webcrypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    pair.privateKey,
    encoder.encode(canonicalSignedMessage(payload))
  );

  return {
    publicJwk,
    payload: {
      ...payload,
      signature: Buffer.from(signature).toString("base64")
    }
  };
}

test("valid signed legacy message verifies", async () => {
  const { publicJwk, payload } = await signedFixture();
  assert.equal(isValidSignedMessageMetadata(payload), true);
  assert.equal(await verifySignedMessage(publicJwk, payload), true);
});

test("editing a signed legacy message invalidates the signature", async () => {
  const { publicJwk, payload } = await signedFixture();
  assert.equal(
    await verifySignedMessage(publicJwk, { ...payload, body: "Tampered message" }),
    false
  );
});

test("encrypted message payload is structurally valid and signature verifies", async () => {
  const { publicJwk, payload } = await encryptedSignedFixture();

  assert.equal(isValidEncryptedMessagePayload(payload), true);
  assert.equal(isValidSignedMessageMetadata(payload), true);
  assert.equal(await verifySignedMessage(publicJwk, payload), true);
});

test("changing ciphertext invalidates the encrypted-message signature", async () => {
  const { publicJwk, payload } = await encryptedSignedFixture();

  assert.equal(
    await verifySignedMessage(publicJwk, {
      ...payload,
      ciphertext: Buffer.from("tampered-ciphertext").toString("base64")
    }),
    false
  );
});

test("changing a wrapped recipient key invalidates the encrypted-message signature", async () => {
  const { publicJwk, payload } = await encryptedSignedFixture();

  const tampered = {
    ...payload,
    keyEnvelopes: payload.keyEnvelopes.map((envelope, index) =>
      index === 0
        ? { ...envelope, wrappedKey: Buffer.alloc(48, 4).toString("base64") }
        : envelope
    )
  };

  assert.equal(await verifySignedMessage(publicJwk, tampered), false);
});

test("encryption public key must be signed by the device signing identity", async () => {
  const { pair: signingPair, publicJwk: signingPublicJwk } = await signingFixture();

  const encryptionPair = await webcrypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  const encryptionPublicJwk = await webcrypto.subtle.exportKey(
    "jwk",
    encryptionPair.publicKey
  );

  const binding = {
    userId: "507f1f77bcf86cd799439011",
    deviceId: "web_device_binding_123456",
    encryptionPublicJwk
  };

  const signature = await webcrypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    signingPair.privateKey,
    encoder.encode(canonicalKeyBinding(binding))
  );

  const encryptionKeySignature = Buffer.from(signature).toString("base64");

  assert.equal(
    await verifyEncryptionKeyBinding(signingPublicJwk, {
      ...binding,
      encryptionKeySignature
    }),
    true
  );

  assert.equal(
    await verifyEncryptionKeyBinding(signingPublicJwk, {
      ...binding,
      deviceId: "web_changed_device_123456",
      encryptionKeySignature
    }),
    false
  );
});

test("public-key fingerprints are stable and contain no private material", async () => {
  const { publicJwk } = await signedFixture();
  const first = fingerprintPublicJwk(publicJwk);
  const second = fingerprintPublicJwk({ ...publicJwk, key_ops: ["verify"] });

  assert.equal(first, second);
  assert.match(first, /^[a-f0-9]{64}$/);
});
