import mongoose from "mongoose";

const roomNamePattern = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

const messageSchema = new mongoose.Schema(
  {
    room: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
      match: roomNamePattern
    },
    from: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000
    },

    // Stage 1 message authenticity fields.
    // Older messages may not have these fields; new messages are required to be signed
    // by the Socket.IO handler before they are saved.
    deviceId: { type: String, default: null, maxlength: 100 },
    clientMessageId: { type: String, default: null, maxlength: 100 },
    signedAt: { type: Date, default: null },
    signature: { type: String, default: null, maxlength: 1000 },
    signatureVerified: { type: Boolean, default: false }
  },
  { timestamps: true }
);

messageSchema.index(
  { from: 1, clientMessageId: 1 },
  { unique: true, sparse: true }
);

export default mongoose.model("Message", messageSchema);
