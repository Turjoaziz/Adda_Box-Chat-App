export function createPasswordResetBurstLimiter({
  windowMs = 60 * 1000,
  maxRequests = 30
} = {}) {
  if (!Number.isFinite(windowMs) || windowMs <= 0) {
    throw new Error("windowMs must be a positive number");
  }

  if (!Number.isInteger(maxRequests) || maxRequests < 1) {
    throw new Error("maxRequests must be a positive integer");
  }

  const requests = [];

  return function shouldThrottle(now = Date.now()) {
    while (requests.length > 0 && now - requests[0] >= windowMs) {
      requests.shift();
    }

    if (requests.length >= maxRequests) {
      return true;
    }

    requests.push(now);
    return false;
  };
}

export const passwordResetBurstLimiter = createPasswordResetBurstLimiter();
