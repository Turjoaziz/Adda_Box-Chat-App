import mongoose from "mongoose";

const groupMemberSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

groupMemberSchema.index({ group: 1, user: 1 }, { unique: true });

export default mongoose.model("GroupMember", groupMemberSchema);
