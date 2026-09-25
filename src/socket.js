import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "./models/User.js";

export const MAX_ROOM_LENGTH = 50;
export const MAX_MESSAGE_LENGTH = 2000;

const ROOM_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

// Keep validation shared and predictable for every Socket.IO client, including
// custom clients that do not use the browser checks in public/index.html.
export function normalizeRoomName(value) {
  if (typeof value !== "string") return null;

  const room = value.trim();
  if (!room || room.length > MAX_ROOM_LENGTH || !ROOM_NAME_PATTERN.test(room)) {
    return null;
  }

  return room;
}

export function normalizeMessageBody(value) {
  if (typeof value !== "string") return null;

  const body = value.trim();
  if (!body || body.length > MAX_MESSAGE_LENGTH) return null;

  return body;
}

export function canSendToRoom(socket, room) {
  return Boolean(socket?.rooms?.has?.(room));
}

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

    // Rooms will be joined by client via "room:join".
    // Validation here prevents a custom Socket.IO client from bypassing UI checks.
    socket.on("room:join", async (requestedRoom) => {
      const room = normalizeRoomName(requestedRoom);
      if (!room) {
        socket.emit("room:error", { error: "Invalid room name" });
        return;
      }

      await socket.join(room);
      socket.emit("room:joined", room);
    });

    socket.on("message:send", async (payload = {}) => {
      const room = normalizeRoomName(payload?.room);
      const body = normalizeMessageBody(payload?.body);

      if (!room) {
        socket.emit("message:error", { error: "Invalid room name" });
        return;
      }

      if (!body) {
        socket.emit("message:error", {
          error: `Message must be between 1 and ${MAX_MESSAGE_LENGTH} characters`
        });
        return;
      }

      // Critical server-side protection: a client can only send to a room this
      // socket has actually joined. Frontend checks alone are not a security boundary.
      if (!canSendToRoom(socket, room)) {
        socket.emit("message:error", { error: "Join the room before sending a message" });
        return;
      }

      try {
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
      } catch (err) {
        console.error("Failed to save chat message:", err);
        socket.emit("message:error", { error: "Message could not be sent" });
      }
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
