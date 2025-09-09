import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import Message from "../models/Message.js";

const router = Router();

router.get("/:room", requireAuth, async (req, res) => {
  const { room } = req.params;
  const msgs = await Message.find({ room }).sort({ createdAt: -1 }).limit(50).populate("from", "name");
  res.json(msgs.reverse());
});

export default router;
