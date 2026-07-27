import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  CalendarDays, Calendar, User, FileText, TestTube, Bell, AlertTriangle, ClipboardList,
  Pill, ShoppingCart, Upload, Search, Zap, Heart, ArrowRight, Clock, Star,
  IndianRupee, Activity, MapPinned, HelpCircle, Phone, MessageCircle, ChevronRight,
  X, Download, Users, Ambulance, Stethoscope, Syringe, CreditCard, Bookmark,
  Smartphone, Landmark, Wallet, RotateCcw, Sparkles, CheckCircle2, TrendingUp,
  ExternalLink, RefreshCw, ChevronLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { api, downloadPaymentInvoice } from '@/lib/api';
import { getISTDateString } from '@/lib/dateUtils';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';

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

const SupportTicketForm = ({ onClose, showToast }) => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = async () => {
    if (!subject || !message) return showToast('Please fill all fields', 'error');
    setSubmitting(true);
    try {
      await api.createSupportTicket({ subject, message });
      showToast('Support ticket submitted');
      onClose();
    } catch { showToast('Failed to submit ticket', 'error'); }
    setSubmitting(false);
  };
  return (
    <div className="space-y-4">
      <div><label className="text-sm font-medium mb-1 block">Subject</label><Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Brief title for your issue" /></div>
      <div><label className="text-sm font-medium mb-1 block">Message</label><textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Describe your issue in detail..." className="w-full min-h-[100px] rounded-lg border border-input bg-transparent px-3 py-2 text-sm" /></div>
      <Button className="w-full" onClick={handleSubmit} disabled={submitting || !subject || !message}>{submitting ? 'Submitting...' : 'Submit Ticket'}</Button>
    </div>
  );
};

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
  { label: 'Find Doctors', icon: Stethoscope, link: '/doctors', desc: 'Book appointment' },
  { label: 'Book Lab Test', icon: Syringe, link: '/patient/services', desc: 'Home collection' },
  { label: 'Buy Medicine', icon: Pill, link: '/pharmacy', desc: 'Doorstep delivery' },
  { label: 'Upload Report', icon: Upload, link: '/upload', desc: 'Store securely' },
  { label: 'Emergency', icon: Ambulance, link: '/patient/emergency', desc: 'Get help now' },
  { label: 'Saved Doctors', icon: Heart, link: '/patient/favorites', desc: 'Quick access' },
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
  const [toast, setToast] = useState(null);
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

  const handleCancelAppointment = async () => {
    if (!cancelTarget) return;
    const id = cancelTarget;
    setCancelTarget(null);
    try {
      await api.updateAppointment(id, { status: 'Cancelled' });
      setAppointments(prev => prev.map(ap => ap._id === id ? { ...ap, status: 'Cancelled' } : ap));
      showToast('Appointment cancelled');
    } catch { showToast('Failed to cancel', 'error'); }
  };

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
     if (!user?.id) return;
    const load = async () => {
      try {
        const [a, r, b] = await Promise.all([
          api.getAppointments().catch(() => ({ data: [] })),
          api.getRecords().catch(() => ({ data: [] })),
          api.getBilling().catch(() => ({ data: [] })),
        ]);
        setAppointments((a?.appointments || a?.data || []).slice(0, 8));
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
        if (phOrders?.orders?.length) setMedOrders(phOrders.orders);
        if (rx?.prescriptions?.length) setPrescriptions(rx.prescriptions);
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
  const upcomingAppts = appointments.filter(a => a.date >= today && a.status !== 'Completed');
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
  const pendingBillsCount = pendingBills.length;
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
    'Test Bookings': recentTests.length,
    'My Reviews': reviews.length,
  };

  return (
    <div>
      {toast && (
        <motion.div initial={{ opacity: 0, x: 50, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }}
          className={`fixed top-4 right-4 z-[60] px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-medium flex items-center gap-3 ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/50 dark:bg-emerald-950 dark:text-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200/50 dark:bg-red-950 dark:text-red-200'
          }`}>
          <div className={`w-2 h-2 rounded-full ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`} />
          {toast.msg}
        </motion.div>
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
          <div className="flex items-center gap-3">
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

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Upcoming Appointments */}
        <div className="lg:col-span-2 bg-card rounded-3xl border border-border/50 p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center shadow-sm">
                <CalendarDays className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-foreground">Upcoming Appointments</h3>
                <p className="text-xs text-muted-foreground">{upcomingAppts.length > 0 ? `${upcomingAppts.length} appointment${upcomingAppts.length > 1 ? 's' : ''} scheduled` : 'No upcoming visits'}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 rounded-xl text-primary border-primary/20 hover:bg-primary/5 hover:text-primary" onClick={() => navigate('/patient/appointments')}>
              View All <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
          {upcomingAppts.slice(0, 3).length > 0 ? (
            <div className="space-y-3">
              {upcomingAppts.slice(0, 3).map(a => (
                <div key={a._id} className="group flex items-center justify-between p-3.5 bg-muted/20 rounded-2xl border border-border/30 hover:bg-muted/40 hover:border-primary/20 transition-all duration-200">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                      <User className="w-5.5 h-5.5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{a.doctor}</p>
                      <div className="flex items-center gap-2.5 text-xs text-muted-foreground mt-0.5">
                        <div className="flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          <span>{a.date}</span>
                        </div>
                        <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{a.time}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost"
                    className="text-xs h-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded-xl border border-transparent hover:border-destructive/20"
                    onClick={() => setCancelTarget(a._id)}>
                    <X className="w-3 h-3 mr-1" /> Cancel
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-3">
                <CalendarDays className="w-7 h-7 text-muted-foreground/30" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">No upcoming appointments</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Book a visit with your doctor</p>
              <Button size="sm" className="mt-4 rounded-xl shadow-lg shadow-primary/20" onClick={() => navigate('/doctors')}>
                <Stethoscope className="w-3.5 h-3.5 mr-1.5" /> Book Now
              </Button>
            </div>
          )}
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
              <Button size="sm" className="mt-4 rounded-xl shadow-lg shadow-amber-500/20 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600" onClick={() => navigate('/pharmacy')}>
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

      {/* Quick Actions */}
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
    </div>
  );
}
