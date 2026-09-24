import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Switch } from '@/components/ui/switch';
import { CalendarDays, Clock, User, AlertCircle, TrendingUp, DollarSign, Beaker, FileText, Microscope, RotateCcw, Globe, Save, Building2, Users, CheckCircle, CalendarClock, ChevronRight } from 'lucide-react';
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
  const [bookingTab, setBookingTab] = useState('pending');
  const [platformSettings, setPlatformSettings] = useState({
    autoConfirmBookings: true,
    patientSelfBooking: false,
    reportAutoPublish: true,
    smsNotifications: true,
    emergencyStat: false,
    acceptRefunds: true,
    homeCollectionFee: '50',
    freePickupThreshold: '500',
    statFee: '200',
    collectionRadius: '10 km',
    autoRelease: false,
    bankAccount: '',
    bankIfsc: '',
    gstin: '',
  });
  const mounted = useRef(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('lab_platform_settings');
      if (saved) setPlatformSettings(JSON.parse(saved));
    } catch {}
  }, []);

  const handleSavePlatformSettings = () => {
    localStorage.setItem('lab_platform_settings', JSON.stringify(platformSettings));
    toast.success('Lab platform settings updated successfully');
  };

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
  const pendingBookings = bookings.filter(b => b.status === 'Pending');
  const upcomingBookings = bookings.filter(b => b.status === 'Confirmed' || (b.bookingDate && b.bookingDate > today && b.status !== 'Completed' && b.status !== 'Cancelled'));
  const completedBookings = bookings.filter(b => b.status === 'Completed');
  const pendingReports = stats?.pending ?? pendingBookings.length;
  const totalEarned = bookings.filter(b => b.status === 'Completed').reduce((s, b) => s + Number(b.amount || 0), 0);
  const completedTests = bookings.filter(b => b.status === 'Completed').reduce((s, b) => s + (b.tests?.length || 0), 0);
  const totalRefunded = refunds.reduce((s, r) => s + (r.refund_amount || r.amount || 0), 0);
  const pendingRefunds = refunds.filter(r => r.status === 'Pending' || r.status === 'pending').length;

  const displayedBookings = bookingTab === 'pending' ? pendingBookings
    : bookingTab === 'upcoming' ? upcomingBookings
    : bookingTab === 'today' ? todayBookings
    : completedBookings;

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
          <p className="font-heading text-2xl font-bold text-foreground">{stats?.total ?? bookings.length}</p>
          <p className="text-sm text-muted-foreground">Total Bookings</p>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} className="bg-card rounded-2xl border border-border/60 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-warning" />
            </div>
          </div>
          <p className="font-heading text-2xl font-bold text-foreground">{pendingReports}</p>
          <p className="text-sm text-muted-foreground">Pending Approvals</p>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} className="bg-card rounded-2xl border border-border/60 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
          </div>
          <p className="font-heading text-2xl font-bold text-foreground">₹{totalEarned.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">Revenue</p>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} className="bg-card rounded-2xl border border-border/60 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
              <Beaker className="w-5 h-5 text-info" />
            </div>
          </div>
          <p className="font-heading text-2xl font-bold text-foreground">{completedTests}</p>
          <p className="text-sm text-muted-foreground">Completed Tests</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border/60 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              <div>
                <h2 className="font-heading text-lg font-semibold text-foreground">Lab Bookings Hub</h2>
                <p className="text-xs text-muted-foreground">Manage sample collection & testing across 4 stages</p>
              </div>
            </div>

            {/* 4 Tabs: Pending, Upcoming, Today, Completed */}
            <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-2xl border border-border/50 overflow-x-auto">
              <button
                type="button"
                onClick={() => setBookingTab('pending')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  bookingTab === 'pending'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Pending</span>
                {pendingBookings.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${bookingTab === 'pending' ? 'bg-white/20 text-white' : 'bg-amber-500/20 text-amber-600'}`}>
                    {pendingBookings.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setBookingTab('upcoming')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  bookingTab === 'upcoming'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <CalendarClock className="w-3.5 h-3.5" />
                <span>Upcoming</span>
                {upcomingBookings.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${bookingTab === 'upcoming' ? 'bg-white/20 text-white' : 'bg-primary/20 text-primary'}`}>
                    {upcomingBookings.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setBookingTab('today')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  bookingTab === 'today'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Today</span>
                {todayBookings.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${bookingTab === 'today' ? 'bg-white/20 text-white' : 'bg-emerald-600/20 text-emerald-600'}`}>
                    {todayBookings.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setBookingTab('completed')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  bookingTab === 'completed'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Completed</span>
                {completedBookings.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${bookingTab === 'completed' ? 'bg-white/20 text-white' : 'bg-purple-600/20 text-purple-600'}`}>
                    {completedBookings.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {displayedBookings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarDays className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No {bookingTab} bookings found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayedBookings.slice(0, 5).map(b => {
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
                        <Clock className="w-3.5 h-3.5" />{b.timeSlot || b.time || 'Scheduled'}
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

          <div className="mt-4 pt-3 border-t border-border flex justify-end">
            <Link to="/lab-business/bookings" className="text-xs text-primary hover:underline flex items-center gap-1">
              View All Bookings <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
            <Switch
              checked={platformSettings.autoConfirmBookings}
              onCheckedChange={(checked) => setPlatformSettings(s => ({ ...s, autoConfirmBookings: checked }))}
            />
          </div>

          <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm text-foreground">Patient Self-Booking</p>
                <p className="text-xs text-muted-foreground">Allow patients to book tests without approval</p>
              </div>
            </div>
            <Switch
              checked={platformSettings.patientSelfBooking}
              onCheckedChange={(checked) => setPlatformSettings(s => ({ ...s, patientSelfBooking: checked }))}
            />
          </div>

          <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm text-foreground">Report Auto-Publish</p>
                <p className="text-xs text-muted-foreground">Automatically publish test reports after completion</p>
              </div>
            </div>
            <Switch
              checked={platformSettings.reportAutoPublish}
              onCheckedChange={(checked) => setPlatformSettings(s => ({ ...s, reportAutoPublish: checked }))}
            />
          </div>

          <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm text-foreground">SMS Notifications</p>
                <p className="text-xs text-muted-foreground">Send SMS alerts for booking confirmations and report availability</p>
              </div>
            </div>
            <Switch
              checked={platformSettings.smsNotifications}
              onCheckedChange={(checked) => setPlatformSettings(s => ({ ...s, smsNotifications: checked }))}
            />
          </div>

          <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-sm text-foreground">Emergency STAT Processing</p>
                <p className="text-xs text-muted-foreground">Accept 60-min urgent cardiac/ICU reports</p>
              </div>
            </div>
            <Switch
              checked={platformSettings.emergencyStat}
              onCheckedChange={(checked) => setPlatformSettings(s => ({ ...s, emergencyStat: checked }))}
            />
          </div>

          <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
            <div className="flex items-start gap-3">
              <RotateCcw className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm text-foreground">Accept Refunds</p>
                <p className="text-xs text-muted-foreground">100% before rider dispatch, 50% en-route</p>
              </div>
            </div>
            <Switch
              checked={platformSettings.acceptRefunds}
              onCheckedChange={(checked) => setPlatformSettings(s => ({ ...s, acceptRefunds: checked }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            <div><label className="text-xs font-medium">Home Collection Fee ₹</label><input value={platformSettings.homeCollectionFee} onChange={e => setPlatformSettings(s => ({ ...s, homeCollectionFee: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-xs font-medium">Free Pickup Threshold ₹</label><input value={platformSettings.freePickupThreshold} onChange={e => setPlatformSettings(s => ({ ...s, freePickupThreshold: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-xs font-medium">STAT Rush Fee ₹</label><input value={platformSettings.statFee} onChange={e => setPlatformSettings(s => ({ ...s, statFee: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-xs font-medium">Collection Radius</label><select value={platformSettings.collectionRadius} onChange={e => setPlatformSettings(s => ({ ...s, collectionRadius: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm"><option>5 km</option><option>10 km</option><option>15 km</option><option>25 km</option></select></div>
            <label className="flex items-center gap-2 text-xs font-medium"><input type="checkbox" checked={platformSettings.autoRelease} onChange={e => setPlatformSettings(s => ({ ...s, autoRelease: e.target.checked }))} className="rounded" /> Auto-release (no pathologist signoff)</label>
            <div><label className="text-xs font-medium">Pathologist Signature (PNG)</label><input type="file" accept="image/png" onChange={() => toast.success('Signature uploaded')} className="w-full text-xs" /></div>
            <div><label className="text-xs font-medium">Bank Account</label><input value={platformSettings.bankAccount} onChange={e => setPlatformSettings(s => ({ ...s, bankAccount: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-xs font-medium">IFSC</label><input value={platformSettings.bankIfsc} onChange={e => setPlatformSettings(s => ({ ...s, bankIfsc: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-xs font-medium">GSTIN</label><input value={platformSettings.gstin} onChange={e => setPlatformSettings(s => ({ ...s, gstin: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-6 pt-6 border-t border-border">
          <button onClick={handleSavePlatformSettings} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
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
