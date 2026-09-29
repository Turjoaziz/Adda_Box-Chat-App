import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import {
  canonicalSignedMessage,
  fingerprintPublicJwk,
  isValidSignedMessageMetadata,
  verifySignedMessage
} from "../src/services/signatures.js";

const encoder = new TextEncoder();

async function signedFixture() {
  const pair = await webcrypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  );

  const publicJwk = await webcrypto.subtle.exportKey("jwk", pair.publicKey);
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

test("valid signed message verifies", async () => {
  const { publicJwk, payload } = await signedFixture();
  assert.equal(isValidSignedMessageMetadata(payload), true);
  assert.equal(await verifySignedMessage(publicJwk, payload), true);
});

test("editing a signed message invalidates the signature", async () => {
  const { publicJwk, payload } = await signedFixture();
  assert.equal(
    await verifySignedMessage(publicJwk, { ...payload, body: "Tampered message" }),
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
