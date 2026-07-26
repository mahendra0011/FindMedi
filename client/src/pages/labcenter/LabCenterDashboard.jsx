import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Clock, User, AlertCircle, TrendingUp, DollarSign, Beaker, FileText, Microscope, RotateCcw, Globe, Save, Building2, Users, CheckCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import LicenseExpiryReminder from '@/components/LicenseExpiryReminder';
import { getISTDateString } from '@/lib/dateUtils';

const statusColors = {
  Pending: { bg: 'bg-warning/10', text: 'text-warning' },
  Confirmed: { bg: 'bg-success/10', text: 'text-success' },
  Completed: { bg: 'bg-primary/10', text: 'text-primary' },
  Cancelled: { bg: 'bg-destructive/10', text: 'text-destructive' },
};

export default function LabCenterDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const load = async () => {
      setLoading(true);
      try {
        const results = await Promise.allSettled([
          api.getLabStats(),
          api.getLabBookings({}),
          api.getRefunds(),
        ]);
        if (!mounted.current) return;
        const [s, b, rf] = results.map(res => res.status === 'fulfilled' ? res.value : null);
        setStats(s);
        setBookings(b?.bookings || []);
        setRefunds((rf?.payments || rf?.data || []).slice(0, 5));
        const failed = results.filter(r => r.status === 'rejected');
        if (failed.length > 0) toast.error(`Failed to load ${failed.length} data source(s)`);
      } catch (e) { console.error(e); toast.error('Failed to load dashboard data'); }
      if (mounted.current) setLoading(false);
    };
    load();
    return () => { mounted.current = false; };
  }, []);

  const today = getISTDateString();
  const todayBookings = bookings.filter(b => (b.bookingDate || '').startsWith(today));
  const pendingReports = stats?.pending ?? bookings.filter(b => b.status === 'Pending' || b.status === 'Confirmed').length;
  const totalEarned = bookings.filter(b => b.status === 'Completed').reduce((s, b) => s + Number(b.amount || 0), 0);
  const completedTests = bookings.filter(b => b.status === 'Completed').reduce((s, b) => s + (b.tests?.length || 0), 0);
  const totalRefunded = refunds.reduce((s, r) => s + (r.refund_amount || r.amount || 0), 0);
  const pendingRefunds = refunds.filter(r => r.status === 'Pending' || r.status === 'pending').length;

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <LicenseExpiryReminder />
      <div className="bg-gradient-to-r from-primary to-primary/80 rounded-3xl p-6 text-white">
        <h1 className="font-heading text-2xl font-bold">Lab Center Dashboard</h1>
        <p className="opacity-90">Welcome, {user?.name || 'Lab Admin'}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div whileHover={{ scale: 1.02 }} className="bg-card rounded-2xl border border-border/60 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-success" />
            </div>
          </div>
          <p className="font-heading text-2xl font-bold text-foreground">{stats?.total ?? todayBookings.length}</p>
          <p className="text-sm text-muted-foreground">Total Bookings</p>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} className="bg-card rounded-2xl border border-border/60 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-warning" />
            </div>
          </div>
          <p className="font-heading text-2xl font-bold text-foreground">{stats?.pending ?? pendingReports}</p>
          <p className="text-sm text-muted-foreground">Pending Reports</p>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} className="bg-card rounded-2xl border border-border/60 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
          </div>
          <p className="font-heading text-2xl font-bold text-foreground">₹{totalEarned.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">Revenue Today</p>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} className="bg-card rounded-2xl border border-border/60 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
              <Beaker className="w-5 h-5 text-info" />
            </div>
          </div>
          <p className="font-heading text-2xl font-bold text-foreground">{stats?.completed ?? completedTests}</p>
          <p className="text-sm text-muted-foreground">Completed Tests</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" /> Recent Bookings
            </h2>
            <span className="text-xs text-muted-foreground">{today}</span>
          </div>

          {todayBookings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarDays className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No bookings today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayBookings.slice(0, 5).map(b => {
                const colors = statusColors[b.status] || statusColors.Pending;
                return (
                  <motion.div key={b._id || b.id} whileHover={{ x: 4 }}
                    className="flex items-center justify-between p-4 bg-muted/30 rounded-xl hover:bg-muted/50 transition-all">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center`}>
                        <User className={`w-5 h-5 ${colors.text}`} />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{b.patientName || b.patient}</p>
                        <p className="text-xs text-muted-foreground">{(b.tests || []).join(', ')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />{b.timeSlot || b.time}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text}`}>
                        {b.status}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-card rounded-2xl border border-border/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-warning" /> Pending Reports
            </h2>
          </div>

          {bookings.filter(b => b.status !== 'Completed').length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No pending reports</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.filter(b => b.status !== 'Completed').slice(0, 5).map(b => (
                <div key={b._id || b.id} className="p-4 bg-muted/30 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-foreground">{b.patientName || b.patient}</p>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">In Progress</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{(b.tests || []).join(', ')}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />{b.timeSlot || b.time}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Refund Section */}
      <div className="bg-card rounded-2xl border border-border/60 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-destructive" /> Refunds
          </h2>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-destructive font-medium">₹{totalRefunded.toLocaleString()} Total</span>
            <span className="text-warning font-medium">{pendingRefunds} Pending</span>
          </div>
        </div>
        {refunds.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <RotateCcw className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>No refunds found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {refunds.map(r => (
              <div key={r._id} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                    <RotateCcw className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{r.patientName || r.patient || '—'}</p>
                    <p className="text-xs text-muted-foreground">{r.reason || r.description || 'Refund'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-destructive">₹{(r.refund_amount || r.amount || 0).toLocaleString()}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.status === 'Refunded' || r.status === 'refunded' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'}`}>
                    {r.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Platform Settings Section */}
      <div className="bg-card rounded-2xl border border-border/60 p-6 mb-6">
        <div className="flex items-center gap-2 mb-5">
          <Globe className="w-4 h-4 text-primary" />
          <h3 className="font-heading font-semibold text-lg text-foreground">Platform Settings</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-success/5 rounded-lg border border-success/20 p-4">
            <p className="text-2xl font-bold text-success">Active</p>
            <p className="text-xs text-muted-foreground">Platform Status</p>
          </div>
          <div className="bg-primary/5 rounded-lg border border-primary/20 p-4">
            <p className="text-2xl font-bold text-primary">{stats?.total ?? '—'}</p>
            <p className="text-xs text-muted-foreground">Total Bookings</p>
          </div>
          <div className="bg-info/5 rounded-lg border border-info/20 p-4">
            <p className="text-2xl font-bold text-info">{stats?.completed ?? completedTests}</p>
            <p className="text-xs text-muted-foreground">Completed Tests</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
            <div className="flex items-start gap-3">
              <Building2 className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm text-foreground">Auto Confirm Bookings</p>
                <p className="text-xs text-muted-foreground">Automatically confirm bookings after payment</p>
              </div>
            </div>
            <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary transition-colors">
              <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
            </button>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm text-foreground">Patient Self-Booking</p>
                <p className="text-xs text-muted-foreground">Allow patients to book tests without approval</p>
              </div>
            </div>
            <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-300 transition-colors">
              <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-1" />
            </button>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm text-foreground">Report Auto-Publish</p>
                <p className="text-xs text-muted-foreground">Automatically publish test reports after completion</p>
              </div>
            </div>
            <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary transition-colors">
              <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
            </button>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm text-foreground">SMS Notifications</p>
                <p className="text-xs text-muted-foreground">Send SMS alerts for booking confirmations and report availability</p>
              </div>
            </div>
            <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary transition-colors">
              <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-6 pt-6 border-t border-border">
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <Save className="w-4 h-4" />
            Save Platform Settings
          </button>
          <span className="text-xs text-muted-foreground">Changes apply platform-wide</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link to="/lab-business/tests" className="block">
          <motion.div whileHover={{ scale: 1.03 }} className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/20 p-4 text-center cursor-pointer">
            <Microscope className="w-6 h-6 mx-auto text-primary mb-1" />
            <p className="font-semibold text-sm text-foreground">Test Catalog</p>
            <p className="text-xs text-muted-foreground">Manage tests</p>
          </motion.div>
        </Link>
        <Link to="/lab-business/appointments" className="block">
          <motion.div whileHover={{ scale: 1.03 }} className="bg-gradient-to-br from-success/10 to-success/5 rounded-2xl border border-success/20 p-4 text-center cursor-pointer">
            <CalendarDays className="w-6 h-6 mx-auto text-success mb-1" />
            <p className="font-semibold text-sm text-foreground">Bookings</p>
            <p className="text-xs text-muted-foreground">Manage bookings</p>
          </motion.div>
        </Link>
        <Link to="/lab-business/prescriptions" className="block">
          <motion.div whileHover={{ scale: 1.03 }} className="bg-gradient-to-br from-warning/10 to-warning/5 rounded-2xl border border-warning/20 p-4 text-center cursor-pointer">
            <FileText className="w-6 h-6 mx-auto text-warning mb-1" />
            <p className="font-semibold text-sm text-foreground">Rx Queue</p>
            <p className="text-xs text-muted-foreground">Verify prescriptions</p>
          </motion.div>
        </Link>
        <motion.div whileHover={{ scale: 1.03 }} className="bg-gradient-to-br from-info/10 to-info/5 rounded-2xl border border-info/20 p-4 text-center cursor-pointer">
          <TrendingUp className="w-6 h-6 mx-auto text-info mb-1" />
          <p className="font-semibold text-sm text-foreground">₹{totalEarned.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Total Revenue</p>
        </motion.div>
      </div>
    </div>
  );
}
