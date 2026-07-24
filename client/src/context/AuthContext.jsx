import { createContext, useContext } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser, registerUser, logoutUser, updateUser as updateUserAction, setUser, selectCurrentUser, selectAuthLoading, selectIsAuthenticated } from '@/store/slices/authSlice';
import { mergeSettings, readStoredSettings } from '@/lib/settings';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const loading = useSelector(selectAuthLoading);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  const login = async (email, password, role) => {
    const result = await dispatch(loginUser({ email, password, role }));
    return result.payload;
  };

  const register = async (body) => {
    const result = await dispatch(registerUser(body));
    return result.payload;
  };

  const logout = () => {
    dispatch(logoutUser());
  };

  const updateUser = (updates) => {
    dispatch(updateUserAction(updates));
  };

  const completeOtpLogin = async ({ token, user: userData }) => {
    dispatch(setUser({
      ...userData,
      settings: mergeSettings(readStoredSettings(), userData?.settings),
    }));
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, updateUser, isAuthenticated, completeOtpLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
