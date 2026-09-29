import mongoose from "mongoose";

const deviceKeySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    deviceId: {
      type: String,
      required: true,
      minlength: 16,
      maxlength: 100
    },
    signingPublicJwk: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    fingerprint: {
      type: String,
      required: true
    },

    // Separate ECDH identity used only for end-to-end message-key wrapping.
    encryptionPublicJwk: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    encryptionFingerprint: {
      type: String,
      default: null
    },
    encryptionKeySignature: {
      type: String,
      default: null,
      maxlength: 1000
    },

    label: {
      type: String,
      maxlength: 80,
      default: "Browser"
    },
    revokedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

deviceKeySchema.index({ user: 1, deviceId: 1 }, { unique: true });

export default mongoose.model("DeviceKey", deviceKeySchema);
