import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import DeviceKey from "../models/DeviceKey.js";
import {
  fingerprintPublicJwk,
  isValidSigningPublicJwk
} from "../services/signatures.js";

const router = Router();

function cleanDeviceId(value) {
  if (typeof value !== "string") return null;
  const deviceId = value.trim();
  if (!/^[A-Za-z0-9_-]{16,100}$/.test(deviceId)) return null;
  return deviceId;
}

router.post("/register", requireAuth, async (req, res) => {
  const deviceId = cleanDeviceId(req.body?.deviceId);
  const signingPublicJwk = req.body?.signingPublicJwk;
  const label = typeof req.body?.label === "string"
    ? req.body.label.trim().slice(0, 80)
    : "Browser";

  if (!deviceId || !isValidSigningPublicJwk(signingPublicJwk)) {
    return res.status(400).json({ error: "Invalid signing identity." });
  }

  const fingerprint = fingerprintPublicJwk(signingPublicJwk);

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

    return res.json({
      deviceId: existing.deviceId,
      fingerprint: existing.fingerprint,
      registeredAt: existing.createdAt
    });
  }

  const key = await DeviceKey.create({
    user: req.user.id,
    deviceId,
    signingPublicJwk,
    fingerprint,
    label: label || "Browser"
  });

  return res.status(201).json({
    deviceId: key.deviceId,
    fingerprint: key.fingerprint,
    registeredAt: key.createdAt
  });
});

router.get("/:userId/:deviceId", requireAuth, async (req, res) => {
  const deviceId = cleanDeviceId(req.params.deviceId);
  if (!deviceId) return res.status(400).json({ error: "Invalid device ID." });

  const key = await DeviceKey.findOne({
    user: req.params.userId,
    deviceId,
    revokedAt: null
  }).lean();

  if (!key) return res.status(404).json({ error: "Signing key not found." });

  return res.json({
    userId: String(key.user),
    deviceId: key.deviceId,
    signingPublicJwk: key.signingPublicJwk,
    fingerprint: key.fingerprint,
    createdAt: key.createdAt
  });
});

export default router;
