import { createSlice } from '@reduxjs/toolkit';
import { api } from '@/lib/api';
import { mergeSettings, readStoredSettings } from '@/lib/settings';

const initialState = {
  user: null,
  loading: true,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
      state.loading = false;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.loading = false;
    },
    updateUser: (state, action) => {
      const updates = action.payload;
      state.user = {
        ...state.user,
        ...updates,
        settings: mergeSettings(state.user?.settings, updates?.settings),
      };
    },
  },
});

export const { setUser, setLoading, logout, updateUser } = authSlice.actions;

export const selectCurrentUser = (state) => state.auth.user;
export const selectAuthLoading = (state) => state.auth.loading;
export const selectIsAuthenticated = (state) => !!state.auth.user;
export const selectUserRole = (state) => state.auth.user?.role;
export const selectUserSettings = (state) => state.auth.user?.settings;

// Async thunk: initialize auth from httpOnly cookie (auto-sent by browser)
export const initializeAuth = () => async (dispatch) => {
  // Backend restart / HMR reload ke waqt request transiently fail hoti hai —
  // turant logout mat karo, retry karo. Sirf tab logout jab server 401/400 de.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const user = await api.me();
      const mergedUser = {
        ...user,
        settings: mergeSettings(readStoredSettings(), user.settings),
      };
      dispatch(setUser(mergedUser));
      return;
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401 || status === 400 || status === 403) {
        break; // session genuinely invalid → logout
      }
      // Network error / 5xx → backend maybe restarting, wait and retry
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  dispatch(setUser(null));
  dispatch(setLoading(false));
};

// Async thunk: login
export const loginUser = (credentials) => async (dispatch) => {
  dispatch(setLoading(true));
  try {
    const data = await api.login(credentials);
    const mergedUser = {
      ...data.user,
      settings: mergeSettings(readStoredSettings(), data.user?.settings),
    };
    dispatch(setUser(mergedUser));
    return mergedUser;
  } catch (error) {
    dispatch(setLoading(false));
    throw error;
  }
};

// Async thunk: register
export const registerUser = (body) => async (dispatch) => {
  dispatch(setLoading(true));
  try {
    const data = await api.register(body);

    // If OTP verification is required, don't auto-login
    if (data.requiresVerification) {
      dispatch(setLoading(false));
      return { ...data, requiresVerification: true };
    }

    const mergedUser = {
      ...data.user,
      settings: mergeSettings(readStoredSettings(), data.user?.settings),
    };
    if (data.token) {
      dispatch(setUser(mergedUser));
    } else {
      dispatch(setLoading(false));
    }
    return mergedUser;
  } catch (error) {
    dispatch(setLoading(false));
    throw error;
  }
};

// Async thunk: logout
export const logoutUser = () => async (dispatch) => {
  try {
    await api.logout();
  } catch {
    console.warn('Logout request failed, clearing local session');
  }
  // Cached refresh token clear kar do taaki next login tak purana token
  // reuse na ho (cross-origin cookie fallback cache).
  try { (await import('@/lib/axios')).clearRefreshTokenCache?.(); } catch { /* ignore */ }
  dispatch(logout());
};

export default authSlice.reducer;