import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, Calendar, CreditCard, FileText, Check, Trash2, AlertCircle, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useNotificationCount } from '@/context/NotificationContext';
import { api } from '@/lib/api';

const typeIcons = { reminder: Calendar, payment: CreditCard, appointment: Calendar, records: FileText, system: AlertCircle };
const typeColors = { reminder: 'bg-warning/10 text-warning', payment: 'bg-success/10 text-success', appointment: 'bg-info/10 text-info', records: 'bg-primary/10 text-primary', system: 'bg-purple-500/10 text-purple-600' };

export default function Notifications() {
  const { user } = useAuth();
  const { refreshCount } = useNotificationCount();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await api.getNotifications({});
      const userId = (user?._id || user?.id)?.toString();
      let filtered = data;
      if (user?.role !== 'admin') {
        filtered = data.filter(n => n.userId === userId);
      }
      setNotifications(filtered);
    } catch (e) { 
      console.error(e);
      setNotifications([]);
    }
    setLoading(false);
  };

  useEffect(() => { loadNotifications(); }, [user]);

  const handleMarkRead = async (id) => {
    try { 
      await api.markNotificationRead(id); 
      loadNotifications();
      refreshCount();
    } catch (e) { console.error(e); }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllRead();
      loadNotifications();
      refreshCount();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id) => {
    try { 
      await api.deleteNotification(id); 
      loadNotifications();
      refreshCount();
    } catch (e) { console.error(e); }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to delete all notifications?')) return;
    try {
      await api.clearAllNotifications();
      loadNotifications();
      refreshCount();
    } catch (e) { console.error(e); }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" className="gap-2" onClick={handleMarkAllRead}>
              <Check className="w-4 h-4" /> Mark all read
            </Button>
          )}
          {notifications.length > 0 && (
            <Button variant="outline" size="sm" className="gap-2 text-destructive hover:bg-destructive/10" onClick={handleClearAll}>
              <Trash className="w-4 h-4" /> Clear all
            </Button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n, i) => {
            const TypeIcon = typeIcons[n.type] || Bell;
            return (
              <motion.div key={n._id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className={`bg-card rounded-2xl border p-4 flex items-start gap-4 transition-all ${n.read ? 'border-border/60 opacity-70' : 'border-primary/30 bg-primary/5'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${typeColors[n.type] || 'bg-muted text-muted-foreground'}`}>
                  <TypeIcon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className={`font-medium text-sm ${n.read ? 'text-muted-foreground' : 'text-foreground'}`}>{n.title}</h3>
                    {!n.read && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">{n.date}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!n.read && (
                    <Button variant="ghost" size="sm" onClick={() => handleMarkRead(n._id)} className="h-8 w-8 p-0">
                      <Check className="w-4 h-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(n._id)} className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
