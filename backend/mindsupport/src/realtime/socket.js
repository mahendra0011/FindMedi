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

/** httpOnly session cookie carriage (same parser shape as main socketService). */
function readCookieToken(socket) {
  const cookieHeader = socket.handshake?.headers?.cookie || "";
  const match = cookieHeader.match(/(?:^|;\s*)(?:__Host-)?token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export function createRealtimeServer(httpServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: allowedSocketOrigins(),
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    // SECURITY (P1-6/CHAT-001): identity comes ONLY from a verified JWT. The
    // old code fell back to a client-supplied `auth.userId` (and even trusted
    // it without a DB lookup), so any socket could join any user's room and
    // read their notifications/chat. Token carriage: handshake payload (legacy)
    // or the httpOnly session cookie - the mind FE keeps no token in
    // localStorage.
    const token = socket.handshake.auth?.token
      || socket.handshake.query?.token
      || readCookieToken(socket);
    if (!token) return next(new Error("unauthorized: no token"));
    try {
      // AUTH-F-01: findmedi access tokens only, key-rotatable. The old
      // raw verify used JWT_SECRET directly (dead under JWT_KEYS) with a
      // MIND_JWT_SECRET/dev-secret fallback no signer ever used.
      const payload = verifyAccessToken(token);
      const uid = payload.id || payload._id || payload.userId;
      if (!uid) return next(new Error("unauthorized: no identity in token"));
      const user = await User.findById(uid);
      if (!user || user.status === "suspended") return next(new Error("unauthorized"));
      socket.user = user;
      next();
    } catch {
      // A bad token or DB failure must never become "authenticated".
      return next(new Error("unauthorized: invalid token"));
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
