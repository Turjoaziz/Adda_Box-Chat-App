import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { tokenPredatesPasswordChange } from "../services/auth-token.js";
import { extractBearerToken } from "../services/bearer-token.js";

export async function requireAuth(req, res, next) {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
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
