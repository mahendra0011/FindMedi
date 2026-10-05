import { Server as SocketIOServer } from "socket.io";
import { User } from "../models/index.js";
import { verifyAccessToken } from "../../../src/utils/jwtKeys.js";

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

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token || "";
      if (token) {
        try {
          // AUTH-F-01: findmedi access tokens only, key-rotatable. The old
          // raw verify used JWT_SECRET directly (dead under JWT_KEYS) with a
          // MIND_JWT_SECRET/dev-secret fallback no signer ever used.
          const payload = verifyAccessToken(token);
          const uid = payload.id || payload._id || payload.userId;
          if (uid) {
            const user = await User.findById(uid);
            if (user && user.status !== "suspended") {
              socket.user = user;
              next();
              return;
            }
          }
        } catch { /* fallback to userId */ }
      }
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
