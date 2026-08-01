import { io } from 'socket.io-client';

// VITE_API_URL ends with /api — Socket.IO usse namespace samajhta hai, isliye
// strip karke sirf origin pass karte hain. Sab jagah ek hi URL (yeh file).
const SOCKET_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api', '')
  : 'http://localhost:5001';

let socket = null;

/**
 * App-wide single Socket.IO connection. Multiple components (NotificationProvider,
 * useAppointmentRealtime, delivery pages) share ise — pehle har ek apni alag
 * connection kholta tha aur same room join karta tha.
 */
export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
  }
  return socket;
}

/**
 * Room join jo har (re)connect par dobara fire hota hai (server reconnection par
 * rooms khud restore nahi karta). Cleanup function return karta hai.
 */
export function joinRoom(event, room) {
  const s = getSocket();
  if (!room) return () => {};
  const doJoin = () => s.emit(event, room);
  s.on('connect', doJoin);
  if (s.connected) doJoin();
  return () => s.off('connect', doJoin);
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
