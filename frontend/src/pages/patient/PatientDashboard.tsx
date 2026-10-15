import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  CalendarDays, User, FileText, TestTube, Bell, ClipboardList,
  Pill, ShoppingCart, Upload, Zap, Heart, Clock, Star,
  IndianRupee, Phone, MessageCircle, ChevronRight,
  X, Download, Syringe, CreditCard,
  Smartphone, Landmark, Wallet, RotateCcw, Sparkles, CheckCircle2,
  RefreshCw, Video, MapPin, Building2, CalendarClock,
  Siren, Stethoscope, Activity, Users, Leaf,
  Search, Eye, EyeOff, Lock, Truck, ShieldCheck, Flame, Droplets, ArrowRight,
  UtensilsCrossed, Compass, Gift, QrCode, Share2, LifeBuoy, HelpCircle, ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { api, downloadPaymentInvoice } from '@/lib/api';
import { getISTDateString, formatDisplayDate } from '@/lib/dateUtils';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { TodayHealthWidget } from '@/components/patient/TodayHealthWidget';
import PersonaStep from './PersonaStep';
import { SupportTicketForm } from '@/components/patient/SupportTicketForm';
import EmergencyDoctorModal from '@/components/emergency/EmergencyDoctorModal';

function getAppointmentModeMeta(appt) {
  if (!appt) return { key: 'hospital', label: 'In Clinic / Hospital', icon: Building2, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' };
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
    return { key: 'chat', label: 'Doctor Chat', icon: MessageCircle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' };
  }
  return { key: 'hospital', label: 'In Clinic / Hospital', icon: Building2, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' };
}

const StatusBadge = ({ status, mapping }) => {
  const colors = {
    Confirmed: 'bg-success/10 text-success', Pending: 'bg-warning/10 text-warning', Completed: 'bg-success/10 text-success',
    Cancelled: 'bg-destructive/10 text-destructive', Shipped: 'bg-info/10 text-info', Delivered: 'bg-success/10 text-success',
    Active: 'bg-info/10 text-info', Dispensed: 'bg-success/10 text-success', Ready: 'bg-success/10 text-success',
    Paid: 'bg-success/10 text-success', Unpaid: 'bg-warning/10 text-warning', Failed: 'bg-destructive/10 text-destructive',
    ...(mapping || {}),
  };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[status] || 'bg-muted text-muted-foreground'}`}>{status}</span>;
};

const methodIcons = { card: CreditCard, upi: Smartphone, netbanking: Landmark, cash: Wallet };

const Modal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
    <div className="bg-card rounded-2xl border shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-6"><h2 className="font-heading text-xl font-bold">{title}</h2><button onClick={onClose}><X className="w-5 h-5" /></button></div>
      {children}
    </div>
  </div>
);

const statCards = [
  { icon: CalendarDays, label: 'Upcoming Appts', color: 'text-emerald-500', bg: 'bg-emerald-500/10', link: '/patient/appointments' },
  { icon: ClipboardList, label: 'Active Prescriptions', color: 'text-blue-500', bg: 'bg-blue-500/10', link: '/patient/prescriptions' },
  { icon: ShoppingCart, label: 'Active Orders', color: 'text-amber-500', bg: 'bg-amber-500/10', link: '/patient/medicine-orders' },
  { icon: FileText, label: 'Reports Ready', color: 'text-violet-500', bg: 'bg-violet-500/10', link: '/patient/reports' },
  { icon: Bell, label: 'Notifications', color: 'text-orange-500', bg: 'bg-orange-500/10', link: '/notifications' },
  { icon: TestTube, label: 'Test Bookings', color: 'text-cyan-500', bg: 'bg-cyan-500/10', link: '/patient/bookings' },
  { icon: Star, label: 'My Reviews', color: 'text-yellow-500', bg: 'bg-yellow-500/10', link: '/patient/reviews' },
];

const quickActions = [
  { label: 'Find Doctors', icon: Building2, link: '/patient/doctors', desc: 'In Clinic / Hospital' },
  { label: 'Video Consult', icon: Video, link: '/patient/video-calls', desc: 'Full HD 1080p' },
  { label: 'Doctor Chat', icon: MessageCircle, link: '/patient/chat', desc: 'Instant messaging' },
  { label: 'Book Lab Test', icon: Syringe, link: '/patient/services', desc: 'Home blood sample' },
  { label: 'Buy Medicine', icon: Pill, link: '/buy-medicine', desc: 'Doorstep delivery' },
  { label: 'Upload Report', icon: Upload, link: '/upload', desc: 'ABDM Health Locker' },
  { label: 'Dentist', icon: Sparkles, link: '/healthcare?category=dentist', desc: 'Teeth cleaning & RCT' },
  { label: 'Eye Care', icon: Eye, link: '/healthcare?category=eye', desc: 'Vision & Lasik' },
  { label: 'Physiotherapy', icon: Activity, link: '/patient/programs', desc: 'Rehab & home visits' },
  { label: 'Diet & Nutrition', icon: Leaf, link: '/healthcare?category=dietitian', desc: 'Custom meal plans' },
  { label: 'Diet Meals', icon: UtensilsCrossed, link: '/patient/meals', desc: 'Therapeutic meal plans' },
  { label: 'Mental Wellbeing', icon: Heart, link: '/patient/wellness', desc: 'Discreet counselling', sensitive: true },
  { label: 'Rent Equipment', icon: Truck, link: '/patient/rentals', desc: 'Beds & Oxygen' },
  { label: 'Gym & Yoga', icon: Flame, link: '/patient/programs', desc: 'CultPass & studios' },
  { label: 'Health Camps', icon: Users, link: '/patient/events', desc: 'Free screenings' },
  { label: 'Vaccinations', icon: ShieldCheck, link: '/patient/vaccinations', desc: 'Child UIP & Adult' },
  { label: 'Insurance & Claims', icon: FileText, link: '/patient/insurance', desc: 'Cashless pre-auth' },
  { label: 'AYUSH Holistic', icon: Leaf, link: '/healthcare?category=ayush', desc: 'Ayurveda, Homeo & Siddha' },
  { label: 'Elder & Home Care', icon: Building2, link: '/patient/home-visit', desc: 'Assisted living & nurses' },
  { label: 'Govt & PM-JAY', icon: Landmark, link: '/healthcare?category=govt_facility', desc: 'PHC, CHC & Ayushman' },
  { label: 'Emergency SOS', icon: Siren, link: '/emergency', desc: 'Ambulance 108 & Blood' },
];

const healthTips = [
  'Stay hydrated — drink at least 8 glasses of water daily.',
  'Take your medicines on time for best results.',
  'A 15-minute walk after meals helps digestion.',
  'Get at least 7-8 hours of sleep every night.',
];

export default function PatientDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [bills, setBills] = useState([]);
  const [medOrders, setMedOrders] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [testBookings, setTestBookings] = useState([]);
  const [reports, setReports] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [tipIndex, setTipIndex] = useState(0);
  const [greeting, setGreeting] = useState('');
  const [payments, setPayments] = useState([]);
  const [apptTab, setApptTab] = useState('upcoming');
  const [doctorSosModalOpen, setDoctorSosModalOpen] = useState(false);
  const [discreetMode, setDiscreetMode] = useState<boolean>(() => {
    try { return window.localStorage.getItem('findmedi:discreet') === '1'; } catch { return false; }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [currentCity, setCurrentCity] = useState('Delhi NCR');
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [selectedProfile, setSelectedProfile] = useState('self');
  const [showAllActions, setShowAllActions] = useState(false);

  useEffect(() => {
    try { window.localStorage.setItem('findmedi:discreet', discreetMode ? '1' : '0'); } catch {}
  }, [discreetMode]);

  useEffect(() => {
    if (user?.id) {
      api.dispatch(null, '/patient/family')
        .then(res => setFamilyMembers(res?.members || []))
        .catch(() => setFamilyMembers([]));
    }
  }, [user?.id]);

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting('Good morning');
    else if (h < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex(i => (i + 1) % healthTips.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let socket;
    (async () => {
      try {
        const { getSocket } = await import('@/lib/socket');
        socket = getSocket();
        const onStatusChange = (data) => {
          toast.info(`Appointment status updated to: ${data?.status || 'updated'}`);
          api.getAppointments().then((res) => setAppointments(res?.data || res?.appointments || res || [])).catch(() => {});
        };
        const onReportReady = (data) => {
          toast.success(`Your lab report for ${data?.testName || 'test'} is now ready!`);
          api.getRecords().then((res) => setReports(res?.data || res?.records || res || [])).catch(() => {});
        };
        socket?.on('appointment:statusChange', onStatusChange);
        socket?.on('lab:reportReady', onReportReady);
        return () => {
          socket?.off('appointment:statusChange', onStatusChange);
          socket?.off('lab:reportReady', onReportReady);
        };
      } catch {}
    })();
  }, []);

  const handleCancelAppointment = async () => {
    if (!cancelTarget) return;
    const id = cancelTarget;
    setCancelTarget(null);
    try {
      await api.updateAppointment(id, { status: 'Cancelled' });
      setAppointments(prev => prev.map(ap => ap._id === id ? { ...ap, status: 'Cancelled' } : ap));
      toast.success('Appointment cancelled');
    } catch { toast.error('Failed to cancel'); }
  };

  const showToast = (msg, type = 'success') => {
    if (type === 'error') toast.error(msg);
    else toast.success(msg);
  };

  useEffect(() => {
     if (!user?.id) return;
    const load = async () => {
      try {
        const [a, r, b] = await Promise.all([
          api.getAppointments().catch(() => ({ data: [] })),
          api.getRecords().catch(() => ({ data: [] })),
          api.getBilling().catch(() => ({ data: [] })),
        ]);
        setAppointments(a?.appointments || a?.data || a || []);
        const rawBills = b?.bills || b?.data || [];
        const [p, rf] = await Promise.all([
          api.getPayments({ patient_id: user?.id }).catch(() => ({ data: [] })),
          api.getRefunds({ patient_id: user?.id }).catch(() => ({ payments: [] })),
        ]);
        const rawPayments = p?.payments || p?.data || [];
        setPayments(rawPayments);
        const rawRefunds = rf?.payments || rf?.data || [];
        setRefunds(rawRefunds);
        // Cross-reference: mark bills as Paid if matching payment exists
        const uid = String(user?.id || '');
        const paidRefs = new Set(rawPayments.map(pay => pay.invoice_id || pay.invoiceId || pay.referenceId));
        const paidSignatures = new Set(rawPayments.map(pay => `${String(pay.patient_id || pay.patientId || '')}:${pay.amount}`));
        setBills(rawBills.map(bill => {
          if (paidRefs.has(bill.invoiceId || bill._id)) return { ...bill, status: 'Paid' };
          if (bill.status !== 'Paid' && uid && paidSignatures.has(`${uid}:${bill.amount}`)) return { ...bill, status: 'Paid' };
          return bill;
        }));
        const [phOrders, rx, n, lb] = await Promise.all([
          api.getPharmacyOrders({}).catch(() => ({ orders: [] })),
          api.getPharmacyPrescriptions({}).catch(() => ({ prescriptions: [] })),
          api.getNotifications({}).catch(() => ({ data: [] })),
          api.getLabBookings({}).catch(() => ({ bookings: [] })),
        ]);
        setMedOrders(phOrders?.orders || []);
        setPrescriptions(rx?.prescriptions || []);
        const notifList = n?.notifications || n?.data || n || [];
        if (notifList.length) setNotifs(notifList);
        const revData = await api.getReviews({ patientId: user?.id }).catch(() => []);
        if (revData?.reviews?.length) setReviews(revData.reviews);
        else if (Array.isArray(revData) && revData.length) setReviews(revData);

        if (lb?.bookings?.length) {
          setTestBookings(lb.bookings.map(b => ({
            _id: b._id,
            bookingId: b.bookingId || `LB-${String(b._id).slice(-6)}`,
            tests: b.tests || [],
            labName: b.facilityId?.name || b.labName || 'Lab',
            status: b.status || 'Pending',
            date: b.bookingDate || b.date || new Date().toISOString(),
            timeSlot: b.timeSlot || '',
            amount: b.totalAmount || b.discountedAmount || 0,
            visitType: b.homeCollectionAddress ? 'Home Collection' : (b.visitType || ''),
            reportsAvailable: ['Completed', 'Report Ready', 'Delivered'].includes(b.status),
          })));
        }
        const allRecs = r?.data || r?.records || r || [];
        const reportRecs = allRecs.filter(rec => ['Lab Report', 'Imaging', 'lab_report', 'Cardiac'].includes(rec.type));
        if (reportRecs.length) {
          setReports(reportRecs.map(rec => ({
            _id: rec._id,
            name: rec.diagnosis || rec.data?.testName || rec.type,
            type: rec.type,
            date: rec.date,
            status: rec.data?.status === 'Completed' ? 'Ready' : (rec.data?.status || 'Ready'),
            orderedBy: rec.doctor,
            labName: rec.data?.labName || rec.data?.facilityName || '',
          })));
        }
      } catch (e) { console.error(e); showToast('Failed to load dashboard data', 'error'); }
    };
    load();
  }, [user?.id]);

  const today = getISTDateString();
  const pendingAppts = appointments.filter(a => a.status === 'Pending' || a.status === 'pending');
  const upcomingAppts = appointments.filter(a => (a.status === 'Confirmed' || a.status === 'Approved' || a.status === 'confirmed') && a.date >= today);
  const todayAppts = appointments.filter(a => a.date === today && a.status !== 'Cancelled');
  const completedAppts = appointments.filter(a => a.status === 'Completed' || a.status === 'completed');
  const unreadNotifs = notifs.filter(n => !n.read).length;
  const isBillPaid = (bill) => {
    if (bill.status === 'Paid') return true;
    const uid = String(user?.id || '');
    return payments.some(p =>
      p.invoice_id === bill.invoiceId ||
      p.invoiceId === bill.invoiceId ||
      (String(p.patient_id || p.patientId || '') === uid && p.amount === bill.amount)
    );
  };
  const pendingBills = bills.filter(b => !isBillPaid(b));

  const activeRxCount = prescriptions.filter(r => r.status === 'Active').length;
  const activeOrders = medOrders.filter(o => o.status !== 'Delivered').length;
  const readyReportsCount = reports.filter(r => r.status === 'Ready').length;
  const totalRefunded = refunds.reduce((s, r) => s + (r.refund_amount || r.amount || 0), 0);
  const pendingRefunds = refunds.filter(r => r.status === 'Pending' || r.status === 'pending').length;
  const recentTests = testBookings.slice(0, 3);
  const recentOrders = medOrders.filter(o => o.status !== 'Delivered').slice(0, 3);

  const statValues = {
    'Upcoming Appts': upcomingAppts.length,
    'Active Prescriptions': activeRxCount,
    'Active Orders': activeOrders,
    'Reports Ready': readyReportsCount,
    'Notifications': unreadNotifs,
    'Test Bookings': testBookings.length,
    'My Reviews': reviews.length,
  };

  return (
    <div>
      {/* ── Global Patient Hub Controls (Profile Switcher, Location, Search, Discreet Mode) ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5 p-3 rounded-2xl bg-card border border-border/60 shadow-xs">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Profile Switcher */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/40 border border-border/40 text-xs font-semibold">
            <User className="w-3.5 h-3.5 text-primary" />
            <select
              value={selectedProfile}
              onChange={(e) => {
                setSelectedProfile(e.target.value);
                toast.success(e.target.value === 'self' ? 'Switched to Self profile' : 'Switched to Family Member profile');
              }}
              className="bg-transparent border-none text-foreground font-semibold focus:outline-none cursor-pointer text-xs pr-1"
            >
              <option value="self">Self ({user?.name?.split(' ')[0] || 'Patient'})</option>
              {familyMembers.map((m: any) => (
                <option key={m.id || m._id} value={m.id || m._id}>
                  {m.name} ({m.relation || 'Dependent'})
                </option>
              ))}
            </select>
          </div>

          {/* City / Location Chip */}
          <button
            type="button"
            onClick={() => {
              const cities = ['Delhi NCR', 'Mumbai', 'Bengaluru', 'Hyderabad', 'Chennai', 'Pune'];
              const nextCity = cities[(cities.indexOf(currentCity) + 1) % cities.length];
              setCurrentCity(nextCity);
              toast.success(`Location set to ${nextCity}`);
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-muted/40 border border-border/40 text-xs font-semibold text-foreground hover:border-primary/40 transition-colors"
          >
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span>{currentCity}</span>
          </button>

          {/* Discreet Mode Toggle */}
          <button
            type="button"
            onClick={() => {
              setDiscreetMode((prev) => !prev);
              toast.info(!discreetMode ? 'Discreet Mode enabled: Sensitive health labels masked.' : 'Discreet Mode disabled.');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
              discreetMode
                ? 'bg-primary/10 border-primary/30 text-primary font-bold'
                : 'bg-muted/40 border-border/40 text-muted-foreground hover:text-foreground'
            }`}
          >
            {discreetMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>Discreet {discreetMode ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {/* Universal Search */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (searchQuery.trim()) {
              navigate(`/healthcare?q=${encodeURIComponent(searchQuery.trim())}`);
            }
          }}
          className="relative min-w-[240px] flex-1 max-w-sm"
        >
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search doctors, tests, medicines..."
            className="h-9 pl-9 pr-3 rounded-xl text-xs bg-muted/20 border-border/40"
          />
        </form>
      </div>

      {/* ── Urgent Health Alerts Strip ── */}
      {(upcomingAppts.length > 0 || readyReportsCount > 0 || pendingBills.length > 0) && (
        <div className="flex flex-col gap-2 mb-5">
          {upcomingAppts.length > 0 && (
            <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs flex items-center justify-between text-blue-900 dark:text-blue-200">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  <strong>Appointment scheduled:</strong> With {upcomingAppts[0]?.doctorName || 'Doctor'} on {upcomingAppts[0]?.date} ({upcomingAppts[0]?.timeSlot || 'Scheduled'})
                </span>
              </div>
              <Button size="sm" variant="ghost" onClick={() => navigate('/patient/appointments')} className="h-7 text-xs font-bold text-blue-600 hover:text-blue-700">
                View <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          )}

          {readyReportsCount > 0 && (
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-center justify-between text-emerald-900 dark:text-emerald-200">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Diagnostic report ready:</strong> {readyReportsCount} verified lab or radiology report ready for download.
                </span>
              </div>
              <Button size="sm" variant="ghost" onClick={() => navigate('/patient/reports')} className="h-7 text-xs font-bold text-emerald-600 hover:text-emerald-700">
                View Reports <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          )}

          {pendingBills.length > 0 && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-center justify-between text-amber-900 dark:text-amber-200">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Pending hospital invoice:</strong> {pendingBills.length} unpaid bill awaiting settlement.
                </span>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setShowModal('add-payment')} className="h-7 text-xs font-bold text-amber-600 hover:text-amber-700">
                Pay Bill <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Welcome Banner */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-6 text-white mb-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-white/5 rounded-full translate-y-1/2" />
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-sm font-medium text-white/70">{greeting}</p>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold mt-0.5">Welcome back, {user?.name?.split(' ')[0] || 'there'}</h1>
            <p className="text-white/80 mt-1">Here's your health snapshot for today</p>
          </div>
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            <Button
              onClick={() => setDoctorSosModalOpen(true)}
              className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-bold text-xs h-10 px-4 rounded-xl shadow-lg border border-teal-300/40 flex items-center gap-1.5 cursor-pointer ring-2 ring-teal-400/40 animate-pulse"
            >
              <Stethoscope className="w-4 h-4 text-white" />
              <span>🩺 Emergency Doctor</span>
            </Button>
            <Button
              onClick={() => navigate('/find-vehicle?emergency=true')}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-10 px-4 rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer"
            >
              <Siren className="w-4 h-4 text-white" />
              <span>🚨 SOS Ambulance</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.location.reload()}
              className="gap-1.5 rounded-xl text-xs h-10"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Button>
            <div className="hidden sm:block bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2.5 text-sm">
              <p className="text-white/70 text-xs">{new Date().toLocaleDateString('en-IN', { weekday: 'long' })}</p>
              <p className="font-semibold">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2.5 text-sm text-center min-w-[80px]">
              <p className="text-white/70 text-xs">Health Tip</p>
              <motion.p key={tipIndex} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="font-medium text-xs max-w-[200px] leading-tight">{healthTips[tipIndex]}</motion.p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 6.md §4 persona step — once, skippable, defaults only */}
      <PersonaStep />

      {/* ── Dual Emergency Quick Hub ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-6">
        {/* Ambulance SOS Card */}
        <motion.div
          whileHover={{ y: -2, scale: 1.005 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => navigate('/find-vehicle?emergency=true')}
          className="group relative overflow-hidden rounded-2xl border-2 border-red-500/30 bg-gradient-to-br from-red-600/10 via-card to-rose-600/5 p-4 shadow-sm hover:shadow-md hover:border-red-500/60 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 text-white flex items-center justify-center shadow-md flex-shrink-0 group-hover:scale-105 transition-transform">
              <span className="absolute inset-0 rounded-2xl bg-red-500/40 animate-ping pointer-events-none" />
              <Siren className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-black text-sm text-foreground group-hover:text-red-500 transition-colors">
                  Emergency Ambulance SOS
                </h3>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-red-500 text-white">
                  ICU / BLS
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                Hospital transport, stretcher support & emergency paramedic transfer.
              </p>
            </div>
            <div className="w-7 h-7 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 group-hover:translate-x-1 transition-transform flex-shrink-0">
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </motion.div>

        {/* Emergency Doctor Flying Squad Card */}
        <motion.div
          whileHover={{ y: -2, scale: 1.005 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => setDoctorSosModalOpen(true)}
          className="group relative overflow-hidden rounded-2xl border-2 border-teal-500/30 bg-gradient-to-br from-teal-600/10 via-card to-cyan-600/5 p-4 shadow-sm hover:shadow-md hover:border-teal-500/60 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-500 text-white flex items-center justify-center shadow-md flex-shrink-0 group-hover:scale-105 transition-transform">
              <span className="absolute inset-0 rounded-2xl bg-teal-500/40 animate-ping pointer-events-none" />
              <Stethoscope className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-black text-sm text-foreground group-hover:text-teal-400 transition-colors">
                  Emergency Doctor at Location
                </h3>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-teal-500 text-white">
                  Flying Squad
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                Nearby clinic doctor rushes to your location with resuscitation kit.
              </p>
            </div>
            <div className="w-7 h-7 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-400 group-hover:translate-x-1 transition-transform flex-shrink-0">
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Stats Grid */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
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

      {/* ── Today's Health & Care Plan Tasks Widget ── */}
      <TodayHealthWidget />

      {/* ── Telehealth & Communication Suite (Chat, Audio Calls, Video Consult) ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="mb-6 rounded-3xl border border-border/60 bg-gradient-to-br from-card via-card/80 to-muted/20 p-5 sm:p-6 shadow-sm relative overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 flex items-center justify-center text-cyan-500 border border-cyan-500/20 shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-bold text-base sm:text-lg text-foreground">
                  Consultation & Telehealth Hub
                </h3>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Instant Connect
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Connect with verified doctors anytime via encrypted chat, crystal-clear voice, or Full HD video.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* 1: In Clinic / Hospital */}
          <div
            onClick={() => navigate('/patient/doctors')}
            className="group relative rounded-2xl border-2 border-blue-500/30 bg-blue-500/5 dark:bg-blue-950/20 p-4 hover:border-blue-500 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <Building2 className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500 text-white flex items-center gap-1">
                  OPD Visit
                </span>
              </div>
              <h4 className="font-heading font-bold text-foreground text-sm group-hover:text-blue-600 transition-colors">
                In Clinic / Hospital
              </h4>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Consult top specialists at verified clinics & hospitals with instant token appointments.
              </p>
            </div>
            <div className="mt-4 pt-2.5 border-t border-blue-500/20 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>In-Person Visit</span>
              <span className="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
                Book Visit <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* 2: Home Visits */}
          <div
            onClick={() => navigate('/patient/home-visit')}
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
                Doctor visits your doorstep with live route tracking, real-time ETA, and arrival check-in.
              </p>
            </div>
            <div className="mt-4 pt-2.5 border-t border-violet-500/20 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>MapLibre Route</span>
              <span className="text-violet-600 dark:text-violet-400 font-semibold flex items-center gap-1">
                Track Live <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* 3: Video Consultations */}
          <div
            onClick={() => navigate('/patient/video-calls')}
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
                Full HD face-to-face video consultation with screen sharing, PiP mode, and e-prescriptions.
              </p>
            </div>
            <div className="mt-4 pt-2.5 border-t border-cyan-500/20 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Adaptive Full HD</span>
              <span className="text-cyan-600 dark:text-cyan-400 font-semibold flex items-center gap-1">
                Video Room <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* 4: Voice Calls */}
          <div
            onClick={() => navigate('/patient/calls')}
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
                Opus 48kHz audio calling with noise cancellation, doctor directory, and call history.
              </p>
            </div>
            <div className="mt-4 pt-2.5 border-t border-emerald-500/20 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Opus 48kHz Audio</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                Call Hub <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* 5: Doctor Chat */}
          <div
            onClick={() => navigate('/patient/chat')}
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
                Doctor Chat
              </h4>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Direct text messaging, share symptoms, medical photos, and get quick answers in real-time.
              </p>
            </div>
            <div className="mt-4 pt-2.5 border-t border-amber-500/20 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Real-time Chat</span>
              <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                Open Chat <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── COMPREHENSIVE CARE TOOLKIT (Audit Fixes) ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Activity className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <h3 className="font-heading font-black text-lg text-foreground">Health & Family Management</h3>
              <p className="text-xs text-muted-foreground font-medium">Tools to manage your medical profile</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          <div onClick={() => navigate('/patient/family')} className="bg-card rounded-2xl border p-3 hover:border-blue-500/40 hover:shadow-sm transition-all flex flex-col justify-between cursor-pointer">
            <div className="flex justify-between items-center mb-2">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Users className="w-3.5 h-3.5 text-blue-500" />
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Family</p>
              <p className="text-[9px] text-muted-foreground uppercase font-semibold">Dependents</p>
            </div>
          </div>

          <div onClick={() => navigate('/patient/emergency-card')} className="bg-card rounded-2xl border p-3 hover:border-rose-500/40 hover:shadow-sm transition-all flex flex-col justify-between cursor-pointer">
            <div className="flex justify-between items-center mb-2">
              <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">SOS Card</p>
              <p className="text-[9px] text-muted-foreground uppercase font-semibold">Blood & Allergies</p>
            </div>
          </div>

          <div onClick={() => navigate('/patient/vitals')} className="bg-card rounded-2xl border p-3 hover:border-amber-500/40 hover:shadow-sm transition-all flex flex-col justify-between cursor-pointer">
            <div className="flex justify-between items-center mb-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Activity className="w-3.5 h-3.5 text-amber-500" />
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Vitals Log</p>
              <p className="text-[9px] text-muted-foreground uppercase font-semibold">BP & Glucose</p>
            </div>
          </div>

          <div onClick={() => navigate('/patient/care-plans')} className="bg-card rounded-2xl border p-3 hover:border-emerald-500/40 hover:shadow-sm transition-all flex flex-col justify-between cursor-pointer">
            <div className="flex justify-between items-center mb-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Leaf className="w-3.5 h-3.5 text-emerald-500" />
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Care Plans</p>
              <p className="text-[9px] text-muted-foreground uppercase font-semibold">Diet & Rehab</p>
            </div>
          </div>

          <div onClick={() => navigate('/patient/prescriptions')} className="bg-card rounded-2xl border p-3 hover:border-pink-500/40 hover:shadow-sm transition-all flex flex-col justify-between cursor-pointer">
            <div className="flex justify-between items-center mb-2">
              <div className="w-7 h-7 rounded-lg bg-pink-500/10 flex items-center justify-center">
                <Pill className="w-3.5 h-3.5 text-pink-500" />
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Rx Safety</p>
              <p className="text-[9px] text-muted-foreground uppercase font-semibold">Check & Refills</p>
            </div>
          </div>

          <div onClick={() => navigate('/patient/vaccinations')} className="bg-card rounded-2xl border p-3 hover:border-cyan-500/40 hover:shadow-sm transition-all flex flex-col justify-between cursor-pointer">
            <div className="flex justify-between items-center mb-2">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-600" />
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Vaccines</p>
              <p className="text-[9px] text-muted-foreground uppercase font-semibold">Child & Adult</p>
            </div>
          </div>

          <div onClick={() => navigate('/patient/meals')} className="bg-card rounded-2xl border p-3 hover:border-teal-500/40 hover:shadow-sm transition-all flex flex-col justify-between cursor-pointer">
            <div className="flex justify-between items-center mb-2">
              <div className="w-7 h-7 rounded-lg bg-teal-500/10 flex items-center justify-center">
                <UtensilsCrossed className="w-3.5 h-3.5 text-teal-600" />
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Diet Kitchen</p>
              <p className="text-[9px] text-muted-foreground uppercase font-semibold">Daily Meal Plans</p>
            </div>
          </div>

          <div onClick={() => navigate('/patient/insurance')} className="bg-card rounded-2xl border p-3 hover:border-violet-500/40 hover:shadow-sm transition-all flex flex-col justify-between cursor-pointer">
            <div className="flex justify-between items-center mb-2">
              <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <FileText className="w-3.5 h-3.5 text-violet-500" />
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Insurance</p>
              <p className="text-[9px] text-muted-foreground uppercase font-semibold">Cashless Pre-Auth</p>
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
                <h3 className="font-heading font-semibold text-foreground">My Appointments</h3>
                <p className="text-xs text-muted-foreground">
                  {apptTab === 'pending' && `${pendingAppts.length} pending confirmation`}
                  {apptTab === 'upcoming' && `${upcomingAppts.length} upcoming scheduled`}
                  {apptTab === 'today' && `${todayAppts.length} booked for today`}
                  {apptTab === 'complete' && `${completedAppts.length} completed visits`}
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
                <Clock className="w-3.5 h-3.5" />
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
                <CheckCircle2 className="w-3.5 h-3.5" />
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
                    {apptTab === 'pending' && 'No pending appointments'}
                    {apptTab === 'upcoming' && 'No upcoming appointments scheduled'}
                    {apptTab === 'today' && 'No appointments scheduled for today'}
                    {apptTab === 'complete' && 'No completed appointment history'}
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Book an in-clinic, home visit, video or call appointment</p>
                  <Button size="sm" className="mt-4 rounded-xl shadow-lg shadow-primary/20" onClick={() => navigate('/patient/doctors')}>
                    <Building2 className="w-3.5 h-3.5 mr-1.5" /> Book Appointment
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
                            <p className="text-sm font-semibold text-foreground">{a.doctor}</p>
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
                            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20">
                              Awaiting Approval
                            </span>
                            <Button size="sm" variant="ghost"
                              className="text-xs h-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded-xl"
                              onClick={() => setCancelTarget(a._id)}>
                              <X className="w-3 h-3 mr-1" /> Cancel
                            </Button>
                          </div>
                        )}
                        {apptTab === 'upcoming' && (
                          <div className="flex items-center gap-2">
                            {mode.key === 'home' && (
                              <Button size="sm" variant="outline" className="text-xs h-8 rounded-xl border-violet-500/30 text-violet-600 hover:bg-violet-500/10" onClick={() => navigate('/patient/home-visit')}>
                                <MapPin className="w-3 h-3 mr-1" /> Track Route
                              </Button>
                            )}
                            {mode.key === 'video' && (
                              <Button size="sm" variant="outline" className="text-xs h-8 rounded-xl border-cyan-500/30 text-cyan-600 hover:bg-cyan-500/10" onClick={() => navigate('/patient/video-calls')}>
                                <Video className="w-3 h-3 mr-1" /> Join Room
                              </Button>
                            )}
                            <Button size="sm" variant="ghost"
                              className="text-xs h-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded-xl"
                              onClick={() => setCancelTarget(a._id)}>
                              <X className="w-3 h-3 mr-1" /> Cancel
                            </Button>
                          </div>
                        )}
                        {apptTab === 'today' && (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white animate-pulse">
                              Active Today
                            </span>
                            {mode.key === 'video' && (
                              <Button size="sm" className="text-xs h-8 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white" onClick={() => navigate('/patient/video-calls')}>
                                <Video className="w-3 h-3 mr-1" /> Start Video
                              </Button>
                            )}
                            {mode.key === 'home' && (
                              <Button size="sm" className="text-xs h-8 rounded-xl bg-violet-600 hover:bg-violet-700 text-white" onClick={() => navigate('/patient/home-visit')}>
                                <MapPin className="w-3 h-3 mr-1" /> Live Map
                              </Button>
                            )}
                          </div>
                        )}
                        {apptTab === 'complete' && (
                          <Button size="sm" variant="outline" className="text-xs h-8 rounded-xl text-primary border-primary/20 hover:bg-primary/5" onClick={() => navigate('/patient/doctors')}>
                            Book Again
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

        {/* Payment History */}
        <div className="bg-card rounded-3xl border border-border/50 p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-sm">
                <IndianRupee className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-foreground">Payment History</h3>
                <p className="text-xs text-muted-foreground">{payments.length > 0 ? `Last ${Math.min(payments.length, 3)} payments` : 'No payments yet'}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 rounded-xl text-primary border-primary/20 hover:bg-primary/5 hover:text-primary" onClick={() => navigate('/patient/history')}>
              View All <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
          {payments.length > 0 ? (
            <div className="space-y-3">
              {payments.slice(0, 3).map((txn, idx) => {
                const MethodIcon = methodIcons[txn.method] || FileText;
                const typeIcon = txn.serviceType === 'appointment' ? '🩺' : txn.serviceType === 'test' ? '🧪' : '💊';
                return (
                  <motion.div key={txn._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                    className="group flex items-center justify-between p-3.5 bg-muted/20 rounded-2xl border border-border/30 hover:bg-muted/40 hover:border-primary/20 transition-all duration-200">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs">{typeIcon}</span>
                        <p className="text-sm font-semibold text-foreground truncate">{txn.description || `${txn.serviceType} payment`}</p>
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
              <p className="text-xs text-muted-foreground/60 mt-1">Your payment history will appear here</p>
            </div>
          )}
        </div>
      </div>

      {/* Second Row */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Recent Lab Bookings */}
        <div className="bg-card rounded-3xl border border-border/50 p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 flex items-center justify-center shadow-sm">
                <TestTube className="w-5 h-5 text-cyan-500" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-foreground">Lab Tests</h3>
                <p className="text-xs text-muted-foreground">{recentTests.length > 0 ? `${recentTests.length} recent` : 'No tests booked'}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 rounded-xl text-cyan-500 border-cyan-500/20 hover:bg-cyan-500/5 hover:text-cyan-500" onClick={() => navigate('/patient/bookings')}>
              View <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
          {recentTests.length > 0 ? (
            <div className="space-y-3">
              {recentTests.map(t => (
                <div key={t._id} className="group flex items-center justify-between p-3.5 bg-muted/20 rounded-2xl border border-border/30 hover:bg-muted/40 hover:border-cyan-500/20 transition-all duration-200">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-cyan-500" />
                      <p className="text-sm font-semibold text-foreground">{t.labName}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 ml-4">{(t.tests || []).slice(0, 2).join(', ')}{t.tests?.length > 2 ? ` +${t.tests.length - 2}` : ''}</p>
                  </div>
                  <StatusBadge status={t.status} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-3">
                <TestTube className="w-7 h-7 text-muted-foreground/30" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">No tests booked</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Schedule a lab test</p>
              <Button size="sm" className="mt-4 rounded-xl shadow-lg shadow-cyan-500/20 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white hover:from-cyan-600 hover:to-cyan-700" onClick={() => navigate('/patient/services')}>
                <Syringe className="w-3.5 h-3.5 mr-1.5" /> Book Now
              </Button>
            </div>
          )}
        </div>

        {/* Active Orders */}
        <div className="bg-card rounded-3xl border border-border/50 p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 flex items-center justify-center shadow-sm">
                <ShoppingCart className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-foreground">Medicine Orders</h3>
                <p className="text-xs text-muted-foreground">{activeOrders > 0 ? `${activeOrders} active` : 'No active orders'}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 rounded-xl text-amber-500 border-amber-500/20 hover:bg-amber-500/5 hover:text-amber-500" onClick={() => navigate('/patient/medicine-orders')}>
              View <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
          {recentOrders.length > 0 ? (
            <div className="space-y-3">
              {recentOrders.map(o => (
                <div key={o._id} className="group flex items-center justify-between p-3.5 bg-muted/20 rounded-2xl border border-border/30 hover:bg-muted/40 hover:border-amber-500/20 transition-all duration-200">
                  <div>
                    <div className="flex items-center gap-2">
                      <Pill className="w-3.5 h-3.5 text-amber-500" />
                      <p className="text-sm font-semibold text-foreground">{o.orderId || `Order #${String(o._id).slice(-6)}`}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 ml-5">₹{o.total?.toLocaleString() || 0}</p>
                  </div>
                  <StatusBadge status={o.status} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-3">
                <ShoppingCart className="w-7 h-7 text-muted-foreground/30" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">No active orders</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Order medicines for delivery</p>
              <Button size="sm" className="mt-4 rounded-xl shadow-lg shadow-amber-500/20 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600" onClick={() => navigate('/buy-medicine')}>
                <Pill className="w-3.5 h-3.5 mr-1.5" /> Shop Now
              </Button>
            </div>
          )}
        </div>

        {/* Active Prescriptions */}
        <div className="bg-card rounded-3xl border border-border/50 p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 flex items-center justify-center shadow-sm">
                <ClipboardList className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-foreground">Active Prescriptions</h3>
                <p className="text-xs text-muted-foreground">{activeRxCount > 0 ? `${activeRxCount} active` : 'No active scripts'}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 rounded-xl text-blue-500 border-blue-500/20 hover:bg-blue-500/5 hover:text-blue-500" onClick={() => navigate('/patient/prescriptions')}>
              View <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
          {prescriptions.length > 0 ? (
            <div className="space-y-3">
              {prescriptions.slice(0, 3).map(rx => (
                <div key={rx._id} className="group flex items-center justify-between p-3.5 bg-muted/20 rounded-2xl border border-border/30 hover:bg-muted/40 hover:border-blue-500/20 transition-all duration-200">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <p className="text-sm font-semibold text-foreground">{rx.doctorName}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 ml-4">{(rx.medicines || []).length} medicines prescribed</p>
                  </div>
                  <StatusBadge status={rx.status} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-3">
                <ClipboardList className="w-7 h-7 text-muted-foreground/30" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">No prescriptions yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Visit a doctor to get one</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions (15 Canonical Categories) */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="bg-card rounded-3xl border border-border/50 p-5 sm:p-6 mb-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 flex items-center justify-center shadow-sm">
              <Zap className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-semibold text-foreground">Health Ecosystem Quick Actions</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {quickActions.length} Services
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Direct access across clinical care, diagnostics, wellness, and logistics</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAllActions(prev => !prev)}
              className="text-xs font-semibold h-8 rounded-xl"
            >
              {showAllActions ? 'Show Top 10' : `View All (${quickActions.length})`}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/patient/services')}
              className="text-xs font-semibold h-8 text-primary hover:text-primary hover:bg-primary/5"
            >
              Services Directory <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3.5">
          {(showAllActions ? quickActions : quickActions.slice(0, 10)).map(a => {
            const displayLabel = a.sensitive && discreetMode ? 'Consultation' : a.label;
            const displayDesc = a.sensitive && discreetMode ? 'Confidential care' : a.desc;

            return (
              <Link key={a.label} to={a.link}
                className="group relative flex flex-col items-center gap-2.5 p-4 rounded-2xl border border-border/40 bg-gradient-to-br from-muted/10 to-muted/5 hover:from-primary/5 hover:to-primary/10 hover:border-primary/30 hover:shadow-md transition-all duration-300 text-center">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center shadow-sm group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
                  <a.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors block line-clamp-1">{displayLabel}</span>
                  <span className="text-[10px] text-muted-foreground block line-clamp-1 leading-tight">{displayDesc}</span>
                </div>
                <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-border/0 group-hover:ring-primary/20 transition-all" />
              </Link>
            );
          })}
        </div>
      </motion.div>

      {/* ── Specialized Health Hubs & Program Subscriptions (File 06) ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
        className="mb-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading font-black text-lg text-foreground">Programs, Subscriptions & Health Records</h3>
            <p className="text-xs text-muted-foreground font-medium">Manage memberships, equipment rentals, registered health camps, and insurance</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Programs & Memberships */}
          <Link
            to="/patient/programs"
            className="p-4 rounded-2xl border border-border/60 bg-card hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between group"
          >
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-heading font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                  Programs & Memberships
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Gym/Yoga passes, diabetes reversal, therapy packs.
                </p>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-xs text-primary font-semibold">
              <span>View Active Passes</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 2: Equipment Rentals */}
          <Link
            to="/patient/rentals"
            className="p-4 rounded-2xl border border-border/60 bg-card hover:border-emerald-500/40 hover:shadow-md transition-all flex flex-col justify-between group"
          >
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-heading font-bold text-sm text-foreground group-hover:text-emerald-600 transition-colors">
                  Equipment Rentals
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  ICU beds, O2 concentrators, deposit tracking.
                </p>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-xs text-emerald-600 font-semibold">
              <span>Rental Orders & Pickups</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 3: Health Camps & Events */}
          <Link
            to="/patient/events"
            className="p-4 rounded-2xl border border-border/60 bg-card hover:border-amber-500/40 hover:shadow-md transition-all flex flex-col justify-between group"
          >
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-heading font-bold text-sm text-foreground group-hover:text-amber-600 transition-colors">
                  Camps & Events
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Registered screening camps, QR entry passes.
                </p>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-xs text-amber-600 font-semibold">
              <span>View QR Passes</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 4: Insurance & Cashless Desk */}
          <Link
            to="/patient/insurance"
            className="p-4 rounded-2xl border border-border/60 bg-card hover:border-indigo-500/40 hover:shadow-md transition-all flex flex-col justify-between group"
          >
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-heading font-bold text-sm text-foreground group-hover:text-indigo-600 transition-colors">
                  Insurance & Pre-Auth
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  PM-JAY, CGHS, private cashless claim tracking.
                </p>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-xs text-indigo-600 font-semibold">
              <span>TPA Claims Desk</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>

        {/* Second Row of Hubs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Card 5: Vaccinations */}
          <Link
            to="/patient/vaccinations"
            className="p-4 rounded-2xl border border-border/60 bg-card hover:border-rose-500/40 hover:shadow-md transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                <Syringe className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-heading font-bold text-sm text-foreground group-hover:text-rose-600 transition-colors">
                  Vaccination Schedule
                </h4>
                <p className="text-xs text-muted-foreground">Child UIP doses & adult boosters</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 group-hover:text-rose-600 transition-transform" />
          </Link>

          {/* Card 6: Holistic Wellness */}
          <Link
            to="/patient/wellness"
            className="p-4 rounded-2xl border border-border/60 bg-card hover:border-violet-500/40 hover:shadow-md transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                <Heart className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-heading font-bold text-sm text-foreground group-hover:text-violet-600 transition-colors">
                  Daily Wellness & Mood
                </h4>
                <p className="text-xs text-muted-foreground">Steps, hydration, private emotional check-in</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 group-hover:text-violet-600 transition-transform" />
          </Link>

          {/* Card 7: Consents & DPDP */}
          <Link
            to="/patient/consents"
            className="p-4 rounded-2xl border border-border/60 bg-card hover:border-cyan-500/40 hover:shadow-md transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-heading font-bold text-sm text-foreground group-hover:text-cyan-600 transition-colors">
                  Consent Manager
                </h4>
                <p className="text-xs text-muted-foreground">ABDM sync & record access audit log</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 group-hover:text-cyan-600 transition-transform" />
          </Link>
        </div>
      </motion.div>

      {/* Refund Section */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-card rounded-2xl border border-border/60 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center"><RotateCcw className="w-4 h-4 text-destructive" /></div>
            <div>
              <h3 className="font-semibold text-foreground">Refunds</h3>
              <p className="text-xs text-muted-foreground">{refunds.length > 0 ? `₹${totalRefunded.toLocaleString()} refunded` : 'No refunds'}</p>
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
                  <p className="text-sm font-medium text-foreground truncate">{rf.description || rf.reason || `${rf.serviceType || 'Refund'} payment`}</p>
                  <p className="text-xs text-muted-foreground">{rf.date ? new Date(rf.date).toLocaleDateString('en-IN') : ''}</p>
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

      {/* ── Section 11: Discover & Preventive Health (Recommendations) ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22 }}
        className="bg-card rounded-3xl border border-border/60 p-5 sm:p-6 mb-6 shadow-sm space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 text-emerald-600 flex items-center justify-center shadow-sm">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-bold text-base sm:text-lg text-foreground">
                  Discover Healthcare Near You
                </h3>
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  Curated & Verified
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Free health camps, age-specific checkup packages, and local public health programs. No third-party ad tracking.
              </p>
            </div>
          </div>

          <Link to="/patient/events">
            <Button variant="ghost" size="sm" className="text-xs text-primary font-semibold h-8 gap-1">
              Explore All Camps <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        {/* Discover Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
          {/* Card 1: Free Health Camp */}
          <div className="p-4 rounded-2xl border border-border/60 bg-muted/15 space-y-3 flex flex-col justify-between hover:border-emerald-500/30 transition-all">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-bold">
                  Free Camp
                </Badge>
                <span className="text-[11px] text-muted-foreground">This Sunday</span>
              </div>
              <h4 className="font-heading font-bold text-sm text-foreground">Community Diabetes & BP Screening</h4>
              <p className="text-xs text-muted-foreground">Free random glucose, blood pressure check, and doctor consult at Green Park Community Hall.</p>
            </div>
            <Link to="/patient/events">
              <Button size="sm" className="w-full h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white">
                Register Free Pass
              </Button>
            </Link>
          </div>

          {/* Card 2: Health Package */}
          <div className="p-4 rounded-2xl border border-border/60 bg-muted/15 space-y-3 flex flex-col justify-between hover:border-primary/30 transition-all">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
                  Annual Checkup
                </Badge>
                <span className="text-xs font-extrabold text-foreground">₹1,499</span>
              </div>
              <h4 className="font-heading font-bold text-sm text-foreground">Comprehensive Full Body Profile (64 Tests)</h4>
              <p className="text-xs text-muted-foreground">Lipid profile, liver function, HbA1c, thyroid panel & free home sample collection.</p>
            </div>
            <Link to="/patient/services">
              <Button size="sm" variant="outline" className="w-full h-8 text-xs font-semibold">
                Book Test Package
              </Button>
            </Link>
          </div>

          {/* Card 3: Seasonal Health Alert */}
          <div className="p-4 rounded-2xl border border-border/60 bg-muted/15 space-y-3 flex flex-col justify-between hover:border-amber-500/30 transition-all">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20 text-[10px] font-bold">
                  Seasonal Health Alert
                </Badge>
                <span className="text-[11px] text-muted-foreground">Doctor-Verified</span>
              </div>
              <h4 className="font-heading font-bold text-sm text-foreground">Air Quality & Respiratory Protection</h4>
              <p className="text-xs text-muted-foreground">PM2.5 precautions, N95 mask advisory, and asthma inhaler refill reminders for Delhi-NCR.</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full h-8 text-xs font-semibold"
              onClick={() => toast.info('Advisory: Keep windows closed during peak morning traffic; wear N95 outdoors.')}
            >
              Read Health Advisory
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ── Section 12: Wallet · Rewards · Referral ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.24 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6"
      >
        {/* Wallet Balance */}
        <div className="bg-card rounded-3xl border border-border/60 p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Wallet className="w-4.5 h-4.5" />
            </div>
            <Badge variant="outline" className="text-[10px]">Instant Checkout</Badge>
          </div>
          <div>
            <span className="text-[11px] text-muted-foreground block">FindMedi Cash Balance</span>
            <div className="text-2xl font-black text-foreground">₹450</div>
          </div>
          <div className="pt-2 border-t flex items-center justify-between text-xs">
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs font-bold text-primary" onClick={() => setShowModal('add-payment')}>
              + Add Balance
            </Button>
            <Link to="/patient/history" className="text-muted-foreground hover:text-foreground">Invoices</Link>
          </div>
        </div>

        {/* Loyalty Points */}
        <div className="bg-card rounded-3xl border border-border/60 p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <Badge variant="outline" className="text-[10px]">Silver Tier</Badge>
          </div>
          <div>
            <span className="text-[11px] text-muted-foreground block">FindMedi Health Coins</span>
            <div className="text-2xl font-black text-foreground">320 Coins</div>
          </div>
          <div className="pt-2 border-t flex items-center justify-between text-xs">
            <Link to="/patient/rewards">
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs font-bold text-amber-600">
                Redeem Rewards
              </Button>
            </Link>
            <span className="text-muted-foreground">100 coins = ₹50 off</span>
          </div>
        </div>

        {/* Referral Program */}
        <div className="bg-card rounded-3xl border border-border/60 p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
              <Gift className="w-4.5 h-4.5" />
            </div>
            <Badge variant="outline" className="text-[10px]">Invite Family</Badge>
          </div>
          <div>
            <span className="text-[11px] text-muted-foreground block">Refer & Earn</span>
            <div className="text-sm font-bold text-foreground">Give ₹200 · Get ₹200</div>
          </div>
          <div className="pt-2 border-t flex items-center justify-between text-xs">
            <Link to="/patient/referral">
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs font-bold text-rose-600">
                Share Code
              </Button>
            </Link>
            <span className="text-muted-foreground font-mono">HEALTH200</span>
          </div>
        </div>
      </motion.div>

      {/* ── Section 13: 24x7 Emergency Helplines & Patient Support ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.26 }}
        className="bg-card rounded-3xl border border-rose-500/30 p-5 sm:p-6 mb-6 shadow-sm bg-gradient-to-br from-rose-500/5 via-card to-card space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
              <Siren className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-bold text-base sm:text-lg text-foreground">
                  24x7 National Emergency & Helplines Directory
                </h3>
                <Badge className="bg-rose-600 text-white text-[10px]">Toll-Free</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Immediate government and medical assistance numbers. Direct one-tap telephone connect.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowModal('support-ticket')}
              className="text-xs font-semibold h-8 rounded-xl"
            >
              Submit Support Ticket
            </Button>
            <Button
              size="sm"
              onClick={() => setDoctorSosModalOpen(true)}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold h-8 rounded-xl gap-1"
            >
              <Siren className="w-3.5 h-3.5" /> Emergency SOS
            </Button>
          </div>
        </div>

        {/* Helplines Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1 text-xs">
          <a
            href="tel:112"
            className="p-3 rounded-2xl bg-muted/40 border hover:border-rose-500/40 hover:bg-rose-500/5 transition-all text-center block"
          >
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">National Emergency</span>
            <div className="text-base font-extrabold text-rose-600 font-mono mt-0.5">112</div>
            <span className="text-[10px] text-muted-foreground">All-in-one helpline</span>
          </a>

          <a
            href="tel:108"
            className="p-3 rounded-2xl bg-muted/40 border hover:border-rose-500/40 hover:bg-rose-500/5 transition-all text-center block"
          >
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Ambulance Dispatch</span>
            <div className="text-base font-extrabold text-foreground font-mono mt-0.5">108</div>
            <span className="text-[10px] text-muted-foreground">State medical emergency</span>
          </a>

          <a
            href="tel:14416"
            className="p-3 rounded-2xl bg-muted/40 border hover:border-rose-500/40 hover:bg-rose-500/5 transition-all text-center block"
          >
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Tele-MANAS (Mental)</span>
            <div className="text-base font-extrabold text-foreground font-mono mt-0.5">14416</div>
            <span className="text-[10px] text-muted-foreground">Confidential 24x7 support</span>
          </a>

          <a
            href="tel:1098"
            className="p-3 rounded-2xl bg-muted/40 border hover:border-rose-500/40 hover:bg-rose-500/5 transition-all text-center block"
          >
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Child Helpline</span>
            <div className="text-base font-extrabold text-foreground font-mono mt-0.5">1098</div>
            <span className="text-[10px] text-muted-foreground">Child care & distress</span>
          </a>

          <a
            href="tel:181"
            className="p-3 rounded-2xl bg-muted/40 border hover:border-rose-500/40 hover:bg-rose-500/5 transition-all text-center block"
          >
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Women Helpline</span>
            <div className="text-base font-extrabold text-foreground font-mono mt-0.5">181</div>
            <span className="text-[10px] text-muted-foreground">24x7 safety assistance</span>
          </a>
        </div>
      </motion.div>

      {/* Modals */}
      {showModal === 'support-ticket' && (
        <Modal title="Submit Support Ticket" onClose={() => setShowModal(null)}>
          <SupportTicketForm onClose={() => { setShowModal(null); showToast('Ticket submitted'); }} showToast={showToast} />
        </Modal>
      )}

      {showModal === 'add-payment' && (
        <Modal title="Make a Payment" onClose={() => setShowModal(null)}>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Select a bill to pay from your pending invoices.</p>
            {pendingBills.slice(0, 5).map(b => (
              <div key={b._id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium">{b.invoiceId}</p>
                  <p className="text-xs text-muted-foreground">{b.service} · ₹{((b.amount || 0) - (b.paid || 0)).toLocaleString()}</p>
                </div>
                <Button size="sm" onClick={() => { navigate('/patient/history'); setShowModal(null); }}>Pay Now</Button>
              </div>
            ))}
            {pendingBills.length === 0 && <p className="text-center py-4 text-sm text-muted-foreground">No pending bills</p>}
          </div>
        </Modal>
      )}

      <AlertDialog open={!!cancelTarget} onOpenChange={(open) => { if (!open) setCancelTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to cancel this appointment? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={handleCancelAppointment}>Cancel Appointment</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EmergencyDoctorModal
        isOpen={doctorSosModalOpen}
        onClose={() => setDoctorSosModalOpen(false)}
        currentUser={user}
      />

      {/* Floating 24x7 SOS Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setDoctorSosModalOpen(true)}
          className="group relative flex items-center gap-2 px-4 py-3 rounded-full bg-rose-600 text-white font-bold text-xs shadow-2xl hover:bg-rose-700 hover:scale-105 active:scale-95 transition-all border-2 border-white/40 ring-4 ring-rose-500/20"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping absolute -top-0.5 -right-0.5" />
          <Siren className="w-4 h-4 text-white animate-bounce" />
          <span>24x7 Emergency SOS</span>
        </button>
      </div>
    </div>
  );
}
