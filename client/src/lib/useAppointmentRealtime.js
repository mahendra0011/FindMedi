import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getSocket, joinRoom } from '@/lib/socket';

/**
 * Realtime appointment updates — server 'appointment:updated' emit karta hai
 * jab bhi koi booking create/update hoti hai. onUpdate() ko call karo
 * (data reload karo). Shared socket use hota hai (NotificationProvider ke saath
 * ek hi connection) aur join har (re)connect par dobara fire hota hai.
 */
export function useAppointmentRealtime(onUpdate) {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;
    const socket = getSocket();
    const cleanupJoin = joinRoom('join', user.id);

    const handler = () => onUpdate?.();
    socket.on('appointment:updated', handler);

    return () => {
      socket.off('appointment:updated', handler);
      cleanupJoin();
    };
  }, [user?.id, onUpdate]);
}
