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

// Async thunk: initialize auth from stored token
export const initializeAuth = () => async (dispatch) => {
  try {
    const token = localStorage.getItem('hms_token');
    if (!token) {
      dispatch(setUser(null));
      dispatch(setLoading(false));
      return;
    }

    const user = await api.me();
    const mergedUser = {
      ...user,
      settings: mergeSettings(readStoredSettings(), user.settings),
    };
    dispatch(setUser(mergedUser));
  } catch (error) {
    localStorage.removeItem('hms_token');
    localStorage.removeItem('token');
    dispatch(setUser(null));
    dispatch(setLoading(false));
  }
};

// Async thunk: login
export const loginUser = (credentials) => async (dispatch) => {
  dispatch(setLoading(true));
  try {
    const data = await api.login(credentials);
    localStorage.removeItem('token');
    localStorage.setItem('hms_token', data.token);

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
    localStorage.removeItem('token');
    localStorage.setItem('hms_token', data.token);

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

// Async thunk: logout
export const logoutUser = () => (dispatch) => {
  localStorage.removeItem('hms_token');
  localStorage.removeItem('token');
  dispatch(logout());
};

export default authSlice.reducer;