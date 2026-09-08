/** eslint-disable @typescript-eslint/no-explicit-any */
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { api, type AuthResponse, type LoginCredentials, type RegisterPayload } from '@/lib/api';
import type { User, UserSettings } from '@/types/models/user';
import type { UserRole } from '@/types/enums';
import { mergeSettings, readStoredSettings } from '@/lib/settings';

export interface AuthState {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  loading: true,
  isAuthenticated: false,
};

// ─── Async thunks ─────────────────────────────────────────────────────────

/** Initialize auth — check localStorage for tokens, verify with server. */
export const initializeAuth = createAsyncThunk<
  User | null,
  void,
  { rejectValue: string }
>('auth/initialize', async (_, { rejectWithValue }) => {
  const hasLocalToken =
    typeof window !== 'undefined' &&
    (localStorage.getItem('token') || localStorage.getItem('refreshToken'));

  if (!hasLocalToken) {
    return null;
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const user = await api.me();
      const mergedUser = {
        ...user,
        settings: mergeSettings(readStoredSettings(), user.settings),
      };
      return mergedUser;
    } catch (err: any) {
      const status = err?.response?.status || err?.status;
      if (status === 401 || status === 400 || status === 403) {
        return null; // session genuinely invalid
      }
      // Network error / 5xx → retry
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  return null;
});

/** Login with email + password + role. */
export const loginUser = createAsyncThunk<User, LoginCredentials, { rejectValue: string }>(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const data: AuthResponse = await api.login(credentials);
      const mergedUser = {
        ...data.user,
        settings: mergeSettings(readStoredSettings(), data.user?.settings),
      };
      return mergedUser;
    } catch (err: any) {
      const message = err?.response?.data?.message || err.message || 'Login failed';
      return rejectWithValue(message);
    }
  },
);

/** Register a new account. */
export const registerUser = createAsyncThunk<
  { user: User; requiresVerification?: boolean },
  RegisterPayload,
  { rejectValue: string }
>('auth/register', async (body, { rejectWithValue }) => {
  try {
    const data = await api.register(body);
    if (data.requiresVerification) {
      return { user: null as unknown as User, requiresVerification: true };
    }
    const mergedUser = {
      ...data.user,
      settings: mergeSettings(readStoredSettings(), data.user?.settings),
    };
    return { user: mergedUser, requiresVerification: false };
  } catch (err: any) {
    const message = err?.response?.data?.message || err.message || 'Registration failed';
    return rejectWithValue(message);
  }
});

/** Verify OTP (for login or registration). */
export const verifyOtp = createAsyncThunk<User, { email: string; otp: string }, { rejectValue: string }>(
  'auth/verify-otp',
  async ({ email, otp }, { rejectWithValue }) => {
    try {
      const data: AuthResponse = await api.verifyOTP({ email, otp });
      const mergedUser = {
        ...data.user,
        settings: mergeSettings(readStoredSettings(), data.user?.settings),
      };
      return mergedUser;
    } catch (err: any) {
      const message = err?.response?.data?.message || err.message || 'OTP verification failed';
      return rejectWithValue(message);
    }
  },
);

/** Logout — instantly clears state, fires backend in background. */
export const logoutUser = createAsyncThunk('auth/logout', async () => {
  // Clear tokens from storage
  try { localStorage.removeItem('token'); localStorage.removeItem('refreshToken'); localStorage.removeItem('user'); } catch {}
  // Fire backend logout silently
  try { api.logout().catch(() => {}); } catch {}
});

// ─── Slice ─────────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
      state.loading = false;
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = {
          ...state.user,
          ...action.payload,
          settings: mergeSettings(state.user.settings, action.payload?.settings),
        };
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    completeOtpLogin: (state, action: PayloadAction<{ user: User }>) => {
      const userData = action.payload.user;
      state.user = {
        ...userData,
        settings: mergeSettings(readStoredSettings(), userData?.settings),
      };
      state.isAuthenticated = true;
      state.loading = false;
    },
    completeGoogleLogin: (state, action: PayloadAction<{ user: User }>) => {
      const userData = action.payload.user;
      state.user = {
        ...userData,
        settings: mergeSettings(readStoredSettings(), userData?.settings),
      };
      state.isAuthenticated = true;
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeAuth.pending, (state) => {
        state.loading = true;
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = !!action.payload;
        state.loading = false;
      })
      .addCase(initializeAuth.rejected, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.loading = false;
      })

      .addCase(loginUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
        state.loading = false;
      })
      .addCase(loginUser.rejected, (state) => {
        state.loading = false;
      })

      .addCase(registerUser.fulfilled, (state, action) => {
        if (action.payload.requiresVerification) {
          state.loading = false;
        } else {
          state.user = action.payload.user;
          state.isAuthenticated = !!action.payload.user;
          state.loading = false;
        }
      })
      .addCase(registerUser.rejected, (state) => {
        state.loading = false;
      })

      .addCase(verifyOtp.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
        state.loading = false;
      })
      .addCase(verifyOtp.rejected, (state) => {
        state.loading = false;
      })

      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.loading = false;
      });
  },
});

export const {
  setUser,
  updateUser,
  setLoading,
  completeOtpLogin,
  completeGoogleLogin,
} = authSlice.actions;

// ─── Selectors ─────────────────────────────────────────────────────────────

export const selectCurrentUser = (state: { auth: AuthState }) => state.auth.user;
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.loading;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectUserRole = (state: { auth: AuthState }): UserRole | null => state.auth.user?.role ?? null;
export const selectUserSettings = (state: { auth: AuthState }): UserSettings | undefined => state.auth.user?.settings;
export const selectIsDoctorApproved = (state: { auth: AuthState }) =>
  state.auth.user && (state.auth.user.role === 'doctor' || state.auth.user.role === 'clinic_doctor')
    ? state.auth.user.approvalStatus === 'approved'
    : true;

export default authSlice.reducer;
