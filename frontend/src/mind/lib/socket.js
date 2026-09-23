import { io } from "socket.io-client";
import { API_BASE } from "@/mind/lib/api";

let socket;

function socketBaseUrl() {
  if (API_BASE) return API_BASE;
  return typeof window !== "undefined" ? window.location.origin : "http://localhost:5001";
}

export function getRealtimeSocket() {
  if (socket?.connected) return socket;
  let authPayload = {};
  try {
    const token = typeof localStorage !== "undefined" ? localStorage.getItem("token") : null;
    if (token) authPayload = { token };
    // Also forward userId/role if cached (helps merged-mode room join)
    const cachedUser = typeof localStorage !== "undefined" ? localStorage.getItem("mind_user") || localStorage.getItem("user") : null;
    if (cachedUser) {
      try {
        const u = JSON.parse(cachedUser);
        if (u?._id || u?.id) authPayload.userId = u._id || u.id;
        if (u?.role) authPayload.role = u.role;
      } catch { /* ignore */ }
    }
  } catch { /* ignore */ }
  socket = io(socketBaseUrl(), {
    withCredentials: true,
    transports: ["websocket", "polling"],
    auth: authPayload,
  });
  try {
    socket.on("connect", () => {
      try {
        const t = localStorage.getItem("token");
        if (t && socket?.emit) socket.emit("join", { token: t });
      } catch { /* ignore */ }
    });
  } catch { /* ignore */ }
  return socket;
}

export function closeRealtimeSocket() {
  if (socket) {
    socket.disconnect();
    socket = undefined;
  }
}
