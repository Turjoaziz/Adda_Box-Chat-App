import { createHash } from "node:crypto";

export function createPasswordResetCooldown({
  cooldownMs = 60 * 1000,
  maxEntries = 1000
} = {}) {
  const recent = new Map();

  function keyFor(email) {
    const normalized = String(email || "").trim().toLowerCase();
    return createHash("sha256").update(normalized).digest("hex");
  }

  function pruneExpired(now) {
    for (const [key, timestamp] of recent) {
      if (now - timestamp >= cooldownMs) recent.delete(key);
    }
  }

  return function shouldThrottle(email, now = Date.now()) {
    pruneExpired(now);

    const key = keyFor(email);
    const lastRequest = recent.get(key);

    if (lastRequest !== undefined && now - lastRequest < cooldownMs) {
      return true;
    }

    if (recent.size >= maxEntries) {
      const oldestKey = recent.keys().next().value;
      if (oldestKey !== undefined) recent.delete(oldestKey);
    }

    recent.set(key, now);
    return false;
  };
}

export const passwordResetCooldown = createPasswordResetCooldown();
