export function tokenPredatesPasswordChange(payload, user) {
  if (!user?.passwordChangedAt) return false;
  if (!payload?.iat) return true;

  const issuedAtMs = Number(payload.iat) * 1000;
  const changedAtMs = user.passwordChangedAt.getTime();

  // JWT iat uses whole seconds while MongoDB dates include milliseconds.
  // Keep the existing one-second tolerance at the reset boundary.
  return issuedAtMs + 1000 < changedAtMs;
}
