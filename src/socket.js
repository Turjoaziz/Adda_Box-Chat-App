import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "./models/User.js";
import DeviceKey from "./models/DeviceKey.js";
import { findGroupBySlug, verifyGroupAccess } from "./services/groups.js";
import { isValidSignedMessageMetadata, verifySignedMessage } from "./services/signatures.js";

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
      const request =
        typeof requestedRoom === "string"
          ? { room: requestedRoom, password: "" }
          : (requestedRoom || {});

      const room = normalizeRoomName(request.room);
      if (!room) {
        socket.emit("room:error", { error: "Invalid group name", code: "INVALID_GROUP" });
        return;
      }

      const group = await findGroupBySlug(room, true);
      if (!group) {
        socket.emit("room:error", { error: "Group does not exist", code: "GROUP_NOT_FOUND", room });
        return;
      }

      const allowed = await verifyGroupAccess(group, request.password);
      if (!allowed) {
        socket.emit("room:error", {
          error: "Incorrect password for this private group",
          code: "PRIVATE_GROUP_PASSWORD",
          room
        });
        return;
      }

      await socket.join(group.slug);
      socket.emit("room:joined", group.slug);
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

      const signedPayload = {
        room,
        body,
        clientMessageId: payload?.clientMessageId,
        signedAt: payload?.signedAt,
        deviceId: payload?.deviceId,
        signature: payload?.signature
      };

      if (!isValidSignedMessageMetadata(signedPayload)) {
        socket.emit("message:error", {
          error: "A valid digital signature is required",
          code: "SIGNATURE_REQUIRED"
        });
        return;
      }

      try {
        const deviceKey = await DeviceKey.findOne({
          user: userId,
          deviceId: signedPayload.deviceId,
          revokedAt: null
        }).lean();

        if (!deviceKey) {
          socket.emit("message:error", {
            error: "This device signing key is not registered",
            code: "SIGNING_KEY_NOT_REGISTERED"
          });
          return;
        }

        const signatureOk = await verifySignedMessage(
          deviceKey.signingPublicJwk,
          signedPayload
        );

        if (!signatureOk) {
          socket.emit("message:error", {
            error: "Digital signature verification failed",
            code: "INVALID_SIGNATURE"
          });
          return;
        }

        // Lazy import to avoid cycle
        const { default: Message } = await import("./models/Message.js");

        const replay = await Message.findOne({
          from: userId,
          clientMessageId: signedPayload.clientMessageId
        }).lean();

        if (replay) {
          socket.emit("message:error", {
            error: "Duplicate signed message rejected",
            code: "DUPLICATE_MESSAGE"
          });
          return;
        }

        const saved = await Message.create({
          room,
          from: userId,
          body,
          deviceId: signedPayload.deviceId,
          clientMessageId: signedPayload.clientMessageId,
          signedAt: new Date(signedPayload.signedAt),
          signature: signedPayload.signature,
          signatureVerified: true
        });

        io.to(room).emit("message:new", {
          _id: saved._id,
          room,
          from: userId,
          body,
          deviceId: saved.deviceId,
          clientMessageId: saved.clientMessageId,
          signedAt: saved.signedAt,
          signature: saved.signature,
          signatureVerified: true,
          createdAt: saved.createdAt
        });
      } catch (err) {
        console.error("Failed to save signed chat message:", err);
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
