// src/server.js
import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";

import { connectDB } from "./config/db.js";
import { validateEnv } from "./config/env.js";
import authRoutes from "./routes/auth.routes.js";
import messageRoutes from "./routes/messages.routes.js";
import usersRoutes from "./routes/users.routes.js";
import { initSocket } from "./socket.js";

// Fail early instead of discovering missing settings during login or signup.
let config;
try {
  config = validateEnv(process.env);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

// 1) Create app
const app = express();

// 2) CORS (comma-separated origins in .env)
const origins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || origins.length === 0) return cb(null, true); // allow curl/postman
    cb(null, origins.includes(origin));
  },
  credentials: true
}));

// 3) Core middleware and static files
app.use(express.json());
app.use(express.static("public"));

// Health check (for Render)
app.get("/healthz", (req, res) => res.json({ ok: true }));

// 4) Routes
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", usersRoutes);

// 5) HTTP server + Socket.IO
const server = http.createServer(app);
initSocket(server, origins[0] || process.env.CORS_ORIGIN);

const PORT = config.port;

// 6) Connect DB then start
connectDB(process.env.MONGO_URI)
  .then(() => server.listen(PORT, () => console.log(`🚀 Adda_Box listening on ${PORT}`)))
  .catch((err) => {
    console.error("DB connection failed:", err);
    process.exit(1);
  });
