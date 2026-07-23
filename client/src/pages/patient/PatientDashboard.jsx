import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, CalendarDays, User, Star, FileText, CreditCard, TestTube,
  Activity, Bell, Search, AlertTriangle, IndianRupee, ClipboardList, Heart,
  Pill, ShoppingCart, Truck, Home, MapPin, Phone, Mail, Shield, Settings,
  Plus, X, Edit, Trash2, Save, Check, Clock, ArrowRight, Bookmark, HeartHandshake,
  HelpCircle, MessageCircle, CreditCard as CardIcon, Wallet, Download, Upload,
  ChevronRight, LogOut, Camera, MapPinned, Users, Award, ExternalLink, Gift
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

const patientApi = {
  getFamily: () => api.dispatch(() => Promise.resolve({ members: [] }), '/patient/family'),
  createFamily: (b) => api.dispatch(() => Promise.resolve({}), '/patient/family', { method: 'POST', body: JSON.stringify(b) }),
  deleteFamily: (id) => api.dispatch(() => Promise.resolve({}), `/patient/family/${id}`, { method: 'DELETE' }),
  getAddresses: () => api.dispatch(() => Promise.resolve({ addresses: [] }), '/patient/addresses'),
  createAddress: (b) => api.dispatch(() => Promise.resolve({}), '/patient/addresses', { method: 'POST', body: JSON.stringify(b) }),
  updateAddress: (id, b) => api.dispatch(() => Promise.resolve({}), `/patient/addresses/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
  deleteAddress: (id) => api.dispatch(() => Promise.resolve({}), `/patient/addresses/${id}`, { method: 'DELETE' }),
  getFavorites: (p = {}) => api.dispatch(() => Promise.resolve({ favorites: [] }), '/patient/favorites?' + new URLSearchParams(p)),
  addFavorite: (b) => api.dispatch(() => Promise.resolve({}), '/patient/favorites', { method: 'POST', body: JSON.stringify(b) }),
  removeFavorite: (id) => api.dispatch(() => Promise.resolve({}), `/patient/favorites/${id}`, { method: 'DELETE' }),
};

let mockFamily = [
  { _id: 'fm1', name: 'Anita Sharma', relation: 'Spouse', gender: 'Female', phone: '9876540091', bloodGroup: 'B+', isActive: true },
  { _id: 'fm2', name: 'Rohit Sharma', relation: 'Child', gender: 'Male', dateOfBirth: '2018-05-12', bloodGroup: 'A+', isActive: true },
];

let mockAddresses = [
  { _id: 'ad1', label: 'Home', address: '123 MG Road, Andheri East', city: 'Mumbai', state: 'Maharashtra', pincode: '400093', phone: '9876543210', isDefault: true },
  { _id: 'ad2', label: 'Office', address: '456 BKC, Bandra East', city: 'Mumbai', state: 'Maharashtra', pincode: '400051', phone: '9876543210', isDefault: false },
];

let mockFavorites = [
  { _id: 'fv1', refType: 'doctor', refId: 'd1', refName: 'Dr. Sarah Smith', notes: 'Cardiologist' },
  { _id: 'fv2', refType: 'hospital', refId: 'h1', refName: 'City General Hospital' },
  { _id: 'fv3', refType: 'lab', refId: 'l1', refName: 'MediCore Diagnostic Center' },
];

let mockMedicineOrders = [
  { _id: 'mo1', orderId: 'ORD-001', items: [{ medicineName: 'Amoxicillin', qty: 20, price: 250 }], total: 5000, status: 'Shipped', paymentStatus: 'Paid', orderDate: new Date(Date.now() - 86400000).toISOString(), deliveryAddress: '123 MG Road, Mumbai', tracking: 'Shipped via Delhivery - ETD: 30 mins' },
  { _id: 'mo2', orderId: 'ORD-002', items: [{ medicineName: 'Paracetamol', qty: 10, price: 50 }, { medicineName: 'Vitamin C', qty: 30, price: 120 }], total: 4100, status: 'Delivered', paymentStatus: 'Paid', orderDate: new Date(Date.now() - 3 * 86400000).toISOString(), deliveryAddress: '456 Park Ave, Delhi' },
  { _id: 'mo3', orderId: 'ORD-003', items: [{ medicineName: 'Insulin', qty: 5, price: 800 }], total: 4000, status: 'Pending', paymentStatus: 'Unpaid', orderDate: new Date(Date.now() - 86400000).toISOString() },
];

let mockPrescriptions = [
  { _id: 'rx1', prescriptionId: 'RX-2026-00001', doctorName: 'Dr. Sarah Smith', diagnosis: 'Hypertension', medicines: [{ name: 'Amlodipine 5mg', dosage: '1-0-1', duration: '30 days' }], status: 'Active', date: new Date(Date.now() - 7 * 86400000).toISOString() },
  { _id: 'rx2', prescriptionId: 'RX-2026-00002', doctorName: 'Dr. Raj Patel', diagnosis: 'Type 2 Diabetes', medicines: [{ name: 'Metformin 500mg', dosage: '1-0-1', duration: '90 days' }, { name: 'Glycomet GP 1', dosage: '0-0-1', duration: '90 days' }], status: 'Active', date: new Date(Date.now() - 30 * 86400000).toISOString() },
  { _id: 'rx3', prescriptionId: 'RX-2026-00003', doctorName: 'Dr. Emily Lee', diagnosis: 'Back Pain', medicines: [{ name: 'Ibuprofen 400mg', dosage: '0-0-1', duration: '7 days' }], status: 'Dispensed', date: new Date(Date.now() - 60 * 86400000).toISOString() },
];

let mockPaymentMethods = [
  { _id: 'pm1', type: 'card', label: 'HDFC Credit Card', last4: '4532', isDefault: true },
  { _id: 'pm2', type: 'upi', label: 'Google Pay', upiId: 'user@okhdfcbank', isDefault: false },
  { _id: 'pm3', type: 'wallet', label: 'PhonePe Wallet', balance: '2500', isDefault: false },
];

let mockNotifications = [
  { _id: 'n1', title: 'Appointment Reminder', message: 'Your appointment with Dr. Sarah Smith is tomorrow at 10:00 AM', type: 'reminder', read: false, date: new Date(Date.now() + 86400000).toISOString() },
  { _id: 'n2', title: 'Lab Report Ready', message: 'Your CBC and Lipid Profile reports are now available', type: 'report', read: false, date: new Date(Date.now() - 1 * 86400000).toISOString() },
  { _id: 'n3', title: 'Order Shipped', message: 'Your medicine order ORD-001 has been shipped', type: 'order', read: true, date: new Date(Date.now() - 2 * 86400000).toISOString() },
  { _id: 'n4', title: 'Payment Received', message: 'Payment of ₹5000 for order ORD-001 confirmed', type: 'payment', read: true, date: new Date(Date.now() - 2 * 86400000).toISOString() },
  { _id: 'n5', title: 'Prescription Added', message: 'Dr. Raj Patel added a new prescription for you', type: 'prescription', read: false, date: new Date(Date.now() - 3 * 86400000).toISOString() },
  { _id: 'n6', title: 'Bill Reminder', message: 'Your pending bill of ₹1200 is due in 3 days', type: 'billing', read: false, date: new Date(Date.now() - 4 * 86400000).toISOString() },
];

const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?'

const tabs = [
  { id: 'overview', label: 'Home', icon: LayoutDashboard },
  { id: 'appointments', label: 'Appointments', icon: CalendarDays },
  { id: 'test-bookings', label: 'Test Bookings', icon: TestTube },
  { id: 'medicine-orders', label: 'Medicine Orders', icon: ShoppingCart },
  { id: 'prescriptions', label: 'Prescriptions', icon: ClipboardList },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'uploads', label: 'Uploads', icon: Upload },
  { id: 'family', label: 'Family', icon: Users },
  { id: 'favorites', label: 'Favorites', icon: Star },
  { id: 'preferred', label: 'Preferred', icon: HeartHandshake },
  { id: 'billing', label: 'Billing', icon: IndianRupee },
  { id: 'payment-methods', label: 'Payments', icon: CardIcon },
  { id: 'addresses', label: 'Addresses', icon: MapPinned },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'reviews', label: 'Reviews', icon: MessageCircle },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'help', label: 'Help', icon: HelpCircle },
];

const StatusBadge = ({ status, mapping }) => {
  const colors = {
    Confirmed: 'bg-success/10 text-success', Pending: 'bg-warning/10 text-warning', Completed: 'bg-success/10 text-success',
    Cancelled: 'bg-destructive/10 text-destructive', Shipped: 'bg-info/10 text-info', Delivered: 'bg-success/10 text-success',
    Active: 'bg-info/10 text-info', Dispensed: 'bg-success/10 text-success', Ready: 'bg-success/10 text-success',
    Paid: 'bg-success/10 text-success', Unpaid: 'bg-warning/10 text-warning', Failed: 'bg-destructive/10 text-destructive',
    ...(mapping || {}),
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-muted text-muted-foreground'}`}>{status}</span>;
};

