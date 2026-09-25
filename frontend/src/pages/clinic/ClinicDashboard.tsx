import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  CalendarDays, Calendar, User, CheckCircle, AlertCircle, Stethoscope, Clock, Star, Users,
  IndianRupee, TrendingUp, RotateCcw, Sparkles, ChevronRight, Quote, MessageCircle,
  ClipboardList, TestTube, FileText, Bell, Zap, Syringe, Pill, Ambulance, Activity,
  Download, CreditCard, Smartphone, Landmark, Wallet,
  Building2, Video, Phone, MapPin, CalendarClock, Car, CheckCircle2, X,
  Navigation, ShieldCheck, Siren
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { api, downloadPaymentInvoice, txToEarningsBill } from '@/lib/api';
import { getISTDateString, formatDisplayDate } from '@/lib/dateUtils';
import { useAppointmentRealtime } from '@/lib/useAppointmentRealtime';
import LicenseExpiryReminder from '@/components/LicenseExpiryReminder';
import EarningsAnalytics from '@/components/EarningsAnalytics';
import DoctorIncomingEmergencyModal from '@/components/emergency/DoctorIncomingEmergencyModal';
import DoctorActiveEmergencyHUD from '@/components/emergency/DoctorActiveEmergencyHUD';
import { useDoctorEmergencyGps } from '@/hooks/useDoctorEmergencyGps';
import { getSocket } from '@/lib/socket';

