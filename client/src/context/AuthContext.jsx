import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { applyUserSettings, mergeSettings, readStoredSettings } from '@/lib/settings';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    applyUserSettings(mergeSettings(readStoredSettings(), user?.settings));
  }, [user?.settings]);

  useEffect(() => {
    const token = localStorage.getItem('hms_token');
    if (token) {
      api.me()
        .then(u => setUser({ ...u, settings: mergeSettings(readStoredSettings(), u.settings) }))
        .catch(() => {
          localStorage.removeItem('hms_token');
          localStorage.removeItem('token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password, role, secretKey = '') => {
    const data = await api.login({ email, password, role, secretKey });
    localStorage.removeItem('token');
    localStorage.setItem('hms_token', data.token);
    const nextUser = { ...data.user, settings: mergeSettings(readStoredSettings(), data.user?.settings) };
    setUser(nextUser);
    return nextUser;
  };

  const register = async (body) => {
    const data = await api.register(body);
    localStorage.removeItem('token');
    localStorage.setItem('hms_token', data.token);
    const nextUser = { ...data.user, settings: mergeSettings(readStoredSettings(), data.user?.settings) };
    setUser(nextUser);
    return nextUser;
  };

  const logout = () => {
    localStorage.removeItem('hms_token');
    localStorage.removeItem('token');
    setUser(null);
  };

  const completeOtpLogin = ({ token, user }) => {
    localStorage.removeItem('token');
    localStorage.setItem('hms_token', token);
    setUser({ ...user, settings: mergeSettings(readStoredSettings(), user?.settings) });
  };

  const updateUser = (updates) => setUser(u => ({
    ...u,
    ...updates,
    settings: mergeSettings(u?.settings, updates?.settings),
  }));

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, updateUser, completeOtpLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
