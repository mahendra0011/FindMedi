import { createSlice } from '@reduxjs/toolkit';
import { api } from '@/lib/api';
import { mergeSettings, readStoredSettings } from '@/lib/settings';

const initialState = {
  user: null,
  loading: true,
  // ─── FE-B-02: session state the UI can actually explain ───────────────────
  // `sessionExpired` and `initError` separate three outcomes that used to render
  // identically as an empty dashboard:
  //   - never signed in        → user === null, no error
  //   - session genuinely gone → sessionExpired === true  ("please sign in again")
  //   - backend unreachable    → initError set            ("try again", not "log out")
  // Collapsing these is what made a 5xx look like a logout, which both confused
  // users and hid CSRF/401 regressions from the team in production.
  sessionExpired: false,
  initError: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
      state.loading = false;
      // A successful hydration clears any previous failure.
      if (action.payload) {
        state.sessionExpired = false;
        state.initError = null;
      }
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    // FE-B-02: an explicit action so the failure is a STATE the UI can render,
    // not a `catch { /* ignore */ }` that leaves `loading: true` forever.
    setInitError: (state, action) => {
      state.initError = action.payload;
      state.loading = false;
    },
    setSessionExpired: (state, action) => {
      state.sessionExpired = action.payload !== false;
      state.loading = false;
      if (action.payload !== false) {
        state.user = null;
        state.initError = null;
      }
    },
    logout: (state) => {
      state.user = null;
      state.loading = false;
      state.sessionExpired = false;
      state.initError = null;
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

export const {
  setUser,
  setLoading,
  setInitError,
  setSessionExpired,
  logout,
  updateUser,
} = authSlice.actions;

export const selectCurrentUser = (state) => state.auth.user;
export const selectAuthLoading = (state) => state.auth.loading;
export const selectIsAuthenticated = (state) => !!state.auth.user;
export const selectUserRole = (state) => state.auth.user?.role;
export const selectUserSettings = (state) => state.auth.user?.settings;
export const selectSessionExpired = (state) => state.auth.sessionExpired;
export const selectInitError = (state) => state.auth.initError;

// Async thunk: initialize auth
export const initializeAuth = () => async (dispatch) => {
  // FE-B-01: the presence check can no longer be `localStorage.getItem('token')`
  // — that token no longer exists, and keying off it would make a valid session
  // look like a logged-out one on every page load.
  //
  // There is no way to test an httpOnly cookie from JavaScript, so we ask the
  // server instead: a 401 means "no session", anything else that fails is a real
  // error worth showing. `api.me()` also triggers the axios refresh interceptor,
  // so a page reload silently re-establishes the session from the refresh cookie.
  let lastError = null;

  // If a session may exist, verify with server. Three attempts with linear backoff
  // cover a backend restart without hammering it.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const user = await api.me();
      const mergedUser = {
        ...user,
        settings: mergeSettings(readStoredSettings(), user.settings),
      };
      // setUser clears sessionExpired/initError on success.
      dispatch(setUser(mergedUser));
      return;
    } catch (err) {
      const status = err?.response?.status || err?.status;

      if (status === 401) {
        // A real, authoritative "no session". This is the only path that logs
        // the user out — everything else must not, or a network blip signs
        // people out of a clinical system.
        dispatch(setSessionExpired(true));
        return;
      }

      if (status === 400 || status === 403) {
        // The session exists but is not permitted — a banned or unverified
        // account. Also a genuine expiry, not a transient fault.
        dispatch(setSessionExpired(true));
        return;
      }

      lastError = err;
      // Network error / 5xx → backend maybe restarting, wait and retry.
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }

  // FE-B-02: three failures and we now SURFACE it. The old code fell through to
  // `setUser(null)`, which rendered as a blank dashboard with no explanation and
  // no retry — indistinguishable from being logged out.
  dispatch(setInitError(
    lastError?.response?.status
      ? `Server returned ${lastError.response.status}. Please try again.`
      : 'Could not reach the server. Check your connection and try again.'
  ));
};

// Async thunk: login
export const loginUser = (credentials) => async (dispatch) => {
  dispatch(setLoading(true));
  try {
    const data = await api.login(credentials);
    // AUTH-B-03: password alone is not a session when 2FA is enrolled — the
    // server returns a short-lived ticket instead of a token. Pass it back to
    // the caller so the UI can collect the TOTP / backup code.
    if (data?.requiresTwoFactor) {
      dispatch(setLoading(false));
      return { requiresTwoFactor: true, twoFactorTicket: data.twoFactorTicket, email: data.email };
    }
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

// Async thunk: second leg of a 2FA login (ticket + TOTP/backup code -> session)
export const completeTwoFactorLogin = ({ twoFactorTicket, token, backupCode }) => async (dispatch) => {
  dispatch(setLoading(true));
  try {
    const data = await api.complete2FA({ twoFactorTicket, token, backupCode });
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
export const logoutUser = () => (dispatch) => {
  // 1. Instantly clear the in-memory token and reset Redux user state (0ms logout).
  //    FE-B-01: `token`/`refreshToken` are no longer in localStorage — they are
  //    httpOnly cookies the server clears on /auth/logout. The removals below are
  //    kept ONLY as a one-time migration for sessions created by an older build;
  //    they are harmless no-ops otherwise.
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  } catch { /* ignore */ }

  try {
    import('@/lib/axios').then(m => m.clearRefreshTokenCache?.()).catch(() => {});
  } catch { /* ignore */ }

  dispatch(logout());

  // 2. Fire backend logout in background without blocking UI
  api.logout().catch(() => {});
};

export default authSlice.reducer;