const Modal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
    <div className="bg-card rounded-2xl border shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-6"><h2 className="font-heading text-xl font-bold">{title}</h2><button onClick={onClose}><X className="w-5 h-5" /></button></div>
      {children}
    </div>
  </div>
);

const SectionHeader = ({ title, subtitle, action }) => (
  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
    <div><h2 className="text-xl font-bold text-foreground">{title}</h2>{subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}</div>
    {action}
  </div>
);

export default function PatientDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [records, setRecords] = useState([]);
  const [bills, setBills] = useState([]);
  const [doctors, setDoctors] = useState([]);

  const [family, setFamily] = useState(mockFamily);
  const [newFamily, setNewFamily] = useState({ name: '', relation: 'Spouse', gender: 'Male', phone: '', bloodGroup: '' });
  const [addresses, setAddresses] = useState(mockAddresses);
  const [newAddress, setNewAddress] = useState({ label: 'Home', address: '', city: '', state: '', pincode: '', phone: '', isDefault: false });
  const [addEditId, setAddEditId] = useState(null);
  const [favorites, setFavorites] = useState(mockFavorites);
  const [medOrders, setMedOrders] = useState(mockMedicineOrders);
  const [prescriptions, setPrescriptions] = useState(mockPrescriptions);
  const [testBookings, setTestBookings] = useState([]);
  const [reports, setReports] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState(mockPaymentMethods);
  const [notifs, setNotifs] = useState(mockNotifications);
  const [reviews, setReviews] = useState([]);
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '', address: user?.address || '', gender: user?.gender || '', dateOfBirth: user?.dateOfBirth ? user.dateOfBirth.split('T')[0] : '', bloodGroup: user?.bloodGroup || '', allergies: user?.allergies?.map(a => a.allergen).join(', ') || '' });
  const [bookingFilter, setBookingFilter] = useState('All');

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    const load = async () => {
      try {
        const [a, r, b, d] = await Promise.all([
          api.getAppointments(),
          api.getRecords(),
          api.getBilling(),
          api.getDoctors({ available: 'true' }),
        ]);
        setAppointments(a?.slice(0, 8) || []);
        setRecords(r?.records || r || []);
        setBills(b?.bills || b || []);
        setDoctors(d?.slice(0, 4) || []);
        const [f, addr, fav, phOrders, rx, n, lb] = await Promise.all([
          patientApi.getFamily(),
          patientApi.getAddresses(),
          patientApi.getFavorites(),
          api.getPharmacyOrders({}).catch(() => ({ orders: [] })),
          api.getPharmacyPrescriptions({}).catch(() => ({ prescriptions: [] })),
          api.getNotifications({}).catch(() => []),
          api.getLabBookings({}).catch(() => ({ bookings: [] })),
        ]);
        if (f?.members?.length) setFamily(f.members);
        if (addr?.addresses?.length) setAddresses(addr.addresses);
        if (fav?.favorites?.length) setFavorites(fav.favorites);
        if (phOrders?.orders?.length) setMedOrders(phOrders.orders);
        if (rx?.prescriptions?.length) setPrescriptions(rx.prescriptions);
        if (n?.length) setNotifs(n);
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
        const allRecs = r?.records || r || [];
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
      } catch (e) { console.error(e); }
    };
    load();
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const upcomingAppts = appointments.filter(a => a.date >= today && a.status !== 'Completed');
  const unreadNotifs = notifs.filter(n => !n.read).length;
  const pendingBills = bills.filter(b => b.status === 'Pending' || b.status === 'Overdue').length;
  const activeRxCount = prescriptions.filter(r => r.status === 'Active').length;
  const activeOrders = medOrders.filter(o => o.status !== 'Delivered').length;
  const readyReports = reports.filter(r => r.status === 'Ready').length;

  const renderStatCard = (icon, label, value, color, bg) => (
    <div className="bg-card rounded-xl border p-4 cursor-pointer hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}><div className={`w-5 h-5 ${color}`}>{icon}</div></div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );

  return (
    <div>
      {toast && (
        <div className={`fixed top-4 right-4 z-[60] px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === 'success' ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'}`}>
          {toast.msg}
        </div>
      )}

      <div className="bg-gradient-to-r from-primary to-primary/80 rounded-3xl p-6 text-white mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold">Welcome back, {user?.name?.split(' ')[0] || 'there'}</h1>
            <p className="opacity-90">Here's your health overview</p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-sm opacity-80">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-1 mb-6 overflow-x-auto pb-2 scrollbar-thin">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${tab === t.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>

          {/* ═══════════════════ OVERVIEW ═══════════════════ */}
          {tab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {[
                  { icon: <CalendarDays />, label: 'Upcoming Appts', value: upcomingAppts.length, color: 'text-success', bg: 'bg-success/10' },
                  { icon: <ClipboardList />, label: 'Active Prescriptions', value: activeRxCount, color: 'text-info', bg: 'bg-info/10' },
                  { icon: <ShoppingCart />, label: 'Active Orders', value: activeOrders, color: 'text-warning', bg: 'bg-warning/10' },
                  { icon: <FileText />, label: 'Reports Ready', value: readyReports, color: 'text-primary', bg: 'bg-primary/10' },
                  { icon: <AlertTriangle />, label: 'Pending Bills', value: pendingBills, color: 'text-destructive', bg: 'bg-destructive/10' },
                  { icon: <Bell />, label: 'Notifications', value: unreadNotifs, color: 'text-warning', bg: 'bg-warning/10' },
                ].map((s, i) => renderStatCard(s.icon, s.label, s.value, s.color, s.bg))}
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-card rounded-xl border p-5">
                  <div className="flex items-center justify-between mb-4"><h3 className="font-semibold flex items-center gap-2"><CalendarDays className="w-4 h-4 text-success" /> Upcoming</h3><Link to="/patient/appointments" className="text-xs text-primary hover:underline">View All</Link></div>
                  {upcomingAppts.slice(0, 3).length > 0 ? upcomingAppts.slice(0, 3).map(a => (
                    <div key={a._id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><User className="w-4 h-4 text-primary" /></div>
                        <div><p className="text-sm font-medium">{a.doctor}</p><p className="text-xs text-muted-foreground">{a.date} · {a.time}</p></div>
                      </div>
                    </div>
                  )) : <p className="text-sm text-muted-foreground text-center py-8">No upcoming appointments</p>}
                </div>
                <div className="bg-card rounded-xl border p-5">
                  <div className="flex items-center justify-between mb-4"><h3 className="font-semibold flex items-center gap-2"><ClipboardList className="w-4 h-4 text-info" /> Recent Prescriptions</h3><Link to="/patient/prescriptions" className="text-xs text-primary hover:underline">View All</Link></div>
                  {prescriptions.slice(0, 3).map(rx => (
                    <div key={rx._id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg mb-2">
                      <div><p className="text-sm font-medium">{rx.doctorName}</p><p className="text-xs text-muted-foreground">{rx.diagnosis} · {(rx.medicines || []).length} medicines</p></div>
                      <StatusBadge status={rx.status} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-card rounded-xl border p-5">
                <h3 className="font-semibold mb-4 flex items-center gap-2"><Zap className="w-4 h-4 text-primary" /> Quick Actions</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Find Doctors', icon: Search, link: '/doctors' },
                    { label: 'Book Lab Test', icon: TestTube, link: '/patient/services' },
                    { label: 'Buy Medicine', icon: Pill, link: '/pharmacy' },
                    { label: 'Upload Report', icon: Upload, link: '/upload' },
                  ].map(a => (
                    <Link key={a.label} to={a.link} className="flex items-center gap-3 p-3 rounded-xl border bg-muted/30 hover:bg-muted transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><a.icon className="w-5 h-5 text-primary" /></div>
                      <span className="text-sm font-medium">{a.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════ APPOINTMENTS ═══════════════════ */}
          {tab === 'appointments' && (
            <div className="space-y-4">
              <SectionHeader title="My Appointments" subtitle={`${upcomingAppts.length} upcoming · ${appointments.length - upcomingAppts.length} past`}
                action={<Link to="/patient/appointments"><Button size="sm" variant="outline">Manage Appointments <ChevronRight className="w-3 h-3 ml-1" /></Button></Link>} />
              {appointments.slice(0, 10).map(a => (
                <div key={a._id} className="bg-card rounded-xl border p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><User className="w-5 h-5 text-primary" /></div>
                      <div><p className="font-medium">{a.doctor}</p><p className="text-xs text-muted-foreground">{a.department} · {a.type}</p></div>
                    </div>
                    <div className="text-right"><p className="text-sm font-medium">{a.date}</p><p className="text-xs text-muted-foreground">{a.time}</p></div>
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t">
                    <Button size="sm" variant="outline" onClick={() => showToast('Reschedule request sent')}><CalendarDays className="w-3 h-3 mr-1" /> Reschedule</Button>
                    {a.status !== 'Cancelled' && <Button size="sm" variant="outline" className="text-destructive" onClick={async () => { try { await api.updateAppointment(a._id, { status: 'Cancelled' }); setAppointments(prev => prev.map(ap => ap._id === a._id ? { ...ap, status: 'Cancelled' } : ap)); showToast('Appointment cancelled'); } catch { showToast('Failed to cancel', 'error'); } }}>Cancel</Button>}
                  </div>
                </div>
              ))}
              {appointments.length === 0 && <div className="text-center py-20 text-muted-foreground"><CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No appointments</p><Link to="/clinic-doctors"><Button size="sm" className="mt-3">Book Appointment</Button></Link></div>}
            </div>
          )}

          {/* ═══════════════════ TEST BOOKINGS ═══════════════════ */}
          {tab === 'test-bookings' && (
            <div className="space-y-4">
              <SectionHeader title="My Test Bookings" subtitle={`${testBookings.filter(b => b.status !== 'Completed').length} active · ${testBookings.filter(b => b.status === 'Completed').length} completed`}
                action={<div className="flex gap-2">{['All', 'Pending', 'Confirmed', 'Completed'].map(s => <button key={s} onClick={() => setBookingFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${bookingFilter === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{s}</button>)}</div>} />
              {testBookings.filter(b => bookingFilter === 'All' || b.status === bookingFilter).map(tb => (
                <div key={tb._id} className="bg-card rounded-xl border p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1"><span className="font-semibold">{tb.bookingId}</span><StatusBadge status={tb.status} /></div>
                      <p className="text-sm">{tb.labName}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(tb.tests || []).map((t, i) => <span key={i} className="text-xs bg-muted px-2 py-1 rounded-lg">{t}</span>)}
                      </div>
                    </div>
                    <div className="text-right"><p className="font-bold">₹{tb.amount?.toLocaleString()}</p><p className="text-xs text-muted-foreground">{new Date(tb.date).toLocaleDateString()}{tb.timeSlot ? ` · ${tb.timeSlot}` : ''}</p></div>
                  </div>
                  {tb.visitType && <p className="text-xs text-muted-foreground"><MapPin className="w-3 h-3 inline mr-1" />{tb.visitType}</p>}
                  <div className="flex gap-2 mt-3 pt-3 border-t">
                    {tb.reportsAvailable && <Button size="sm" onClick={() => showToast('Opening report')}><FileText className="w-3 h-3 mr-1" /> View Report</Button>}
                    {tb.status === 'Pending' && <Button size="sm" variant="outline" onClick={() => showToast('Reschedule request sent')}>Reschedule</Button>}
                  </div>
                </div>
              ))}
              {testBookings.length === 0 && <div className="text-center py-20 text-muted-foreground"><TestTube className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No test bookings</p></div>}
            </div>
          )}

          {/* ═══════════════════ MEDICINE ORDERS ═══════════════════ */}
          {tab === 'medicine-orders' && (
            <div className="space-y-4">
              <SectionHeader title="My Medicine Orders" subtitle={`${activeOrders} active · ${medOrders.filter(o => o.status === 'Delivered').length} delivered`}
                action={<Link to="/pharmacy"><Button size="sm" variant="outline"><ShoppingCart className="w-3 h-3 mr-1" /> Order Medicines</Button></Link>} />
              {medOrders.map(o => (
                <div key={o._id} className="bg-card rounded-xl border p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1"><span className="font-semibold">{o.orderId}</span><StatusBadge status={o.status} /></div>
                      <div className="flex flex-wrap gap-2">
                        {(o.items || []).map((item, i) => <span key={i} className="text-xs bg-muted px-2 py-1 rounded-lg">{item.medicineName} x{item.qty}</span>)}
                      </div>
                    </div>
                    <div className="text-right"><p className="font-bold text-lg">₹{o.total?.toLocaleString()}</p><StatusBadge status={o.paymentStatus} mapping={{ Paid: 'bg-success/10 text-success', Unpaid: 'bg-warning/10 text-warning' }} /></div>
                  </div>
                  {o.tracking && <p className="text-xs text-info mt-2"><Truck className="w-3 h-3 inline mr-1" />{o.tracking}</p>}
                  {o.deliveryAddress && <p className="text-xs text-muted-foreground mt-1"><MapPin className="w-3 h-3 inline mr-1" />{o.deliveryAddress}</p>}
                  <div className="flex gap-2 mt-3 pt-3 border-t">
                    {o.status === 'Pending' && <Button size="sm" variant="outline" onClick={async () => { try { await api.updatePharmacyOrder(o._id, { status: 'Cancelled' }); setMedOrders(prev => prev.map(mo => mo._id === o._id ? { ...mo, status: 'Cancelled' } : mo)); showToast('Order cancelled'); } catch { showToast('Failed to cancel', 'error'); } }} className="text-destructive">Cancel</Button>}
                    {o.status === 'Delivered' && <Button size="sm" variant="outline" onClick={() => showToast('Reorder placed')}><RefreshCw className="w-3 h-3 mr-1" /> Reorder</Button>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ═══════════════════ PRESCRIPTIONS ═══════════════════ */}
          {tab === 'prescriptions' && (
            <div className="space-y-4">
              <SectionHeader title="My Prescriptions" subtitle={`${activeRxCount} active prescriptions`}
                action={<Button size="sm" variant="outline" onClick={() => showToast('Upload prescription feature')}><Upload className="w-3 h-3 mr-1" /> Upload External Rx</Button>} />
              {prescriptions.map(rx => (
                <div key={rx._id} className="bg-card rounded-xl border p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1"><span className="font-semibold">{rx.prescriptionId}</span><StatusBadge status={rx.status} /></div>
                      <p className="text-sm font-medium">{rx.doctorName}</p>
                      <p className="text-xs text-muted-foreground">{rx.diagnosis} · {new Date(rx.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="space-y-2 mt-3">
                    {(rx.medicines || []).map((m, i) => (
                      <div key={i} className="flex items-center justify-between bg-muted/30 rounded-lg p-2">
                        <div><p className="text-sm font-medium">{m.name}</p><p className="text-xs text-muted-foreground">{m.dosage} · {m.duration}</p></div>
                        <Button size="sm" variant="outline" onClick={() => { setTab('medicine-orders'); showToast('Quick order: ' + m.name); }}><ShoppingCart className="w-3 h-3" /></Button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t">
                    <Button size="sm" variant="outline" onClick={() => showToast('Saved for later use')}><Bookmark className="w-3 h-3 mr-1" /> Save for Reuse</Button>
                    <Button size="sm" variant="outline" onClick={() => showToast('Downloading prescription')}><Download className="w-3 h-3 mr-1" /> Download</Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ═══════════════════ REPORTS ═══════════════════ */}
          {tab === 'reports' && (
            <div className="space-y-4">
              <SectionHeader title="My Reports" subtitle={`${readyReports} reports ready to view`}
                action={<Button size="sm" variant="outline" onClick={() => showToast('Downloading all reports')}><Download className="w-3 h-3 mr-1" /> Download All</Button>} />
              {reports.map(r => (
                <div key={r._id} className="bg-card rounded-xl border p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${r.status === 'Ready' ? 'bg-success/10' : 'bg-warning/10'} flex items-center justify-center`}>
                        <FileText className={`w-5 h-5 ${r.status === 'Ready' ? 'text-success' : 'text-warning'}`} />
                      </div>
                      <div><p className="font-medium">{r.name}</p><p className="text-xs text-muted-foreground">{r.labName} · {r.orderedBy} · {new Date(r.date).toLocaleDateString()}</p></div>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                  {r.status === 'Ready' && <div className="flex gap-2 mt-3 pt-3 border-t"><Button size="sm" onClick={() => showToast('Opening report')}><Eye className="w-3 h-3 mr-1" /> View</Button><Button size="sm" variant="outline" onClick={() => showToast('Downloading PDF')}><Download className="w-3 h-3 mr-1" /> Download PDF</Button></div>}
                </div>
              ))}
              {reports.length === 0 && <div className="text-center py-20"><FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground">No reports yet</p></div>}
            </div>
          )}

          {/* ═══════════════════ UPLOADS ═══════════════════ */}
          {tab === 'uploads' && (
            <div className="max-w-lg">
              <SectionHeader title="Upload Health Records" subtitle="Upload your reports, prescriptions, and documents" />
              <div className="bg-card rounded-xl border p-6 space-y-4">
                <div className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:bg-muted/30 transition-colors">
                  <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="font-medium">Click to upload or drag and drop</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG up to 10MB</p>
                </div>
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Recently Uploaded</h4>
                  {[1, 2].map(i => (
                    <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-3"><FileText className="w-4 h-4 text-primary" /><span className="text-sm">Report_{i}.pdf</span></div>
                      <span className="text-xs text-muted-foreground">2.3 MB</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════ FAMILY ═══════════════════ */}
          {tab === 'family' && (
            <div className="max-w-2xl">
              <SectionHeader title="Family Members" subtitle="Add dependent profiles for bookings on their behalf"
                action={<Button size="sm" onClick={() => { setNewFamily({ name: '', relation: 'Spouse', gender: 'Male', phone: '', bloodGroup: '' }); setShowModal('add-family'); }}><Plus className="w-4 h-4 mr-1" /> Add Member</Button>} />
              <div className="space-y-3">
                {family.map(m => (
                  <div key={m._id} className="bg-card rounded-xl border p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><User className="w-5 h-5 text-primary" /></div>
                        <div><p className="font-medium">{m.name}</p><p className="text-xs text-muted-foreground">{m.relation} · {m.gender}{m.bloodGroup ? ` · ${m.bloodGroup}` : ''}</p></div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => showToast('Booking for ' + m.name)}><CalendarDays className="w-3 h-3 mr-1" /> Book Test</Button>
                        <Button size="sm" variant="outline" className="text-destructive" onClick={async () => { try { await patientApi.deleteFamily(m._id); setFamily(f => f.filter(mm => mm._id !== m._id)); showToast(m.name + ' removed'); } catch { showToast('Failed to remove', 'error'); } }}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </div>
                  </div>
                ))}
                {family.length === 0 && <div className="text-center py-20"><Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground">No family members added</p></div>}
              </div>
            </div>
          )}

          {/* ═══════════════════ FAVORITES ═══════════════════ */}
          {tab === 'favorites' && (
            <div className="space-y-4">
              <SectionHeader title="Saved & Favorites" subtitle="Bookmarked doctors, hospitals, labs, and pharmacies" />
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {favorites.map(f => (
                  <div key={f._id} className="bg-card rounded-xl border p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Star className="w-5 h-5 text-warning fill-warning" /></div>
                      <div><p className="font-medium">{f.refName}</p><p className="text-xs text-muted-foreground capitalize">{f.refType}{f.notes ? ` · ${f.notes}` : ''}</p></div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => showToast('Opening ' + f.refName)}><ExternalLink className="w-3 h-3 mr-1" /> View</Button>
                      <Button size="sm" variant="outline" className="text-destructive" onClick={async () => { try { await patientApi.removeFavorite(f._id); setFavorites(fs => fs.filter(ff => ff._id !== f._id)); showToast('Removed from favorites'); } catch { showToast('Failed to remove', 'error'); } }}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════════════ PREFERRED ═══════════════════ */}
          {tab === 'preferred' && (
            <div className="max-w-2xl">
              <SectionHeader title="Preferred Pharmacies & Labs" subtitle="Priority list for auto-fallback when prescriptions are rejected" />
              <div className="bg-card rounded-xl border p-6 space-y-4">
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2"><HeartHandshake className="w-4 h-4 text-primary" /> Your Priority List</h3>
                  {[
                    { name: 'MedPlus Pharmacy', priority: 1, type: 'Pharmacy' },
                    { name: 'HealthFirst Medicals', priority: 2, type: 'Pharmacy' },
                    { name: 'Apollo Pharmacy', priority: 3, type: 'Pharmacy' },
                    { name: 'MediCore Diagnostic Center', priority: 1, type: 'Lab' },
                  ].map(p => (
                    <div key={`${p.type}-${p.priority}`} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">{p.priority}</span>
                        <div><p className="text-sm font-medium">{p.name}</p><p className="text-xs text-muted-foreground">{p.type}</p></div>
                      </div>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => showToast('Removed from priority list')}><X className="w-3 h-3" /></Button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">When a pharmacy/lab rejects your prescription, it auto-forwards to the next in your priority list.</p>
              </div>
            </div>
          )}

          {/* ═══════════════════ BILLING ═══════════════════ */}
          {tab === 'billing' && (
            <div className="space-y-4">
              <SectionHeader title="Payments & Billing History" subtitle="All your transactions in one place"
                action={<Link to="/patient/billing"><Button size="sm" variant="outline">Full Billing <ChevronRight className="w-3 h-3 ml-1" /></Button></Link>} />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-muted-foreground"><th className="text-left py-3 px-2 font-medium">Invoice</th><th className="text-left py-3 px-2 font-medium">Service</th><th className="text-right py-3 px-2 font-medium">Amount</th><th className="text-center py-3 px-2 font-medium">Status</th><th className="text-right py-3 px-2 font-medium">Date</th></tr></thead>
                  <tbody>
                    {bills.slice(0, 10).map(b => (
                      <tr key={b._id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2 font-medium">{b.invoiceId || b._id}</td>
                        <td className="py-3 px-2">{b.service || 'Consultation'}</td>
                        <td className="py-3 px-2 text-right font-medium">₹{b.amount?.toLocaleString() || 0}</td>
                        <td className="py-3 px-2 text-center"><StatusBadge status={b.status} /></td>
                        <td className="py-3 px-2 text-right text-muted-foreground">{b.date}</td>
                      </tr>
                    ))}
                    {bills.length === 0 && (
                      <>
                        <tr className="border-b hover:bg-muted/50"><td className="py-3 px-2 font-medium">INV-0001</td><td className="py-3 px-2">Cardiology Consultation</td><td className="py-3 px-2 text-right font-medium">₹500</td><td className="py-3 px-2 text-center"><StatusBadge status="Paid" /></td><td className="py-3 px-2 text-right text-muted-foreground">{new Date().toLocaleDateString()}</td></tr>
                        <tr className="border-b hover:bg-muted/50"><td className="py-3 px-2 font-medium">INV-0002</td><td className="py-3 px-2">Lab Tests - CBC, Lipid</td><td className="py-3 px-2 text-right font-medium">₹1,800</td><td className="py-3 px-2 text-center"><StatusBadge status="Pending" /></td><td className="py-3 px-2 text-right text-muted-foreground">{new Date().toLocaleDateString()}</td></tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══════════════════ PAYMENT METHODS ═══════════════════ */}
          {tab === 'payment-methods' && (
            <div className="max-w-lg">
              <SectionHeader title="Payment Methods" subtitle="Saved cards, wallets, and UPI"
                action={<Button size="sm" onClick={() => setShowModal('add-payment')}><Plus className="w-4 h-4 mr-1" /> Add Method</Button>} />
              <div className="space-y-3">
                {paymentMethods.map(pm => (
                  <div key={pm._id} className="bg-card rounded-xl border p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          {pm.type === 'card' ? <CardIcon className="w-5 h-5 text-primary" /> : pm.type === 'upi' ? <Smartphone className="w-5 h-5 text-primary" /> : <Wallet className="w-5 h-5 text-primary" />}
                        </div>
                        <div>
                          <p className="font-medium">{pm.label}</p>
                          <p className="text-xs text-muted-foreground">{pm.type === 'card' ? `**** ${pm.last4}` : pm.type === 'upi' ? pm.upiId : `₹${pm.balance} balance`}</p>
                        </div>
                      </div>
                      {pm.isDefault && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Default</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════════════ ADDRESSES ═══════════════════ */}
          {tab === 'addresses' && (
            <div className="max-w-2xl">
              <SectionHeader title="Saved Addresses" subtitle="For home collection and medicine delivery"
                action={<Button size="sm" onClick={() => { setAddEditId(null); setNewAddress({ label: 'Home', address: '', city: '', state: '', pincode: '', phone: user?.phone || '', isDefault: false }); setShowModal('add-address'); }}><Plus className="w-4 h-4 mr-1" /> Add Address</Button>} />
              <div className="space-y-3">
                {addresses.map(a => (
                  <div key={a._id} className="bg-card rounded-xl border p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><MapPinned className="w-5 h-5 text-primary" /></div>
                        <div>
                          <div className="flex items-center gap-2"><p className="font-medium">{a.label}</p>{a.isDefault && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">Default</span>}</div>
                          <p className="text-sm text-muted-foreground">{a.address}</p>
                          <p className="text-xs text-muted-foreground">{a.city}, {a.state} - {a.pincode}<br /><Phone className="w-3 h-3 inline mr-1" />{a.phone}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => { setAddEditId(a._id); setNewAddress({ label: a.label, address: a.address, city: a.city, state: a.state, pincode: a.pincode, phone: a.phone, isDefault: a.isDefault }); setShowModal('add-address'); }}><Edit className="w-3 h-3" /></Button>
                        <Button size="sm" variant="outline" className="text-destructive" onClick={async () => { try { await patientApi.deleteAddress(a._id); setAddresses(ads => ads.filter(ad => ad._id !== a._id)); showToast('Address deleted'); } catch { showToast('Failed to delete', 'error'); } }}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════════════ NOTIFICATIONS ═══════════════════ */}
          {tab === 'notifications' && (
            <div className="space-y-4">
              <SectionHeader title="Notifications" subtitle={`${unreadNotifs} unread`}
                action={<Button size="sm" variant="outline" onClick={async () => { try { await api.markAllRead(); setNotifs(ns => ns.map(n => ({ ...n, read: true }))); showToast('All marked as read'); } catch { showToast('Failed to mark as read', 'error'); } }}>Mark All Read</Button>} />
              {notifs.map(n => (
                <div key={n._id} className={`bg-card rounded-xl border p-4 ${!n.read ? 'border-l-4 border-l-primary' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl ${!n.read ? 'bg-primary/10' : 'bg-muted'} flex items-center justify-center`}>
                        {n.type === 'reminder' ? <Clock className="w-5 h-5 text-primary" /> :
                         n.type === 'report' ? <FileText className="w-5 h-5 text-success" /> :
                         n.type === 'order' ? <Truck className="w-5 h-5 text-info" /> :
                         n.type === 'payment' ? <IndianRupee className="w-5 h-5 text-success" /> :
                         n.type === 'billing' ? <CreditCard className="w-5 h-5 text-warning" /> :
                         <Bell className="w-5 h-5 text-muted-foreground" />}
                      </div>
                      <div><p className="font-medium">{n.title}</p><p className="text-xs text-muted-foreground">{n.message}</p></div>
                    </div>
                    <div className="text-right"><p className="text-xs text-muted-foreground">{new Date(n.date).toLocaleDateString()}</p>{!n.read && <div className="w-2 h-2 rounded-full bg-primary mt-1 ml-auto" />}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ═══════════════════ REVIEWS ═══════════════════ */}
          {tab === 'reviews' && (
            <div className="max-w-2xl">
              <SectionHeader title="My Reviews" subtitle="Reviews you've given"
                action={<Link to="/patient/reviews"><Button size="sm" variant="outline">Manage Reviews <ChevronRight className="w-3 h-3 ml-1" /></Button></Link>} />
              <div className="space-y-3">
                {reviews.length > 0 ? reviews.map(r => (
                  <div key={r._id} className="bg-card rounded-xl border p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">{r.doctorName || r.service}</p>
                      <div className="flex items-center gap-0.5">{Array.from({ length: 5 }, (_, i) => <Star key={i} className={`w-4 h-4 ${i < r.rating ? 'text-warning fill-warning' : 'text-muted'}`} />)}</div>
                    </div>
                    <p className="text-sm text-muted-foreground">{r.comment}</p>
                  </div>
                )) : (
                  <div className="text-center py-20"><Star className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground">No reviews yet</p><Link to="/patient/reviews"><Button size="sm" className="mt-3">Write a Review</Button></Link></div>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════════ PROFILE ═══════════════════ */}
          {tab === 'profile' && (
            <div className="max-w-2xl">
              <SectionHeader title="Profile Settings" subtitle="Manage your personal information and medical history" />
              <div className="bg-card rounded-xl border p-6 space-y-5">
                <div className="flex items-center gap-4 pb-5 border-b">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <p className="font-semibold text-lg">{user?.name}</p>
                    <p className="text-sm text-muted-foreground">{user?.email} · {user?.phone}</p>
                    {user?.uhid && <p className="text-xs text-primary font-mono">UHID: {user.uhid}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[{ key: 'name', label: 'Full Name' }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' }, { key: 'address', label: 'Address' }, { key: 'gender', label: 'Gender' }, { key: 'dateOfBirth', label: 'Date of Birth', type: 'date' }, { key: 'bloodGroup', label: 'Blood Group' }].map(f => (
                    <div key={f.key}><label className="text-sm font-medium mb-1 block">{f.label}</label><Input type={f.type || 'text'} value={profileForm[f.key]} onChange={e => setProfileForm({ ...profileForm, [f.key]: e.target.value })} /></div>
                  ))}
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Allergies (comma separated)</label>
                  <Input value={profileForm.allergies} onChange={e => setProfileForm({ ...profileForm, allergies: e.target.value })} placeholder="e.g. Penicillin, Peanuts, Sulfa" />
                  <p className="text-xs text-muted-foreground mt-1">This helps doctors and pharmacists avoid prescribing medicines you're allergic to.</p>
                </div>
                <Button className="w-full" onClick={async () => { try { await api.updateProfile(profileForm); showToast('Profile updated'); } catch { showToast('Failed to update profile', 'error'); } }}><Save className="w-4 h-4 mr-1" /> Save Profile</Button>
              </div>
            </div>
          )}

          {/* ═══════════════════ HELP ═══════════════════ */}
          {tab === 'help' && (
            <div className="max-w-2xl">
              <SectionHeader title="Help & Support" subtitle="FAQs and contact information" />
              <div className="space-y-4">
                <div className="bg-card rounded-xl border divide-y">
                  {[
                    { q: 'How do I book an appointment?', a: 'Go to Find Doctors, select your preferred doctor, and choose an available time slot.' },
                    { q: 'How do I access my lab reports?', a: 'Go to the Reports section in your dashboard. All completed reports are available for view and download.' },
                    { q: 'How does prescription auto-fallback work?', a: 'When a pharmacy rejects your prescription, it automatically forwards to the next pharmacy in your preferred list.' },
                    { q: 'Can I book tests for family members?', a: 'Yes! Add family members under the Family section and book tests on their behalf.' },
                    { q: 'How do I get medicines delivered?', a: 'Visit the Pharmacy section, add medicines to your cart, and choose delivery. Saved addresses will appear automatically.' },
                    { q: 'What payment methods are accepted?', a: 'We accept credit/debit cards, UPI (GPay, PhonePe), and net banking.' },
                  ].map((faq, i) => (
                    <details key={i} className="group p-4">
                      <summary className="flex items-center justify-between cursor-pointer list-none">
                        <span className="text-sm font-medium">{faq.q}</span>
                        <ChevronDown className="w-4 h-4 text-muted-foreground group-open:rotate-180 transition-transform" />
                      </summary>
                      <p className="text-sm text-muted-foreground mt-3 pl-4 border-l-2 border-primary">{faq.a}</p>
                    </details>
                  ))}
                </div>
                <div className="bg-card rounded-xl border p-6 text-center">
                  <MessageCircle className="w-12 h-12 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Still need help?</h3>
                  <p className="text-sm text-muted-foreground mb-4">Our support team is available 24/7</p>
                  <div className="flex justify-center gap-3">
                    <Button variant="outline" onClick={() => showToast('Email: support@medicore.com')}><Mail className="w-4 h-4 mr-1" /> Email Us</Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ═══════════════════ MODALS ═══════════════════ */}

      {showModal === 'add-family' && (
        <Modal title="Add Family Member" onClose={() => setShowModal(null)}>
          <div className="grid grid-cols-2 gap-4">
            {[{ key: 'name', label: 'Full Name' }, { key: 'phone', label: 'Phone' }, { key: 'bloodGroup', label: 'Blood Group' }].map(f => (
              <div key={f.key}><label className="text-sm font-medium mb-1 block">{f.label}</label><Input value={newFamily[f.key]} onChange={e => setNewFamily({ ...newFamily, [f.key]: e.target.value })} /></div>
            ))}
            <div><label className="text-sm font-medium mb-1 block">Relation</label><select value={newFamily.relation} onChange={e => setNewFamily({ ...newFamily, relation: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">{['Spouse', 'Child', 'Parent', 'Sibling', 'Grandparent', 'Other'].map(r => <option key={r} value={r}>{r}</option>)}</select></div>
            <div><label className="text-sm font-medium mb-1 block">Gender</label><select value={newFamily.gender} onChange={e => setNewFamily({ ...newFamily, gender: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">{['Male', 'Female', 'Other'].map(g => <option key={g} value={g}>{g}</option>)}</select></div>
          </div>
          <Button className="w-full mt-6" onClick={async () => { try { await patientApi.createFamily(newFamily); setFamily(f => [...f, { ...newFamily, _id: `fm${Date.now()}`, isActive: true }]); showToast(newFamily.name + ' added'); setShowModal(null); } catch { showToast('Failed to add member', 'error'); } }} disabled={!newFamily.name}>Add Member</Button>
        </Modal>
      )}

      {showModal === 'add-address' && (
        <Modal title={addEditId ? 'Edit Address' : 'Add Address'} onClose={() => setShowModal(null)}>
          <div className="space-y-4">
            <div><label className="text-sm font-medium mb-1 block">Label</label><select value={newAddress.label} onChange={e => setNewAddress({ ...newAddress, label: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">{['Home', 'Office', 'Other'].map(l => <option key={l} value={l}>{l}</option>)}</select></div>
            <div><label className="text-sm font-medium mb-1 block">Address</label><Input value={newAddress.address} onChange={e => setNewAddress({ ...newAddress, address: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-sm font-medium mb-1 block">City</label><Input value={newAddress.city} onChange={e => setNewAddress({ ...newAddress, city: e.target.value })} /></div>
              <div><label className="text-sm font-medium mb-1 block">State</label><Input value={newAddress.state} onChange={e => setNewAddress({ ...newAddress, state: e.target.value })} /></div>
              <div><label className="text-sm font-medium mb-1 block">Pincode</label><Input value={newAddress.pincode} onChange={e => setNewAddress({ ...newAddress, pincode: e.target.value })} /></div>
            </div>
            <div><label className="text-sm font-medium mb-1 block">Phone</label><Input value={newAddress.phone} onChange={e => setNewAddress({ ...newAddress, phone: e.target.value })} /></div>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={newAddress.isDefault} onChange={e => setNewAddress({ ...newAddress, isDefault: e.target.checked })} className="rounded" /> Set as default address</label>
            <Button className="w-full" onClick={async () => { try { if (addEditId) { await patientApi.updateAddress(addEditId, newAddress); setAddresses(ads => ads.map(ad => ad._id === addEditId ? { ...ad, ...newAddress } : ad)); showToast('Address updated'); } else { await patientApi.createAddress(newAddress); setAddresses(ads => [...ads, { ...newAddress, _id: `ad${Date.now()}` }]); showToast('Address added'); } setShowModal(null); } catch { showToast('Failed to save address', 'error'); } }} disabled={!newAddress.address}>{addEditId ? 'Update Address' : 'Add Address'}</Button>
          </div>
        </Modal>
      )}

      {showModal === 'add-payment' && (
        <Modal title="Add Payment Method" onClose={() => setShowModal(null)}>
          <div className="space-y-4">
            <div><label className="text-sm font-medium mb-1 block">Method Type</label><select className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">{['Credit/Debit Card', 'UPI', 'Wallet'].map(m => <option key={m} value={m}>{m}</option>)}</select></div>
            <div><label className="text-sm font-medium mb-1 block">Card Number / UPI ID</label><Input placeholder="Enter details" /></div>
            <Button className="w-full" onClick={() => { showToast('Payment method added'); setShowModal(null); }}>Add Method</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

