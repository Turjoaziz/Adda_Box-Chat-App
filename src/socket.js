import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "./models/User.js";

// In-memory presence map: userId -> connection count
const onlineUsers = new Map();

function presenceList() {
  // return minimal info for UI
  return Array.from(onlineUsers.keys());
}

export function initSocket(httpServer, corsOrigin) {
  const io = new Server(httpServer, { cors: { origin: corsOrigin, credentials: true } });

  // Auth handshake via JWT token
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error("No token"));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = { id: payload.id, email: payload.email };
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.user.id;

    // Mark online in memory
    onlineUsers.set(userId, (onlineUsers.get(userId) || 0) + 1);

    // Mark online in DB (fire and forget)
    User.findByIdAndUpdate(userId, { isOnline: true }).catch(() => {});

    // Send initial presence list to this client
    socket.emit("presence:init", presenceList());

    // Broadcast this user's online status
    io.emit("presence:update", { userId, isOnline: true });

    // Rooms will be joined by client via "room:join"
    socket.on("room:join", (room) => {
      if (!room) return;
      socket.join(room);
      socket.emit("room:joined", room);
    });

    socket.on("message:send", async ({ room, body }) => {
      if (!room || !body) return;
      // Lazy import to avoid cycle
      const { default: Message } = await import("./models/Message.js");
      const saved = await Message.create({ room, from: userId, body });
      io.to(room).emit("message:new", {
        _id: saved._id,
        room,
        from: userId,
        body,
        createdAt: saved.createdAt
      });
    });

    socket.on("disconnect", async () => {
      const count = (onlineUsers.get(userId) || 1) - 1;
      if (count <= 0) {
        onlineUsers.delete(userId);
        // Update DB
        await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() }).catch(() => {});
        io.emit("presence:update", { userId, isOnline: false });
      } else {
        onlineUsers.set(userId, count);
      }
    });
  });

  return io;
}
