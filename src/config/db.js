// src/config/db.js
import mongoose from "mongoose";

export async function connectDB(uri) {
  if (!uri) throw new Error("MONGO_URI missing");
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
  console.log("✅ MongoDB connected");
}

export function isDatabaseReady(connection = mongoose.connection) {
  // Mongoose readyState 1 means connected. Keep health responses generic so
  // connection strings, hostnames, and driver details are never exposed.
  return connection?.readyState === 1;
}