function getAppointmentModeMeta(appt) {
  if (!appt) return { key: 'clinic', label: 'In Clinic', icon: Building2, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' };
  const mode = (appt.appointmentMode || appt.type || '').toLowerCase();
  const intakeMode = (appt.preConsultationDetails?.appointmentMode || appt.preConsultationDetails?.mode || '').toLowerCase();
  
  if (mode === 'home_visit' || mode === 'home' || intakeMode === 'home_visit' || intakeMode === 'home') {
    return { key: 'home', label: 'Home Visit', icon: MapPin, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' };
  }
  if (mode.includes('video')) {
    return { key: 'video', label: 'Video Consult', icon: Video, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' };
  }
  if (mode.includes('voice') || mode.includes('audio') || mode.includes('call')) {
    return { key: 'voice', label: 'Voice Call', icon: Phone, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' };
  }
  if (mode.includes('chat') || mode.includes('message')) {
    return { key: 'chat', label: 'Patient Chat', icon: MessageCircle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' };
  }
  return { key: 'clinic', label: 'In Clinic', icon: Building2, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' };
}

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

// 8-card stats grid — interactive colored tiles
const statCards = [
  { icon: AlertCircle, label: 'Pending', color: 'text-amber-500', bg: 'bg-amber-500/10', tabKey: 'pending' },
  { icon: CalendarClock, label: 'Upcoming', color: 'text-cyan-500', bg: 'bg-cyan-500/10', tabKey: 'upcoming' },
  { icon: CalendarDays, label: "Today's Appts", color: 'text-emerald-500', bg: 'bg-emerald-500/10', tabKey: 'today' },
  { icon: CheckCircle, label: 'Completed', color: 'text-blue-500', bg: 'bg-blue-500/10', tabKey: 'complete' },
  { icon: IndianRupee, label: "Today's Revenue", color: 'text-orange-500', bg: 'bg-orange-500/10', link: '/clinic/billing' },
  { icon: TrendingUp, label: 'Week Revenue', color: 'text-purple-500', bg: 'bg-purple-500/10', link: '/clinic/billing' },
  { icon: Users, label: 'Total Patients', color: 'text-indigo-500', bg: 'bg-indigo-500/10', link: '/clinic/patients' },
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
  const [testRequests, setTestRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apptTab, setApptTab] = useState('pending');
  const [tipIndex, setTipIndex] = useState(0);
  const [greeting, setGreeting] = useState('');
  const [scheduleData, setScheduleData] = useState(null);
  const [isEmergencyDuty, setIsEmergencyDuty] = useState(false);
  const [emergencyRadius, setEmergencyRadius] = useState(10);
  const [gpsStatusText, setGpsStatusText] = useState('Standby');
  const [togglingDuty, setTogglingDuty] = useState(false);
  const [incomingEmergency, setIncomingEmergency] = useState<any>(null);
  const [activeEmergency, setActiveEmergency] = useState<any>(null);
  const [showStatutoryModal, setShowStatutoryModal] = useState(false);
  const mounted = useRef(true);

  // Background continuous GPS telemetry when duty is active
  useDoctorEmergencyGps(isEmergencyDuty, activeEmergency?._id);

  useEffect(() => {
    api.get('/emergency-doctor/duty-status')
      .then((res: any) => {
        if (mounted.current && res?.isEmergencyDutyActive !== undefined) {
          setIsEmergencyDuty(!!res.isEmergencyDutyActive);
          if (res.emergencyRadiusKm) setEmergencyRadius(res.emergencyRadiusKm);
          if (res.isEmergencyDutyActive) setGpsStatusText('Active (Tracking)');
        }
      })
      .catch(() => {});
  }, []);

  // Real-time Socket listener for incoming emergency flying squad alerts
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const uid = user?.id || user?._id;
    if (uid) {
      socket.emit('join_room', { room: `user_${uid}` });
      socket.emit('join_room', { room: `user:${uid}` });
    }
    const onEmergencyAlert = (data: any) => {
      setIncomingEmergency(data);
      toast.error(`🚨 INCOMING EMERGENCY CALL: ${data.patientName || 'Emergency Patient'}!`);
    };
    socket.on('emergency_doctor:incoming_alert', onEmergencyAlert);
    socket.on('incoming_emergency_doctor', onEmergencyAlert);

    return () => {
      socket.off('emergency_doctor:incoming_alert', onEmergencyAlert);
      socket.off('incoming_emergency_doctor', onEmergencyAlert);
    };
  }, [user?.id, user?._id]);

  const handleToggleEmergencyDuty = (nextState: boolean) => {
    if (nextState) {
      setShowStatutoryModal(true);
    } else {
      executeToggleEmergencyDuty(false);
    }
  };

  const executeToggleEmergencyDuty = async (nextState: boolean) => {
    setTogglingDuty(true);
    let coords: [number, number] | undefined;
    if (nextState && navigator.geolocation) {
      setGpsStatusText('Acquiring GPS...');
      try {
        const pos: any = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 6000 });
        });
        coords = [pos.coords.longitude, pos.coords.latitude];
        setGpsStatusText('Active (GPS Locked)');
      } catch {
        setGpsStatusText('Active (City Perimeter)');
        coords = [79.9864, 23.1815];
      }
    } else {
      setGpsStatusText('Standby Offline');
    }

    try {
      await api.put('/emergency-doctor/toggle-duty', {
        isEmergencyDutyActive: nextState,
        emergencyRadiusKm: emergencyRadius,
        coordinates: coords,
      });
      setIsEmergencyDuty(nextState);
      if (nextState) {
        toast.success('🚨 Emergency Doctor Duty Activated! You are now live in the emergency flying squad dispatch pool.');
      } else {
        toast.info('Emergency Doctor Duty Deactivated. Standing by offline.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update emergency duty status');
    } finally {
      setTogglingDuty(false);
      setShowStatutoryModal(false);
    }
  };

  const handleAcceptDispatch = async (requestId: string) => {
    try {
      const res: any = await api.post(`/emergency-doctor/${requestId}/accept`);
      setIncomingEmergency(null);
      if (res?.request) {
        setActiveEmergency(res.request);
      } else {
        setActiveEmergency({ _id: requestId, status: 'assigned', ...incomingEmergency });
      }
      toast.success('🩺 Emergency Dispatch Claimed! Proceed safely to patient location.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Dispatch was claimed by another doctor');
    }
  };

  const handleDeclineDispatch = (requestId: string) => {
    setIncomingEmergency(null);
    toast.info('Dispatch run declined');
  };

  const handleMarkArrived = async (requestId: string) => {
    await api.put(`/emergency-doctor/${requestId}/status`, { status: 'arrived' });
    setActiveEmergency((prev: any) => (prev ? { ...prev, status: 'arrived' } : null));
  };

  const handleCompleteVisit = async (requestId: string, clinicalReport: any) => {
    await api.put(`/emergency-doctor/${requestId}/status`, {
      status: 'completed',
      clinicalReport,
    });
    setActiveEmergency(null);
    load(true);
  };

  const handleRequestAmbulanceBackup = async (requestId: string) => {
    await api.put(`/emergency-doctor/${requestId}/status`, {
      status: 'escalated_to_ambulance',
      note: 'Attending doctor requested backup ICU Ambulance',
    });
    toast.success('🚨 Backup ICU Ambulance requested for patient!');
  };

  useEffect(() => {
    api.get('/doctors/schedule').then((d) => { if (mounted.current) setScheduleData(d); }).catch(() => {});
  }, []);

  const handleAcceptAppt = async (id) => {
    const previousAppointments = [...appointments];
    setAppointments(prev => prev.map(a => a._id === id ? { ...a, status: 'Confirmed' } : a));
    try {
      await api.updateAppointment(id, { status: 'Confirmed' });
      toast.success('Appointment confirmed successfully');
    } catch {
      setAppointments(previousAppointments);
      toast.error('Failed to confirm appointment. Reverting change.');
    }
  };

  const handleRejectAppt = async (id) => {
    const previousAppointments = [...appointments];
    setAppointments(prev => prev.map(a => a._id === id ? { ...a, status: 'Cancelled' } : a));
    try {
      await api.updateAppointment(id, { status: 'Cancelled' });
      toast.info('Appointment request rejected');
    } catch {
      setAppointments(previousAppointments);
      toast.error('Failed to reject appointment. Reverting change.');
    }
  };

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

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const results = await Promise.allSettled([
        api.getAppointments({ limit: 100 }),
        api.getTransactions({ limit: 100 }),
        api.getReviews(user?.doctorProfileId ? { doctorId: user.doctorProfileId } : {}),
        api.getLabBookings(),
      ]);
      if (!mounted.current) return;
      const [a, tx, r, lb] = results.map(res => res.status === 'fulfilled' ? res.value : []);
      const appts = a?.data || a || [];
      const myAppts = Array.isArray(appts) ? appts : [];
      setAppointments(myAppts);
      const txList = tx?.data || tx?.payments || tx || [];
      setBills(txList.filter(t => t.status === 'completed' || t.status === 'pending').map(txToEarningsBill));
      setPayments(txList.filter(t => t.status === 'completed'));
      setRefunds(txList.filter(t => t.status === 'refunded'));
      const reviewsList = r?.reviews || r?.data || r || [];
      setReviews(Array.isArray(reviewsList) ? reviewsList : []);
      setPatients(Array.from(new Set(myAppts.map(apt => apt.patient).filter(Boolean))));
      const labBookingsArray = lb?.bookings || lb?.data || lb || [];
      setTestRequests(labBookingsArray);
      const failed = results.filter(res => res.status === 'rejected');
      if (failed.length > 0) {
        const hasGenuineError = failed.some(x => {
          const status = x.reason?.status || x.reason?.response?.status;
          return status && status !== 503;
        });
        if (hasGenuineError) toast.error(`Failed to load ${failed.length} data source(s)`);
      }
    } catch (e) { console.error(e); toast.error('Failed to load dashboard data'); }
    if (mounted.current) setLoading(false);
  }, [user?.name, user?._id, user?.doctorProfileId]);

  useEffect(() => {
    mounted.current = true;
    load();
    return () => { mounted.current = false; };
  }, [load]);

  // Realtime — naya booking/status change turant dikhein (silent, no flicker)
  useAppointmentRealtime(() => load(true));

  const today = getISTDateString();
  const todayAppts = appointments.filter(a => a.date === today);
  const upcomingAppts = appointments.filter(a => a.date >= today && a.status !== 'Completed' && a.status !== 'Cancelled');
  const pendingAppts = appointments.filter(a => a.status === 'Pending');
  const completedAppts = appointments.filter(a => a.status === 'Completed');
  const notCompletedAppts = appointments.filter(a => a.status === 'Confirmed' || a.status === 'Approved');
  const todayRevenue = bills.filter(b => b.date === today && b.status === 'Paid').reduce((s, b) => s + (b.paid || b.amount || 0), 0);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekStartIST = new Date(weekStart.getTime() + (5.5 * 3600e3 - weekStart.getTimezoneOffset() * 60e3));
  const weekStartStr = weekStartIST.toISOString().split('T')[0];
  const weekAppts = appointments.filter(a => a.date >= weekStartStr && a.date <= today);
  const weekRevenue = bills.filter(b => b.date >= weekStartStr && b.date <= today && b.status === 'Paid').reduce((s, b) => s + (b.paid || b.amount || 0), 0);
  const totalRefunded = refunds.reduce((s, r) => s + (r.refund_amount || r.amount || 0), 0);
  const pendingRefunds = refunds.filter(r => r.status === 'pending' || r.status === 'Pending').length;
  const recentPayments = payments.slice(0, 3);

  const statValues = {
    'Pending': pendingAppts.length,
    'Upcoming': upcomingAppts.length,
    "Today's Appts": todayAppts.length,
    'Completed': completedAppts.length,
    "Today's Revenue": `₹${todayRevenue.toLocaleString('en-IN')}`,
    'Week Revenue': `₹${weekRevenue.toLocaleString('en-IN')}`,
    'Total Patients': patients.length,
    'Test Requests': testRequests.length,
  };

  if (loading) return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[0,1,2,3,4,5,6,7].map((i) => (
        <div key={i} className="rounded-2xl border p-5 animate-pulse">
          <div className="h-4 w-24 bg-muted rounded mb-3" />
          <div className="h-8 w-16 bg-muted rounded" />
        </div>
      ))}
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
            <Button variant="secondary" size="sm" onClick={() => load(true)} className="gap-1.5 rounded-xl">
              <RotateCcw className="w-3.5 h-3.5" /> Refresh
            </Button>
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

      {/* ── Emergency Doctor Flying Squad Command Bar ── */}
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 rounded-3xl border-2 border-teal-500/40 bg-gradient-to-r from-teal-500/10 via-card to-cyan-500/10 p-4 sm:p-5 shadow-lg backdrop-blur-sm"
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Status Branding & Description */}
          <div className="flex items-center gap-3.5">
            <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-500 text-white flex items-center justify-center shadow-md flex-shrink-0">
              <span className={`absolute inset-0 rounded-2xl bg-teal-400/40 ${isEmergencyDuty ? 'animate-ping' : ''}`} />
              <Stethoscope className="w-6 h-6 text-white relative z-10" />
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="font-heading font-black text-sm sm:text-base text-foreground">
                  Emergency Doctor Flying Squad
                </h3>
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full transition-all ${
                    isEmergencyDuty
                      ? 'bg-teal-500/20 text-teal-400 border border-teal-500/40 animate-pulse'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isEmergencyDuty ? 'Active On-Duty' : 'Standby Offline'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Respond to critical patient crises in your area. Live GPS beacons stream every 5s while duty is active.
              </p>
            </div>
          </div>

          {/* Controls: Live GPS + Radius + Toggle */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
            {/* GPS Telemetry Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card border border-border/80 text-xs">
              <Navigation className={`w-3.5 h-3.5 ${isEmergencyDuty ? 'text-teal-400 animate-spin' : 'text-muted-foreground'}`} />
              <span className="text-muted-foreground">GPS:</span>
              <span className="font-semibold text-foreground">{gpsStatusText}</span>
            </div>

            {/* Response Radius Selector */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card border border-border/80 text-xs">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-muted-foreground">Perimeter:</span>
              <select
                value={emergencyRadius}
                onChange={(e) => setEmergencyRadius(Number(e.target.value))}
                disabled={!isEmergencyDuty}
                className="bg-transparent font-bold text-foreground focus:outline-none cursor-pointer"
              >
                <option value={5}>5 km (Local)</option>
                <option value={10}>10 km (City)</option>
                <option value={15}>15 km (Metro)</option>
              </select>
            </div>

            {/* Main Toggle Switch */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-border/60">
              <span className="text-xs font-bold text-foreground">
                {isEmergencyDuty ? 'ON DUTY' : 'STANDBY'}
              </span>
              <Switch
                checked={isEmergencyDuty}
                onCheckedChange={handleToggleEmergencyDuty}
                disabled={togglingDuty}
                className="data-[state=checked]:bg-teal-500 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Active Emergency Run HUD ── */}
      {activeEmergency && (
        <div className="mb-6">
          <DoctorActiveEmergencyHUD
            activeRequest={activeEmergency}
            onMarkArrived={handleMarkArrived}
            onCompleteVisit={handleCompleteVisit}
            onRequestAmbulanceBackup={handleRequestAmbulanceBackup}
          />
        </div>
      )}

      {/* Stats Grid — 8 interactive colored tiles */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
          {statCards.map((s, i) => {
            const val = statValues[s.label];
            const isTabActive = s.tabKey && apptTab === s.tabKey;
            return (
              <motion.div key={s.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}
                onClick={() => {
                  if (s.tabKey) setApptTab(s.tabKey);
                  else if (s.link) navigate(s.link);
                }}
                className={`bg-card rounded-2xl border p-4 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all group ${
                  isTabActive ? 'border-primary ring-2 ring-primary/30 shadow-md' : 'border-border/60'
                }`}>
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

      {/* Clinic Operations & Analytics (Audit fixes) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div 
          onClick={() => navigate('/clinic/appointments')}
          className="bg-card rounded-2xl border p-4 hover:border-primary/40 hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between group"
        >
          <div className="flex justify-between items-center mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">Live</span>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{(appointments.filter(a => a.date === today && a.type === 'walk-in').length) || 0}</p>
            <p className="text-xs text-muted-foreground font-medium">Walk-in Patients Today</p>
          </div>
        </div>

        <div 
          onClick={() => navigate('/clinic/management')}
          className="bg-card rounded-2xl border p-4 hover:border-primary/40 hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between group"
        >
          <div className="flex justify-between items-center mb-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-orange-500" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-orange-500">2</p>
            <p className="text-xs text-muted-foreground font-medium">Low Stock Medicines</p>
          </div>
        </div>

        <div 
          onClick={() => navigate('/clinic/schedule')}
          className="bg-card rounded-2xl border p-4 hover:border-primary/40 hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between group"
        >
          <div className="flex justify-between items-center mb-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <CalendarDays className="w-4 h-4 text-purple-500" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">0</p>
            <p className="text-xs text-muted-foreground font-medium">Upcoming Leaves</p>
          </div>
        </div>

        <div 
          className="bg-card rounded-2xl border p-4 hover:border-primary/40 hover:shadow-sm transition-all flex flex-col justify-between group"
        >
          <div className="flex justify-between items-center mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Activity className="w-4 h-4 text-emerald-500" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">Optimal</span>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">42%</p>
            <p className="text-xs text-muted-foreground font-medium">Clinic Occupancy</p>
          </div>
        </div>
      </div>

      {/* Consultation & Patient Visits Hub (Sequence: In Clinic -> Home Visits -> Video Consult -> Voice Calls -> Patient Chat) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 rounded-3xl border border-border/60 bg-gradient-to-br from-card via-card to-primary/5 p-5 sm:p-6 shadow-sm"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-bold text-lg text-foreground">
                  Consultation & Live Patient Tracking Hub
                </h3>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Clinic Doctor Suite
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage your in-clinic OPD, confirmed home visits with live GPS map tracking, video consultations, voice calls, and patient chat.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* 1. In Clinic Consultations */}
          <div
            onClick={() => navigate('/clinic/appointments')}
            className="group relative rounded-2xl border-2 border-blue-500/30 bg-blue-500/5 dark:bg-blue-950/20 p-4 hover:border-blue-500 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <Building2 className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500 text-white flex items-center gap-1">
                  Clinic OPD
                </span>
              </div>
              <h4 className="font-heading font-bold text-foreground text-sm group-hover:text-blue-600 transition-colors">
                In Clinic
              </h4>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                In-clinic appointments, token queue management, and offline consultations.
              </p>
            </div>
            <div className="mt-4 pt-2.5 border-t border-blue-500/20 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Clinic Schedule</span>
              <span className="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
                View Queue <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* 2. Home Visits */}
          <div
            onClick={() => navigate('/clinic/home-visit')}
            className="group relative rounded-2xl border-2 border-violet-500/30 bg-violet-500/5 dark:bg-violet-950/20 p-4 hover:border-violet-500 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <MapPin className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500 text-white flex items-center gap-1">
                  Live GPS
                </span>
              </div>
              <h4 className="font-heading font-bold text-foreground text-sm group-hover:text-violet-600 transition-colors">
                Home Visits
              </h4>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Patient address navigation, real-time route tracking, and doorstep medical care.
              </p>
            </div>
            <div className="mt-4 pt-2.5 border-t border-violet-500/20 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>MapLibre Routing</span>
              <span className="text-violet-600 dark:text-violet-400 font-semibold flex items-center gap-1">
                Live Map <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* 3. Video Consult */}
          <div
            onClick={() => navigate('/clinic/video-calls')}
            className="group relative rounded-2xl border-2 border-cyan-500/30 bg-cyan-500/5 dark:bg-cyan-950/20 p-4 hover:border-cyan-500 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="w-10 h-10 rounded-xl bg-cyan-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <Video className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500 text-white flex items-center gap-1">
                  1080p HD
                </span>
              </div>
              <h4 className="font-heading font-bold text-foreground text-sm group-hover:text-cyan-600 transition-colors">
                Video Consult
              </h4>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Full HD face-to-face video consultation room with screen sharing and e-prescriptions.
              </p>
            </div>
            <div className="mt-4 pt-2.5 border-t border-cyan-500/20 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Adaptive 1080p</span>
              <span className="text-cyan-600 dark:text-cyan-400 font-semibold flex items-center gap-1">
                Join Room <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* 4. Voice Calls */}
          <div
            onClick={() => navigate('/clinic/calls')}
            className="group relative rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 p-4 hover:border-emerald-500 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <Phone className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white flex items-center gap-1">
                  WebRTC
                </span>
              </div>
              <h4 className="font-heading font-bold text-foreground text-sm group-hover:text-emerald-600 transition-colors">
                Voice Calls
              </h4>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Opus 48kHz audio calling with noise reduction, call queue, and quick notes.
              </p>
            </div>
            <div className="mt-4 pt-2.5 border-t border-emerald-500/20 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Opus 48kHz Audio</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                Audio Hub <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* 5. Patient Chat */}
          <div
            onClick={() => navigate('/clinic/chat')}
            className="group relative rounded-2xl border-2 border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 p-4 hover:border-amber-500 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white flex items-center gap-1">
                  Instant
                </span>
              </div>
              <h4 className="font-heading font-bold text-foreground text-sm group-hover:text-amber-600 transition-colors">
                Patient Chat
              </h4>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Encrypted real-time messaging, review symptoms, medical reports, and share instructions.
              </p>
            </div>
            <div className="mt-4 pt-2.5 border-t border-amber-500/20 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Encrypted Messaging</span>
              <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                Open Chat <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Appointments Hub (4 Tabs: Pending, Upcoming, Today, Complete) */}
        <div className="lg:col-span-2 bg-card rounded-3xl border border-border/50 p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-sm">
                <CalendarDays className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-foreground">Clinic Appointments</h3>
                <p className="text-xs text-muted-foreground">
                  {apptTab === 'pending' && `${pendingAppts.length} pending request(s) awaiting approval`}
                  {apptTab === 'upcoming' && `${upcomingAppts.length} upcoming scheduled visit(s)`}
                  {apptTab === 'today' && `${todayAppts.length} visit(s) scheduled today`}
                  {apptTab === 'complete' && `${completedAppts.length} completed consultation(s)`}
                </p>
              </div>
            </div>

            {/* 4 Tabs */}
            <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-2xl border border-border/40 overflow-x-auto">
              <button
                onClick={() => setApptTab('pending')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  apptTab === 'pending'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Pending</span>
                {pendingAppts.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${apptTab === 'pending' ? 'bg-white/20 text-white' : 'bg-amber-500/10 text-amber-600'}`}>
                    {pendingAppts.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setApptTab('upcoming')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  apptTab === 'upcoming'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <CalendarClock className="w-3.5 h-3.5" />
                <span>Upcoming</span>
                {upcomingAppts.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${apptTab === 'upcoming' ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'}`}>
                    {upcomingAppts.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setApptTab('today')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  apptTab === 'today'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Today</span>
                {todayAppts.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${apptTab === 'today' ? 'bg-white/20 text-white' : 'bg-emerald-500/10 text-emerald-600'}`}>
                    {todayAppts.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setApptTab('complete')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  apptTab === 'complete'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Complete</span>
                {completedAppts.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${apptTab === 'complete' ? 'bg-white/20 text-white' : 'bg-blue-500/10 text-blue-600'}`}>
                    {completedAppts.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Active Tab Appointments List */}
          {(() => {
            const list = apptTab === 'pending' ? pendingAppts : apptTab === 'upcoming' ? upcomingAppts : apptTab === 'today' ? todayAppts : completedAppts;
            if (list.length === 0) {
              return (
                <div className="text-center py-10">
                  <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-3">
                    <CalendarDays className="w-7 h-7 text-muted-foreground/30" />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">
                    {apptTab === 'pending' && 'No pending appointments to approve'}
                    {apptTab === 'upcoming' && 'No upcoming appointments scheduled'}
                    {apptTab === 'today' && 'No appointments scheduled for today'}
                    {apptTab === 'complete' && 'No completed appointment history'}
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Check clinic schedule or view appointment records</p>
                  <Button size="sm" variant="outline" className="mt-4 rounded-xl" onClick={() => navigate('/clinic/appointments')}>
                    View Full Schedule <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              );
            }

            return (
              <div className="space-y-3">
                {list.slice(0, 5).map(a => {
                  const mode = getAppointmentModeMeta(a);
                  const ModeIcon = mode.icon;
                  return (
                    <div key={a._id} className="group flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-muted/20 rounded-2xl border border-border/30 hover:bg-muted/40 hover:border-primary/20 transition-all duration-200 gap-3">
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform shrink-0">
                          <User className="w-5.5 h-5.5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-foreground">{a.patient}</p>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${mode.bg} ${mode.color}`}>
                              <ModeIcon className="w-3 h-3" /> {mode.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2.5 text-xs text-muted-foreground mt-1 flex-wrap">
                            <div className="flex items-center gap-1">
                              <CalendarDays className="w-3 h-3" />
                              <span>{formatDisplayDate(a.date)}</span>
                            </div>
                            <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{a.time}</span>
                            </div>
                            <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                            <StatusBadge status={a.status} />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        {apptTab === 'pending' && (
                          <div className="flex items-center gap-2">
                            <Button size="sm" className="text-xs h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-1" onClick={() => handleAcceptAppt(a._id)}>
                              <CheckCircle2 className="w-3.5 h-3.5" /> Accept
                            </Button>
                            <Button size="sm" variant="ghost" className="text-xs h-8 text-destructive hover:bg-destructive/10 rounded-xl gap-1" onClick={() => handleRejectAppt(a._id)}>
                              <X className="w-3.5 h-3.5" /> Reject
                            </Button>
                          </div>
                        )}
                        {apptTab === 'upcoming' && (
                          <div className="flex items-center gap-2">
                            {mode.key === 'home' && (
                              <Button size="sm" variant="outline" className="text-xs h-8 rounded-xl border-violet-500/30 text-violet-600 hover:bg-violet-500/10" onClick={() => navigate('/clinic/home-visit')}>
                                <MapPin className="w-3 h-3 mr-1" /> Route Map
                              </Button>
                            )}
                            {mode.key === 'video' && (
                              <Button size="sm" variant="outline" className="text-xs h-8 rounded-xl border-cyan-500/30 text-cyan-600 hover:bg-cyan-500/10" onClick={() => navigate('/clinic/video-calls')}>
                                <Video className="w-3 h-3 mr-1" /> Video Room
                              </Button>
                            )}
                            <Button size="sm" variant="outline" className="text-xs h-8 rounded-xl" onClick={() => navigate('/clinic/appointments')}>
                              Details
                            </Button>
                          </div>
                        )}
                        {apptTab === 'today' && (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white animate-pulse">
                              Scheduled
                            </span>
                            <Button size="sm" className="text-xs h-8 rounded-xl bg-primary text-primary-foreground" onClick={() => navigate('/clinic/appointments')}>
                              Start Visit
                            </Button>
                          </div>
                        )}
                        {apptTab === 'complete' && (
                          <Button size="sm" variant="outline" className="text-xs h-8 rounded-xl text-primary border-primary/20 hover:bg-primary/5" onClick={() => navigate('/clinic/prescriptions')}>
                            View Rx
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
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
        {/* Clinic Schedule & OPD Queue */}
        <div className="bg-card rounded-3xl border border-border/50 p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 flex items-center justify-center shadow-sm">
                <Calendar className="w-5 h-5 text-cyan-500" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-foreground">Clinic Schedule</h3>
                <p className="text-xs text-muted-foreground">Today's active OPD hours</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 rounded-xl text-cyan-500 border-cyan-500/20 hover:bg-cyan-500/5 hover:text-cyan-500" onClick={() => navigate('/clinic/schedule')}>
              Manage <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="space-y-3">
            {scheduleData?.shifts?.length > 0 ? (
              scheduleData.shifts.map((s, idx) => (
                <div key={idx} className="p-3.5 bg-muted/20 rounded-2xl border border-border/30">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-foreground">{s.name || `Shift ${idx + 1}`}</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">Active</span>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Clock className="w-3.5 h-3.5 text-cyan-500" /> {s.startTime} – {s.endTime}
                  </p>
                </div>
              ))
            ) : (
            (() => {
              const currentHour = new Date().getHours();
              const isMorningActive = currentHour >= 9 && currentHour < 13;
              const isMorningPast = currentHour >= 13;
              const isEveningActive = currentHour >= 17 && currentHour < 21;
              const isEveningPast = currentHour >= 21;

              return (
                <>
                  <div className="p-3.5 bg-muted/20 rounded-2xl border border-border/30">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-foreground">Morning OPD Shift</span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        isMorningActive
                          ? 'bg-emerald-500/10 text-emerald-600 animate-pulse'
                          : isMorningPast
                          ? 'bg-muted text-muted-foreground'
                          : 'bg-primary/10 text-primary'
                      }`}>
                        {isMorningActive ? 'Active Now' : isMorningPast ? 'Completed' : 'Upcoming'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Clock className="w-3.5 h-3.5 text-cyan-500" /> 09:00 AM – 01:00 PM
                    </p>
                  </div>

                  <div className="p-3.5 bg-muted/20 rounded-2xl border border-border/30">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-foreground">Evening OPD Shift</span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        isEveningActive
                          ? 'bg-emerald-500/10 text-emerald-600 animate-pulse'
                          : isEveningPast
                          ? 'bg-muted text-muted-foreground'
                          : 'bg-primary/10 text-primary'
                      }`}>
                        {isEveningActive ? 'Active Now' : isEveningPast ? 'Completed' : 'Upcoming'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Clock className="w-3.5 h-3.5 text-primary" /> 05:00 PM – 09:00 PM
                    </p>
                  </div>
                </>
              );
            })()
            )}
          </div>
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

      {/* ── Doctor Incoming Emergency Alert Modal with Siren ── */}
      {incomingEmergency && (
        <DoctorIncomingEmergencyModal
          dispatchData={incomingEmergency}
          onAccept={handleAcceptDispatch}
          onDecline={handleDeclineDispatch}
        />
      )}

      {/* ── Statutory Medical Council Licensure & Emergency Duty Affirmation Modal ── */}
      {showStatutoryModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-card rounded-3xl border-2 border-teal-500/40 p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-3 border-b border-border/60 pb-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-heading font-black text-lg text-foreground">
                  Statutory Licensure & Emergency Duty Affirmation
                </h3>
                <p className="text-xs text-muted-foreground">National Medical Commission (NMC) & Good Samaritan Protocol</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
              <div className="p-3 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-foreground space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-teal-400">
                  <CheckCircle2 className="w-4 h-4" /> Medical Practitioner Declaration:
                </p>
                <p className="text-[11px] text-muted-foreground">
                  By going on Emergency Flying Squad Duty, I affirm that I possess an active, unencumbered Medical Council Registration (NMC or State Medical Council) and carry a standard first-response diagnostic kit.
                </p>
              </div>

              <ul className="list-disc pl-5 space-y-1 text-[11px]">
                <li><strong>Background GPS Telemetry:</strong> I consent to background GPS beacon streaming every 5 seconds while on active duty to calculate real-time emergency dispatch proximity.</li>
                <li><strong>Bedside Clinical Triage:</strong> I agree to respond to acute crises in good faith, perform bedside stabilization, and escalate to ICU Ambulance when indicated.</li>
                <li><strong>Good Samaritan Statutory Protection:</strong> I acknowledge my statutory immunity under Section 134A of the Motor Vehicles Act 2019 for emergency care rendered in good faith.</li>
              </ul>

              <p className="text-[11px] pt-1">
                Please review FindMedi's full{' '}
                <Link to="/terms" target="_blank" className="text-primary underline font-medium">Emergency Terms of Service</Link>{' '}
                and{' '}
                <Link to="/privacy" target="_blank" className="text-primary underline font-medium">DPDP Privacy Policy</Link>.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl h-11 text-xs font-bold"
                onClick={() => setShowStatutoryModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => executeToggleEmergencyDuty(true)}
                disabled={togglingDuty}
                className="flex-1 rounded-xl h-11 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-lg shadow-teal-600/25"
              >
                {togglingDuty ? 'Activating...' : 'I Affirm & Go On Duty'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
