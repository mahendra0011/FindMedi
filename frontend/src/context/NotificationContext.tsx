import { createContext, useContext, useEffect, useCallback } from 'react';
import { emergencyOverlayActive } from '@/lib/emergencyState';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '@/context/AuthContext';
import { fetchNotifications, selectNotificationCount, addNotification } from '@/store/slices/notificationsSlice';
import { getSocket, joinRoom, disconnectSocket } from '@/lib/socket';
import type { Unmodelled } from '@/lib/apiTypes';

const NotificationContext = createContext<Unmodelled>(null);

export function NotificationProvider({ children }: Unmodelled) {
  const dispatch = useDispatch();
  const count = useSelector(selectNotificationCount);
  const { user } = useAuth();

  const refreshCount = useCallback(async () => {
    if (!user) return;
    (dispatch as Unmodelled)(fetchNotifications());
  }, [user, dispatch]);

  useEffect(() => {
    if (user) {
      (dispatch as Unmodelled)(fetchNotifications());
    }
  }, [user, dispatch]);

  useEffect(() => {
    if (!user) {
      disconnectSocket();
      return;
    }

    const socket = getSocket();
    if (!socket.connected) socket.connect(); // logout ke baad disconnect hua tha
    // Shared socket — room join har (re)connect par dobara hota hai
    const cleanupJoin = joinRoom('join', user.id);

    const onNotification = (notification: Unmodelled) => {
      if (emergencyOverlayActive?.current) return;
      dispatch(addNotification(notification));
    };
    socket.on('notification', onNotification);

    return () => {
      socket.off('notification', onNotification);
      cleanupJoin();
    };
    // Sirf user.id par depend karo — user object har profile/settings update par
    // naya reference banata hai, jisse socket needless reconnect hota tha.
  }, [user?.id, dispatch]);

  return (
    <NotificationContext.Provider value={{ count, refreshCount }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationCount() {
  const context = useContext(NotificationContext);
  return context || { count: 0, refreshCount: () => {} };
}
