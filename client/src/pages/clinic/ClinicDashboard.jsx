import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  CalendarDays, Calendar, User, CheckCircle, AlertCircle, Stethoscope, Clock, Star, Users,
  IndianRupee, TrendingUp, RotateCcw, Sparkles, ChevronRight, Quote, MessageCircle,
  ClipboardList, TestTube, FileText, Bell, Zap, Syringe, Pill, Ambulance, Activity,
  Download, CreditCard, Smartphone, Landmark, Wallet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { api, downloadPaymentInvoice } from '@/lib/api';
import { getISTDateString, formatDisplayDate } from '@/lib/dateUtils';
import { useAppointmentRealtime } from '@/lib/useAppointmentRealtime';
import LicenseExpiryReminder from '@/components/LicenseExpiryReminder';
import EarningsAnalytics from '@/components/EarningsAnalytics';

const StatusBadge = ({ status }) => {
  const colors = {
    Confirmed: 'bg-success/10 text-success', Pending: 'bg-warning/10 text-warning', Completed: 'bg-success/10 text-success',
    Cancelled: 'bg-destructive/10 text-destructive', Shipped: 'bg-info/10 text-info', Delivered: 'bg-success/10 text-success',
    Active: 'bg-info/10 text-info', Dispensed: 'bg-success/10 text-success', Ready: 'bg-success/10 text-success',
    Paid: 'bg-success/10 text-success', Unpaid: 'bg-warning/10 text-warning', Failed: 'bg-destructive/10 text-destructive',
  };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[status] || 'bg-muted text-muted-foreground'}`}>{status}</span>;
};

const methodIcons = { card: CreditCard, upi: Smartphone, netbanking: Landmark, cash: Wallet };

// 8-card stats grid — mirrors PatientDashboard's clickable colored tiles
const statCards = [
  { icon: CalendarDays, label: "Today's Appts", color: 'text-emerald-500', bg: 'bg-emerald-500/10', link: '/clinic/appointments' },
  { icon: CheckCircle, label: 'Completed', color: 'text-blue-500', bg: 'bg-blue-500/10', link: '/clinic/appointments' },
  { icon: Clock, label: 'Not Completed', color: 'text-violet-500', bg: 'bg-violet-500/10', link: '/clinic/appointments' },
  { icon: AlertCircle, label: 'Pending', color: 'text-amber-500', bg: 'bg-amber-500/10', link: '/clinic/appointments' },
  { icon: IndianRupee, label: "Today's Revenue", color: 'text-orange-500', bg: 'bg-orange-500/10', link: '/clinic/billing' },
  { icon: Calendar, label: 'Week Appts', color: 'text-cyan-500', bg: 'bg-cyan-500/10', link: '/clinic/appointments' },
  { icon: TrendingUp, label: 'Week Revenue', color: 'text-purple-500', bg: 'bg-purple-500/10', link: '/clinic/billing' },
  { icon: TestTube, label: 'Test Requests', color: 'text-rose-500', bg: 'bg-rose-500/10', link: '/clinic/test-requests' },
];

const quickActions = [
  { label: 'Schedule', icon: CalendarDays, link: '/clinic/schedule', desc: 'Manage slots' },
  { label: 'Patients', icon: Users, link: '/clinic/patients', desc: 'View records' },
  { label: 'Prescriptions', icon: ClipboardList, link: '/clinic/prescriptions', desc: 'Write Rx' },
  { label: 'Lab Tests', icon: Syringe, link: '/clinic/tests', desc: 'Order tests' },
  { label: 'Billing', icon: IndianRupee, link: '/clinic/billing', desc: 'Invoices' },
  { label: 'Consultations', icon: Stethoscope, link: '/clinic/consultations', desc: 'Active visits' },
];

const clinicTips = [
  'Review today\'s appointments before starting consultations.',
  'Confirm pending appointments promptly to avoid no-shows.',
  'Keep patient records updated after each visit.',
  'Follow up with patients who have pending lab tests.',
];

export default function ClinicDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [bills, setBills] = useState([]);
  const [payments, setPayments] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [patients, setPatients] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [testRequests, setTestRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tipIndex, setTipIndex] = useState(0);
  const [greeting, setGreeting] = useState('');
  const mounted = useRef(true);

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting('Good morning');
    else if (h < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex(i => (i + 1) % clinicTips.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        api.getAppointments(),
        api.getBilling(),
        api.getReviews(),
        api.getPayments({ status: 'refunded' }),
        api.getPayments({ status: 'pending' }),
        api.getPayments({}),
        api.getLabBookings(),
      ]);
      if (!mounted.current) return;
      const [a, b, r, rf, pf, allP, lb] = results.map(res => res.status === 'fulfilled' ? res.value : []);
      const appts = a?.data || a || [];
      const myAppts = appts?.filter(apt => apt.doctor?.toLowerCase().includes(user?.name?.toLowerCase())) || [];
      setAppointments(myAppts);
      const billsArray = b?.data || b?.bills || b || [];
      setBills(billsArray);
      setReviews(r?.filter(rv => rv.doctorName === user?.name) || []);
      const refundedArray = rf?.payments || rf?.data || rf || [];
      const pendingArray = pf?.payments || pf?.data || pf || [];
      setRefunds([...refundedArray, ...pendingArray]);
      const allPayments = allP?.payments || allP?.data || allP || [];
      setPayments(allPayments);
      setPatients(Array.from(new Set(myAppts.map(apt => apt.patient).filter(Boolean))));
      const labBookingsArray = lb?.bookings || lb?.data || lb || [];
      setTestRequests(labBookingsArray);
      // best-effort prescriptions load
      try {
        const rx = await api.getPharmacyPrescriptions?.({}).catch(() => ({ prescriptions: [] }));
        if (rx?.prescriptions?.length) setPrescriptions(rx.prescriptions);
      } catch { /* optional */ }
      const failed = results.filter(res => res.status === 'rejected');
      if (failed.length > 0) toast.error(`Failed to load ${failed.length} data source(s)`);
    } catch (e) { console.error(e); toast.error('Failed to load dashboard data'); }
    if (mounted.current) setLoading(false);
  }, [user?.name]);

  useEffect(() => {
    mounted.current = true;
    load();
    return () => { mounted.current = false; };
  }, [load]);

  // Realtime — naya booking/status change turant dikhein
  useAppointmentRealtime(load);

  const today = getISTDateString();
  const todayAppts = appointments.filter(a => a.date === today);
  const upcomingAppts = appointments.filter(a => a.date >= today && a.status !== 'Completed' && a.status !== 'Cancelled');
  const pendingAppts = appointments.filter(a => a.status === 'Pending');
  const completedAppts = appointments.filter(a => a.status === 'Completed');
  const notCompletedAppts = appointments.filter(a => a.status === 'Confirmed' || a.status === 'Approved');
  const todayRevenue = bills.filter(b => b.date === today && b.status === 'Paid').reduce((s, b) => s + (b.paid || b.amount || 0), 0);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekStartStr = weekStart.toISOString().split('T')[0];
  const weekAppts = appointments.filter(a => a.date >= weekStartStr && a.date <= today);
  const weekRevenue = bills.filter(b => b.date >= weekStartStr && b.date <= today && b.status === 'Paid').reduce((s, b) => s + (b.paid || b.amount || 0), 0);
  const totalRefunded = refunds.reduce((s, r) => s + (r.refund_amount || r.amount || 0), 0);
  const pendingRefunds = refunds.filter(r => r.status === 'pending' || r.status === 'Pending').length;
  const activeRxCount = prescriptions.filter(p => p.status === 'Active').length;
  const recentPayments = payments.slice(0, 3);

  const statValues = {
    "Today's Appts": todayAppts.length,
    'Completed': completedAppts.length,
    'Not Completed': notCompletedAppts.length,
    'Pending': pendingAppts.length,
    "Today's Revenue": `₹${todayRevenue.toLocaleString('en-IN')}`,
    'Week Appts': weekAppts.length,
    'Week Revenue': `₹${weekRevenue.toLocaleString('en-IN')}`,
    'Test Requests': testRequests.length,
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <LicenseExpiryReminder />

      {/* Welcome Banner — mirrors PatientDashboard */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-6 text-white mb-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-white/5 rounded-full translate-y-1/2" />
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-sm font-medium text-white/70">{greeting}</p>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold mt-0.5">Welcome back, Dr. {user?.name?.split(' ')[0] || 'there'}</h1>
            <p className="text-white/80 mt-1">Here's your clinic overview for today</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2.5 text-sm">
              <p className="text-white/70 text-xs">{new Date().toLocaleDateString('en-IN', { weekday: 'long' })}</p>
              <p className="font-semibold">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2.5 text-sm text-center min-w-[80px]">
              <p className="text-white/70 text-xs">Clinic Tip</p>
              <motion.p key={tipIndex} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="font-medium text-xs max-w-[200px] leading-tight">{clinicTips[tipIndex]}</motion.p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid — 7 clickable colored tiles */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
          {statCards.map((s, i) => {
            const val = statValues[s.label];
            return (
              <motion.div key={s.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}
                onClick={() => navigate(s.link)}
                className="bg-card rounded-2xl border border-border/60 p-4 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all group">
                <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform`}>
                  <s.icon className={`w-4.5 h-4.5 ${s.color}`} />
                </div>
                <p className={`text-xl font-bold ${s.color}`}>{val}</p>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{s.label}</p>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Today's Schedule */}
        <div className="lg:col-span-2 bg-card rounded-3xl border border-border/50 p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center shadow-sm">
                <CalendarDays className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-foreground">Today's Schedule</h3>
                <p className="text-xs text-muted-foreground">{todayAppts.length > 0 ? `${todayAppts.length} appointment${todayAppts.length > 1 ? 's' : ''} today` : 'No visits today'}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 rounded-xl text-primary border-primary/20 hover:bg-primary/5 hover:text-primary" onClick={() => navigate('/clinic/appointments')}>
              View All <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
          {todayAppts.slice(0, 3).length > 0 ? (
            <div className="space-y-3">
              {todayAppts.slice(0, 3).map(a => (
                <div key={a._id} className="group flex items-center justify-between p-3.5 bg-muted/20 rounded-2xl border border-border/30 hover:bg-muted/40 hover:border-primary/20 transition-all duration-200">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                      <User className="w-5.5 h-5.5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{a.patient}</p>
                      <div className="flex items-center gap-2.5 text-xs text-muted-foreground mt-0.5">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{a.time}</span>
                        </div>
                        <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                        <StatusBadge status={a.status} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-3">
                <CalendarDays className="w-7 h-7 text-muted-foreground/30" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">No appointments today</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Your schedule is clear for today</p>
            </div>
          )}
        </div>

        {/* Recent Payments */}
        <div className="bg-card rounded-3xl border border-border/50 p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-sm">
                <IndianRupee className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-foreground">Recent Payments</h3>
                <p className="text-xs text-muted-foreground">{payments.length > 0 ? `Last ${Math.min(payments.length, 3)} payments` : 'No payments yet'}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 rounded-xl text-primary border-primary/20 hover:bg-primary/5 hover:text-primary" onClick={() => navigate('/clinic/billing')}>
              View All <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
          {recentPayments.length > 0 ? (
            <div className="space-y-3">
              {recentPayments.map((txn, idx) => {
                const MethodIcon = methodIcons[txn.method] || FileText;
                const typeIcon = txn.serviceType === 'appointment' ? '🩺' : txn.serviceType === 'test' ? '🧪' : '💊';
                return (
                  <motion.div key={txn._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                    className="group flex items-center justify-between p-3.5 bg-muted/20 rounded-2xl border border-border/30 hover:bg-muted/40 hover:border-primary/20 transition-all duration-200">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs">{typeIcon}</span>
                        <p className="text-sm font-semibold text-foreground truncate">{txn.description || `${txn.serviceType || ''} payment`}</p>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{txn.provider} · {new Date(txn.createdAt).toLocaleDateString('en-IN')}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/50">
                          <MethodIcon className="w-3 h-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground capitalize font-medium">{txn.method}</span>
                        </div>
                        {txn.transaction_id && (
                          <span className="text-[9px] font-mono text-muted-foreground/60 truncate max-w-[100px]">{txn.transaction_id}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="text-sm font-bold text-emerald-600">₹{txn.amount?.toLocaleString('en-IN')}</p>
                      <Button size="sm" variant="ghost"
                        className="h-7 px-2.5 text-[11px] gap-1.5 text-primary hover:bg-primary/10 rounded-xl mt-1"
                        onClick={() => downloadPaymentInvoice(txn._id, `${txn.invoice_id || 'invoice'}.pdf`).catch(() => {})}>
                        <Download className="w-3 h-3" /> Invoice
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-3">
                <IndianRupee className="w-7 h-7 text-muted-foreground/30" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">No payments yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Payments will appear here</p>
            </div>
          )}
        </div>
      </div>

      {/* Second Row — 3 cards */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Upcoming Appointments */}
        <div className="bg-card rounded-3xl border border-border/50 p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 flex items-center justify-center shadow-sm">
                <Calendar className="w-5 h-5 text-cyan-500" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-foreground">Upcoming</h3>
                <p className="text-xs text-muted-foreground">{upcomingAppts.length > 0 ? `${upcomingAppts.length} scheduled` : 'No upcoming'}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 rounded-xl text-cyan-500 border-cyan-500/20 hover:bg-cyan-500/5 hover:text-cyan-500" onClick={() => navigate('/clinic/appointments')}>
              View <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
          {upcomingAppts.slice(0, 3).length > 0 ? (
            <div className="space-y-3">
              {upcomingAppts.slice(0, 3).map(a => (
                <div key={a._id} className="group flex items-center justify-between p-3.5 bg-muted/20 rounded-2xl border border-border/30 hover:bg-muted/40 hover:border-cyan-500/20 transition-all duration-200">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-cyan-500" />
                      <p className="text-sm font-semibold text-foreground">{a.patient}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 ml-4">{formatDisplayDate(a.date)} at {a.time}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-7 h-7 text-muted-foreground/30" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">No upcoming appointments</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Check your schedule</p>
            </div>
          )}
        </div>

        {/* Patients */}
        <div className="bg-card rounded-3xl border border-border/50 p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 flex items-center justify-center shadow-sm">
                <Users className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-foreground">Patients</h3>
                <p className="text-xs text-muted-foreground">{patients.length > 0 ? `${patients.length} total` : 'No patients'}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 rounded-xl text-amber-500 border-amber-500/20 hover:bg-amber-500/5 hover:text-amber-500" onClick={() => navigate('/clinic/patients')}>
              View <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
          {patients.length > 0 ? (
            <div className="space-y-3">
              {patients.slice(0, 3).map((p, idx) => (
                <div key={idx} className="group flex items-center gap-2 p-3.5 bg-muted/20 rounded-2xl border border-border/30 hover:bg-muted/40 hover:border-amber-500/20 transition-all duration-200">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <p className="text-sm font-semibold text-foreground truncate">{p}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-3">
                <Users className="w-7 h-7 text-muted-foreground/30" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">No patients yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Patients will appear here</p>
            </div>
          )}
        </div>

        {/* Recent Reviews */}
        <div className="bg-card rounded-3xl border border-border/50 p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 flex items-center justify-center shadow-sm">
                <Star className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-foreground">Recent Reviews</h3>
                <p className="text-xs text-muted-foreground">{reviews.length > 0 ? `${reviews.length} review${reviews.length > 1 ? 's' : ''}` : 'No reviews yet'}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 rounded-xl text-blue-500 border-blue-500/20 hover:bg-blue-500/5 hover:text-blue-500" onClick={() => navigate('/clinic/reviews')}>
              View <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
          {reviews.length > 0 ? (
            <div className="space-y-3">
              {reviews.slice(0, 2).map(rv => (
                <div key={rv._id} className="p-3.5 bg-muted/20 rounded-2xl border border-border/30 hover:bg-muted/40 hover:border-blue-500/20 transition-all duration-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="font-semibold text-foreground text-sm truncate">{rv.patientName}</p>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} className={`w-3 h-3 ${s <= rv.rating ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30'}`} />
                      ))}
                    </div>
                  </div>
                  {rv.comment && (
                    <div className="flex items-start gap-1.5">
                      <Quote className="w-3 h-3 text-muted-foreground/30 mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground/80 leading-relaxed line-clamp-2">{rv.comment}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-3">
                <MessageCircle className="w-7 h-7 text-muted-foreground/30" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">No reviews yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Patient reviews will appear here</p>
            </div>
          )}
        </div>
      </div>

      {/* Earnings Analytics */}
      <EarningsAnalytics bills={bills} payments={payments} title="Earnings Analytics" />

      {/* Test Requests */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="bg-card rounded-3xl border border-border/50 p-5 sm:p-6 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500/20 to-rose-500/5 flex items-center justify-center shadow-sm">
              <TestTube className="w-5 h-5 text-rose-500" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-foreground">Test Requests</h3>
              <p className="text-xs text-muted-foreground">{testRequests.length > 0 ? `${testRequests.length} request${testRequests.length > 1 ? 's' : ''}` : 'No test requests'}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 rounded-xl text-rose-500 border-rose-500/20 hover:bg-rose-500/5 hover:text-rose-500" onClick={() => navigate('/clinic/test-requests')}>
            View All <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
        {testRequests.length > 0 ? (
          <div className="space-y-3">
            {testRequests.slice(0, 4).map(req => {
              const testNames = req.tests?.join(', ') || req.testName || 'Test';
              const status = req.status || 'Pending';
              const amount = req.discountedAmount || req.totalAmount || 0;
              return (
                <div key={req._id || req.bookingId} className="group flex items-center justify-between p-3.5 bg-muted/20 rounded-2xl border border-border/30 hover:bg-muted/40 hover:border-rose-500/20 transition-all duration-200">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500/20 to-rose-500/5 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform shrink-0">
                      <TestTube className="w-5 h-5 text-rose-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{req.patientName || 'Patient'}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{testNames}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-bold text-foreground">₹{amount.toLocaleString('en-IN')}</span>
                    <StatusBadge status={status} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10">
            <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-3">
              <TestTube className="w-7 h-7 text-muted-foreground/30" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">No test requests yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">When patients book tests, they will appear here</p>
          </div>
        )}
      </motion.div>


      {/* Quick Actions — mirrors PatientDashboard grid */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="bg-card rounded-3xl border border-border/50 p-5 sm:p-6 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 flex items-center justify-center shadow-sm">
              <Zap className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-foreground">Quick Actions</h3>
              <p className="text-xs text-muted-foreground">Tasks at your fingertips</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {quickActions.map(a => (
            <Link key={a.label} to={a.link}
              className="group relative flex flex-col items-center gap-2.5 p-5 rounded-2xl border border-border/40 bg-gradient-to-br from-muted/10 to-muted/5 hover:from-primary/5 hover:to-primary/10 hover:border-primary/30 hover:shadow-md transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center shadow-sm group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
                <a.icon className="w-6 h-6 text-primary" />
              </div>
              <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{a.label}</span>
              <span className="text-[10px] text-muted-foreground text-center leading-tight">{a.desc}</span>
              <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-border/0 group-hover:ring-primary/20 transition-all" />
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Refund Section — mirrors PatientDashboard */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-card rounded-2xl border border-border/60 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center"><RotateCcw className="w-4 h-4 text-destructive" /></div>
            <div>
              <h3 className="font-semibold text-foreground">Refunds</h3>
              <p className="text-xs text-muted-foreground">{refunds.length > 0 ? `${refunds.length} record${refunds.length > 1 ? 's' : ''}` : 'No refunds'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-destructive font-medium">₹{totalRefunded.toLocaleString()}</span>
            {pendingRefunds > 0 && <span className="text-warning font-medium">{pendingRefunds} pending</span>}
          </div>
        </div>
        {refunds.length > 0 ? (
          <div className="space-y-2.5">
            {refunds.slice(0, 3).map(rf => (
              <div key={rf._id} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{rf.patient_name || rf.patient || rf.patientName || rf.description || rf.reason || 'Refund'}</p>
                  <p className="text-xs text-muted-foreground">{rf.reason || rf.description || 'Refund'}</p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-sm font-bold text-destructive">₹{(rf.refund_amount || rf.amount || 0).toLocaleString()}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${rf.status === 'Refunded' || rf.status === 'refunded' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'}`}>
                    {rf.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <RotateCcw className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No refunds yet</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
