import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Beaker, Search, Plus, Clock, CheckCircle, AlertTriangle, X, Package, AlertCircle,
  CalendarDays, Truck, CreditCard, RotateCcw, Users, Percent, Star, BarChart3,
  Settings, TrendingUp, IndianRupee, Filter, Download, Printer, Send,
  Phone, Mail, MapPin, Edit, Trash2, Save, Eye, ClipboardList, User, Stethoscope,
  Shield, Activity, DollarSign, Bell, ChevronDown, ChevronUp, RefreshCw, Box,
  Check, Minus, Copy, FileText, Radio, Home, Zap, Gift, Upload, Tag,
  Microscope, FlaskConical, Syringe, Heart, Calendar, ShoppingCart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

const labApi = {
  getOrders: (p = {}) => api.dispatch(() => Promise.resolve({ orders: [] }), '/lab/orders?' + new URLSearchParams(p)),
  getStats: () => api.dispatch(() => Promise.resolve({ total: 0, pending: 0, processing: 0, completed: 0, critical: 0, totalBookings: 0, todayBookings: 0, revenue: 0 }), '/lab/stats'),
  getTests: (p = {}) => api.dispatch(() => Promise.resolve([]), '/tests?' + new URLSearchParams(p)),
  getBookings: (p = {}) => api.dispatch(() => Promise.resolve({ bookings: [] }), '/lab/bookings?' + new URLSearchParams(p)),
  createBooking: (b) => api.dispatch(() => Promise.resolve({}), '/lab/bookings', { method: 'POST', body: JSON.stringify(b) }),
  updateBooking: (id, b) => api.dispatch(() => Promise.resolve({}), `/lab/bookings/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
  getEquipment: (p = {}) => api.dispatch(() => Promise.resolve({ equipment: [] }), '/lab/equipment?' + new URLSearchParams(p)),
  createEquipment: (b) => api.dispatch(() => Promise.resolve({}), '/lab/equipment', { method: 'POST', body: JSON.stringify(b) }),
  updateEquipment: (id, b) => api.dispatch(() => Promise.resolve({}), `/lab/equipment/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
  deleteEquipment: (id) => api.dispatch(() => Promise.resolve({}), `/lab/equipment/${id}`, { method: 'DELETE' }),
  getPackages: (p = {}) => api.dispatch(() => Promise.resolve({ packages: [] }), '/lab/packages?' + new URLSearchParams(p)),
  createPackage: (b) => api.dispatch(() => Promise.resolve({}), '/lab/packages', { method: 'POST', body: JSON.stringify(b) }),
  updatePackage: (id, b) => api.dispatch(() => Promise.resolve({}), `/lab/packages/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
  deletePackage: (id) => api.dispatch(() => Promise.resolve({}), `/lab/packages/${id}`, { method: 'DELETE' }),
  createOrder: (b) => api.dispatch(() => Promise.resolve({}), '/lab/orders', { method: 'POST', body: JSON.stringify(b) }),
  registerSample: (id, b) => api.dispatch(() => Promise.resolve({}), `/lab/orders/${id}/register-sample`, { method: 'PUT', body: JSON.stringify(b) }),
  collectSample: (id, b) => api.dispatch(() => Promise.resolve({}), `/lab/orders/${id}/collect-sample`, { method: 'PUT', body: JSON.stringify(b) }),
  enterResult: (id, b) => api.dispatch(() => Promise.resolve({}), `/lab/orders/${id}/enter-result`, { method: 'PUT', body: JSON.stringify(b) }),
  verify: (id, b) => api.dispatch(() => Promise.resolve({}), `/lab/orders/${id}/verify`, { method: 'PUT', body: JSON.stringify(b) }),
  deliverReport: (id, b) => api.dispatch(() => Promise.resolve({}), `/lab/orders/${id}/deliver-report`, { method: 'PUT', body: JSON.stringify(b) }),
};

const CATEGORIES = ['Blood Test', 'Urine/Stool', 'Hormone', 'Vitamin', 'Cardiac Basic', 'Basic Imaging', 'Advanced Imaging', 'Health Package', 'Other'];
const DEPARTMENTS = ['Pathology', 'Radiology', 'Cardiology', 'Health Packages'];
const REPORT_TIMES = ['30 mins', '1 hr', '2 hrs', '6 hrs', '12 hrs', '24 hrs', '48 hrs', '72 hrs'];

let mockBookings = [
  { _id: 'b1', bookingId: 'BK-2026-0001', patientName: 'Ravi Sharma', patientPhone: '9876543210', tests: ['CBC', 'Lipid Profile'], totalAmount: 1800, status: 'Confirmed', bookingDate: new Date().toISOString(), timeSlot: '9:30 AM', visitType: 'Walk-in', paymentStatus: 'Paid' },
  { _id: 'b2', bookingId: 'BK-2026-0002', patientName: 'Priya Patel', patientPhone: '9876543211', tests: ['Thyroid', 'Blood Sugar'], totalAmount: 1200, status: 'Pending', bookingDate: new Date().toISOString(), timeSlot: '10:00 AM', visitType: 'Home Collection', homeCollectionAddress: '456 Park Ave', paymentStatus: 'Unpaid' },
  { _id: 'b3', bookingId: 'BK-2026-0003', patientName: 'Amit Verma', patientPhone: '9876543212', tests: ['ECG', 'X-Ray Chest'], totalAmount: 2500, status: 'Completed', bookingDate: new Date().toISOString(), timeSlot: '11:30 AM', visitType: 'Walk-in', paymentStatus: 'Paid' },
  { _id: 'b4', bookingId: 'BK-2026-0004', patientName: 'Sunita Gupta', patientPhone: '9876543213', tests: ['Urine Routine', 'Liver Function'], totalAmount: 2200, status: 'Confirmed', bookingDate: new Date(Date.now() + 86400000).toISOString(), timeSlot: '2:00 PM', visitType: 'Appointment', paymentStatus: 'Partially Paid' },
  { _id: 'b5', bookingId: 'BK-2026-0005', patientName: 'Vikas Yadav', patientPhone: '9876543214', tests: ['MRI Brain', 'CT Abdomen'], totalAmount: 15000, status: 'Pending', bookingDate: new Date(Date.now() + 2 * 86400000).toISOString(), timeSlot: '9:00 AM', visitType: 'Walk-in', paymentStatus: 'Unpaid' },
  { _id: 'b6', bookingId: 'BK-2026-0006', patientName: 'Neha Kapoor', patientPhone: '9876543215', tests: ['Complete Blood Count'], totalAmount: 299, status: 'Cancelled', bookingDate: new Date(Date.now() - 86400000).toISOString(), timeSlot: '3:00 PM', visitType: 'Home Collection', paymentStatus: 'Refunded' },
];

let mockEquipment = [
  { _id: 'e1', name: 'Siemens MRI 3T', type: 'MRI', model: 'Magnetom Vida', serialNumber: 'MRI-001', manufacturer: 'Siemens', installationDate: '2024-01-15', nextMaintenanceDate: new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0], status: 'Operational', location: 'Room 101, Ground Floor' },
  { _id: 'e2', name: 'GE CT Scanner', type: 'CT Scan', model: 'Revolution EVO', serialNumber: 'CT-002', manufacturer: 'GE Healthcare', installationDate: '2024-03-20', nextMaintenanceDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0], status: 'Operational', location: 'Room 102, Ground Floor' },
  { _id: 'e3', name: 'Philips X-Ray', type: 'X-Ray', model: 'DigitalDiagnost', serialNumber: 'XR-003', manufacturer: 'Philips', installationDate: '2024-06-10', nextMaintenanceDate: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0], status: 'Under Maintenance', location: 'Room 201, First Floor' },
  { _id: 'e4', name: 'Samsung Ultrasound', type: 'Ultrasound', model: 'RS85 Prestige', serialNumber: 'US-004', manufacturer: 'Samsung', installationDate: '2024-09-01', nextMaintenanceDate: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0], status: 'Operational', location: 'Room 202, First Floor' },
  { _id: 'e5', name: 'Schiller ECG', type: 'ECG', model: 'Cardiovit AT-102', serialNumber: 'ECG-005', manufacturer: 'Schiller', installationDate: '2024-11-05', nextMaintenanceDate: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0], status: 'Out of Service', location: 'Room 203, First Floor' },
];

let mockPackages = [
  { _id: 'hp1', name: 'Basic Health Checkup', category: 'Basic', testNames: ['CBC', 'Blood Sugar', 'Urine Routine'], originalPrice: 1500, packagePrice: 799, popular: true, homeCollectionAvailable: true, reportTime: '12-24 hrs', isActive: true },
  { _id: 'hp2', name: 'Comprehensive Wellness', category: 'Comprehensive', testNames: ['CBC', 'Lipid Profile', 'LFT', 'KFT', 'Thyroid', 'Blood Sugar', 'Urine Routine'], originalPrice: 3500, packagePrice: 1999, popular: true, homeCollectionAvailable: true, reportTime: '24-48 hrs', isActive: true },
  { _id: 'hp3', name: 'Cardiac Risk Assessment', category: 'Cardiac', testNames: ['ECG', 'Lipid Profile', 'Troponin I', 'CK-MB', 'Blood Sugar'], originalPrice: 2800, packagePrice: 1499, popular: false, homeCollectionAvailable: false, reportTime: '12-24 hrs', isActive: true },
  { _id: 'hp4', name: 'Diabetic Care Package', category: 'Diabetic', testNames: ['Blood Sugar Fasting', 'HbA1c', 'Lipid Profile', 'KFT', 'Urine Microalbumin'], originalPrice: 2200, packagePrice: 1299, popular: false, homeCollectionAvailable: true, reportTime: '12-24 hrs', isActive: true },
];

let mockLabStaff = [
  { _id: 'ls1', name: 'Dr. Ananya Gupta', role: 'Pathologist', email: 'ananya@lab.com', phone: '9876540101', licenseNumber: 'MD-PAT-001', experience: '10 years', isActive: true, joinedAt: '2023-01-15' },
  { _id: 'ls2', name: 'Rahul Verma', role: 'Lab Technician', email: 'rahul@lab.com', phone: '9876540102', licenseNumber: 'MLT-001', experience: '5 years', isActive: true, joinedAt: '2024-03-01' },
  { _id: 'ls3', name: 'Priya Singh', role: 'Phlebotomist', email: 'priya@lab.com', phone: '9876540103', licenseNumber: '', experience: '3 years', isActive: true, joinedAt: '2024-06-10' },
  { _id: 'ls4', name: 'Suresh Kumar', role: 'Radiologist', email: 'suresh@lab.com', phone: '9876540104', licenseNumber: 'MD-RAD-002', experience: '8 years', isActive: false, joinedAt: '2022-11-20' },
  { _id: 'ls5', name: 'Meena Joshi', role: 'Lab Receptionist', email: 'meena@lab.com', phone: '9876540105', licenseNumber: '', experience: '2 years', isActive: true, joinedAt: '2024-09-05' },
];

let mockReviews = [
  { _id: 'lr1', patientName: 'Ravi Sharma', rating: 5, comment: 'Fast and accurate results. Highly recommended.', date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0] },
  { _id: 'lr2', patientName: 'Anita Desai', rating: 4, comment: 'Good service but waiting time could be reduced.', date: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0] },
  { _id: 'lr3', patientName: 'Vijay Kumar', rating: 5, comment: 'Home collection was very convenient. Technician was professional.', date: new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0] },
  { _id: 'lr4', patientName: 'Deepa Nair', rating: 3, comment: 'Reports were delayed by a day. Need to improve turnaround time.', date: new Date(Date.now() - 15 * 86400000).toISOString().split('T')[0] },
];

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'catalog', label: 'Test Catalog', icon: FlaskConical },
  { id: 'bookings', label: 'Bookings', icon: CalendarDays },
  { id: 'rxqueue', label: 'Rx Queue', icon: ClipboardList },
  { id: 'samples', label: 'Sample Collection', icon: Syringe },
  { id: 'appointments', label: 'Appointments', icon: Calendar },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'equipment', label: 'Equipment', icon: Microscope },
  { id: 'staff', label: 'Staff', icon: Users },
  { id: 'packages', label: 'Packages', icon: Gift },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'reviews', label: 'Reviews', icon: Star },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function DiagnosticDashboard() {
  const [tab, setTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [toast, setToast] = useState(null);
  const [stats, setStats] = useState({ total: 0, pending: 0, processing: 0, completed: 0, critical: 0, totalBookings: 0, todayBookings: 0, revenue: 0 });

  // Orders
  const [orders, setOrders] = useState([]);
  const [orderFilter, setOrderFilter] = useState('All');

  // Tests
  const [tests, setTests] = useState([]);
  const [testForm, setTestForm] = useState({ name: '', category: 'Blood Test', department: 'Pathology', price: '', mrp: '', reportTime: '24 hrs', prescriptionReq: false, homeCollection: false, homeCollectionFee: '50', popular: false, nablAccredited: false, description: '', preparation: '' });
  const [editTestId, setEditTestId] = useState(null);

  // Bookings
  const [bookings, setBookings] = useState(mockBookings);
  const [bookingFilter, setBookingFilter] = useState('All');

  // Equipment
  const [equipment, setEquipment] = useState(mockEquipment);
  const [equipForm, setEquipForm] = useState({ name: '', type: 'MRI', model: '', serialNumber: '', manufacturer: '', installationDate: '', nextMaintenanceDate: '', status: 'Operational', location: '', notes: '' });
  const [editEquipId, setEditEquipId] = useState(null);

  // Packages
  const [packages, setPackages] = useState(mockPackages);
  const [pkgForm, setPkgForm] = useState({ name: '', category: 'Basic', description: '', testNames: '', originalPrice: '', packagePrice: '', popular: false, homeCollectionAvailable: false, reportTime: '24-48 hrs' });
  const [editPkgId, setEditPkgId] = useState(null);

  // Staff
  const [staffList, setStaffList] = useState(mockLabStaff);
  const [newStaff, setNewStaff] = useState({ name: '', role: 'Lab Technician', email: '', phone: '', licenseNumber: '', experience: '' });

  // Reviews
  const [reviews, setReviews] = useState(mockReviews);

  // Prescription Queue
  const [rxQueue, setRxQueue] = useState([]);

  // Billing
  const [bills, setBills] = useState([]);
  const [billFilter, setBillFilter] = useState('All');

  // Reports
  const [reportPeriod, setReportPeriod] = useState('7d');

  // Settings
  const [centerSettings, setCenterSettings] = useState({ name: 'MediCore Diagnostic Center', type: 'Pathology Lab', address: '123 Healthcare Ave, New York', phone: '+1 234-567-8900', email: 'lab@medicore.com', licenseNo: 'LAB-LIC-001', nablCertified: true, nablCertNo: 'NABL-MC-2024-001', aerbCertified: false, timings: '7:00 AM - 9:00 PM', homeCollectionAvailable: true, reportDeliveryModes: ['Email', 'SMS', 'Portal'] });

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    const load = async () => {
      try {
        const s = await labApi.getStats();
        setStats(s);
        const o = await labApi.getOrders({});
        setOrders(o.orders || []);
        const t = await labApi.getTests({});
        setTests(t || []);
      } catch (e) { console.error(e); }
    };
    load();
  }, []);

  const filteredOrders = useMemo(() => {
    if (orderFilter === 'All') return orders;
    return orders.filter(o => o.status === orderFilter);
  }, [orders, orderFilter]);

  const filteredBookings = useMemo(() => {
    let list = bookings;
    if (search) { const q = search.toLowerCase(); list = list.filter(b => b.patientName?.toLowerCase().includes(q) || b.bookingId?.toLowerCase().includes(q)); }
    if (bookingFilter !== 'All') list = list.filter(b => b.status === bookingFilter);
    return list;
  }, [bookings, search, bookingFilter]);

  const filteredBills = useMemo(() => {
    if (billFilter === 'All') return bills;
    return bills.filter(b => b.status === billFilter);
  }, [bills, billFilter]);

  const derivedStats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayBookingCount = bookings.filter(b => b.bookingDate?.startsWith(todayStr)).length;
    const pendingRx = rxQueue.filter(r => r.status === 'Pending').length;
    const revenue = bookings.filter(b => b.paymentStatus === 'Paid').reduce((s, b) => s + (b.totalAmount || 0), 0);
    const lowStock = equipment.filter(e => e.status === 'Under Maintenance' || e.status === 'Out of Service').length;
    return { ...stats, todayBookings: todayBookingCount, totalBookings: bookings.length, revenue, pendingRx, lowStock };
  }, [stats, bookings, rxQueue, equipment]);

  const StatusBadge = ({ status, mapping = {} }) => {
    const colors = mapping[status] || {
      Confirmed: 'bg-success/10 text-success', Pending: 'bg-warning/10 text-warning', Completed: 'bg-success/10 text-success',
      Cancelled: 'bg-destructive/10 text-destructive', Processing: 'bg-info/10 text-info', 'Sample Collected': 'bg-info/10 text-info',
      Operational: 'bg-success/10 text-success', 'Under Maintenance': 'bg-warning/10 text-warning', 'Out of Service': 'bg-destructive/10 text-destructive',
      Paid: 'bg-success/10 text-success', Unpaid: 'bg-warning/10 text-warning', 'Partially Paid': 'bg-info/10 text-info', Refunded: 'bg-destructive/10 text-destructive',
    };
    const c = colors[status] || 'bg-muted text-muted-foreground';
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c}`}>{status}</span>;
  };

  const Modal = ({ title, children, onClose }) => (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl border shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
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

  return (
    <div>
      {toast && (
        <div className={`fixed top-4 right-4 z-[60] px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === 'success' ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'}`}>
          {toast.msg}
        </div>
      )}

      <div className="page-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center"><Microscope className="w-6 h-6 text-primary" /></div>
          <div>
            <h1 className="page-title">{centerSettings.name}</h1>
            <p className="page-subscript">{centerSettings.type} · {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
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
                  { label: 'Total Orders', value: derivedStats.total, icon: Beaker, color: 'text-primary', bg: 'bg-primary/10' },
                  { label: 'Pending', value: derivedStats.pending, icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
                  { label: 'Processing', value: derivedStats.processing, icon: Activity, color: 'text-info', bg: 'bg-info/10' },
                  { label: 'Today\'s Bookings', value: derivedStats.todayBookings, icon: CalendarDays, color: 'text-success', bg: 'bg-success/10' },
                  { label: 'Pending Rx', value: derivedStats.pendingRx || rxQueue.length, icon: ClipboardList, color: 'text-warning', bg: 'bg-warning/10' },
                  { label: 'Revenue', value: `₹${(derivedStats.revenue / 1000).toFixed(1)}k`, icon: IndianRupee, color: 'text-success', bg: 'bg-success/10' },
                ].map(s => (
                  <div key={s.label} className="bg-card rounded-xl border p-4">
                    <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-card rounded-xl border p-5">
                  <h3 className="font-semibold mb-4 flex items-center gap-2"><CalendarDays className="w-4 h-4 text-info" /> Today's Bookings</h3>
                  <div className="space-y-3">
                    {bookings.filter(b => b.bookingDate?.startsWith(new Date().toISOString().split('T')[0])).slice(0, 5).map(b => (
                      <div key={b._id} className="flex items-center justify-between text-sm">
                        <div><span className="font-medium">{b.patientName}</span><p className="text-xs text-muted-foreground">{b.timeSlot} · {b.tests?.join(', ')}</p></div>
                        <StatusBadge status={b.status} />
                      </div>
                    ))}
                    {bookings.filter(b => b.bookingDate?.startsWith(new Date().toISOString().split('T')[0])).length === 0 && <p className="text-sm text-muted-foreground">No bookings today</p>}
                  </div>
                </div>

                <div className="bg-card rounded-xl border p-5">
                  <h3 className="font-semibold mb-4 flex items-center gap-2"><Microscope className="w-4 h-4 text-warning" /> Equipment Status</h3>
                  <div className="space-y-3">
                    {equipment.filter(e => e.status !== 'Operational').map(e => (
                      <div key={e._id} className="flex items-center justify-between text-sm">
                        <span className="font-medium">{e.name}</span>
                        <StatusBadge status={e.status} />
                      </div>
                    ))}
                    {equipment.filter(e => e.status !== 'Operational').length === 0 && <p className="text-sm text-muted-foreground">All equipment operational</p>}
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-xl border p-5">
                <h3 className="font-semibold mb-4 flex items-center gap-2"><Zap className="w-4 h-4 text-primary" /> Quick Actions</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[{ label: 'New Booking', icon: Plus, tab: 'bookings' }, { label: 'Add Test', icon: FlaskConical, tab: 'catalog' }, { label: 'Register Sample', icon: Syringe, tab: 'samples' }, { label: 'New Package', icon: Gift, tab: 'packages' }].map(a => (
                    <button key={a.label} onClick={() => { setTab(a.tab); setShowModal(a.label === 'New Booking' ? 'add-booking' : a.label === 'Add Test' ? 'add-test' : null); }}
                      className="flex items-center gap-3 p-3 rounded-xl border bg-muted/30 hover:bg-muted transition-colors text-left">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><a.icon className="w-5 h-5 text-primary" /></div>
                      <span className="text-sm font-medium">{a.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════ TEST CATALOG ═══════════════════ */}
          {tab === 'catalog' && (
            <>
              <SectionHeader title="Test Catalog Management" subtitle={`${tests.length} tests configured`}
                action={<Button size="sm" onClick={() => { setEditTestId(null); setTestForm({ name: '', category: 'Blood Test', department: 'Pathology', price: '', mrp: '', reportTime: '24 hrs', prescriptionReq: false, homeCollection: false, homeCollectionFee: '50', popular: false, nablAccredited: false, description: '', preparation: '' }); setShowModal('add-test'); }}><Plus className="w-4 h-4 mr-1" /> Add Test</Button>} />
              <div className="flex flex-wrap gap-3 mb-6">
                <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search tests..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} /></div>
              </div>
              <div className="space-y-3">
                {(tests.length ? tests : [
                  { _id: 't1', name: 'Complete Blood Count (CBC)', category: 'Blood Test', department: 'Pathology', price: 299, mrp: 499, reportTime: '6 hrs', popular: true, nablAccredited: true, prescriptionReq: false, homeCollection: true, description: 'Measures overall health and detects disorders.' },
                  { _id: 't2', name: 'Lipid Profile', category: 'Blood Test', department: 'Pathology', price: 399, mrp: 699, reportTime: '12 hrs', popular: true, nablAccredited: true, homeCollection: true, prescriptionReq: false, description: 'Measures cholesterol levels.' },
                  { _id: 't3', name: 'Thyroid Profile', category: 'Hormone', department: 'Pathology', price: 449, mrp: 799, reportTime: '24 hrs', nablAccredited: true, homeCollection: true, prescriptionReq: false, description: 'Evaluates thyroid function.' },
                  { _id: 't4', name: 'Blood Sugar (Fasting & PP)', category: 'Blood Test', department: 'Pathology', price: 199, mrp: 349, reportTime: '6 hrs', popular: true, homeCollection: true, prescriptionReq: false, description: 'Screens for diabetes.' },
                  { _id: 't5', name: 'ECG / Electrocardiogram', category: 'Cardiac Basic', department: 'Cardiology', price: 299, mrp: 499, reportTime: '30 mins', prescriptionReq: true, homeCollection: false, popular: false, description: 'Records heart electrical signals.' },
                ]).filter(t => !search || t.name?.toLowerCase().includes(search.toLowerCase())).map(test => (
                  <div key={test._id} className="bg-card rounded-xl border p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><FlaskConical className="w-5 h-5 text-primary" /></div>
                        <div>
                          <p className="font-medium text-foreground">{test.name}</p>
                          <p className="text-xs text-muted-foreground">{test.category} · {test.department} · Report: {test.reportTime}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-bold text-lg">₹{test.price}</p>
                          {test.mrp > test.price && <p className="text-xs text-muted-foreground line-through">₹{test.mrp}</p>}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {test.popular && <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">Popular</span>}
                          {test.nablAccredited && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded">NABL</span>}
                          {test.homeCollection && <span className="text-[10px] font-bold text-info bg-info/10 px-1.5 py-0.5 rounded">Home</span>}
                          {test.prescriptionReq && <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded">Rx</span>}
                        </div>
                      </div>
                    </div>
                    {test.description && <p className="text-xs text-muted-foreground mt-2">{test.description}</p>}
                  </div>
                ))}
                {tests.length === 0 && <div className="text-center py-20"><FlaskConical className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground">No tests. Add a test to get started.</p></div>}
              </div>
            </>
          )}

          {/* ═══════════════════ BOOKINGS ═══════════════════ */}
          {tab === 'bookings' && (
            <>
              <div className="flex flex-wrap gap-3 mb-6 items-center">
                <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search bookings..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} /></div>
                {['All', 'Pending', 'Confirmed', 'Completed', 'Cancelled'].map(s => (
                  <button key={s} onClick={() => setBookingFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${bookingFilter === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{s}</button>
                ))}
                <Button size="sm" onClick={() => setShowModal('add-booking')}><Plus className="w-4 h-4 mr-1" /> New Booking</Button>
              </div>
              <div className="space-y-3">
                {filteredBookings.map(b => (
                  <div key={b._id} className="bg-card rounded-xl border p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1"><span className="font-semibold">{b.bookingId}</span><StatusBadge status={b.status} /></div>
                        <p className="text-sm font-medium">{b.patientName}</p>
                        <p className="text-xs text-muted-foreground">{b.patientPhone} · {b.visitType} · {b.timeSlot}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">₹{b.totalAmount?.toLocaleString()}</p>
                        <StatusBadge status={b.paymentStatus} />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {(b.tests || []).map((t, i) => <span key={i} className="text-xs bg-muted px-2 py-1 rounded-lg">{t}</span>)}
                    </div>
                    {b.homeCollectionAddress && <p className="text-xs text-muted-foreground"><MapPin className="w-3 h-3 inline mr-1" />{b.homeCollectionAddress}</p>}
                    <div className="flex gap-2 mt-3 pt-3 border-t">
                      {b.status === 'Pending' && <>
                        <Button size="sm" onClick={() => { setBookings(bs => bs.map(bk => bk._id === b._id ? { ...bk, status: 'Confirmed' } : bk)); showToast('Booking confirmed'); }}><Check className="w-3 h-3 mr-1" /> Accept</Button>
                        <Button size="sm" variant="outline" className="text-destructive" onClick={() => { setBookings(bs => bs.map(bk => bk._id === b._id ? { ...bk, status: 'Cancelled' } : bk)); showToast('Booking cancelled'); }}><X className="w-3 h-3 mr-1" /> Reject</Button>
                      </>}
                      {b.status === 'Confirmed' && <Button size="sm" variant="outline" onClick={() => { setBookings(bs => bs.map(bk => bk._id === b._id ? { ...bk, status: 'Completed' } : bk)); showToast('Marked completed'); }}><Check className="w-3 h-3 mr-1" /> Mark Complete</Button>}
                    </div>
                  </div>
                ))}
                {filteredBookings.length === 0 && <div className="text-center py-20"><CalendarDays className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground">No bookings</p></div>}
              </div>
            </>
          )}

          {/* ═══════════════════ RX QUEUE ═══════════════════ */}
          {tab === 'rxqueue' && (
            <>
              <SectionHeader title="Prescription Verification Queue" subtitle="Verify uploaded prescriptions and approve/reject test requests"
                action={<Button size="sm" variant="outline" onClick={() => showToast('Auto-fallback triggered: Rx forwarded to next available center')}><Send className="w-4 h-4 mr-1" /> Trigger Fallback</Button>} />
              <div className="space-y-3">
                {[
                  { _id: 'rx1', bookingId: 'BK-2026-0002', patientName: 'Priya Patel', tests: ['Thyroid', 'Blood Sugar'], uploadedRx: 'rx_thyroid_001.pdf', status: 'Pending', uploadedAt: new Date(Date.now() - 86400000).toISOString() },
                  { _id: 'rx2', bookingId: 'BK-2026-0007', patientName: 'Rohit Singh', tests: ['ECG', 'Lipid Profile'], uploadedRx: 'rx_cardiac_002.pdf', status: 'Verified', uploadedAt: new Date(Date.now() - 3 * 86400000).toISOString() },
                  { _id: 'rx3', bookingId: 'BK-2026-0008', patientName: 'Kavita Jain', tests: ['MRI Brain'], uploadedRx: 'rx_mri_003.pdf', status: 'Rejected', uploadedAt: new Date(Date.now() - 5 * 86400000).toISOString() },
                ].map(rx => (
                  <div key={rx._id} className="bg-card rounded-xl border p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{rx.bookingId}</span>
                          <StatusBadge status={rx.status} mapping={{ Pending: 'bg-warning/10 text-warning', Verified: 'bg-success/10 text-success', Rejected: 'bg-destructive/10 text-destructive' }} />
                        </div>
                        <p className="text-sm font-medium">{rx.patientName}</p>
                        <p className="text-xs text-muted-foreground">{(rx.tests || []).join(', ')} · Uploaded {new Date(rx.uploadedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => showToast('Viewing prescription PDF')}><Eye className="w-3 h-3 mr-1" /> View Rx</Button>
                      {rx.status === 'Pending' && <>
                        <Button size="sm" onClick={() => { showToast('Prescription verified, tests approved'); }}><Check className="w-3 h-3 mr-1" /> Approve</Button>
                        <Button size="sm" variant="outline" className="text-destructive" onClick={() => { showToast('Prescription rejected, auto-fallback initiated'); }}><X className="w-3 h-3 mr-1" /> Reject & Fallback</Button>
                      </>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ═══════════════════ SAMPLE COLLECTION ═══════════════════ */}
          {tab === 'samples' && (
            <>
              <SectionHeader title="Sample Collection Management" subtitle={`${bookings.filter(b => b.visitType === 'Home Collection' && b.status !== 'Completed').length} pending home collections`}
                action={<Button size="sm" onClick={() => setShowModal('assign-phlebotomist')}><Plus className="w-4 h-4 mr-1" /> Assign Phlebotomist</Button>} />
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-card rounded-xl border p-5">
                  <h3 className="font-semibold mb-4 flex items-center gap-2"><Home className="w-4 h-4 text-primary" /> Home Collection Requests</h3>
                  <div className="space-y-3">
                    {bookings.filter(b => b.visitType === 'Home Collection' && b.status !== 'Completed').map(b => (
                      <div key={b._id} className="flex items-start justify-between p-3 bg-muted/30 rounded-lg">
                        <div><p className="text-sm font-medium">{b.patientName}</p><p className="text-xs text-muted-foreground"><MapPin className="w-3 h-3 inline mr-1" />{b.homeCollectionAddress || 'Address pending'}</p><p className="text-xs text-muted-foreground"><Phone className="w-3 h-3 inline mr-1" />{b.patientPhone}</p></div>
                        <StatusBadge status={b.status} />
                      </div>
                    ))}
                    {bookings.filter(b => b.visitType === 'Home Collection' && b.status !== 'Completed').length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No pending home collections</p>}
                  </div>
                </div>
                <div className="bg-card rounded-xl border p-5">
                  <h3 className="font-semibold mb-4 flex items-center gap-2"><Syringe className="w-4 h-4 text-info" /> Available Phlebotomists</h3>
                  <div className="space-y-3">
                    {staffList.filter(s => s.role === 'Phlebotomist' && s.isActive).map(s => (
                      <div key={s._id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div><p className="text-sm font-medium">{s.name}</p><p className="text-xs text-muted-foreground"><Phone className="w-3 h-3 inline mr-1" />{s.phone}</p></div>
                        <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full">Available</span>
                      </div>
                    ))}
                    {staffList.filter(s => s.role === 'Phlebotomist' && s.isActive).length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No phlebotomists available</p>}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ═══════════════════ APPOINTMENTS ═══════════════════ */}
          {tab === 'appointments' && (
            <>
              <SectionHeader title="Appointment / Visit Management" subtitle="Schedule and manage imaging scan slots"
                action={<Button size="sm" onClick={() => setShowModal('add-appointment')}><Plus className="w-4 h-4 mr-1" /> New Appointment</Button>} />
              <div className="space-y-3">
                {bookings.filter(b => b.status !== 'Cancelled').sort((a, b) => new Date(b.bookingDate) - new Date(a.bookingDate)).map(b => (
                  <div key={b._id} className="bg-card rounded-xl border p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center"><Calendar className="w-5 h-5 text-info" /></div>
                        <div>
                          <p className="font-medium">{b.patientName}</p>
                          <p className="text-xs text-muted-foreground">{new Date(b.bookingDate).toLocaleDateString()} at {b.timeSlot} · {b.visitType}</p>
                        </div>
                      </div>
                      <StatusBadge status={b.status} />
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(b.tests || []).map((t, i) => <span key={i} className="text-xs bg-muted px-2 py-1 rounded-lg">{t}</span>)}
                    </div>
                    <div className="flex gap-2 mt-3 pt-3 border-t">
                      <Button size="sm" variant="outline" onClick={() => showToast('Reschedule link sent')}><Calendar className="w-3 h-3 mr-1" /> Reschedule</Button>
                      <Button size="sm" variant="outline" onClick={() => showToast('Reminder sent to patient')}><Bell className="w-3 h-3 mr-1" /> Send Reminder</Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ═══════════════════ REPORTS ═══════════════════ */}
          {tab === 'reports' && (
            <>
              <SectionHeader title="Report Upload & Management" subtitle="Upload test reports and notify patients"
                action={<Button size="sm" onClick={() => setShowModal('upload-report')}><Upload className="w-4 h-4 mr-1" /> Upload Report</Button>} />
              <div className="space-y-3">
                {orders.filter(o => o.status === 'Processing' || o.status === 'Under Verification' || o.status === 'Completed').slice(0, 10).map(o => (
                  <div key={o._id} className="bg-card rounded-xl border p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1"><span className="font-semibold">{o.orderId}</span><StatusBadge status={o.status} /></div>
                        <p className="text-sm font-medium">{o.patientName}</p>
                        <p className="text-xs text-muted-foreground">Dr. {o.doctorName} · {(o.tests || []).map(t => t.testName).join(', ')}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {o.status === 'Under Verification' && <Button size="sm" onClick={() => showToast('Report marked as delivered, patient notified')}><Send className="w-3 h-3 mr-1" /> Mark Delivered & Notify</Button>}
                      {o.status === 'Processing' && <Button size="sm" variant="outline" onClick={() => showToast('Report uploaded successfully')}><Upload className="w-3 h-3 mr-1" /> Upload Results</Button>}
                    </div>
                  </div>
                ))}
                {orders.length === 0 && <div className="text-center py-20"><FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground">No orders. Lab orders will appear here.</p></div>}
              </div>
            </>
          )}

          {/* ═══════════════════ EQUIPMENT ═══════════════════ */}
          {tab === 'equipment' && (
            <>
              <SectionHeader title="Equipment Management" subtitle={`${equipment.filter(e => e.status === 'Operational').length} operational · ${equipment.filter(e => e.status !== 'Operational').length} requires attention`}
                action={<Button size="sm" onClick={() => { setEditEquipId(null); setEquipForm({ name: '', type: 'MRI', model: '', serialNumber: '', manufacturer: '', installationDate: '', nextMaintenanceDate: '', status: 'Operational', location: '', notes: '' }); setShowModal('add-equipment'); }}><Plus className="w-4 h-4 mr-1" /> Add Equipment</Button>} />
              <div className="grid md:grid-cols-2 gap-4">
                {equipment.map(e => (
                  <div key={e._id} className={`bg-card rounded-xl border p-4 ${e.status !== 'Operational' ? 'border-warning/30' : ''}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${e.status === 'Operational' ? 'bg-success/10' : 'bg-warning/10'} flex items-center justify-center`}><Microscope className={`w-5 h-5 ${e.status === 'Operational' ? 'text-success' : 'text-warning'}`} /></div>
                        <div><p className="font-medium">{e.name}</p><p className="text-xs text-muted-foreground">{e.type} · {e.model}</p></div>
                      </div>
                      <StatusBadge status={e.status} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <p>Serial: {e.serialNumber}</p>
                      <p>Location: {e.location}</p>
                      <p>Next Maintenance: {e.nextMaintenanceDate ? new Date(e.nextMaintenanceDate).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    <div className="flex gap-2 mt-3 pt-3 border-t">
                      <Button size="sm" variant="outline" onClick={() => { setEditEquipId(e._id); setEquipForm({ name: e.name, type: e.type, model: e.model || '', serialNumber: e.serialNumber || '', manufacturer: e.manufacturer || '', installationDate: e.installationDate?.split('T')[0] || '', nextMaintenanceDate: e.nextMaintenanceDate || '', status: e.status, location: e.location || '', notes: e.notes || '' }); setShowModal('add-equipment'); }}><Edit className="w-3 h-3 mr-1" /> Edit</Button>
                      <Button size="sm" variant="outline" onClick={() => showToast('Maintenance scheduled')}><Calendar className="w-3 h-3 mr-1" /> Schedule Maint.</Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ═══════════════════ STAFF ═══════════════════ */}
          {tab === 'staff' && (
            <>
              <SectionHeader title="Lab Staff Management" subtitle={`${staffList.filter(s => s.isActive).length} active staff members`}
                action={<Button size="sm" onClick={() => { setNewStaff({ name: '', role: 'Lab Technician', email: '', phone: '', licenseNumber: '', experience: '' }); setShowModal('add-staff'); }}><Plus className="w-4 h-4 mr-1" /> Add Staff</Button>} />
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {staffList.map(s => (
                  <div key={s._id} className="bg-card rounded-xl border p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><User className="w-5 h-5 text-primary" /></div>
                        <div><p className="font-medium">{s.name}</p><p className="text-xs text-muted-foreground">{s.role}</p></div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.isActive ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>{s.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p><Phone className="w-3 h-3 inline mr-1" />{s.phone}</p>
                      <p><Mail className="w-3 h-3 inline mr-1" />{s.email}</p>
                      {s.licenseNumber && <p><Shield className="w-3 h-3 inline mr-1" />License: {s.licenseNumber}</p>}
                      <p className="text-xs">Exp: {s.experience} · Joined {s.joinedAt}</p>
                    </div>
                    <div className="flex gap-2 mt-3 pt-3 border-t">
                      <Button size="sm" variant="outline" onClick={() => { setStaffList(sl => sl.map(st => st._id === s._id ? { ...st, isActive: !st.isActive } : st)); showToast(`Staff ${s.isActive ? 'deactivated' : 'activated'}`); }}>{s.isActive ? 'Deactivate' : 'Activate'}</Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ═══════════════════ PACKAGES ═══════════════════ */}
          {tab === 'packages' && (
            <>
              <SectionHeader title="Health Package Management" subtitle={`${packages.filter(p => p.isActive).length} active packages`}
                action={<Button size="sm" onClick={() => { setEditPkgId(null); setPkgForm({ name: '', category: 'Basic', description: '', testNames: '', originalPrice: '', packagePrice: '', popular: false, homeCollectionAvailable: false, reportTime: '24-48 hrs' }); setShowModal('add-package'); }}><Plus className="w-4 h-4 mr-1" /> New Package</Button>} />
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {packages.filter(p => p.isActive).map(pkg => (
                  <div key={pkg._id} className="bg-card rounded-xl border p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center"><Gift className="w-5 h-5 text-warning" /></div>
                        <div><p className="font-medium">{pkg.name}</p><p className="text-xs text-muted-foreground">{pkg.category}</p></div>
                      </div>
                      {pkg.popular && <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">Popular</span>}
                    </div>
                    <div className="text-sm space-y-2 mb-3">
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-bold text-primary">₹{pkg.packagePrice}</p>
                        <p className="text-xs text-muted-foreground line-through">₹{pkg.originalPrice}</p>
                        <span className="text-xs text-success font-medium">{Math.round((1 - pkg.packagePrice / pkg.originalPrice) * 100)}% off</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(pkg.testNames || []).map((tn, i) => <span key={i} className="text-xs bg-muted px-1.5 py-0.5 rounded">{tn}</span>)}
                      </div>
                      <p className="text-xs text-muted-foreground">Report: {pkg.reportTime} {pkg.homeCollectionAvailable && '· Home Collection'}</p>
                    </div>
                    <div className="flex gap-2 pt-3 border-t">
                      <Button size="sm" variant="outline" onClick={() => showToast('Package deactivated')}>Disable</Button>
                    </div>
                  </div>
                ))}
                {packages.filter(p => p.isActive).length === 0 && <div className="col-span-full text-center py-20"><Gift className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground">No active packages</p></div>}
              </div>
            </>
          )}

          {/* ═══════════════════ BILLING ═══════════════════ */}
          {tab === 'billing' && (
            <>
              <div className="flex flex-wrap gap-3 mb-6 items-center">
                <div className="relative flex-1 min-w-[200px]"><Input placeholder="Search bills..." className="pl-10" /></div>
                {['All', 'Paid', 'Unpaid', 'Partially Paid'].map(s => (
                  <button key={s} onClick={() => setBillFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${billFilter === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{s}</button>
                ))}
                <Button size="sm" variant="outline" onClick={() => showToast('Report downloaded')}><Download className="w-4 h-4 mr-1" /> Export</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-muted-foreground"><th className="text-left py-3 px-2 font-medium">Invoice</th><th className="text-left py-3 px-2 font-medium">Patient</th><th className="text-left py-3 px-2 font-medium">Tests</th><th className="text-right py-3 px-2 font-medium">Amount</th><th className="text-center py-3 px-2 font-medium">Payment</th><th className="text-right py-3 px-2 font-medium">Date</th></tr></thead>
                  <tbody>
                    {filteredBills.length === 0 ? bookings.map(b => (
                      <tr key={b._id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2 font-medium">{b.bookingId}</td>
                        <td className="py-3 px-2">{b.patientName}</td>
                        <td className="py-3 px-2">{(b.tests || []).length}</td>
                        <td className="py-3 px-2 text-right font-medium">₹{b.totalAmount?.toLocaleString() || 0}</td>
                        <td className="py-3 px-2 text-center"><StatusBadge status={b.paymentStatus} /></td>
                        <td className="py-3 px-2 text-right text-muted-foreground">{b.bookingDate?.split('T')[0]}</td>
                      </tr>
                    )) : bills.map(b => (
                      <tr key={b._id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2 font-medium">{b.invoiceId || b._id}</td>
                        <td className="py-3 px-2">{b.patientName}</td>
                        <td className="py-3 px-2">{(b.tests || []).length}</td>
                        <td className="py-3 px-2 text-right font-medium">₹{b.totalAmount?.toLocaleString() || 0}</td>
                        <td className="py-3 px-2 text-center"><StatusBadge status={b.paymentStatus} /></td>
                        <td className="py-3 px-2 text-right text-muted-foreground">{b.date || b.bookingDate?.split('T')[0]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ═══════════════════ REVIEWS ═══════════════════ */}
          {tab === 'reviews' && (
            <>
              <SectionHeader title="Patient Reviews" subtitle={`${reviews.length} reviews · ${(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length || 0).toFixed(1)} avg rating`} />
              <div className="space-y-3">
                {reviews.map(r => (
                  <div key={r._id} className="bg-card rounded-xl border p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><User className="w-5 h-5 text-primary" /></div>
                        <div><p className="font-medium">{r.patientName}</p><p className="text-xs text-muted-foreground">{r.date || ''}</p></div>
                      </div>
                      <div className="flex items-center gap-0.5">{Array.from({ length: 5 }, (_, i) => <Star key={i} className={`w-4 h-4 ${i < r.rating ? 'text-warning fill-warning' : 'text-muted'}`} />)}</div>
                    </div>
                    <p className="text-sm text-foreground/80">{r.comment}</p>
                  </div>
                ))}
                {reviews.length === 0 && <div className="text-center py-20"><Star className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground">No reviews yet</p></div>}
              </div>
            </>
          )}

          {/* ═══════════════════ ANALYTICS ═══════════════════ */}
          {tab === 'analytics' && (
            <>
              <SectionHeader title="Reports & Analytics" subtitle="Performance metrics and insights"
                action={<div className="flex gap-2">{['7d', '30d', '90d', '1y'].map(p => <button key={p} onClick={() => setReportPeriod(p)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${reportPeriod === p ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{p}</button>)}</div>} />
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="bg-card rounded-xl border p-5">
                  <h3 className="font-semibold mb-4">Performance Metrics</h3>
                  <div className="space-y-4">
                    {[
                      { label: 'Total Bookings', value: bookings.length, change: orders.length > 0 ? '+15%' : '0%' },
                      { label: 'Tests Conducted', value: orders.reduce((s, o) => s + (o.tests?.length || 0), 0), change: '+12%' },
                      { label: 'Avg Turnaround', value: orders.length > 0 ? '6.2 hrs' : 'N/A', change: '-8%' },
                      { label: 'Revenue (Period)', value: `₹${bookings.filter(b => b.paymentStatus === 'Paid').reduce((s, b) => s + (b.totalAmount || 0), 0).toLocaleString()}`, change: '+22%' },
                      { label: 'Critical Results', value: stats.critical || 0, change: '0%' },
                      { label: 'Patient Satisfaction', value: reviews.length > 0 ? `${(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)}/5` : 'N/A', change: '+0.3' },
                    ].map(d => (
                      <div key={d.label} className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{d.label}</span>
                        <div className="text-right"><span className="font-semibold">{d.value}</span><span className={`text-xs ml-2 ${d.change.startsWith('+') ? 'text-success' : d.change.startsWith('-') && d.change !== '0%' ? 'text-destructive' : 'text-muted-foreground'}`}>{d.change}</span></div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-card rounded-xl border p-5">
                  <h3 className="font-semibold mb-4">Test Category Distribution</h3>
                  <div className="space-y-3">
                    {CATEGORIES.slice(0, 7).map(cat => {
                      const count = orders.reduce((s, o) => s + (o.tests?.filter(t => t.category === cat)?.length || 0), 0);
                      const total = orders.reduce((s, o) => s + (o.tests?.length || 0), 0) || 1;
                      return count > 0 && (
                        <div key={cat} className="flex items-center gap-3">
                          <span className="text-sm w-28 truncate">{cat}</span>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${(count / total) * 100}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground w-8 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="bg-card rounded-xl border p-5">
                <h3 className="font-semibold mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {[
                    ...bookings.slice(0, 4).map(b => ({ text: `Booking ${b.bookingId} ${b.status.toLowerCase()} for ${b.patientName}`, time: b.bookingDate })),
                    ...orders.slice(0, 3).map(o => ({ text: `Lab order ${o.orderId} ${o.status.toLowerCase()} - ${o.patientName}`, time: o.createdAt })),
                  ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 8).map((act, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span className="flex-1">{act.text}</span>
                      <span className="text-xs text-muted-foreground">{act.time ? new Date(act.time).toLocaleDateString() : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ═══════════════════ SETTINGS ═══════════════════ */}
          {tab === 'settings' && (
            <div className="max-w-2xl">
              <SectionHeader title="Center Profile Settings" subtitle="Configure lab/diagnostic center details" />
              <div className="bg-card rounded-xl border p-6 space-y-5">
                {[
                  { key: 'name', label: 'Center Name' }, { key: 'type', label: 'Center Type' },
                  { key: 'address', label: 'Address' }, { key: 'phone', label: 'Phone' },
                  { key: 'email', label: 'Email' }, { key: 'licenseNo', label: 'License Number' },
                  { key: 'nablCertNo', label: 'NABL Certificate Number' },
                  { key: 'timings', label: 'Operating Hours' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-sm font-medium mb-1 block">{f.label}</label>
                    <Input value={centerSettings[f.key]} onChange={e => setCenterSettings(s => ({ ...s, [f.key]: e.target.value }))} />
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl border"><input type="checkbox" checked={centerSettings.nablCertified} onChange={e => setCenterSettings(s => ({ ...s, nablCertified: e.target.checked }))} className="rounded" /> NABL Certified</label>
                  <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl border"><input type="checkbox" checked={centerSettings.aerbCertified} onChange={e => setCenterSettings(s => ({ ...s, aerbCertified: e.target.checked }))} className="rounded" /> AERB Certified</label>
                  <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl border"><input type="checkbox" checked={centerSettings.homeCollectionAvailable} onChange={e => setCenterSettings(s => ({ ...s, homeCollectionAvailable: e.target.checked }))} className="rounded" /> Home Collection</label>
                </div>
                <Button className="w-full" onClick={() => showToast('Settings saved')}><Save className="w-4 h-4 mr-1" /> Save Settings</Button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ═══════════════════ MODALS ═══════════════════ */}

      {/* Add Test Modal */}
      {showModal === 'add-test' && (
        <Modal title={editTestId ? 'Edit Test' : 'Add Test'} onClose={() => setShowModal(null)}>
          <div className="space-y-4">
            <div><label className="text-sm font-medium mb-1 block">Test Name *</label><Input value={testForm.name} onChange={e => setTestForm({ ...testForm, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium mb-1 block">Department</label><select value={testForm.department} onChange={e => setTestForm({ ...testForm, department: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">{DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
              <div><label className="text-sm font-medium mb-1 block">Category</label><select value={testForm.category} onChange={e => setTestForm({ ...testForm, category: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium mb-1 block">MRP (₹)</label><Input type="number" value={testForm.mrp} onChange={e => setTestForm({ ...testForm, mrp: e.target.value })} /></div>
              <div><label className="text-sm font-medium mb-1 block">Selling Price (₹)</label><Input type="number" value={testForm.price} onChange={e => setTestForm({ ...testForm, price: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium mb-1 block">Report Time</label><select value={testForm.reportTime} onChange={e => setTestForm({ ...testForm, reportTime: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">{REPORT_TIMES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
              <div><label className="text-sm font-medium mb-1 block">Home Collection Fee</label><Input type="number" value={testForm.homeCollectionFee} onChange={e => setTestForm({ ...testForm, homeCollectionFee: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[{ key: 'popular', label: 'Popular' }, { key: 'homeCollection', label: 'Home Collection' }, { key: 'prescriptionReq', label: 'Prescription Required' }, { key: 'nablAccredited', label: 'NABL Accredited' }].map(toggle => (
                <label key={toggle.key} className="flex items-center gap-2 cursor-pointer p-3 rounded-xl border"><input type="checkbox" checked={testForm[toggle.key]} onChange={e => setTestForm({ ...testForm, [toggle.key]: e.target.checked })} className="rounded" /> {toggle.label}</label>
              ))}
            </div>
            <div><label className="text-sm font-medium mb-1 block">Description</label><textarea value={testForm.description} onChange={e => setTestForm({ ...testForm, description: e.target.value })} rows={2} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none" /></div>
            <Button className="w-full" onClick={() => { showToast(editTestId ? 'Test updated' : 'Test added'); setShowModal(null); }} disabled={!testForm.name || !testForm.price}>{editTestId ? 'Update Test' : 'Add Test'}</Button>
          </div>
        </Modal>
      )}

      {/* New Booking Modal */}
      {showModal === 'add-booking' && (
        <Modal title="New Booking" onClose={() => setShowModal(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium mb-1 block">Patient Name</label><Input placeholder="Name" /></div>
              <div><label className="text-sm font-medium mb-1 block">Phone</label><Input placeholder="Phone" /></div>
            </div>
            <div><label className="text-sm font-medium mb-1 block">Visit Type</label><select className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">{['Walk-in', 'Home Collection', 'Appointment'].map(v => <option key={v} value={v}>{v}</option>)}</select></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium mb-1 block">Date</label><Input type="date" /></div>
              <div><label className="text-sm font-medium mb-1 block">Time Slot</label><Input placeholder="e.g. 10:00 AM" /></div>
            </div>
            <Button className="w-full" onClick={() => { showToast('Booking created'); setShowModal(null); }}>Create Booking</Button>
          </div>
        </Modal>
      )}

      {/* Add Equipment Modal */}
      {showModal === 'add-equipment' && (
        <Modal title={editEquipId ? 'Edit Equipment' : 'Add Equipment'} onClose={() => setShowModal(null)}>
          <div className="grid grid-cols-2 gap-4">
            {[{ key: 'name', label: 'Equipment Name' }, { key: 'model', label: 'Model' }, { key: 'serialNumber', label: 'Serial Number' }, { key: 'manufacturer', label: 'Manufacturer' }, { key: 'installationDate', label: 'Installation Date', type: 'date' }, { key: 'nextMaintenanceDate', label: 'Next Maintenance', type: 'date' }, { key: 'location', label: 'Location' }, { key: 'notes', label: 'Notes' }].map(f => (
              <div key={f.key}><label className="text-sm font-medium mb-1 block">{f.label}</label><Input type={f.type || 'text'} value={equipForm[f.key]} onChange={e => setEquipForm({ ...equipForm, [f.key]: e.target.value })} /></div>
            ))}
            <div><label className="text-sm font-medium mb-1 block">Type</label><select value={equipForm.type} onChange={e => setEquipForm({ ...equipForm, type: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">{['MRI', 'CT Scan', 'X-Ray', 'Ultrasound', 'ECG', 'EEG', 'Mammography', 'DEXA', 'PET Scan', 'Lab Analyzer', 'Centrifuge', 'Microscope', 'Other'].map(t => <option key={t} value={t}>{t}</option>)}</select></div>
            <div><label className="text-sm font-medium mb-1 block">Status</label><select value={equipForm.status} onChange={e => setEquipForm({ ...equipForm, status: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">{['Operational', 'Under Maintenance', 'Out of Service', 'Retired'].map(s => <option key={s} value={s}>{s}</option>)}</select></div>
          </div>
          <Button className="w-full mt-6" onClick={() => { showToast(editEquipId ? 'Equipment updated' : 'Equipment added'); setShowModal(null); }} disabled={!equipForm.name}>{editEquipId ? 'Update Equipment' : 'Add Equipment'}</Button>
        </Modal>
      )}

      {/* Add Package Modal */}
      {showModal === 'add-package' && (
        <Modal title={editPkgId ? 'Edit Package' : 'New Health Package'} onClose={() => setShowModal(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium mb-1 block">Package Name</label><Input value={pkgForm.name} onChange={e => setPkgForm({ ...pkgForm, name: e.target.value })} /></div>
              <div><label className="text-sm font-medium mb-1 block">Category</label><select value={pkgForm.category} onChange={e => setPkgForm({ ...pkgForm, category: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">{['Basic', 'Comprehensive', 'Cardiac', 'Diabetic', 'Women', 'Senior Citizen', 'Corporate', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            </div>
            <div><label className="text-sm font-medium mb-1 block">Tests Included (comma separated)</label><Input value={pkgForm.testNames} onChange={e => setPkgForm({ ...pkgForm, testNames: e.target.value })} placeholder="CBC, Lipid Profile, LFT" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium mb-1 block">Original Price (₹)</label><Input type="number" value={pkgForm.originalPrice} onChange={e => setPkgForm({ ...pkgForm, originalPrice: e.target.value })} /></div>
              <div><label className="text-sm font-medium mb-1 block">Package Price (₹)</label><Input type="number" value={pkgForm.packagePrice} onChange={e => setPkgForm({ ...pkgForm, packagePrice: e.target.value })} /></div>
            </div>
            {pkgForm.originalPrice && pkgForm.packagePrice && <div className="text-xs text-emerald-600 font-medium text-center bg-emerald-500/10 rounded-xl py-1.5">Discount: {Math.round((1 - Number(pkgForm.packagePrice) / Number(pkgForm.originalPrice)) * 100)}% off</div>}
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl border"><input type="checkbox" checked={pkgForm.popular} onChange={e => setPkgForm({ ...pkgForm, popular: e.target.checked })} className="rounded" /> Popular</label>
              <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl border"><input type="checkbox" checked={pkgForm.homeCollectionAvailable} onChange={e => setPkgForm({ ...pkgForm, homeCollectionAvailable: e.target.checked })} className="rounded" /> Home Collection</label>
            </div>
            <Button className="w-full" onClick={() => { showToast(editPkgId ? 'Package updated' : 'Package created'); setShowModal(null); }} disabled={!pkgForm.name || !pkgForm.packagePrice}>{editPkgId ? 'Update Package' : 'Create Package'}</Button>
          </div>
        </Modal>
      )}

      {/* Add Staff Modal */}
      {showModal === 'add-staff' && (
        <Modal title="Add Staff Member" onClose={() => setShowModal(null)}>
          <div className="grid grid-cols-2 gap-4">
            {[{ key: 'name', label: 'Full Name' }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' }, { key: 'licenseNumber', label: 'License Number' }, { key: 'experience', label: 'Experience' }].map(f => (
              <div key={f.key}><label className="text-sm font-medium mb-1 block">{f.label}</label><Input value={newStaff[f.key]} onChange={e => setNewStaff({ ...newStaff, [f.key]: e.target.value })} /></div>
            ))}
            <div><label className="text-sm font-medium mb-1 block">Role</label><select value={newStaff.role} onChange={e => setNewStaff({ ...newStaff, role: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">{['Pathologist', 'Radiologist', 'Lab Technician', 'Phlebotomist', 'Lab Receptionist', 'Lab Manager'].map(r => <option key={r} value={r}>{r}</option>)}</select></div>
          </div>
          <Button className="w-full mt-6" onClick={() => { setStaffList(sl => [...sl, { ...newStaff, _id: `ls${Date.now()}`, isActive: true, joinedAt: new Date().toISOString().split('T')[0] }]); showToast('Staff added'); setShowModal(null); }} disabled={!newStaff.name}>Add Staff</Button>
        </Modal>
      )}

      {/* Assign Phlebotomist Modal */}
      {showModal === 'assign-phlebotomist' && (
        <Modal title="Assign Phlebotomist" onClose={() => setShowModal(null)}>
          <div className="space-y-4">
            <div><label className="text-sm font-medium mb-1 block">Select Booking</label><select className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">{bookings.filter(b => b.visitType === 'Home Collection' && b.status !== 'Completed').map(b => <option key={b._id} value={b._id}>{b.bookingId} - {b.patientName}</option>)}</select></div>
            <div><label className="text-sm font-medium mb-1 block">Select Phlebotomist</label><select className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">{staffList.filter(s => s.role === 'Phlebotomist' && s.isActive).map(s => <option key={s._id} value={s._id}>{s.name}</option>)}</select></div>
            <Button className="w-full" onClick={() => { showToast('Phlebotomist assigned'); setShowModal(null); }}>Assign</Button>
          </div>
        </Modal>
      )}

      {/* Upload Report Modal */}
      {showModal === 'upload-report' && (
        <Modal title="Upload Report" onClose={() => setShowModal(null)}>
          <div className="space-y-4">
            <div><label className="text-sm font-medium mb-1 block">Select Order</label><select className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">{orders.filter(o => o.status === 'Processing' || o.status === 'Under Verification').map(o => <option key={o._id} value={o._id}>{o.orderId} - {o.patientName}</option>)}</select></div>
            <div><label className="text-sm font-medium mb-1 block">Upload PDF Report</label><div className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:bg-muted/30"><Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" /><p className="text-sm text-muted-foreground">Click to upload or drag and drop</p></div></div>
            <Button className="w-full" onClick={() => { showToast('Report uploaded, patient notified'); setShowModal(null); }}>Upload & Notify</Button>
          </div>
        </Modal>
      )}

      {/* New Appointment Modal */}
      {showModal === 'add-appointment' && (
        <Modal title="Schedule Appointment" onClose={() => setShowModal(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4"><div><label className="text-sm font-medium mb-1 block">Patient Name</label><Input /></div><div><label className="text-sm font-medium mb-1 block">Phone</label><Input /></div></div>
            <div className="grid grid-cols-2 gap-4"><div><label className="text-sm font-medium mb-1 block">Date</label><Input type="date" /></div><div><label className="text-sm font-medium mb-1 block">Time Slot</label><Input placeholder="e.g. 10:00 AM" /></div></div>
            <div><label className="text-sm font-medium mb-1 block">Test / Scan</label><Input placeholder="e.g. MRI Brain, CT Abdomen" /></div>
            <Button className="w-full" onClick={() => { showToast('Appointment scheduled'); setShowModal(null); }}>Schedule</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}


