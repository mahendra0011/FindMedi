/**
 * SocketProvider — Client Component.
 *
 * Wraps the app and maintains the single shared Socket.IO connection.
 * Listens for server-emitted notifications and forwards them to the
 * Redux notifications slice (addNotification).
 *
 * Ported from client/src/context/NotificationContext.jsx (socket integration
 * portion) + client/src/lib/socket.js.
 */
'use client';

import { useEffect, type ReactNode } from 'react';
import { getSocket, disconnectSocket, joinRoom } from '@/lib/socket';
import { useAppDispatch, useAppSelector } from '@/store';
import { addNotification, selectNotificationsList } from '@/store/slices/notificationsSlice';
import type { NotificationItem } from '@/store/slices/notificationsSlice';
import { selectCurrentUser } from '@/store/slices/authSlice';

interface SocketProviderProps {
  children: ReactNode;
}

export default function SocketProvider({ children }: SocketProviderProps) {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);
  const existingNotifications = useAppSelector(selectNotificationsList);

  useEffect(() => {
    if (!user?._id) return;

    const socket = getSocket();

    // Join the user's personal room for targeted notifications
    const cleanupJoin = joinRoom('join', user._id);

    // Handle incoming notifications from the server
    const onNotification = (notification: Partial<NotificationItem>) => {
      const notificationId = notification._id;
      if (!notificationId) return;

      // Skip if we already have this notification (dedupe)
      if (existingNotifications.some((n) => n._id === notificationId)) return;

      dispatch(addNotification({
        ...notification,
        _id: notificationId,
        read: false,
      } as NotificationItem));
    };

    socket.on('notification', onNotification);

    // Listen for unread count updates
    const onUnreadCount = ({ count }: { count: number }) => {
      if (count > 0) {
        // The count is already tracked via addNotification, so we only
        // need to handle count reductions (mark-all-read, etc.) from other devices
        dispatch({ type: 'notifications/setCount', payload: count });
      }
    };
    socket.on('notifications:unread-count', onUnreadCount);

    // Cleanup on unmount or user change
    return () => {
      socket.off('notification', onNotification);
      socket.off('notifications:unread-count', onUnreadCount);
      cleanupJoin();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id, dispatch]);

  // Disconnect on full unmount (e.g., logout)
  useEffect(() => {
    return () => {
      // Only disconnect if there's truly no user left
      if (!user?._id) {
        disconnectSocket();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
