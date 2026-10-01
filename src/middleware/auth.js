import jwt from "jsonwebtoken";
import User from "../models/User.js";

function tokenPredatesPasswordChange(payload, user) {
  if (!user?.passwordChangedAt) return false;
  if (!payload?.iat) return true;

  const issuedAtMs = Number(payload.iat) * 1000;
  const changedAtMs = user.passwordChangedAt.getTime();

  // JWT iat has second precision while MongoDB dates include milliseconds.
  return issuedAtMs + 1000 < changedAtMs;
}

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token" });
  }

  const token = authHeader.split(" ")[1];
  if (!token || token === "null" || token === "undefined") {
    return res.status(401).json({ error: "No token" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id).select("email passwordChangedAt");

    if (!user || tokenPredatesPasswordChange(payload, user)) {
      return res.status(401).json({ error: "Invalid token" });
    }

    req.user = { id: String(user._id), email: user.email };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}
