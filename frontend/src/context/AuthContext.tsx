import React, { createContext, useContext, ReactNode } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser, registerUser, logoutUser, updateUser as updateUserAction, setUser, selectCurrentUser, selectAuthLoading, selectIsAuthenticated } from '@/store/slices/authSlice';
import { mergeSettings, readStoredSettings } from '@/lib/settings';

export interface AuthUser {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  avatar?: string;
  isVerified?: boolean;
  settings?: any;
  [key: string]: any;
}

export interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password?: string, role?: string) => Promise<any>;
  register: (body: any) => Promise<any>;
  logout: () => void;
  loading: boolean;
  updateUser: (updates: any) => void;
  isAuthenticated: boolean;
  completeOtpLogin: (data: { user: any }) => Promise<void>;
  completeGoogleLogin: (userData: any) => void;
  [key: string]: any;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const dispatch = useDispatch<any>();
  const user = useSelector(selectCurrentUser) as AuthUser | null;
  const loading = useSelector(selectAuthLoading) as boolean;
  const isAuthenticated = useSelector(selectIsAuthenticated) as boolean;

  const login = async (email: string, password?: string, role?: string) => {
    const result = await dispatch(loginUser({ email, password, role }));
    return result.payload;
  };

  const register = async (body: any) => {
    const result = await dispatch(registerUser(body));
    return result.payload;
  };

  const logout = () => {
    dispatch(logoutUser());
  };

  const updateUser = (updates: any) => {
    dispatch(updateUserAction(updates));
  };

  const completeOtpLogin = async ({ user: userData }: { user: any }) => {
    dispatch(setUser({
      ...userData,
      settings: mergeSettings(readStoredSettings(), userData?.settings),
    }));
  };

  const completeGoogleLogin = (userData: any) => {
    dispatch(setUser({
      ...userData,
      settings: mergeSettings(readStoredSettings(), userData?.settings),
    }));
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, updateUser, isAuthenticated, completeOtpLogin, completeGoogleLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
