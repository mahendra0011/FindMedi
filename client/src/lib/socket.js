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
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      // Explicit reconnection config — server restart / network drop hone par
      // socket khud reconnect karega. Default bhi true hai, par explicit rakhne
      // se kabhi kisi dependency update me default change ho jaye to break na ho.
      reconnection: true,
      reconnectionAttempts: Infinity,   // hamesha try karte raho
      reconnectionDelay: 1000,           // pehla retry 1s baad
      reconnectionDelayMax: 5000,        // max 5s between retries
      timeout: 20000,
    });
    // Connection lifecycle logging — warn level, taaki console me dikhe bina
    // crash kiye. connect_error bahut important hai: agar URL galat ho ya
    // server namespace na de, yahan reason milta hai.
    socket.on('connect_error', (err) => {
      console.warn('[Socket] connect error:', err.message);
    });
    socket.on('disconnect', (reason) => {
      console.warn('[Socket] disconnected:', reason);
    });
    socket.on('reconnect', (attempt) => {
      console.info('[Socket] reconnected after', attempt, 'attempts');
    });
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
