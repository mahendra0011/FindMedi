import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CalendarDays, Clock, AlertTriangle, Info, CheckCheck, Trash2, RefreshCw, FileText, User, Pill, Star, CreditCard, MessageSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

const typeIcons = {
  booking: CalendarDays,
  reminder: Clock,
  alert: AlertTriangle,
  update: Info,
  review: Star,
  billing: CreditCard,
  prescription: Pill,
  message: MessageSquare,
};
const typeColors = {
  booking: 'bg-blue-100 text-blue-600',
  reminder: 'bg-amber-100 text-amber-600',
  alert: 'bg-red-100 text-red-600',
  update: 'bg-purple-100 text-purple-600',
  review: 'bg-green-100 text-green-600',
  billing: 'bg-cyan-100 text-cyan-600',
  prescription: 'bg-pink-100 text-pink-600',
  message: 'bg-gray-100 text-gray-600',
};
const filters = ['All', 'Booking', 'Reminder', 'Alert', 'Update', 'Review', 'Billing'];

export default function ClinicNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [detailModal, setDetailModal] = useState(null);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await api.getNotifications({ doctor: user?.name, type: filter });
      setNotifications(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadNotifications(); }, [filter, user?.name]);

  const filtered = notifications.filter(n => {
    if (search) {
      const q = search.toLowerCase();
      if (!n.title?.toLowerCase().includes(q) && !n.message?.toLowerCase().includes(q)) return false;
    }
    if (filter === 'All') return true;
    return n.type === filter.toLowerCase();
  });

  const markRead = async (id) => {
    try {
      await api.updateNotification(id, { read: true });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    } catch (e) { console.error(e); }
  };

  const markAllRead = async () => {
    try {
      await Promise.all(notifications.filter(n => !n.read).map(n => api.updateNotification(n._id, { read: true })));
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (e) { console.error(e); }
  };

  const clearAll = async () => {
    try {
      await Promise.all(notifications.map(n => api.deleteNotification(n._id)));
      setNotifications([]);
    } catch (e) { console.error(e); }
  };

  const deleteSelected = async () => {
    try {
      await Promise.all([...selectedIds].map(id => api.deleteNotification(id)));
      setNotifications(prev => prev.filter(n => !selectedIds.has(n._id)));
      setSelectedIds(new Set());
      setBulkMode(false);
    } catch (e) { console.error(e); }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground text-sm">
            {unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead}>
              <CheckCheck className="w-4 h-4 mr-1" /> Mark All Read
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setBulkMode(!bulkMode)}>
            <Trash2 className="w-4 h-4 mr-1" /> {bulkMode ? 'Cancel' : 'Manage'}
          </Button>
          <Button variant="ghost" size="sm" onClick={loadNotifications}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </div>
      </motion.div>

      {/* Search + Filters */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        <Input
          placeholder="Search notifications..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-md"
        />
        <div className="flex flex-wrap gap-2">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Bulk Actions */}
      {bulkMode && selectedIds.size > 0 && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Button variant="destructive" size="sm" onClick={deleteSelected}>
            <Trash2 className="w-4 h-4 mr-1" /> Delete Selected
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setSelectedIds(new Set()); setBulkMode(false); }}>
            Cancel
          </Button>
        </motion.div>
      )}

      {/* Notification List */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Bell className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg font-medium">No notifications</p>
            <p className="text-sm">{search ? 'Try a different search term' : filter !== 'All' ? 'No notifications in this category' : 'You are all caught up'}</p>
          </motion.div>
        ) : (
          <AnimatePresence>
            {filtered.map((n, i) => {
              const Icon = typeIcons[n.type] || Bell;
              const color = typeColors[n.type] || 'bg-gray-100 text-gray-600';
              return (
                <motion.div
                  key={n._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.03 }}
                  className={`group flex items-start gap-4 p-4 rounded-xl border transition-colors cursor-pointer ${
                    n.read ? 'bg-card' : 'bg-primary/5 border-primary/20'
                  } hover:bg-accent`}
                  onClick={() => { if (!bulkMode) setDetailModal(n); }}
                >
                  {bulkMode && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(n._id)}
                      onChange={() => toggleSelect(n._id)}
                      className="mt-1"
                      onClick={e => e.stopPropagation()}
                    />
                  )}
                  <div className={`p-2.5 rounded-full shrink-0 ${color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm ${n.read ? '' : 'font-semibold'}`}>{n.title}</p>
                      <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                        {n.createdAt ? new Date(n.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    {n.patient && <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><User className="w-3 h-3" /> {n.patient}</p>}
                  </div>
                  {!n.read && !bulkMode && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={e => { e.stopPropagation(); markRead(n._id); }}
                    >
                      <CheckCheck className="w-4 h-4" />
                    </Button>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Clear All */}
      {!loading && filtered.length > 0 && (
        <div className="flex justify-center pt-2">
          <Button variant="ghost" size="sm" onClick={clearAll}>
            <Trash2 className="w-4 h-4 mr-1" /> Clear All Notifications
          </Button>
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {detailModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setDetailModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4"
              onClick={e => e.stopPropagation()}
            >
                <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-full ${typeColors[detailModal.type] || 'bg-gray-100 text-gray-600'}`}>
                    {(() => { const Icon = typeIcons[detailModal.type] || Bell; return <Icon className="w-5 h-5" />; })()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{detailModal.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {detailModal.createdAt ? new Date(detailModal.createdAt).toLocaleString('en-IN') : ''}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setDetailModal(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">{detailModal.message}</p>
              {detailModal.patient && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span>Patient: <strong>{detailModal.patient}</strong></span>
                </div>
              )}
              {detailModal.appointmentId && (
                <div className="flex items-center gap-2 text-sm">
                  <CalendarDays className="w-4 h-4 text-muted-foreground" />
                  <span>Appointment ID: <strong>{detailModal.appointmentId}</strong></span>
                </div>
              )}
              {!detailModal.read && (
                <Button className="w-full" onClick={() => { markRead(detailModal._id); setDetailModal(prev => ({ ...prev, read: true })); }}>
                  <CheckCheck className="w-4 h-4 mr-1" /> Mark as Read
                </Button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
