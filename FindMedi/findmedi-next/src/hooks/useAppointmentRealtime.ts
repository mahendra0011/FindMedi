'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getSocket, joinRoom } from '@/lib/socket';

/**
 * Realtime appointment updates — server emits 'appointment:updated'
 * whenever an appointment is created or changed. Calls onUpdate() to reload data.
 */
export function useAppointmentRealtime(onUpdate?: () => void): void {
  const { user } = useAuth();
  const userId = user?._id || (user as any)?.id;

  useEffect(() => {
    if (!userId) return;
    const socket = getSocket();
    const cleanupJoin = joinRoom('join', userId);

    const handler = () => onUpdate?.();
    socket.on('appointment:updated', handler);

    return () => {
      socket.off('appointment:updated', handler);
      cleanupJoin();
    };
  }, [userId, onUpdate]);
}
