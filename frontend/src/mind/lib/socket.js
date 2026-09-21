import { io } from "socket.io-client";
import { API_BASE } from "@/mind/lib/api";

let socket;

function socketBaseUrl() {
  if (API_BASE) return API_BASE;
  return typeof window !== "undefined" ? window.location.origin : "http://localhost:5001";
}

export function getRealtimeSocket() {
  if (socket?.connected) return socket;
  socket = io(socketBaseUrl(), {
    withCredentials: true,
    transports: ["websocket", "polling"],
  });
  return socket;
}

export function closeRealtimeSocket() {
  if (socket) {
    socket.disconnect();
    socket = undefined;
  }
}
