import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('hms_token');
    if (token) {
      api.me()
        .then(u => setUser(u))
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
    setUser(data.user);
    return data.user;
  };

  const register = async (body) => {
    const data = await api.register(body);
    localStorage.removeItem('token');
    localStorage.setItem('hms_token', data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('hms_token');
    localStorage.removeItem('token');
    setUser(null);
  };

  const completeOtpLogin = ({ token, user }) => {
    localStorage.removeItem('token');
    localStorage.setItem('hms_token', token);
    setUser(user);
  };

  const updateUser = (updates) => setUser(u => ({ ...u, ...updates }));

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
