import { io } from 'socket.io-client';
import { getServerOrigin } from './axios';

const SOCKET_URL = getServerOrigin();

let socket = null;

/**
 * Access token for the Socket.IO handshake.
 *
 * The server now rejects unauthenticated connections (backend
 * `services/socketService.js` → `verifySocketAuth`), so the client must
 * present the same JWT the REST layer uses. Mirrors the cache in `lib/axios.js`
 * — login writes the token to localStorage, and the refresh interceptor
 * updates it, so reading localStorage per connect keeps this correct after a
 * silent token refresh. Returning null (not logged in) is fine: the server
 * rejects it, and the app's connect_error handler surfaces that.
 */
function getSocketAuthToken() {
  // FE-B-01: read the in-memory token owned by `lib/axios.js`, not localStorage.
  //
  // This used to read `localStorage.getItem('token')`, which meant every socket
  // connection required the token to be persisted — and persisting it is the
  // vulnerability. Socket.IO cannot send an httpOnly cookie as a handshake header
  // by itself, but it CAN be configured to send cookies, and the server already
  // validates the same JWT the REST layer uses. Reading the module-scoped cache
  // keeps a single owner for token state.
  try {
    const { getAccessToken } = require('@/lib/axios');
    return typeof getAccessToken === 'function' ? getAccessToken() : null;
  } catch {
    return null;
  }
}

/**
 * App-wide single Socket.IO connection. Multiple components (NotificationProvider,
 * useAppointmentRealtime, delivery pages) share ise — pehle har ek apni alag
 * connection kholta tha aur same room join karta tha.
 */
export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      // Server verifies this JWT before completing the handshake.
      auth: (cb) => cb({ token: getSocketAuthToken() }),
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

  // The instance is a singleton, so a socket created while logged out carries
  // no token and the server rejects its handshake. Reconnecting in place is the
  // only way to pick up the credentials that appeared after login — creating a
  // second instance would orphan every listener already attached to this one.
  if (socket.auth?.token !== getSocketAuthToken()) {
    socket.auth = { token: getSocketAuthToken() };
    socket.disconnect().connect();
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

export function joinRideRoom(rideId) {
  const s = getSocket();
  if (!rideId) return () => {};
  const doJoin = () => s.emit('join_ride_room', { rideId });
  s.on('connect', doJoin);
  if (s.connected) doJoin();
  return () => {
    s.emit('leave_ride_room', { rideId });
    s.off('connect', doJoin);
  };
}

export function joinAssistantBookingRoom(bookingId) {
  const s = getSocket();
  if (!bookingId) return () => {};
  const doJoin = () => s.emit('join_booking_room', { bookingId });
  s.on('connect', doJoin);
  if (s.connected) doJoin();
  return () => {
    s.emit('leave_booking_room', { bookingId });
    s.off('connect', doJoin);
  };
}

export function joinLawyerBookingRoom(bookingId) {
  const s = getSocket();
  if (!bookingId) return () => {};
  const doJoin = () => s.emit('join_booking_room', { bookingId });
  s.on('connect', doJoin);
  if (s.connected) doJoin();
  return () => {
    s.emit('leave_booking_room', { bookingId });
    s.off('connect', doJoin);
  };
}


export function disconnectSocket() {
  // Instance ko null mat karo: EmergencyFlowController jaise components ke listeners
  // isi object par lage hote hain. Naya object banega to purane listeners dead ho jate hain.
  if (socket) socket.disconnect();
}
