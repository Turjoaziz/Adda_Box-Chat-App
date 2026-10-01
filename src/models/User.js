import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, minlength: 2, maxlength: 40 },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    passwordHash: { type: String, required: true },

    // Password reset state. Only a SHA-256 hash of the one-time token is stored.
    passwordResetTokenHash: { type: String, default: null, select: false },
    passwordResetExpiresAt: { type: Date, default: null, select: false },
    passwordResetRequestedAt: { type: Date, default: null, select: false },

    // Tokens issued before this time are rejected after a successful reset.
    passwordChangedAt: { type: Date, default: null },

    // Presence
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: null }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
