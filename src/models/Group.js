import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 40
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true
    },
    nameKey: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true
    },
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "public",
      index: true
    },
    passwordHash: {
      type: String,
      default: null,
      select: false
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    isBuiltIn: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

export default mongoose.model("Group", groupSchema);
