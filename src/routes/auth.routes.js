import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { createHash, randomBytes } from "node:crypto";
import { body, validationResult } from "express-validator";
import User from "../models/User.js";
import {
  isPasswordResetEmailConfigured,
  sendPasswordResetEmail
} from "../services/password-reset-email.js";

const router = Router();
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;
const RESET_REQUEST_COOLDOWN_MS = 60 * 1000;

// Password policy: min 8, at least 1 upper, 1 lower, 1 digit, 1 special
const passwordRules = body("password")
  .isLength({ min: 8 }).withMessage("Password must be at least 8 characters.")
  .matches(/[a-z]/).withMessage("Password must include at least one lowercase letter.")
  .matches(/[A-Z]/).withMessage("Password must include at least one uppercase letter.")
  .matches(/\d/).withMessage("Password must include at least one number.")
  .matches(/[^A-Za-z0-9]/).withMessage("Password must include at least one special character.");

const emailRules = body("email")
  .isEmail().withMessage("Invalid email format.")
  .normalizeEmail();

function hashResetToken(token) {
  return createHash("sha256").update(String(token)).digest("hex");
}

function authTokenFor(user) {
  return jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// POST /api/auth/register
router.post(
  "/register",
  [
    body("name").isLength({ min: 2 }).withMessage("Name must be at least 2 chars."),
    emailRules,
    passwordRules
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: "Email already exists." });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash });

    const token = authTokenFor(user);
    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });
  }
);

// POST /api/auth/login
router.post(
  "/login",
  [emailRules, body("password").isLength({ min: 1 }).withMessage("Password is required.")],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Invalid credentials." });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials." });

    const token = authTokenFor(user);
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });
  }
);

// POST /api/auth/forgot-password
router.post(
  "/forgot-password",
  [emailRules],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    // This is a server-wide setting, so returning 503 here does not reveal
    // whether the submitted email belongs to an Adda Box account.
    if (!isPasswordResetEmailConfigured()) {
      return res.status(503).json({
        error: "Password reset email is not configured yet."
      });
    }

    const genericResponse = {
      message: "If an Adda Box account exists for that email, a reset link has been sent."
    };

    const { email } = req.body;

    const user = await User.findOne({ email }).select(
      "+passwordResetTokenHash +passwordResetExpiresAt +passwordResetRequestedAt"
    );

    if (!user) return res.json(genericResponse);

    const now = Date.now();
    const lastRequest = user.passwordResetRequestedAt?.getTime?.() || 0;

    // Return the same generic response during cooldown to avoid email spam
    // without exposing account existence.
    if (lastRequest && now - lastRequest < RESET_REQUEST_COOLDOWN_MS) {
      return res.json(genericResponse);
    }

    const rawToken = randomBytes(32).toString("hex");

    user.passwordResetTokenHash = hashResetToken(rawToken);
    user.passwordResetExpiresAt = new Date(now + RESET_TOKEN_TTL_MS);
    user.passwordResetRequestedAt = new Date(now);
    await user.save();

    try {
      await sendPasswordResetEmail({
        to: user.email,
        token: rawToken
      });
    } catch (err) {
      // Keep the outward response generic so provider failures do not become
      // an account-enumeration side channel.
      console.error("Password reset email delivery failed:", err.message);

      user.passwordResetTokenHash = null;
      user.passwordResetExpiresAt = null;
      await user.save();
    }

    return res.json(genericResponse);
  }
);

// POST /api/auth/reset-password
router.post(
  "/reset-password",
  [
    emailRules,
    body("token")
      .isString()
      .isLength({ min: 64, max: 64 })
      .matches(/^[a-f0-9]+$/i)
      .withMessage("Invalid reset token."),
    passwordRules
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, token, password } = req.body;
    const tokenHash = hashResetToken(token);

    const user = await User.findOne({
      email,
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() }
    }).select("+passwordResetTokenHash +passwordResetExpiresAt +passwordResetRequestedAt");

    if (!user) {
      return res.status(400).json({
        error: "This password reset link is invalid or has expired."
      });
    }

    user.passwordHash = await bcrypt.hash(password, 10);
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    user.passwordResetRequestedAt = null;
    user.passwordChangedAt = new Date();
    await user.save();

    return res.json({
      message: "Password changed successfully. You can now log in with your new password."
    });
  }
);

export default router;
