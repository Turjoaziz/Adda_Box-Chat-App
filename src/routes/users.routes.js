// src/routes/users.routes.js
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import User from "../models/User.js";

const router = Router();

// POST /api/users/lookup  body: { ids: [ "<userId>", ... ] }
router.post("/lookup", requireAuth, async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.json([]);
  const users = await User.find({ _id: { $in: ids } }, "name isOnline").lean();
  res.json(users);
});

export default router;
