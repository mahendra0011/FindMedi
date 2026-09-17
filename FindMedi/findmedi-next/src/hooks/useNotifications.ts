/**
 * useNotifications — replaces NotificationContext.jsx (logic portion).
 *
 * Notification state lives in Redux (notificationsSlice).
 * The old NotificationContext also handled Socket.IO — that moves to
 * a dedicated socket provider in Phase 4 (components/shared/realtime/).
 *
 * This hook exposes typed selectors + action dispatchers, plus a
 * refreshCount convenience method that re-fetches from the server.
 */
'use client';

import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  createNotificationAction,
  selectNotificationCount,
  selectNotificationsList,
} from '@/store/slices/notificationsSlice';
import type { NotificationItem } from '@/store/slices/notificationsSlice';

export interface UseNotificationsReturn {
  count: number;
  list: NotificationItem[];
  fetch: () => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  delete: (id: string) => void;
  create: (body: Record<string, unknown>) => Promise<NotificationItem>;
  refreshCount: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const dispatch = useAppDispatch();
  const count = useAppSelector(selectNotificationCount);
  const list = useAppSelector(selectNotificationsList);

  const fetch = useCallback(() => {
    dispatch(fetchNotifications());
  }, [dispatch]);

  const markRead = useCallback((id: string) => {
    dispatch(markNotificationAsRead(id));
  }, [dispatch]);

  const markAllRead = useCallback(() => {
    dispatch(markAllNotificationsAsRead());
  }, [dispatch]);

  const delete_ = useCallback((id: string) => {
    dispatch(deleteNotification(id));
  }, [dispatch]);

  const create = useCallback(
    async (body: Record<string, unknown>): Promise<NotificationItem> => {
      const result = await dispatch(createNotificationAction(body));
      return result as unknown as NotificationItem;
    },
    [dispatch],
  );

  const refreshCount = useCallback(async (): Promise<void> => {
    dispatch(fetchNotifications());
  }, [dispatch]);

  return {
    count,
    list,
    fetch,
    markRead,
    markAllRead,
    delete: delete_,
    create,
    refreshCount,
  };
}
