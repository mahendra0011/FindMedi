import type { Socket } from 'socket.io-client';

/**
 * `socket.js` is a plain-JS module, so TypeScript infers `let socket = null`
 * literally as `null` — which made every `getSocket().emit(...)` call site
 * fail with "Property 'emit' does not exist on type 'null'". This declaration
 * file gives the module a real shape without touching the runtime code.
 */
export declare function getSocket(): Socket;
export declare function joinRoom(event: string, room?: string | null): () => void;
export declare function joinRideRoom(rideId?: string | null): () => void;
export declare function joinAssistantBookingRoom(bookingId?: string | null): () => void;
export declare function joinLawyerBookingRoom(bookingId?: string | null): () => void;
export declare function disconnectSocket(): void;
