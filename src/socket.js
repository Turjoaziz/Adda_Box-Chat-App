import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import Message from "./models/Message.js";

export function initSocket(httpServer, corsOrigin) {
  const io = new Server(httpServer, { cors: { origin: corsOrigin, credentials: true } });

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

  io.on("connection", (socket) => {
    socket.on("room:join", (room) => {
      if (!room) return;
      socket.join(room);
      socket.emit("room:joined", room);
    });

    socket.on("message:send", async ({ room, body }) => {
      if (!room || !body) return;
      const saved = await Message.create({ room, from: socket.user.id, body });
      io.to(room).emit("message:new", {
        _id: saved._id,
        room,
        from: socket.user.id,
        body,
        createdAt: saved.createdAt
      });
    });
  });

  return io;
}
