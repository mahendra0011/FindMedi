import { Server as SocketIOServer } from "socket.io";
import { User } from "../models/index.js";

function allowedSocketOrigins() {
  const origins = [process.env.CLIENT_ORIGIN || "http://localhost:8080"];
  if (process.env.CORS_ORIGIN) {
    origins.push(...process.env.CORS_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean));
  }
  return origins;
}

export function createRealtimeServer(httpServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: allowedSocketOrigins(),
      credentials: true,
    },
  });

  // Auth removed: MindSupport is now part of the FindMedi platform, which handles
  // authentication. Sockets connect openly; user rooms attach when known.
  io.use(async (socket, next) => {
    try {
      const userId = socket.handshake.auth?.userId || socket.handshake.query?.userId || "";
      const role = socket.handshake.auth?.role || socket.handshake.query?.role || "";
      if (userId) {
        const user = await User.findById(userId);
        if (user && user.status !== "suspended") {
          socket.user = user;
          next();
          return;
        }
      }
      socket.user = userId ? { _id: userId, role: role || "user" } : null;
      next();
    } catch {
      next();
    }
  });

  io.on("connection", (socket) => {
    const user = socket.user;
    if (user?._id) {
      socket.join(`user:${user._id}`);
      if (user.role) socket.join(`role:${user.role}`);
    }
    socket.emit("realtime:ready", user?._id ? { userId: String(user._id), role: user.role } : {});
  });

  return io;
}
