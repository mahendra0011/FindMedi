import { createSlice } from '@reduxjs/toolkit';
import { api } from '@/lib/api';
import type { BaseEntity } from '@/types/api';

export type NotificationType = 'appointment' | 'message' | 'prescription' | 'payment' | 'system' | 'lab_result' | 'review' | 'general';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface NotificationItem extends BaseEntity {
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  read: boolean;
  readAt?: string;
  link?: string;
  recipientId?: string;
  senderId?: string;
  relatedId?: string;
  relatedType?: string;
}

export interface NotificationsState {
  count: number;
  list: NotificationItem[];
}

const initialState: NotificationsState = {
  count: 0,
  list: [],
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setCount: (state, action) => {
      state.count = action.payload;
    },
    setList: (state, action) => {
      state.list = action.payload ?? [];
      state.count = state.list.filter((n) => !n.read).length;
    },
    markRead: (state, action) => {
      const id = action.payload as string;
      const notification = state.list.find((n) => n._id === id);
      if (notification) {
        notification.read = true;
        state.count = state.list.filter((n) => !n.read).length;
      }
    },
    markAllRead: (state) => {
      state.list.forEach((n) => (n.read = true));
      state.count = 0;
    },
    addNotification: (state, action) => {
      state.list.unshift(action.payload);
      if (!action.payload.read) {
        state.count += 1;
      }
    },
    removeNotification: (state, action) => {
      const id = action.payload as string;
      state.list = state.list.filter((n) => n._id !== id);
      state.count = state.list.filter((n) => !n.read).length;
    },
    clearAll: (state) => {
      state.list = [];
      state.count = 0;
    },
  },
});

export const {
  setCount,
  setList,
  markRead,
  markAllRead,
  addNotification,
  removeNotification,
  clearAll,
} = notificationsSlice.actions;

// ─── Selectors ─────────────────────────────────────────────────────────────
export const selectNotificationCount = (state: { notifications: NotificationsState }) =>
  state.notifications.count;
export const selectNotificationsList = (state: { notifications: NotificationsState }) =>
  state.notifications.list;

// ─── Thunks ────────────────────────────────────────────────────────────────

/** Fetch the current user's notifications from the server. */
export const fetchNotifications = () => async (
  dispatch: (action: { type: string; payload?: unknown }) => void,
) => {
  try {
    const list = await api.notifications.get({});
    dispatch(setList(list));
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
  }
};

/** Mark a single notification as read on the server. */
export const markNotificationAsRead = (id: string) => async (
  dispatch: (action: { type: string; payload?: unknown }) => void,
) => {
  try {
    await api.notifications.markRead(id);
    dispatch(markRead(id));
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
  }
};

/** Mark all notifications as read on the server. */
export const markAllNotificationsAsRead = () => async (
  dispatch: (action: { type: string; payload?: unknown }) => void,
) => {
  try {
    await api.notifications.markAllRead();
    dispatch(markAllRead());
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error);
  }
};

/** Delete a notification from the server. */
export const deleteNotification = (id: string) => async (
  dispatch: (action: { type: string; payload?: unknown }) => void,
) => {
  try {
    await api.notifications.delete(id);
    dispatch(removeNotification(id));
  } catch (error) {
    console.error('Failed to delete notification:', error);
  }
};

/** Create a notification on the server (admin action). */
export const createNotificationAction = (body: Record<string, unknown>) => async (
  dispatch: (action: { type: string; payload?: unknown }) => void,
) => {
  try {
    const notification = await api.notifications.create(body);
    dispatch(addNotification(notification));
    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error);
    throw error;
  }
};

export default notificationsSlice.reducer;
