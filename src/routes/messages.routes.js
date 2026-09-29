import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import Message from "../models/Message.js";
import { findGroupBySlug, verifyGroupAccess } from "../services/groups.js";

const router = Router();

router.get("/:room", requireAuth, async (req, res) => {
  const room = String(req.params.room || "").trim().toLowerCase();
  const group = await findGroupBySlug(room, true);

  if (!group) {
    return res.status(404).json({ error: "Group does not exist." });
  }

  const password = req.headers["x-group-password"];
  const allowed = await verifyGroupAccess(group, password);

  if (!allowed) {
    return res.status(403).json({
      error: "Private group password required or incorrect.",
      code: "PRIVATE_GROUP_PASSWORD"
    });
  }

  const msgs = await Message.find({ room: group.slug })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate("from", "name");

  res.json(msgs.reverse());
});

export default router;
