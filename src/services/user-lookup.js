export const MAX_USER_LOOKUP_IDS = 100;
const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i;

export function normalizeUserLookupIds(value) {
  if (!Array.isArray(value) || value.length === 0) {
    return { ids: [] };
  }

  if (value.length > MAX_USER_LOOKUP_IDS) {
    return {
      ids: [],
      error: `A maximum of ${MAX_USER_LOOKUP_IDS} user IDs can be looked up at once.`
    };
  }

  const seen = new Set();
  const ids = [];

  for (const rawId of value) {
    if (typeof rawId !== "string") {
      return { ids: [], error: "User IDs must be valid MongoDB ObjectIds." };
    }

    const id = rawId.trim();
    if (!OBJECT_ID_PATTERN.test(id)) {
      return { ids: [], error: "User IDs must be valid MongoDB ObjectIds." };
    }

    const normalized = id.toLowerCase();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      ids.push(normalized);
    }
  }

  return { ids };
}
