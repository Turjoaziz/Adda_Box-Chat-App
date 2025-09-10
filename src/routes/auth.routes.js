import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import User from "../models/User.js";

const router = Router();

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

    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "7d" });
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

    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });
  }
);

export default router;
