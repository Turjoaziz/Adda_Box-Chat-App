import mongoose from "mongoose";

const roomNamePattern = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

const keyEnvelopeSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, maxlength: 64 },
    deviceId: { type: String, required: true, maxlength: 100 },
    wrapIv: { type: String, required: true, maxlength: 64 },
    wrappedKey: { type: String, required: true, maxlength: 1000 }
  },
  { _id: false }
);

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

    // Legacy plaintext messages are kept readable for compatibility.
    // New messages use encryptionVersion=1 and store ciphertext instead.
    body: {
      type: String,
      default: null,
      trim: true,
      maxlength: 2000
    },

    encryptionVersion: {
      type: Number,
      default: 0,
      enum: [0, 1]
    },
    ciphertext: {
      type: String,
      default: null,
      maxlength: 12000
    },
    iv: {
      type: String,
      default: null,
      maxlength: 64
    },
    keyEnvelopes: {
      type: [keyEnvelopeSchema],
      default: []
    },

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
