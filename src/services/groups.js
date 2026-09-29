import bcrypt from "bcrypt";
import Group from "../models/Group.js";

export const DEFAULT_GROUPS = ["General", "Gaming", "Coursework", "Random"];
export const MAX_GROUP_NAME_LENGTH = 40;

export function cleanGroupName(value) {
  if (typeof value !== "string") return null;
  const name = value.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > MAX_GROUP_NAME_LENGTH) return null;
  if (!/^[A-Za-z0-9][A-Za-z0-9 _-]*$/.test(name)) return null;
  return name;
}

export function groupNameKey(value) {
  const name = cleanGroupName(value);
  if (!name) return null;
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function groupSlug(value) {
  const name = cleanGroupName(value);
  if (!name) return null;
  return name
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function levenshteinDistance(a, b) {
  const left = String(a || "");
  const right = String(b || "");
  const rows = left.length + 1;
  const cols = right.length + 1;
  const matrix = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = 0; i < rows; i++) matrix[i][0] = i;
  for (let j = 0; j < cols; j++) matrix[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[left.length][right.length];
}

export function areGroupNamesTooSimilar(leftName, rightName) {
  const a = groupNameKey(leftName);
  const b = groupNameKey(rightName);
  if (!a || !b) return false;
  if (a === b) return true;

  const maxLen = Math.max(a.length, b.length);
  const minLen = Math.min(a.length, b.length);
  if (maxLen < 4) return false;

  const distance = levenshteinDistance(a, b);
  if (maxLen <= 6 && distance <= 1) return true;
  if (maxLen >= 7 && distance <= 2) return true;

  const similarity = 1 - distance / maxLen;
  if (similarity >= 0.84) return true;

  if ((a.startsWith(b) || b.startsWith(a)) && maxLen - minLen <= 2) return true;

  return false;
}

export async function ensureDefaultGroups() {
  for (const name of DEFAULT_GROUPS) {
    const slug = groupSlug(name);
    const nameKey = groupNameKey(name);
    await Group.updateOne(
      { slug },
      {
        $setOnInsert: {
          name,
          slug,
          nameKey,
          visibility: "public",
          passwordHash: null,
          owner: null,
          isBuiltIn: true
        }
      },
      { upsert: true }
    );
  }
}

export async function findSimilarGroup(name) {
  const groups = await Group.find({}, "name slug nameKey").lean();
  return groups.find(group => areGroupNamesTooSimilar(name, group.name));
}

export async function verifyGroupAccess(group, password) {
  if (!group) return false;
  if (group.visibility !== "private") return true;
  if (!password || !group.passwordHash) return false;
  return bcrypt.compare(String(password), group.passwordHash);
}

export async function findGroupBySlug(slug, withPassword = false) {
  if (typeof slug !== "string") return null;
  const cleanSlug = slug.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]*$/.test(cleanSlug)) return null;

  const query = Group.findOne({ slug: cleanSlug });
  if (withPassword) query.select("+passwordHash");
  return query;
}
