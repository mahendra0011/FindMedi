import { getSocket } from './socket';

export type InstantProviderType = 'rider' | 'lawyer' | 'assistant' | 'emergency_doctor' | 'ambulance';

export interface InstantAlertPayload {
  requestId: string;
  type: InstantProviderType;
  providerType?: string;
  category?: string;
  title?: string;
  subtitle?: string;
  patient?: {
    name?: string;
    phone?: string;
    age?: number | string;
    gender?: string;
  };
  location?: {
    address?: string;
    pickupAddress?: string;
    dropAddress?: string;
    coordinates?: [number, number];
  };
  hospitalName?: string;
  distanceKm?: number;
  amount?: number | string;
  windowSeconds?: number;
  scheduledTime?: string;
  specialInstructions?: string;
  serviceBadges?: string[];
  [key: string]: any;
}

export interface InstantSearchUpdatePayload {
  requestId: string;
  radiusKm: number;
}

export interface InstantAssignedPayload {
  requestId: string;
  providerId: string;
  distanceKm?: number;
  status: string;
  providerDetails?: any;
}

export interface InstantNoRespondersPayload {
  requestId: string;
  message?: string;
}

/**
 * Joins request room for both namespace and standard format
 */
export function joinInstantRequestRoom(type: string, requestId: string): () => void {
  const s = getSocket();
  if (!s || !requestId) return () => {};

  const roomA = `${type}:${requestId}`;
  const roomB = `request_${requestId}`;

  const doJoin = () => {
    s.emit('join_room', { room: roomA });
    s.emit('join_room', { room: roomB });
  };

  s.on('connect', doJoin);
  if (s.connected) doJoin();

  return () => {
    s.emit('leave_room', { room: roomA });
    s.emit('leave_room', { room: roomB });
    s.off('connect', doJoin);
  };
}

/**
 * Helper to listen to unified instant search progress
 */
export function listenToInstantSearch(
  type: string,
  requestId: string,
  callbacks: {
    onSearchUpdate?: (data: InstantSearchUpdatePayload) => void;
    onAssigned?: (data: InstantAssignedPayload) => void;
    onNoResponders?: (data: InstantNoRespondersPayload) => void;
  }
): () => void {
  const s = getSocket();
  if (!s || !requestId) return () => {};

  const cleanupRoom = joinInstantRequestRoom(type, requestId);

  const searchUpdateEvent = `${type}:search_update`;
  const assignedEvent = `${type}:assigned`;
  const noRespondersEvent = `${type}:no_responders_found`;

  const handleSearchUpdate = (data: any) => {
    if (String(data.requestId) === String(requestId)) {
      callbacks.onSearchUpdate?.(data);
    }
  };

  const handleAssigned = (data: any) => {
    if (String(data.requestId) === String(requestId)) {
      callbacks.onAssigned?.(data);
    }
  };

  const handleNoResponders = (data: any) => {
    if (String(data.requestId) === String(requestId)) {
      callbacks.onNoResponders?.(data);
    }
  };

  s.on(searchUpdateEvent, handleSearchUpdate);
  s.on(assignedEvent, handleAssigned);
  s.on(noRespondersEvent, handleNoResponders);

  // Also support generic fallbacks
  s.on('instant:search_update', handleSearchUpdate);
  s.on('instant:assigned', handleAssigned);
  s.on('instant:no_responders_found', handleNoResponders);

  return () => {
    cleanupRoom();
    s.off(searchUpdateEvent, handleSearchUpdate);
    s.off(assignedEvent, handleAssigned);
    s.off(noRespondersEvent, handleNoResponders);
    s.off('instant:search_update', handleSearchUpdate);
    s.off('instant:assigned', handleAssigned);
    s.off('instant:no_responders_found', handleNoResponders);
  };
}
