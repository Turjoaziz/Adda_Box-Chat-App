import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    room: { type: String, required: true },
    from: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true }
  },
  { timestamps: true }
);

export default mongoose.model("Message", messageSchema);
