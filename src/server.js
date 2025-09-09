import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import messageRoutes from "./routes/messages.routes.js";
import { initSocket } from "./socket.js";

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));

app.use(express.static("public"));

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

const server = http.createServer(app);
initSocket(server, process.env.CORS_ORIGIN);

const PORT = process.env.PORT || 4000;

connectDB(process.env.MONGO_URI)
  .then(() => server.listen(PORT, () => console.log(`🚀 Adda_Box listening on ${PORT}`)))
  .catch((err) => {
    console.error("DB connection failed:", err);
    process.exit(1);
  });
