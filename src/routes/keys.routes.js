import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import DeviceKey from "../models/DeviceKey.js";
import {
  fingerprintPublicJwk,
  isValidSigningPublicJwk,
  isValidEncryptionPublicJwk,
  verifyEncryptionKeyBinding
} from "../services/signatures.js";

const router = Router();

function cleanDeviceId(value) {
  if (typeof value !== "string") return null;
  const deviceId = value.trim();
  if (!/^[A-Za-z0-9_-]{16,100}$/.test(deviceId)) return null;
  return deviceId;
}

function publicKeyBundle(key) {
  return {
    userId: String(key.user),
    deviceId: key.deviceId,
    signingPublicJwk: key.signingPublicJwk,
    signingFingerprint: key.fingerprint,
    encryptionPublicJwk: key.encryptionPublicJwk,
    encryptionFingerprint: key.encryptionFingerprint,
    encryptionKeySignature: key.encryptionKeySignature,
    createdAt: key.createdAt
  };
}

router.post("/register", requireAuth, async (req, res) => {
  const deviceId = cleanDeviceId(req.body?.deviceId);
  const signingPublicJwk = req.body?.signingPublicJwk;
  const encryptionPublicJwk = req.body?.encryptionPublicJwk;
  const encryptionKeySignature = req.body?.encryptionKeySignature;
  const label = typeof req.body?.label === "string"
    ? req.body.label.trim().slice(0, 80)
    : "Browser";

  if (
    !deviceId ||
    !isValidSigningPublicJwk(signingPublicJwk) ||
    !isValidEncryptionPublicJwk(encryptionPublicJwk)
  ) {
    return res.status(400).json({ error: "Invalid device cryptographic identity." });
  }

  const bindingOk = await verifyEncryptionKeyBinding(signingPublicJwk, {
    userId: req.user.id,
    deviceId,
    encryptionPublicJwk,
    encryptionKeySignature
  });

  if (!bindingOk) {
    return res.status(400).json({
      error: "Encryption key binding signature is invalid."
    });
  }

  const fingerprint = fingerprintPublicJwk(signingPublicJwk);
  const encryptionFingerprint = fingerprintPublicJwk(encryptionPublicJwk);

  const existing = await DeviceKey.findOne({
    user: req.user.id,
    deviceId
  });

  if (existing) {
    if (existing.fingerprint !== fingerprint || existing.revokedAt) {
      return res.status(409).json({
        error: "This device ID is already registered with a different or revoked signing key."
      });
    }

    if (
      existing.encryptionFingerprint &&
      existing.encryptionFingerprint !== encryptionFingerprint
    ) {
      return res.status(409).json({
        error: "This device ID is already registered with a different encryption key."
      });
    }

    existing.encryptionPublicJwk = encryptionPublicJwk;
    existing.encryptionFingerprint = encryptionFingerprint;
    existing.encryptionKeySignature = encryptionKeySignature;
    existing.label = label || existing.label || "Browser";
    await existing.save();

    return res.json(publicKeyBundle(existing));
  }

  const key = await DeviceKey.create({
    user: req.user.id,
    deviceId,
    signingPublicJwk,
    fingerprint,
    encryptionPublicJwk,
    encryptionFingerprint,
    encryptionKeySignature,
    label: label || "Browser"
  });

  return res.status(201).json(publicKeyBundle(key));
});

router.get("/:userId/:deviceId", requireAuth, async (req, res) => {
  const deviceId = cleanDeviceId(req.params.deviceId);
  if (!deviceId) return res.status(400).json({ error: "Invalid device ID." });

  const key = await DeviceKey.findOne({
    user: req.params.userId,
    deviceId,
    revokedAt: null
  }).lean();

  if (!key) return res.status(404).json({ error: "Device key not found." });

  if (!key.encryptionPublicJwk || !key.encryptionKeySignature) {
    return res.status(409).json({
      error: "This device has not registered an encryption key yet."
    });
  }

  return res.json(publicKeyBundle(key));
});

export default router;
