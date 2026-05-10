import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const refreshCount = useCallback(async () => {
    if (!user || user.settings?.systemNotifications === false) { setCount(0); return; }
    try {
      const list = await api.getNotifications({});
      const userId = (user._id || user.id)?.toString();
      console.log('[NotificationContext] user.role:', user.role, 'userId:', userId);
      console.log('[NotificationContext] all notifications from API:', list.map(n => ({ id: n._id, userId: n.userId, title: n.title })));
      let filtered = list;
      if (user.role !== 'admin') {
        filtered = list.filter(n => n.userId === userId);
        console.log('[NotificationContext] after filter userId check:', filtered.map(n => ({ id: n._id, userId: n.userId, title: n.title })));
      }
      const unread = filtered.filter(n => !n.read).length;
      setCount(unread);
    } catch (e) { 
      console.error('[NotificationContext] error:', e);
      setCount(0);
    }
  }, [user]);

  useEffect(() => {
    if (user && user.settings?.systemNotifications !== false) {
      refreshCount();
      const interval = setInterval(refreshCount, 5000);
      return () => clearInterval(interval);
    }
    setCount(0);
  }, [user, refreshCount]);

  return (
    <NotificationContext.Provider value={{ count, refreshCount }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationCount() {
  const context = useContext(NotificationContext);
  return context || { count: 0, refreshCount: () => {} };
}
