// src/routes/users.routes.js
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import User from "../models/User.js";
import { normalizeUserLookupIds } from "../services/user-lookup.js";

const router = Router();

// POST /api/users/lookup  body: { ids: [ "<userId>", ... ] }
router.post("/lookup", requireAuth, async (req, res) => {
  const lookup = normalizeUserLookupIds(req.body?.ids);

  if (lookup.error) {
    return res.status(400).json({ error: lookup.error });
  }

  if (lookup.ids.length === 0) return res.json([]);

  const users = await User.find(
    { _id: { $in: lookup.ids } },
    "name isOnline"
  ).lean();

  return res.json(users);
});

export default router;
