import { Router } from "express";
import bcrypt from "bcrypt";
import { requireAuth } from "../middleware/auth.js";
import Group from "../models/Group.js";
import {
  cleanGroupName,
  groupNameKey,
  groupSlug,
  ensureDefaultGroups,
  findSimilarGroup
} from "../services/groups.js";

const router = Router();

function publicGroupShape(group) {
  return {
    id: group._id,
    name: group.name,
    slug: group.slug,
    visibility: group.visibility,
    isPrivate: group.visibility === "private",
    isBuiltIn: Boolean(group.isBuiltIn),
    createdAt: group.createdAt
  };
}

router.get("/", requireAuth, async (req, res) => {
  await ensureDefaultGroups();
  const groups = await Group.find({})
    .sort({ isBuiltIn: -1, createdAt: 1, name: 1 })
    .lean();

  res.json(groups.map(publicGroupShape));
});

router.post("/", requireAuth, async (req, res) => {
  const name = cleanGroupName(req.body?.name);
  const visibility = req.body?.visibility === "private" ? "private" : "public";
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  if (!name) {
    return res.status(400).json({
      error: "Group name must be 2-40 characters and use only letters, numbers, spaces, hyphens or underscores."
    });
  }

  if (visibility === "private" && (password.length < 4 || password.length > 72)) {
    return res.status(400).json({ error: "Private group password must be 4-72 characters." });
  }

  await ensureDefaultGroups();

  const similar = await findSimilarGroup(name);
  if (similar) {
    return res.status(409).json({
      error: "A group with this or a very similar name already exists.",
      similarTo: similar.name
    });
  }

  const slug = groupSlug(name);
  const nameKey = groupNameKey(name);
  const passwordHash = visibility === "private" ? await bcrypt.hash(password, 10) : null;

  try {
    const group = await Group.create({
      name,
      slug,
      nameKey,
      visibility,
      passwordHash,
      owner: req.user.id,
      isBuiltIn: false
    });

    return res.status(201).json(publicGroupShape(group));
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ error: "A group with this or a very similar name already exists." });
    }
    throw err;
  }
});

export default router;
