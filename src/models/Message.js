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
    }
  },
  { timestamps: true }
);

export default mongoose.model("Message", messageSchema);
