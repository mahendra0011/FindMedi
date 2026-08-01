import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '@/context/AuthContext';

const SOCKET_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5001';

/**
 * Realtime appointment updates — server 'appointment:updated' emit karta hai
 * jab bhi koi booking create/update hoti hai. onUpdate() ko call karo
 * (data reload karo). Reconnect par socket 'join' room dobara emit hota hai.
 */
export function useAppointmentRealtime(onUpdate) {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });

    socket.on('connect', () => socket.emit('join', user.id));
    socket.on('appointment:updated', () => onUpdate?.());

    return () => socket.disconnect();
  }, [user?.id, onUpdate]);
}
