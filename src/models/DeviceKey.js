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
