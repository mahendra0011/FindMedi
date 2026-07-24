import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Pill, Search, Plus, Clock, CheckCircle, AlertTriangle, X, Package, AlertCircle,
  ShoppingCart, Truck, CreditCard, RotateCcw, Users, Percent, Star, BarChart3,
  Settings, TrendingUp, IndianRupee, Calendar, Filter, Download, Printer, Send,
  Phone, Mail, MapPin, Edit, Trash2, Save, Eye, ClipboardList, User, Stethoscope,
  Shield, Activity, DollarSign, Bell, ChevronDown, ChevronUp, RefreshCw, Box,
  Check, Minus, Copy, FileText, Radio, Home, Zap, Gift, Upload, Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

const pharmApi = {
  getMedicines: (p = {}) => api.dispatch(() => Promise.resolve({ medicines: [] }), '/pharmacy/medicines?' + new URLSearchParams(p)),
  createMedicine: (b) => api.dispatch(() => Promise.resolve({}), '/pharmacy/medicines', { method: 'POST', body: JSON.stringify(b) }),
  updateMedicine: (id, b) => api.dispatch(() => Promise.resolve({}), `/pharmacy/medicines/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
  deleteMedicine: (id) => api.dispatch(() => Promise.resolve({}), `/pharmacy/medicines/${id}`, { method: 'DELETE' }),
  stockUpdate: (id, b) => api.dispatch(() => Promise.resolve({}), `/pharmacy/medicines/${id}/stock`, { method: 'PUT', body: JSON.stringify(b) }),
  getPrescriptions: (p = {}) => api.dispatch(() => Promise.resolve({ prescriptions: [] }), '/pharmacy/prescriptions?' + new URLSearchParams(p)),
  createPrescription: (b) => api.dispatch(() => Promise.resolve({}), '/pharmacy/prescriptions', { method: 'POST', body: JSON.stringify(b) }),
  dispense: (id, b) => api.dispatch(() => Promise.resolve({}), `/pharmacy/prescriptions/${id}/dispense`, { method: 'PUT', body: JSON.stringify(b) }),
  getStats: () => api.dispatch(() => Promise.resolve({ totalMedicines: 0, lowStock: 0, expiringSoon: 0, totalPrescriptions: 0, pendingDispense: 0 }), '/pharmacy/stats'),
  getBillingExport: () => api.dispatch(() => Promise.resolve({ bills: [] }), '/pharmacy/billing/export'),
  getMedicineAlerts: () => api.dispatch(() => Promise.resolve({ medicines: [] }), '/pharmacy/medicines/export-alerts'),
};

const categoryOptions = ['Antibiotic', 'Analgesic', 'Antihypertensive', 'Antidiabetic', 'Antacid', 'Antihistamine', 'Antiviral', 'Antifungal', 'Vitamin', 'Steroid', 'Anesthetic', 'Diuretic', 'Cardiac', 'Respiratory', 'Other'];
const formOptions = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Drop', 'Cream', 'Inhaler', 'Infusion', 'Other'];



const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'orders', label: 'Orders', icon: ShoppingCart },
  { id: 'prescriptions', label: 'Prescriptions', icon: ClipboardList },
  { id: 'delivery', label: 'Delivery', icon: Truck },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'returns', label: 'Returns', icon: RotateCcw },
  { id: 'staff', label: 'Staff', icon: Users },
  { id: 'offers', label: 'Offers', icon: Percent },
  { id: 'reviews', label: 'Reviews', icon: Star },
  { id: 'reports', label: 'Reports', icon: TrendingUp },
  { id: 'alerts', label: 'Stock Alerts', icon: AlertTriangle },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function Pharmacy() {
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState({ totalMedicines: 0, lowStock: 0, expiringSoon: 0, totalPrescriptions: 0, pendingDispense: 0, totalOrders: 0, revenue: 0, pendingReturns: 0 });
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [toast, setToast] = useState(null);
  const [stockModal, setStockModal] = useState(null);
  const [stockQty, setStockQty] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Inventory
  const [medicines, setMedicines] = useState([]);
  const [newMed, setNewMed] = useState({ name: '', genericName: '', category: 'Antibiotic', form: 'Tablet', manufacturer: '', batchNumber: '', expiryDate: '', purchasePrice: '', sellingPrice: '', currentStock: '', reorderLevel: '10', rackLocation: '' });
  const [editMed, setEditMed] = useState(null);
  const [medFilter, setMedFilter] = useState({ category: '', lowStock: false, expiring: false });

  // Prescriptions
  const [prescriptions, setPrescriptions] = useState([]);
  const [rxSearch, setRxSearch] = useState('');
  const [newRx, setNewRx] = useState({ patientName: '', diagnosis: '', medicines: [{ medicineName: '', dosage: '', frequency: '1-0-1', duration: '7 days', quantity: 1 }] });

  // Orders
  const [orders, setOrders] = useState([]);
  const [orderFilter, setOrderFilter] = useState('All');
  const [orderForm, setOrderForm] = useState({ patientName: '', phone: '', deliveryAddress: '', medicineName: '', qty: '1', price: '0' });

  // Delivery
  const [deliveries, setDeliveries] = useState([]);
  const [deliveryForm, setDeliveryForm] = useState({ orderId: '', deliveryPerson: '', phone: '', estimatedTime: '' });

  // Billing
  const [bills] = useState([]);
  const [billFilter, setBillFilter] = useState('All');

  // Returns
  const [returns, setReturns] = useState([]);
  const [returnForm, setReturnForm] = useState({ orderId: '', reason: '' });

  // Staff
  const [staffList, setStaffList] = useState([]);
  const [newStaff, setNewStaff] = useState({ name: '', role: 'Pharmacist', email: '', phone: '', licenseNumber: '', experience: '', shift: 'Morning' });

  // Offers
  const [offers, setOffers] = useState([]);
  const [newOffer, setNewOffer] = useState({ title: '', code: '', discount: '', type: 'percentage', minPurchase: '0', maxDiscount: '', validTill: '', usageLimit: '100', isActive: true });

  // Reviews
  const [reviews, _setReviews] = useState([]);
  const reviewCount = reviews.length;

  // Reports
  const [reportPeriod, setReportPeriod] = useState('7d');

// Settings
  const [storeSettings, setStoreSettings] = useState({ name: 'MediCore Pharmacy', address: '123 Healthcare Ave, New York', phone: '+1 234-567-8900', email: 'pharmacy@medicore.com', licenseNo: 'PH-LIC-001', timing: '8:00 AM - 10:00 PM', deliveryRadius: '10 km', minOrderAmt: '100', deliveryFee: '30', gst: '18', autoRetry: true });

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const exportBillingCsv = async () => {
    try {
      const data = await pharmApi.getBillingExport();
      const rows = (data.bills || filteredBills.length ? filteredBills : orders).map(b => ({
        invoice: b.invoiceId || b.orderId || b._id,
        patient: b.patientName,
        amount: b.total || b.amount || 0,
        payment: b.paymentStatus || b.status,
        date: b.date || b.orderDate || b.createdAt,
      }));
      if (!rows.length) return showToast('No rows to export', 'error');
      const csv = ['Invoice,Patient,Amount,Payment,Date', ...rows.map(r => [r.invoice, r.patient, r.amount, r.payment, r.date].map(v => `"${String(v).replaceAll('"', '""')}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pharmacy-billing-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast('CSV exported');
    } catch {
showToast('Failed to export billing', 'error');
    }
  };

  useEffect(() => {
    const load = async () => {
      const d = await pharmApi.getStats();
      setStats(d);
      const m = await pharmApi.getMedicines({});
      setMedicines(m.medicines || []);
      const r = await pharmApi.getPrescriptions({});
      setPrescriptions(r.prescriptions || []);
    };
    load();
  }, []);

  const loadMedicines = async () => {
    const params = {};
    if (medFilter.category) params.category = medFilter.category;
    if (medFilter.lowStock) params.lowStock = 'true';
    const m = await pharmApi.getMedicines(params);
    setMedicines(m.medicines || []);
  };

  const loadPrescriptions = async () => {
    const params = {};
    if (rxSearch) params.search = rxSearch;
    const r = await pharmApi.getPrescriptions(params);
    setPrescriptions(r.prescriptions || []);
  };

  const filteredMedicines = useMemo(() => {
    let list = medicines;
    if (search) { const q = search.toLowerCase(); list = list.filter(m => m.name?.toLowerCase().includes(q) || m.genericName?.toLowerCase().includes(q) || m.manufacturer?.toLowerCase().includes(q)); }
    if (medFilter.expiring) list = list.filter(m => new Date(m.expiryDate) < new Date(Date.now() + 90 * 86400000));
    return list.sort((a, b) => (a.currentStock / a.reorderLevel) - (b.currentStock / b.reorderLevel));
  }, [medicines, search, medFilter]);

  const filteredOrders = useMemo(() => {
    if (orderFilter === 'All') return orders;
    return orders.filter(o => o.status === orderFilter);
  }, [orders, orderFilter]);

  const filteredBills = useMemo(() => {
    if (billFilter === 'All') return bills;
    return bills.filter(b => b.status === billFilter);
  }, [bills, billFilter]);

  // Compute derived stats
  const derivedStats = useMemo(() => {
    const low = medicines.filter(m => m.currentStock <= m.reorderLevel).length;
    const exp = medicines.filter(m => new Date(m.expiryDate) < new Date(Date.now() + 90 * 86400000)).length;
    const pendingOrders = orders.filter(o => o.status === 'Pending').length;
    const revenue = orders.filter(o => o.paymentStatus === 'Paid').reduce((s, o) => s + o.total, 0);
    return { ...stats, lowStock: low, expiringSoon: exp, totalOrders: orders.length, pendingOrders, revenue, pendingReturns: returns.filter(r => r.status === 'Pending').length };
  }, [stats, medicines, orders, returns]);

  const addRxMed = () => setNewRx(r => ({ ...r, medicines: [...r.medicines, { medicineName: '', dosage: '', frequency: '1-0-1', duration: '7 days', quantity: 1 }] }));
  const removeRxMed = (i) => setNewRx(r => ({ ...r, medicines: r.medicines.filter((_, idx) => idx !== i) }));
  const updateRxMed = (i, f, v) => setNewRx(r => ({ ...r, medicines: r.medicines.map((m, idx) => idx === i ? { ...m, [f]: v } : m) }));

  // Render helpers
  const StatusBadge = ({ status, mapping = {} }) => {
    const colors = mapping[status] || { Pending: 'bg-warning/10 text-warning', Shipped: 'bg-info/10 text-info', Delivered: 'bg-success/10 text-success', Cancelled: 'bg-destructive/10 text-destructive', Active: 'bg-info/10 text-info', Dispensed: 'bg-success/10 text-success', Paid: 'bg-success/10 text-success', Unpaid: 'bg-warning/10 text-warning', Approved: 'bg-success/10 text-success', Rejected: 'bg-destructive/10 text-destructive', InTransit: 'bg-info/10 text-info', 'In Transit': 'bg-info/10 text-info', 'Pending Pickup': 'bg-warning/10 text-warning' };
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

      {/* Page header */}
      <div className="page-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center"><Pill className="w-6 h-6 text-primary" /></div>
          <div>
            <h1 className="page-title">{storeSettings.name}</h1>
            <p className="page-subtitle">Medical Store Dashboard · {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
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
                  { label: 'Medicines', value: derivedStats.totalMedicines, icon: Package, color: 'text-primary', bg: 'bg-primary/10' },
                  { label: 'Low Stock', value: derivedStats.lowStock, icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10' },
                  { label: 'Expiring', value: derivedStats.expiringSoon, icon: Clock, color: 'text-destructive', bg: 'bg-destructive/10' },
                  { label: 'Orders', value: derivedStats.totalOrders, icon: ShoppingCart, color: 'text-info', bg: 'bg-info/10' },
                  { label: 'Pending Rx', value: derivedStats.pendingDispense, icon: ClipboardList, color: 'text-warning', bg: 'bg-warning/10' },
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
                  <h3 className="font-semibold mb-4 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-warning" /> Quick Alerts</h3>
                  <div className="space-y-3">
                    {medicines.filter(m => m.currentStock <= m.reorderLevel).slice(0, 5).map(m => (
                      <div key={m._id} className="flex items-center justify-between text-sm">
                        <span className="font-medium">{m.name}</span>
                        <span className="text-destructive">{m.currentStock} / {m.reorderLevel}</span>
                      </div>
                    ))}
                    {medicines.filter(m => m.currentStock <= m.reorderLevel).length === 0 && <p className="text-sm text-muted-foreground">No low stock alerts</p>}
                  </div>
                </div>

                <div className="bg-card rounded-xl border p-5">
                  <h3 className="font-semibold mb-4 flex items-center gap-2"><ShoppingCart className="w-4 h-4 text-info" /> Recent Orders</h3>
                  <div className="space-y-3">
                    {orders.slice(0, 5).map(o => (
                      <div key={o._id} className="flex items-center justify-between text-sm">
                        <div><span className="font-medium">{o.orderId}</span><p className="text-xs text-muted-foreground">{o.patientName}</p></div>
                        <StatusBadge status={o.status} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-xl border p-5">
                <h3 className="font-semibold mb-4 flex items-center gap-2"><Zap className="w-4 h-4 text-primary" /> Quick Actions</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[{ label: 'Add Medicine', icon: Plus, tab: 'inventory' }, { label: 'New Order', icon: ShoppingCart, tab: 'orders' }, { label: 'Create Rx', icon: ClipboardList, tab: 'prescriptions' }, { label: 'Manage Staff', icon: Users, tab: 'staff' }].map(a => (
                    <button key={a.label} onClick={() => { setTab(a.tab); setShowModal(a.label === 'Add Medicine' ? 'add-medicine' : a.label === 'New Order' ? 'add-order' : a.label === 'Create Rx' ? 'add-rx' : null); }}
                      className="flex items-center gap-3 p-3 rounded-xl border bg-muted/30 hover:bg-muted transition-colors text-left">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><a.icon className="w-5 h-5 text-primary" /></div>
                      <span className="text-sm font-medium">{a.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════ INVENTORY ═══════════════════ */}
          {tab === 'inventory' && (
            <>
              <div className="flex flex-wrap gap-3 mb-6">
                <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search medicines..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} /></div>
                <select value={medFilter.category} onChange={e => setMedFilter(f => ({ ...f, category: e.target.value }))} className="h-10 px-3 rounded-lg border border-input bg-background text-sm">{[{ value: '', label: 'All Categories' }, ...categoryOptions.map(c => ({ value: c, label: c }))].map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
                <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={medFilter.lowStock} onChange={e => setMedFilter(f => ({ ...f, lowStock: e.target.checked }))} className="rounded" /> Low Stock</label>
                <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={medFilter.expiring} onChange={e => setMedFilter(f => ({ ...f, expiring: e.target.checked }))} className="rounded" /> Expiring</label>
                <Button onClick={() => { setEditMed(null); setNewMed({ name: '', genericName: '', category: 'Antibiotic', form: 'Tablet', manufacturer: '', batchNumber: '', expiryDate: '', purchasePrice: '', sellingPrice: '', currentStock: '', reorderLevel: '10', rackLocation: '' }); setShowModal('add-medicine'); }}><Plus className="w-4 h-4 mr-1" /> Add</Button>
              </div>

              <div className="space-y-3">
                {filteredMedicines.map(med => {
                  const expiring = new Date(med.expiryDate) < new Date(Date.now() + 90 * 86400000);
                  const low = med.currentStock <= med.reorderLevel;
                  return (
                    <div key={med._id} className="bg-card rounded-xl border p-4">
                      <div className="flex items-start justify-between cursor-pointer" onClick={() => setExpandedId(expandedId === med._id ? null : med._id)}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Pill className="w-5 h-5 text-primary" /></div>
                          <div><p className="font-medium text-foreground">{med.name} <span className="text-muted-foreground text-xs ml-1">{med.form}</span></p>
                            <p className="text-xs text-muted-foreground">{med.genericName} · {med.manufacturer}</p></div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${low ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}`}>{med.currentStock} in stock</span>
                          {expiring && <span className="text-xs text-destructive font-medium">Expiring</span>}
                        </div>
                      </div>
                      {expandedId === med._id && (
                        <div className="mt-4 pt-4 border-t space-y-3">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div><p className="text-muted-foreground">Batch</p><p className="font-medium">{med.batchNumber}</p></div>
                            <div><p className="text-muted-foreground">Expiry</p><p className="font-medium">{new Date(med.expiryDate).toLocaleDateString()}</p></div>
                            <div><p className="text-muted-foreground">Purchase Price</p><p className="font-medium">₹{med.purchasePrice}</p></div>
                            <div><p className="text-muted-foreground">Selling Price</p><p className="font-medium">₹{med.sellingPrice}</p></div>
                            <div><p className="text-muted-foreground">Reorder Level</p><p className="font-medium">{med.reorderLevel}</p></div>
                            <div><p className="text-muted-foreground">Rack</p><p className="font-medium">{med.rackLocation || 'N/A'}</p></div>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <Button size="sm" variant="outline" onClick={() => { setStockModal({ id: med._id, type: 'add' }); setStockQty(''); }}>+ Add Stock</Button>
                            <Button size="sm" variant="outline" onClick={() => { setStockModal({ id: med._id, type: 'deduct' }); setStockQty(''); }}>- Deduct</Button>
                            <Button size="sm" variant="outline" onClick={() => { setEditMed(med); setNewMed({ name: med.name, genericName: med.genericName, category: med.category, form: med.form, manufacturer: med.manufacturer, batchNumber: med.batchNumber, expiryDate: med.expiryDate?.split('T')[0] || '', purchasePrice: med.purchasePrice?.toString() || '', sellingPrice: med.sellingPrice?.toString() || '', currentStock: med.currentStock?.toString() || '', reorderLevel: med.reorderLevel?.toString() || '10', rackLocation: med.rackLocation || '' }); setShowModal('add-medicine'); }}><Edit className="w-3 h-3 mr-1" /> Edit</Button>
                            <Button size="sm" variant="outline" className="text-destructive" onClick={() => setDeleteConfirmId(med._id)}><Trash2 className="w-3 h-3 mr-1" /> Delete</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {filteredMedicines.length === 0 && <div className="text-center py-20"><Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground">No medicines found</p></div>}
              </div>
            </>
          )}

          {/* ═══════════════════ ORDERS ═══════════════════ */}
          {tab === 'orders' && (
            <>
              <div className="flex flex-wrap gap-3 mb-6 items-center">
                <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search orders..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} /></div>
                {['All', 'Pending', 'Shipped', 'Delivered', 'Cancelled'].map(s => (
                  <button key={s} onClick={() => setOrderFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${orderFilter === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{s}</button>
                ))}
                <Button size="sm" onClick={() => setShowModal('add-order')}><Plus className="w-4 h-4 mr-1" /> New Order</Button>
              </div>
              <div className="space-y-3">
                {filteredOrders.map(o => (
                  <div key={o._id} className="bg-card rounded-xl border p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1"><span className="font-semibold">{o.orderId}</span><StatusBadge status={o.status} /></div>
                        <p className="text-sm font-medium">{o.patientName}</p>
                        <p className="text-xs text-muted-foreground">{o.phone} · {o.deliveryAddress}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">₹{o.total.toLocaleString()}</p>
                        <StatusBadge status={o.paymentStatus} />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {o.items.map((item, i) => (
                        <span key={i} className="text-xs bg-muted px-2 py-1 rounded-lg">{item.medicineName} x{item.qty}</span>
                      ))}
                    </div>
                    {o.note && <p className="text-xs text-muted-foreground mt-2">Note: {o.note}</p>}
                    <div className="flex gap-2 mt-3 pt-3 border-t">
                      {o.status === 'Pending' && <Button size="sm" onClick={async () => { await api.updatePharmacyOrder(o._id, { status: 'Shipped' }); setOrders(os => os.map(ord => ord._id === o._id ? { ...ord, status: 'Shipped' } : ord)); showToast('Order marked as shipped'); }}><Truck className="w-3 h-3 mr-1" /> Mark Shipped</Button>}
                      {o.status === 'Shipped' && <Button size="sm" onClick={async () => { await api.updatePharmacyOrder(o._id, { status: 'Delivered', paymentStatus: 'Paid' }); setOrders(os => os.map(ord => ord._id === o._id ? { ...ord, status: 'Delivered', paymentStatus: 'Paid' } : ord)); showToast('Order delivered'); }}><Check className="w-3 h-3 mr-1" /> Mark Delivered</Button>}
                      {o.paymentStatus === 'Unpaid' && <Button size="sm" variant="outline" onClick={async () => { await api.updatePharmacyOrder(o._id, { paymentStatus: 'Paid' }); setOrders(os => os.map(ord => ord._id === o._id ? { ...ord, paymentStatus: 'Paid' } : ord)); showToast('Payment received'); }}>Mark Paid</Button>}
                    </div>
                  </div>
                ))}
                {filteredOrders.length === 0 && <div className="text-center py-20"><ShoppingCart className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground">No orders found</p></div>}
              </div>
            </>
          )}

          {/* ═══════════════════ PRESCRIPTIONS ═══════════════════ */}
          {tab === 'prescriptions' && (
            <>
              <div className="flex flex-wrap gap-3 mb-6 items-center">
                <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search prescriptions..." className="pl-10" value={rxSearch} onChange={e => setRxSearch(e.target.value)} /></div>
                <Button onClick={() => setShowModal('add-rx')}><Plus className="w-4 h-4 mr-1" /> New Prescription</Button>
              </div>
              <div className="space-y-4">
                {prescriptions.map(rx => (
                  <div key={rx._id} className="bg-card rounded-xl border p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-foreground">{rx.prescriptionId}</span>
                          <StatusBadge status={rx.status} mapping={{ Active: 'bg-info/10 text-info', Dispensed: 'bg-success/10 text-success', 'Partially Dispensed': 'bg-warning/10 text-warning', Cancelled: 'bg-destructive/10 text-destructive' }} />
                        </div>
                        <p className="text-sm font-medium">{rx.patientName}</p>
                        <p className="text-xs text-muted-foreground">Dr. {rx.doctorName} · {rx.medicines?.length || 0} medicine(s)</p>
                      </div>
                      <span className="text-xs text-muted-foreground"><Clock className="w-3 h-3 inline mr-1" />{new Date(rx.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="space-y-2">
                      {(rx.medicines || []).map((m, i) => (
                        <div key={i} className="flex items-center justify-between bg-muted/30 rounded-lg p-2">
                          <div>
                            <p className="text-sm font-medium text-foreground">{m.medicineName} {m.dosage}</p>
                            <p className="text-xs text-muted-foreground">{m.frequency} · {m.duration} · Qty: {m.quantity}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {m.isDispensed ? <CheckCircle className="w-4 h-4 text-success" /> : <Button size="sm" variant="outline" onClick={async () => { await pharmApi.dispense(rx._id, { medicineIndex: i }); loadPrescriptions(); showToast(`${m.medicineName} dispensed`); }}>Dispense</Button>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {prescriptions.length === 0 && <div className="text-center py-20"><ClipboardList className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground">No prescriptions</p></div>}
              </div>
            </>
          )}

          {/* ═══════════════════ DELIVERY ═══════════════════ */}
          {tab === 'delivery' && (
            <>
              <SectionHeader title="Delivery Management" subtitle={`${deliveries.filter(d => d.status === 'In Transit' || d.status === 'Pending Pickup').length} active deliveries`}
                action={<Button size="sm" onClick={() => setShowModal('add-delivery')}><Plus className="w-4 h-4 mr-1" /> Assign Delivery</Button>} />
              <div className="space-y-3">
                {deliveries.map(d => (
                  <div key={d._id} className="bg-card rounded-xl border p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1"><span className="font-semibold">{d.orderId}</span><StatusBadge status={d.status} /></div>
                        <p className="text-sm font-medium"><Truck className="w-3 h-3 inline mr-1 text-muted-foreground" />{d.deliveryPerson}</p>
                        <p className="text-xs text-muted-foreground">{d.phone} · ETA: {d.estimatedTime}</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {d.tracking.map((t, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="w-2 h-2 rounded-full bg-primary" /> {t.location} · {new Date(t.time).toLocaleTimeString()}
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-3 pt-3 border-t">
                      <Button size="sm" variant="outline" onClick={async () => { await api.createNotification({ message: `Delivery notification for ${d.deliveryPerson} - Order ${d.orderId}`, type: 'delivery', relatedId: d._id }); showToast('Delivery person notified'); }}><Send className="w-3 h-3 mr-1" /> Notify</Button>
                      <Button size="sm" variant="outline" onClick={async () => { await api.updatePharmacyDelivery(d._id, { status: 'Delivered' }); setDeliveries(ds => ds.map(dd => dd._id === d._id ? { ...dd, status: 'Delivered' } : dd)); showToast('Marked delivered'); }}><Check className="w-3 h-3 mr-1" /> Complete</Button>
                    </div>
                  </div>
                ))}
                {deliveries.length === 0 && <div className="text-center py-20"><Truck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground">No active deliveries</p></div>}
              </div>
            </>
          )}

          {/* ═══════════════════ BILLING ═══════════════════ */}
          {tab === 'billing' && (
            <>
              <div className="flex flex-wrap gap-3 mb-6 items-center">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <div className="relative flex-1 min-w-[200px]"><Input placeholder="Search bills..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} /></div>
                {['All', 'Paid', 'Unpaid', 'Partial'].map(s => (
                  <button key={s} onClick={() => setBillFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${billFilter === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{s}</button>
                ))}
<Button size="sm" variant="outline" onClick={exportBillingCsv}><Download className="w-4 h-4 mr-1" /> Export</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-3 px-2 font-medium">Invoice</th>
                      <th className="text-left py-3 px-2 font-medium">Patient</th>
                      <th className="text-left py-3 px-2 font-medium">Items</th>
                      <th className="text-right py-3 px-2 font-medium">Amount</th>
                      <th className="text-center py-3 px-2 font-medium">Status</th>
                      <th className="text-right py-3 px-2 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBills.map(b => (
                      <tr key={b._id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2 font-medium">{b.invoiceId || b._id}</td>
                        <td className="py-3 px-2">{b.patientName}</td>
                        <td className="py-3 px-2">{b.items?.length || 0}</td>
                        <td className="py-3 px-2 text-right font-medium">₹{b.total?.toLocaleString() || 0}</td>
                        <td className="py-3 px-2 text-center"><StatusBadge status={b.status} /></td>
                        <td className="py-3 px-2 text-right text-muted-foreground">{b.date || b.orderDate?.split('T')[0]}</td>
                      </tr>
                    ))}
                    {filteredBills.length === 0 && filteredOrders.map(o => (
                      <tr key={o._id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2 font-medium">{o.orderId}</td>
                        <td className="py-3 px-2">{o.patientName}</td>
                        <td className="py-3 px-2">{o.items?.length || 0}</td>
                        <td className="py-3 px-2 text-right font-medium">₹{o.total?.toLocaleString() || 0}</td>
                        <td className="py-3 px-2 text-center"><StatusBadge status={o.paymentStatus} /></td>
                        <td className="py-3 px-2 text-right text-muted-foreground">{o.orderDate?.split('T')[0]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ═══════════════════ RETURNS ═══════════════════ */}
          {tab === 'returns' && (
            <>
              <SectionHeader title="Returns & Refunds" subtitle={`${returns.filter(r => r.status === 'Pending').length} pending requests`}
                action={<Button size="sm" variant="outline" onClick={() => setShowModal('add-return')}><Plus className="w-4 h-4 mr-1" /> New Return</Button>} />
              <div className="space-y-3">
                {returns.map(r => (
                  <div key={r._id} className="bg-card rounded-xl border p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1"><span className="font-semibold">{r.returnId}</span><StatusBadge status={r.status} /></div>
                        <p className="text-sm font-medium">{r.patientName} · {r.orderId}</p>
                      </div>
                      <p className="font-bold">₹{r.total.toLocaleString()}</p>
                    </div>
                    <div className="space-y-1">
                      {r.items.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-sm bg-muted/30 rounded-lg p-2">
                          <span>{item.medicineName} x{item.qty}</span>
                          <span className="text-xs text-muted-foreground">{item.reason}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-3 pt-3 border-t">
                      {r.status === 'Pending' && <>
                        <Button size="sm" onClick={async () => { await api.updatePharmacyReturn(r._id, { status: 'Approved' }); setReturns(rs => rs.map(rr => rr._id === r._id ? { ...rr, status: 'Approved', completedAt: new Date().toISOString().split('T')[0] } : rr)); showToast('Return approved, refund initiated'); }}><Check className="w-3 h-3 mr-1" /> Approve</Button>
                        <Button size="sm" variant="outline" className="text-destructive" onClick={async () => { await api.updatePharmacyReturn(r._id, { status: 'Rejected' }); setReturns(rs => rs.map(rr => rr._id === r._id ? { ...rr, status: 'Rejected' } : rr)); showToast('Return rejected'); }}><X className="w-3 h-3 mr-1" /> Reject</Button>
                      </>}
                    </div>
                  </div>
                ))}
                {returns.length === 0 && <div className="text-center py-20"><RotateCcw className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground">No returns</p></div>}
              </div>
            </>
          )}

          {/* ═══════════════════ STAFF ═══════════════════ */}
          {tab === 'staff' && (
            <>
              <SectionHeader title="Pharmacy Staff" subtitle={`${staffList.filter(s => s.isActive).length} active staff members`}
                action={<Button size="sm" onClick={() => { setNewStaff({ name: '', role: 'Pharmacist', email: '', phone: '', licenseNumber: '', experience: '', shift: 'Morning' }); setShowModal('add-staff'); }}><Plus className="w-4 h-4 mr-1" /> Add Staff</Button>} />
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
                      <p className="text-xs">Exp: {s.experience} · Shift: {s.shift} · Since {s.joinedAt}</p>
                    </div>
                    <div className="flex gap-2 mt-3 pt-3 border-t">
                      <Button size="sm" variant="outline" onClick={() => { setStaffList(ss => ss.map(st => st._id === s._id ? { ...st, isActive: !st.isActive } : st)); showToast(`Staff ${s.isActive ? 'deactivated' : 'activated'}`); }}>{s.isActive ? 'Deactivate' : 'Activate'}</Button>
                    </div>
                  </div>
                ))}
                {staffList.length === 0 && <div className="col-span-full text-center py-20"><Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground">No staff</p></div>}
              </div>
            </>
          )}

          {/* ═══════════════════ OFFERS ═══════════════════ */}
          {tab === 'offers' && (
            <>
              <SectionHeader title="Offers & Discounts" subtitle={`${offers.filter(o => o.isActive).length} active offers`}
                action={<Button size="sm" onClick={() => { setNewOffer({ title: '', code: '', discount: '', type: 'percentage', minPurchase: '0', maxDiscount: '', validTill: '', usageLimit: '100', isActive: true }); setShowModal('add-offer'); }}><Plus className="w-4 h-4 mr-1" /> New Offer</Button>} />
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {offers.map(o => (
                  <div key={o._id} className={`bg-card rounded-xl border p-4 ${!o.isActive ? 'opacity-50' : ''}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center"><Gift className="w-5 h-5 text-warning" /></div>
                        <div><p className="font-medium">{o.title}</p><p className="text-xs text-muted-foreground">Code: <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{o.code}</span></p></div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${o.isActive ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>{o.isActive ? 'Active' : 'Expired'}</span>
                    </div>
                    <div className="text-sm space-y-1">
                      <p className="text-lg font-bold text-primary">{o.type === 'percentage' ? `${o.discount}% Off` : `₹${o.discount} Off`}</p>
                      <p className="text-muted-foreground">Min purchase: ₹{o.minPurchase} · {o.used}/{o.usageLimit} used</p>
                      <p className="text-xs text-muted-foreground">Valid till: {o.validTill}</p>
                    </div>
                    <div className="flex gap-2 mt-3 pt-3 border-t">
                      <Button size="sm" variant="outline" onClick={() => { setOffers(os => os.map(off => off._id === o._id ? { ...off, isActive: !off.isActive } : off)); showToast(`Offer ${o.isActive ? 'disabled' : 'enabled'}`); }}>{o.isActive ? 'Disable' : 'Enable'}</Button>
                      <Button size="sm" variant="outline" onClick={() => { navigator.clipboard?.writeText(o.code); showToast('Coupon code copied!'); }}><Copy className="w-3 h-3 mr-1" /> Copy Code</Button>
                    </div>
                  </div>
                ))}
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
                        <div><p className="font-medium">{r.patientName}</p><p className="text-xs text-muted-foreground">{r.orderId} · {r.date}</p></div>
                      </div>
                      <div className="flex items-center gap-0.5">{Array.from({ length: 5 }, (_, i) => <Star key={i} className={`w-4 h-4 ${i < r.rating ? 'text-warning fill-warning' : 'text-muted'}`} />)}</div>
                    </div>
                    <p className="text-sm text-foreground/80">{r.comment}</p>
                  </div>
                ))}
                {reviews.length === 0 && reviewCount === 0 && <div className="text-center py-20"><Star className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground">No reviews yet</p></div>}
                {reviews.length === 0 && reviewCount > 0 && <div className="text-center py-20"><Star className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground">Reviews summary available, individual reviews loading soon.</p></div>}
              </div>
            </>
          )}

          {/* ═══════════════════ REPORTS ═══════════════════ */}
          {tab === 'reports' && (
            <>
              <SectionHeader title="Pharmacy Reports" subtitle="Analytics and sales data"
                action={<div className="flex gap-2">{['7d', '30d', '90d', '1y'].map(p => <button key={p} onClick={() => setReportPeriod(p)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${reportPeriod === p ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{p}</button>)}</div>} />
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="bg-card rounded-xl border p-5">
                  <h3 className="font-semibold mb-4">Sales Overview</h3>
                  <div className="space-y-4">
                    {[
                      { label: 'Total Orders', value: orders.length, change: '+12%' },
                      { label: 'Revenue', value: `₹${orders.filter(o => o.paymentStatus === 'Paid').reduce((s, o) => s + o.total, 0).toLocaleString()}`, change: '+18%' },
                      { label: 'Avg Order Value', value: `₹${orders.length ? Math.round(orders.reduce((s, o) => s + o.total, 0) / orders.length).toLocaleString() : 0}`, change: '+5%' },
                      { label: 'Medicines Dispensed', value: medicines.reduce((s, m) => s + (m.currentStock || 0), 0), change: '-3%' },
                    ].map(d => (
                      <div key={d.label} className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{d.label}</span>
                        <div className="text-right"><span className="font-semibold">{d.value}</span><span className="text-xs text-success ml-2">{d.change}</span></div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-card rounded-xl border p-5">
                  <h3 className="font-semibold mb-4">Category Distribution</h3>
                  <div className="space-y-3">
                    {categoryOptions.slice(0, 8).map(cat => {
                      const count = medicines.filter(m => m.category === cat).length;
                      const max = Math.max(...categoryOptions.map(c => medicines.filter(m => m.category === c).length), 1);
                      return count > 0 && (
                        <div key={cat} className="flex items-center gap-3">
                          <span className="text-sm w-28 truncate">{cat}</span>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${(count / max) * 100}%` }} />
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
                    ...orders.slice(0, 3).map(o => ({ text: `Order ${o.orderId} ${o.status.toLowerCase()} for ${o.patientName}`, time: o.orderDate })),
                    ...prescriptions.slice(0, 3).map(r => ({ text: `Prescription ${r.prescriptionId} ${r.status.toLowerCase()} - ${r.patientName}`, time: r.createdAt })),
                    ...returns.filter(r => r.status === 'Approved').slice(0, 2).map(r => ({ text: `Return ${r.returnId} approved - ₹${r.total} refunded`, time: r.completedAt })),
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

{/* ═══════════════════ STOCK ALERTS ═══════════════════ */}
          {tab === 'alerts' && (
            <>
              <SectionHeader title="Low Stock & Expiry Alerts" subtitle={`${medicines.filter(m => m.currentStock <= m.reorderLevel).length} items low stock · ${medicines.filter(m => new Date(m.expiryDate) < new Date(Date.now() + 90 * 86400000)).length} items expiring soon`}
                action={<Button size="sm" variant="outline" onClick={async () => {
                  try {
                    const data = await pharmApi.getMedicineAlerts();
                    const rows = (data.medicines || medicines.filter(m => m.currentStock <= m.reorderLevel || new Date(m.expiryDate) < new Date(Date.now() + 90 * 86400000))).map(m => ({ name: m.name, genericName: m.genericName, currentStock: m.currentStock, reorderLevel: m.reorderLevel, expiryDate: m.expiryDate ? new Date(m.expiryDate).toLocaleDateString() : '' }));
                    if (!rows.length) return showToast('No rows to export', 'error');
                    const csv = ['Name,Generic Name,Current Stock,Reorder Level,Expiry Date', ...rows.map(r => [r.name, r.genericName, r.currentStock, r.reorderLevel, r.expiryDate].map(v => `"${String(v).replaceAll('"', '""')}"`).join(','))].join('\n');
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `pharmacy-stock-alerts-${new Date().toISOString().slice(0, 10)}.csv`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    URL.revokeObjectURL(url);
                    showToast('CSV exported');
                  } catch {
                    showToast('Failed to export stock alerts', 'error');
                  }
                }}><Download className="w-4 h-4 mr-1" /> Export Alert Report</Button>} />
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-card rounded-xl border p-5">
                  <h3 className="font-semibold mb-4 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-warning" /> Low Stock Items</h3>
                  <div className="space-y-3">
                    {medicines.filter(m => m.currentStock <= m.reorderLevel).sort((a, b) => (a.currentStock / a.reorderLevel) - (b.currentStock / b.reorderLevel)).map(m => (
                      <div key={m._id} className="flex items-center justify-between p-3 bg-warning/5 rounded-lg border border-warning/20">
                        <div><p className="text-sm font-medium">{m.name}</p><p className="text-xs text-muted-foreground">{m.genericName} · Reorder at {m.reorderLevel}</p></div>
                        <div className="text-right"><p className="text-lg font-bold text-destructive">{m.currentStock}</p><p className="text-xs text-muted-foreground">remaining</p></div>
                      </div>
                    ))}
                    {medicines.filter(m => m.currentStock <= m.reorderLevel).length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No low stock items</p>}
                  </div>
                </div>
                <div className="bg-card rounded-xl border p-5">
                  <h3 className="font-semibold mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-destructive" /> Expiring Soon</h3>
                  <div className="space-y-3">
                    {medicines.filter(m => new Date(m.expiryDate) < new Date(Date.now() + 90 * 86400000)).sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate)).map(m => (
                      <div key={m._id} className="flex items-center justify-between p-3 bg-destructive/5 rounded-lg border border-destructive/20">
                        <div><p className="text-sm font-medium">{m.name}</p><p className="text-xs text-muted-foreground">Batch: {m.batchNumber}</p></div>
                        <div className="text-right"><p className="text-sm font-bold text-destructive">{new Date(m.expiryDate).toLocaleDateString()}</p><p className="text-xs text-muted-foreground">{Math.ceil((new Date(m.expiryDate) - new Date()) / 86400000)} days left</p></div>
                      </div>
                    ))}
                    {medicines.filter(m => new Date(m.expiryDate) < new Date(Date.now() + 90 * 86400000)).length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No items expiring soon</p>}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ═══════════════════ SETTINGS ═══════════════════ */}
          {tab === 'settings' && (
            <div className="max-w-2xl">
              <SectionHeader title="Store Profile Settings" subtitle="Configure your pharmacy store details" />
              <div className="bg-card rounded-xl border p-6 space-y-5">
                {[{ key: 'name', label: 'Store Name' }, { key: 'address', label: 'Address' }, { key: 'phone', label: 'Phone' }, { key: 'email', label: 'Email' }, { key: 'licenseNo', label: 'License Number' }, { key: 'timing', label: 'Operating Hours' }, { key: 'deliveryRadius', label: 'Delivery Radius' }, { key: 'minOrderAmt', label: 'Minimum Order Amount (₹)' }, { key: 'deliveryFee', label: 'Delivery Fee (₹)' }, { key: 'gst', label: 'GST (%)' }].map(f => (
                  <div key={f.key}>
                    <label className="text-sm font-medium mb-1 block">{f.label}</label>
                    <Input value={storeSettings[f.key]} onChange={e => setStoreSettings(s => ({ ...s, [f.key]: e.target.value }))} />
                  </div>
                ))}
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div><p className="text-sm font-medium">Auto-Retry Prescriptions</p><p className="text-xs text-muted-foreground">Auto-forward rejected Rx to next preferred pharmacy</p></div>
                  <button onClick={() => setStoreSettings(s => ({ ...s, autoRetry: !s.autoRetry }))} className={`w-12 h-6 rounded-full transition-colors ${storeSettings.autoRetry ? 'bg-primary' : 'bg-muted-foreground/30'} relative`}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-transform ${storeSettings.autoRetry ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                <Button className="w-full" onClick={() => { window.location.href = '/admin/pharmacy-settings'; }}><Save className="w-4 h-4 mr-1" /> Save Settings</Button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ═══════════════════ MODALS ═══════════════════ */}

      {/* Add / Edit Medicine Modal */}
      {showModal === 'add-medicine' && (
        <Modal title={editMed ? 'Edit Medicine' : 'Add Medicine'} onClose={() => setShowModal(null)}>
          <div className="grid grid-cols-2 gap-4">
            {[{ key: 'name', label: 'Medicine Name' }, { key: 'genericName', label: 'Generic Name' }, { key: 'manufacturer', label: 'Manufacturer' }, { key: 'batchNumber', label: 'Batch Number' }, { key: 'expiryDate', label: 'Expiry Date', type: 'date' }, { key: 'purchasePrice', label: 'Purchase Price', type: 'number' }, { key: 'sellingPrice', label: 'Selling Price', type: 'number' }, { key: 'currentStock', label: 'Stock', type: 'number' }, { key: 'reorderLevel', label: 'Reorder Level', type: 'number' }, { key: 'rackLocation', label: 'Rack Location' }].map(f => (
              <div key={f.key}><label className="text-sm font-medium mb-1 block">{f.label}</label><Input type={f.type || 'text'} value={newMed[f.key]} onChange={e => setNewMed({ ...newMed, [f.key]: e.target.value })} /></div>
            ))}
            <div><label className="text-sm font-medium mb-1 block">Category</label><select value={newMed.category} onChange={e => setNewMed({ ...newMed, category: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">{categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div><label className="text-sm font-medium mb-1 block">Form</label><select value={newMed.form} onChange={e => setNewMed({ ...newMed, form: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">{formOptions.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          </div>
          <Button className="w-full mt-6" onClick={async () => {
            if (editMed) { await pharmApi.updateMedicine(editMed._id, newMed); showToast('Medicine updated'); }
            else { await pharmApi.createMedicine(newMed); showToast('Medicine added'); }
            setShowModal(null); loadMedicines();
          }} disabled={!newMed.name}>{editMed ? 'Update Medicine' : 'Add Medicine'}</Button>
        </Modal>
      )}

      {/* New Order Modal */}
      {showModal === 'add-order' && (
        <Modal title="Create New Order" onClose={() => setShowModal(null)}>
          <div className="space-y-4">
            <div><label className="text-sm font-medium mb-1 block">Patient Name</label><Input value={orderForm.patientName} onChange={e => setOrderForm({ ...orderForm, patientName: e.target.value })} placeholder="Patient name" /></div>
            <div className="grid grid-cols-2 gap-4"><div><label className="text-sm font-medium mb-1 block">Phone</label><Input value={orderForm.phone} onChange={e => setOrderForm({ ...orderForm, phone: e.target.value })} placeholder="Phone" /></div><div><label className="text-sm font-medium mb-1 block">Delivery Address</label><Input value={orderForm.deliveryAddress} onChange={e => setOrderForm({ ...orderForm, deliveryAddress: e.target.value })} placeholder="Address" /></div></div>
            <div><label className="text-sm font-medium mb-1 block">Medicine Items</label>
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2"><Input value={orderForm.medicineName} onChange={e => setOrderForm({ ...orderForm, medicineName: e.target.value })} placeholder="Medicine name" /><Input value={orderForm.qty} onChange={e => setOrderForm({ ...orderForm, qty: e.target.value })} placeholder="Qty" type="number" /><Input value={orderForm.price} onChange={e => setOrderForm({ ...orderForm, price: e.target.value })} placeholder="Price" type="number" /></div>
              </div>
            </div>
            <Button className="w-full" onClick={async () => {
              const item = orderForm.medicineName ? [{ medicineName: orderForm.medicineName, qty: Number(orderForm.qty || 1), price: Number(orderForm.price || 0) }] : [];
              const created = await api.createPharmacyOrder({ ...orderForm, items: item, total: item.reduce((s, i) => s + i.qty * i.price, 0) });
              setOrders(os => [created, ...os]);
              showToast('Order created');
              setShowModal(null);
            }} disabled={!orderForm.patientName || !orderForm.phone || !orderForm.deliveryAddress}>Create Order</Button>
          </div>
        </Modal>
      )}

      {/* New Prescription Modal */}
      {showModal === 'add-rx' && (
        <Modal title="New Prescription" onClose={() => setShowModal(null)}>
          <div className="space-y-4">
            <div><label className="text-sm font-medium mb-1 block">Patient Name</label><Input value={newRx.patientName} onChange={e => setNewRx({ ...newRx, patientName: e.target.value })} placeholder="Patient name" /></div>
            <div><label className="text-sm font-medium mb-1 block">Diagnosis</label><Input value={newRx.diagnosis} onChange={e => setNewRx({ ...newRx, diagnosis: e.target.value })} placeholder="Diagnosis" /></div>
            <div>
              <div className="flex items-center justify-between mb-2"><label className="text-sm font-medium">Medicines</label><Button size="sm" variant="outline" onClick={addRxMed}><Plus className="w-3 h-3 mr-1" />Add</Button></div>
              {newRx.medicines.map((m, i) => (
                <div key={i} className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-2">
                  <Input className="col-span-2" placeholder="Medicine name" value={m.medicineName} onChange={e => updateRxMed(i, 'medicineName', e.target.value)} />
                  <Input placeholder="Dosage" value={m.dosage} onChange={e => updateRxMed(i, 'dosage', e.target.value)} />
                  <select value={m.frequency} onChange={e => updateRxMed(i, 'frequency', e.target.value)} className="h-10 px-3 rounded-lg border border-input bg-background text-sm">{[1, 2, 3, 4].map(n => <option key={n}>{n}-0-{n}</option>)}</select>
                  <div className="flex gap-1"><Input placeholder="Qty" type="number" value={m.quantity} onChange={e => updateRxMed(i, 'quantity', parseInt(e.target.value))} />{newRx.medicines.length > 1 && <button onClick={() => removeRxMed(i)} className="p-2 text-destructive"><X className="w-4 h-4" /></button>}</div>
                </div>
              ))}
            </div>
            <Button className="w-full" onClick={async () => { await pharmApi.createPrescription(newRx); showToast('Prescription created'); setShowModal(null); loadPrescriptions(); }} disabled={!newRx.patientName}>Create Prescription</Button>
          </div>
        </Modal>
      )}

      {/* Assign Delivery Modal */}
      {showModal === 'add-delivery' && (
        <Modal title="Assign Delivery" onClose={() => setShowModal(null)}>
          <div className="space-y-4">
            <div><label className="text-sm font-medium mb-1 block">Select Order</label><select value={deliveryForm.orderId} onChange={e => setDeliveryForm({ ...deliveryForm, orderId: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"><option value="">Select order</option>{orders.filter(o => o.status !== 'Delivered').map(o => <option key={o._id} value={o._id}>{o.orderId} - {o.patientName}</option>)}</select></div>
            <div className="grid grid-cols-2 gap-4"><div><label className="text-sm font-medium mb-1 block">Delivery Person</label><Input value={deliveryForm.deliveryPerson} onChange={e => setDeliveryForm({ ...deliveryForm, deliveryPerson: e.target.value })} placeholder="Name" /></div><div><label className="text-sm font-medium mb-1 block">Phone</label><Input value={deliveryForm.phone} onChange={e => setDeliveryForm({ ...deliveryForm, phone: e.target.value })} placeholder="Phone" /></div></div>
            <div><label className="text-sm font-medium mb-1 block">Estimated Time</label><Input value={deliveryForm.estimatedTime} onChange={e => setDeliveryForm({ ...deliveryForm, estimatedTime: e.target.value })} placeholder="e.g. 30 mins" /></div>
            <Button className="w-full" onClick={async () => { const created = await api.createPharmacyDelivery(deliveryForm); setDeliveries(ds => [created, ...ds]); showToast('Delivery assigned'); setShowModal(null); }} disabled={!deliveryForm.orderId || !deliveryForm.deliveryPerson}>Assign Delivery</Button>
          </div>
        </Modal>
      )}

      {/* New Return Modal */}
      {showModal === 'add-return' && (
        <Modal title="Initiate Return" onClose={() => setShowModal(null)}>
          <div className="space-y-4">
            <div><label className="text-sm font-medium mb-1 block">Select Order</label><select value={returnForm.orderId} onChange={e => setReturnForm({ ...returnForm, orderId: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"><option value="">Select order</option>{orders.filter(o => o.status === 'Delivered').map(o => <option key={o._id} value={o._id}>{o.orderId} - {o.patientName}</option>)}</select></div>
            <div><label className="text-sm font-medium mb-1 block">Reason</label><Input value={returnForm.reason} onChange={e => setReturnForm({ ...returnForm, reason: e.target.value })} placeholder="Reason for return" /></div>
            <Button className="w-full" onClick={async () => { const created = await api.createPharmacyReturn(returnForm); setReturns(rs => [created, ...rs]); showToast('Return initiated'); setShowModal(null); }} disabled={!returnForm.orderId || !returnForm.reason}>Initiate Return</Button>
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
            <div><label className="text-sm font-medium mb-1 block">Role</label><select value={newStaff.role} onChange={e => setNewStaff({ ...newStaff, role: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">{[{ value: 'Pharmacist', label: 'Pharmacist' }, { value: 'Senior Pharmacist', label: 'Senior Pharmacist' }, { value: 'Pharmacy Technician', label: 'Pharmacy Technician' }, { value: 'Store Manager', label: 'Store Manager' }].map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
            <div><label className="text-sm font-medium mb-1 block">Shift</label><select value={newStaff.shift} onChange={e => setNewStaff({ ...newStaff, shift: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">{['Morning', 'Evening', 'Night', 'Rotating'].map(s => <option key={s} value={s}>{s}</option>)}</select></div>
          </div>
          <Button className="w-full mt-6" onClick={async () => { try { const created = await api.createPharmacyStaff(newStaff); setStaffList(sl => [...sl, created]); showToast('Staff added'); setShowModal(null); } catch { showToast('Unable to add staff', 'error'); } }} disabled={!newStaff.name}>Add Staff</Button>
        </Modal>
      )}

      {/* Stock Add/Deduct Modal */}
      {stockModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setStockModal(null)}>
          <div className="bg-card rounded-2xl border shadow-xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading text-xl font-bold">{stockModal.type === 'add' ? 'Add Stock' : 'Deduct Stock'}</h2>
              <button onClick={() => setStockModal(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Quantity</label>
                <Input type="number" value={stockQty} onChange={e => setStockQty(e.target.value)} placeholder="Enter quantity" min={1} />
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={async () => {
                  if (!stockQty || parseInt(stockQty) <= 0) { showToast('Please enter a valid quantity', 'error'); return; }
                  await pharmApi.stockUpdate(stockModal.id, { quantity: parseInt(stockQty), type: stockModal.type });
                  loadMedicines();
                  showToast(stockModal.type === 'add' ? 'Stock added' : 'Stock deducted');
                  setStockModal(null);
                  setStockQty('');
                }}>Confirm</Button>
                <Button variant="outline" onClick={() => { setStockModal(null); setStockQty(''); }}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirmId(null)}>
          <div className="bg-card rounded-2xl border shadow-xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <h2 className="font-heading text-xl font-bold mb-2">Confirm Delete</h2>
            <p className="text-sm text-muted-foreground mb-6">Are you sure you want to delete this medicine?</p>
            <div className="flex gap-2">
              <Button className="flex-1 text-destructive" variant="outline" onClick={async () => {
                await pharmApi.deleteMedicine(deleteConfirmId);
                loadMedicines();
                showToast('Medicine deleted');
                setDeleteConfirmId(null);
              }}>Delete</Button>
              <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* New Offer Modal */}
      {showModal === 'add-offer' && (
        <Modal title="Create Offer" onClose={() => setShowModal(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium mb-1 block">Offer Title</label><Input value={newOffer.title} onChange={e => setNewOffer({ ...newOffer, title: e.target.value })} /></div>
              <div><label className="text-sm font-medium mb-1 block">Coupon Code</label><Input value={newOffer.code} onChange={e => setNewOffer({ ...newOffer, code: e.target.value.toUpperCase() })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium mb-1 block">Discount</label><Input type="number" value={newOffer.discount} onChange={e => setNewOffer({ ...newOffer, discount: e.target.value })} placeholder={newOffer.type === 'percentage' ? '%' : '₹'} /></div>
              <div><label className="text-sm font-medium mb-1 block">Type</label><select value={newOffer.type} onChange={e => setNewOffer({ ...newOffer, type: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"><option value="percentage">Percentage (%)</option><option value="flat">Flat Amount (₹)</option></select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium mb-1 block">Min Purchase (₹)</label><Input type="number" value={newOffer.minPurchase} onChange={e => setNewOffer({ ...newOffer, minPurchase: e.target.value })} /></div>
              <div><label className="text-sm font-medium mb-1 block">Max Discount (₹)</label><Input type="number" value={newOffer.maxDiscount} onChange={e => setNewOffer({ ...newOffer, maxDiscount: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium mb-1 block">Valid Till</label><Input type="date" value={newOffer.validTill} onChange={e => setNewOffer({ ...newOffer, validTill: e.target.value })} /></div>
              <div><label className="text-sm font-medium mb-1 block">Usage Limit</label><Input type="number" value={newOffer.usageLimit} onChange={e => setNewOffer({ ...newOffer, usageLimit: e.target.value })} /></div>
            </div>
            <Button className="w-full" onClick={async () => { await api.createPharmacyOffer({ ...newOffer, discount: Number(newOffer.discount), minPurchase: Number(newOffer.minPurchase), maxDiscount: Number(newOffer.maxDiscount), usageLimit: Number(newOffer.usageLimit) }); showToast('Offer created'); setShowModal(null); }} disabled={!newOffer.title || !newOffer.code}>Create Offer</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}



