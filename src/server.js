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
import groupsRoutes from "./routes/groups.routes.js";
import keyRoutes from "./routes/keys.routes.js";
import { apiErrorHandler, apiNotFound } from "./middleware/api-errors.js";
import { requireJsonBody } from "./middleware/content-type.js";
import { noStore, securityHeaders } from "./middleware/security-headers.js";
import { initSocket } from "./socket.js";
import { ensureDefaultGroups } from "./services/groups.js";

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

// Avoid advertising the framework and add lightweight browser hardening headers.
app.disable("x-powered-by");
app.use(securityHeaders);

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
// Auth tokens, private group data, key material, and message history should
// never be stored by browser or intermediary caches.
app.use("/api", noStore);

// Current write endpoints all accept JSON bodies. Reject unsupported media types
// before route handlers try to validate an unparsed request body.
app.use("/api", requireJsonBody);

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/groups", groupsRoutes);
app.use("/api/keys", keyRoutes);

// Keep API failures machine-readable and avoid exposing server internals.
app.use("/api", apiNotFound);
app.use("/api", apiErrorHandler);

// 5) HTTP server + Socket.IO
const server = http.createServer(app);
initSocket(server, origins[0] || process.env.CORS_ORIGIN);

const PORT = config.port;

// 6) Connect DB then start
connectDB(process.env.MONGO_URI)
  .then(async () => {
    await ensureDefaultGroups();
    server.listen(PORT, () => console.log(`🚀 Adda_Box listening on ${PORT}`));
  })
  .catch((err) => {
    console.error("DB connection failed:", err);
    process.exit(1);
  });
