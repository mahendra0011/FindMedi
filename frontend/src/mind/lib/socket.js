import { io } from "socket.io-client";
import { API_BASE } from "@/mind/lib/api";

let socket;

function socketBaseUrl() {
  if (API_BASE) return API_BASE;
  return typeof window !== "undefined" ? window.location.origin : "http://localhost:5001";
}

export function getRealtimeSocket() {
  if (socket?.connected) return socket;
  // SECURITY (P1-6): no localStorage reads - handshake identity comes from
  // the httpOnly session cookie (withCredentials) which the server verifies.
  // The old code forwarded a never-written `token` key plus a cached user id
  // the server used to trust blindly (room-join impersonation).
  socket = io(socketBaseUrl(), {
    withCredentials: true,
    transports: ["websocket", "polling"],
    auth: {},
  });
  return socket;
}

export function closeRealtimeSocket() {
  if (socket) {
    socket.disconnect();
    socket = undefined;
  }
}
