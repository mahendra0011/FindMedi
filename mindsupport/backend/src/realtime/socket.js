import jwt from "jsonwebtoken";
import { Server as SocketIOServer } from "socket.io";
import { JWT_SECRET } from "../config/env.js";
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

  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers?.cookie || "";
      const cookies = Object.fromEntries(
        cookieHeader.split(";").filter(Boolean).map((c) => {
          const [key, ...val] = c.trim().split("=");
          return [key, val.join("=")];
        })
      );
      const token =
        socket.handshake.auth?.token
        || String(socket.handshake.headers.authorization || "").replace(/^Bearer\s+/i, "")
        || cookies.token || "";
      if (!token) {
        next(new Error("Authentication required"));
        return;
      }
      const payload = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(payload.sub);
      if (!user || user.status === "suspended") {
        next(new Error("Forbidden"));
        return;
      }
      socket.user = user;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.user;
    socket.join(`user:${user._id}`);
    socket.join(`role:${user.role}`);
    socket.emit("realtime:ready", { userId: String(user._id), role: user.role });
  });

  return io;
}
