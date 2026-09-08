/**
 * useAuth — replaces the old AuthContext.jsx wrapper.
 *
 * Auth state lives in Redux (authSlice), so this hook simply exposes
 * typed selectors + action dispatchers via useAppDispatch/useAppSelector.
 *
 * Components that previously did `const { user, login } = useAuth()` from
 * AuthContext can now `import { useAuth } from '@/hooks/useAuth'` with no
 * other changes.
 */
'use client';

import { useAppDispatch, useAppSelector } from '@/store';
import {
  loginUser,
  registerUser,
  verifyOtp,
  logoutUser,
  setUser,
  updateUser,
  completeOtpLogin,
  completeGoogleLogin,
  selectCurrentUser,
  selectAuthLoading,
  selectIsAuthenticated,
  selectUserRole,
  selectUserSettings,
  selectIsDoctorApproved,
} from '@/store/slices/authSlice';
import { mergeSettings, readStoredSettings } from '@/lib/settings';
import type { User, LoginCredentials, RegisterPayload, AuthResponse } from '@/types/models/user';
import type { UserRole, ApprovalStatus } from '@/types/enums';
import type { AppDispatch } from '@/store';

export interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  role: UserRole | null;
  settings: User['settings'] | undefined;
  isDoctorApproved: boolean;
  login: (credentials: LoginCredentials) => Promise<User>;
  register: (body: RegisterPayload) => Promise<{ user: User | null; requiresVerification?: boolean }>;
  logout: () => Promise<void>;
  verifyOTP: (payload: { email: string; otp: string }) => Promise<User>;
  updateUser: (updates: Partial<User>) => void;
  completeOtpLogin: (payload: { user: User }) => void;
  completeGoogleLogin: (user: User) => void;
}

export function useAuth(): UseAuthReturn {
  const dispatch = useAppDispatch() as AppDispatch;
  const user = useAppSelector(selectCurrentUser);
  const loading = useAppSelector(selectAuthLoading);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const role = useAppSelector(selectUserRole);
  const settings = useAppSelector(selectUserSettings);
  const isDoctorApproved = useAppSelector(selectIsDoctorApproved) as boolean;
  const dispatchTyped = useAppDispatch();

  const login = async (credentials: LoginCredentials): Promise<User> => {
    const result = await dispatchTyped(loginUser(credentials));
    const payload = result.payload as User | undefined;
    if (!payload) {
      throw new Error('Login failed');
    }
    return payload;
  };

  const register = async (body: RegisterPayload): Promise<{ user: User | null; requiresVerification?: boolean }> => {
    const result = await dispatchTyped(registerUser(body));
    if (result.type === 'auth/register/rejected') {
      throw new Error(result.payload as string);
    }
    return result.payload as { user: User | null; requiresVerification?: boolean };
  };

  const logout = async (): Promise<void> => {
    await dispatchTyped(logoutUser());
  };

  const verifyOTP = async ({ email, otp }: { email: string; otp: string }): Promise<User> => {
    const result = await dispatchTyped(verifyOtp({ email, otp }));
    return result.payload as User;
  };

  const handleUpdateUser = (updates: Partial<User>): void => {
    dispatch(updateUser(updates));
  };

  const handleCompleteOtpLogin = ({ user: userData }: { user: User }): void => {
    dispatch(completeOtpLogin({ user: userData }));
  };

  const handleCompleteGoogleLogin = (userData: User): void => {
    dispatch(completeGoogleLogin({ user: userData }));
  };

  return {
    user,
    loading,
    isAuthenticated,
    role,
    settings,
    isDoctorApproved,
    login,
    register,
    logout,
    verifyOTP,
    updateUser: handleUpdateUser,
    completeOtpLogin: handleCompleteOtpLogin,
    completeGoogleLogin: handleCompleteGoogleLogin,
  };
}

// Re-export commonly used actions for direct dispatch
export {
  setUser,
  updateUser,
  completeOtpLogin,
  completeGoogleLogin,
  selectCurrentUser,
  selectAuthLoading,
  selectIsAuthenticated,
  selectUserRole,
  selectUserSettings,
};

export type {
  User as AuthUser,
  LoginCredentials,
  RegisterPayload,
  AuthResponse,
  UserRole,
  ApprovalStatus,
};
