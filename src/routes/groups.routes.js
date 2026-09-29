import { Router } from "express";
import bcrypt from "bcrypt";
import { requireAuth } from "../middleware/auth.js";
import Group from "../models/Group.js";
import GroupMember from "../models/GroupMember.js";
import DeviceKey from "../models/DeviceKey.js";
import {
  cleanGroupName,
  groupNameKey,
  groupSlug,
  ensureDefaultGroups,
  findSimilarGroup,
  findGroupBySlug,
  verifyGroupAccess
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

router.get("/:slug/recipients", requireAuth, async (req, res) => {
  const group = await findGroupBySlug(req.params.slug, true);

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

  await GroupMember.updateOne(
    { group: group._id, user: req.user.id },
    { $setOnInsert: { joinedAt: new Date() } },
    { upsert: true }
  );

  const memberships = await GroupMember.find({ group: group._id }, "user").lean();
  const memberIds = memberships.map(member => member.user);

  const deviceKeys = await DeviceKey.find({
    user: { $in: memberIds },
    revokedAt: null,
    encryptionPublicJwk: { $ne: null },
    encryptionKeySignature: { $ne: null }
  })
    .select(
      "user deviceId signingPublicJwk fingerprint encryptionPublicJwk encryptionFingerprint encryptionKeySignature"
    )
    .lean();

  const readyUsers = new Set(deviceKeys.map(key => String(key.user)));

  return res.json({
    group: {
      id: String(group._id),
      slug: group.slug,
      name: group.name,
      visibility: group.visibility
    },
    memberCount: memberships.length,
    encryptionReadyUserCount: readyUsers.size,
    recipients: deviceKeys.map(key => ({
      userId: String(key.user),
      deviceId: key.deviceId,
      signingPublicJwk: key.signingPublicJwk,
      signingFingerprint: key.fingerprint,
      encryptionPublicJwk: key.encryptionPublicJwk,
      encryptionFingerprint: key.encryptionFingerprint,
      encryptionKeySignature: key.encryptionKeySignature
    }))
  });
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

    await GroupMember.updateOne(
      { group: group._id, user: req.user.id },
      { $setOnInsert: { joinedAt: new Date() } },
      { upsert: true }
    );

    return res.status(201).json(publicGroupShape(group));
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ error: "A group with this or a very similar name already exists." });
    }
    throw err;
  }
});

export default router;
