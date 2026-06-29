import { createSlice } from '@reduxjs/toolkit';
import { api } from '@/lib/api';

const initialState = {
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
      state.list = action.payload;
      const unread = action.payload.filter((n) => !n.read).length;
      state.count = unread;
    },
    markRead: (state, action) => {
      const id = action.payload;
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
      state.list = state.list.filter((n) => n._id !== action.payload);
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

export const selectNotificationCount = (state) => state.notifications.count;
export const selectNotificationsList = (state) => state.notifications.list;

// Thunks
export const fetchNotifications = () => async (dispatch) => {
  try {
    const list = await api.getNotifications({});
    dispatch(setList(list));
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
  }
};

export const markNotificationAsRead = (id) => async (dispatch) => {
  try {
    await api.markNotificationRead(id);
    dispatch(markRead(id));
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
  }
};

export const markAllNotificationsAsRead = () => async (dispatch) => {
  try {
    await api.markAllRead();
    dispatch(markAllRead());
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error);
  }
};

export const deleteNotification = (id) => async (dispatch) => {
  try {
    await api.deleteNotification(id);
    dispatch(removeNotification(id));
  } catch (error) {
    console.error('Failed to delete notification:', error);
  }
};

export const createNotification = (body) => async (dispatch) => {
  try {
    const notification = await api.createNotification(body);
    dispatch(addNotification(notification));
    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error);
    throw error;
  }
};

export default notificationsSlice.reducer;