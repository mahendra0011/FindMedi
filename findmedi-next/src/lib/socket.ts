/**
 * Socket.IO client wrapper.
 *
 * Ported from client/src/lib/socket.js.
 *
 * Provides a single shared Socket.IO connection used by NotificationProvider,
 * useAppointmentRealtime, delivery pages, etc. Multiple components sharing one
 * connection avoids duplicate room joins and redundant reconnect attempts.
 *
 * Usage:
 *   import { getSocket, joinRoom, emitMessage, disconnectSocket } from '@/lib/socket';
 *
 *   const socket = getSocket();
 *   socket.on('notification', handler);
 */
import { io, type Socket } from 'socket.io-client';
import { getServerOrigin } from '@/lib/api/client';
import { getStorageItem } from '@/lib/api/client';

const SOCKET_URL = getServerOrigin();

let socket: Socket | null = null;

/**
 * Returns the singleton Socket.IO connection, creating it on first call.
 * The connection uses WebSocket first, falling back to polling.
 */
export function getSocket(): Socket {
  if (!socket) {
    const token = getStorageItem('token');
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      auth: token ? { token } : undefined,
    });

    // Connection lifecycle logging — warn level only
    socket.on('connect_error', (err: Error) => {
      console.warn('[Socket] connect error:', err.message);
    });
    socket.on('disconnect', (reason: string) => {
      console.warn('[Socket] disconnected:', reason);
    });
    socket.on('reconnect', (attempt: number) => {
      console.info('[Socket] reconnected after', attempt, 'attempts');
    });
  }
  return socket;
}

/**
 * Join a socket room on connect (and on every reconnection).
 * Returns a cleanup function that removes the connect listener.
 *
 * @param event  The server event to emit (e.g. 'join', 'order:join_tracking').
 * @param room   The room identifier to pass to the server.
 */
export function joinRoom(event: string, room: string): () => void {
  if (!room) return () => {};
  const s = getSocket();
  const doJoin = () => s.emit(event, room);
  s.on('connect', doJoin);
  if (s.connected) doJoin();
  return () => s.off('connect', doJoin);
}

/**
 * Emit a message to the server (server-side room broadcast is handled server-side).
 */
export function emitToServer(event: string, payload: unknown): void {
  const s = getSocket();
  s.emit(event, payload);
}

/**
 * Disconnect and null the singleton socket.
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
