import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "@/lib/api";

/* ─── Initial State ──────────────────────────────────────────────────────────── */
const initialState = {
  items: [],
  status: "idle", // "idle" | "loading" | "succeeded" | "failed"
  error: null,
};

/* --- Async Thunks ------------------------------------------------------------- */

/**
 * Fetch the current user's notifications (public + role-based).
 */
export const fetchNotifications = createAsyncThunk(
  "notifications/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/api/notifications/my");
      return Array.isArray(data) ? data : [];
    } catch (error) {
      return rejectWithValue(error.message || "Failed to load notifications");
    }
  }
);

/**
 * Mark a single notification as read.
 */
export const markNotificationRead = createAsyncThunk(
  "notifications/markRead",
  async (notificationId, { rejectWithValue }) => {
    try {
      const { data } = await api.patch(`/api/notifications/${encodeURIComponent(notificationId)}/read`);
      return data;
    } catch (error) {
      return rejectWithValue(error.message || "Failed to mark notification read");
    }
  }
);

/**
 * Mark all notifications as read in the store without optimistic updates.
 */
export const markAllNotificationsRead = createAsyncThunk(
  "notifications/markAllRead",
  async (_, { getState }) => {
    const state = getState();
    const items = state.notifications?.items || [];
    const unread = items.filter((n) => !n.read);
    try {
      await Promise.all(
        unread.map((n) =>
          api.patch(`/api/notifications/${encodeURIComponent(n.id)}/read`).catch(() => null)
        )
      );
    } catch {
      // ignore batch failure; individual calls above already ignore errors
    }
    return unread.map((n) => ({ ...n, read: true }));
  }
);

/* ─── Slice ──────────────────────────────────────────────────────────────────── */
const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    /**
     * Replace existing notifications (e.g., on pull-to-refresh).
     */
    setNotifications(state, action) {
      state.items = action.payload;
      state.error = null;
    },
    /**
     * Remove a notification (e.g., after a soft-delete).
     */
    removeNotification(state, action) {
      state.items = state.items.filter((n) => n.id !== action.payload);
    },
    /**
     * Clear all notifications (e.g., on logout).
     */
    clearNotifications() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder

      /* ── fetchNotifications ──────────────────────────────────────────────── */
      .addCase(fetchNotifications.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      /* ── markNotificationRead ─────────────────────────────────────────────── */
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        const index = state.items.findIndex((n) => n.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = { ...state.items[index], ...action.payload, read: true };
        }
      })
      .addCase(markNotificationRead.rejected, (state) => {
        // Keep previous state; caller can show a toast
      })

      /* ── markAllNotificationsRead ─────────────────────────────────────────── */
      .addCase(markAllNotificationsRead.fulfilled, (state, action) => {
        state.items = action.payload;
      });
  },
});

/* ─── Exports ────────────────────────────────────────────────────────────────── */
export const {
  setNotifications,
  removeNotification,
  clearNotifications,
} = notificationsSlice.actions;

/* ─── Selectors ──────────────────────────────────────────────────────────────── */
export const selectNotifications = (state) => state.notifications.items;
export const selectUnreadNotifications = (state) =>
  state.notifications.items.filter((n) => !n.read);
export const selectUnreadNotificationsCount = (state) =>
  state.notifications.items.filter((n) => !n.read).length;
export const selectNotificationsStatus = (state) => state.notifications.status;
export const selectNotificationsError = (state) => state.notifications.error;

export default notificationsSlice.reducer;
