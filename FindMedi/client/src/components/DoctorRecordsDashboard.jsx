import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, User, Pill, Send, Plus, X, Search, Calendar, Download,
  CreditCard, Receipt, CheckCircle, Trash2, Phone, Mail, MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { api, downloadPrescriptionPdf, downloadInvoicePdf } from '@/lib/api';
import { toast } from 'sonner';
import { getISTDateString } from '@/lib/dateUtils';

// ── Shared form templates ──
const initialPrescription = {
  patientName: '', age: '', gender: '', phone: '', email: '', address: '', patientPhoto: '',
  chiefComplaints: '', diagnosis: '',
  medications: [{ name: '', dosage: '', frequency: '', instructions: '' }],
  advice: '', followUp: '',
};

const initialBill = {
  patient: '', doctor: '', service: 'Consultation', amount: '', paid: '0',
  status: 'Pending', date: getISTDateString(), dueDate: '',
  items: [{ name: '', price: '', quantity: 1 }],
};

const initialInvoice = {
  patient: '', doctor: '', service: '', amount: '', paid: '0',
  status: 'Pending', date: getISTDateString(), dueDate: '',
  items: [{ name: '', price: '', quantity: 1 }],
};

const statusColors = {
  Paid: 'bg-success/10 text-success',
  Pending: 'bg-warning/10 text-warning',
  Overdue: 'bg-destructive/10 text-destructive',
  Partial: 'bg-info/10 text-info',
};
const STATUSES = ['All', 'Paid', 'Pending', 'Overdue', 'Partial'];

// ── Section column wrapper ──
function SectionCard({ title, subtitle, icon: Icon, accent = 'text-primary', count, searchPlaceholder, search, onSearch, onNew, newLabel, children }) {
  return (
    <div className="bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden flex flex-col min-h-0">
      {/* Header */}
      <div className="p-4 border-b border-border/60 bg-gradient-to-r from-muted/50 to-transparent">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 ${accent}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-heading font-semibold text-foreground leading-tight">{title}</h3>
              <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
            </div>
          </div>
          <Badge variant="outline" className="shrink-0">{count}</Badge>
        </div>
        <div className="flex gap-2 mt-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input value={search} onChange={e => onSearch(e.target.value)} placeholder={searchPlaceholder} className="pl-8 h-9 text-sm" />
          </div>
          <Button size="sm" className="gap-1.5 shrink-0" onClick={onNew}>
            <Plus className="w-3.5 h-3.5" /> {newLabel}
          </Button>
        </div>
      </div>
      {/* Body */}
      <div className="flex-1 overflow-y-auto max-h-[calc(100vh-280px)] min-h-[320px]">
        {children}
      </div>
    </div>
  );
}

// ── Empty state ──
function EmptyState({ icon: Icon, title, hint }) {
  return (
    <div className="text-center py-14 px-4">
      <Icon className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
      <p className="text-muted-foreground font-medium">{title}</p>
      <p className="text-xs text-muted-foreground/60 mt-1">{hint}</p>
    </div>
  );
}

// ── Prescription card (patient personal details always visible) ──
function PrescriptionCard({ rec, onDownload }) {
  const [expanded, setExpanded] = useState(false);
  const p = rec.data?.patient || {};
  const avatar = p.photo || p.avatar || '';

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="border-b border-border/40 hover:bg-muted/20 transition-colors">
      <div className="p-3.5">
        {/* Patient personal details header */}
        <div className="flex items-center gap-3">
          {/* Avatar / Photo */}
          <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center text-success shrink-0 overflow-hidden ring-2 ring-success/20">
            {avatar ? <img src={avatar} alt={rec.patient} className="w-full h-full object-cover" /> : <User className="w-6 h-6" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground text-sm truncate">{rec.patient}</p>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
              {p.age && <span>{p.age}y</span>}
              {p.gender && <span>· {p.gender}</span>}
              <span className="flex items-center gap-0.5"><Calendar className="w-3 h-3" />{rec.date}</span>
            </div>
          </div>
          <Badge className="bg-success/10 text-success shrink-0 text-[10px]">RX</Badge>
        </div>

        {/* Patient personal details grid (always visible) */}
        <div className="mt-3 bg-muted/30 rounded-lg p-2.5 space-y-1.5 text-[11px]">
          {p.phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="w-3 h-3 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Phone:</span>
              <span className="font-medium text-foreground">{p.phone}</span>
            </div>
          )}
          {p.email && (
            <div className="flex items-center gap-1.5 min-w-0">
              <Mail className="w-3 h-3 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium text-foreground truncate">{p.email}</span>
            </div>
          )}
          {p.address && (
            <div className="flex items-start gap-1.5">
              <MapPin className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
              <span className="text-muted-foreground">Address:</span>
              <span className="font-medium text-foreground">{p.address}</span>
            </div>
          )}
        </div>

        {/* Diagnosis + PDF download */}
        <div className="flex items-center justify-between mt-2.5">
          <p className="text-xs text-muted-foreground truncate max-w-[60%]">{rec.diagnosis}</p>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-primary" title="Download Prescription PDF" onClick={() => onDownload(rec)}>
            <Download className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Expandable medical details */}
        <button onClick={() => setExpanded(!expanded)} className="mt-1 text-[11px] text-primary hover:underline flex items-center gap-1">
          {expanded ? 'Hide details' : 'View medications & more'}
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="px-3.5 pb-3.5 border-t border-border/40 bg-muted/20">
            <div className="pt-3 space-y-2.5 text-xs">
              {rec.data?.chiefComplaints && (
                <div><span className="text-muted-foreground">Complaints:</span> <span className="ml-1">{rec.data.chiefComplaints}</span></div>
              )}
              {rec.data?.medications?.length > 0 && (
                <div>
                  <p className="text-muted-foreground mb-1">Medications:</p>
                  <div className="space-y-1">
                    {rec.data.medications.map((m, j) => (
                      <div key={j} className="flex items-center gap-1.5">
                        <Pill className="w-3 h-3 text-success shrink-0" />
                        <span className="font-medium">{m.name}</span>
                        {m.dosage && <span className="text-muted-foreground">{m.dosage}</span>}
                        {m.frequency && <span className="text-muted-foreground">{m.frequency}</span>}
                        {m.instructions && <Badge variant="outline" className="text-[9px]">{m.instructions}</Badge>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {rec.data?.advice && <div><span className="text-muted-foreground">Advice:</span> <span className="ml-1">{rec.data.advice}</span></div>}
              {rec.data?.followUp && <div><span className="text-muted-foreground">Follow-up:</span> <span className="ml-1">{rec.data.followUp}</span></div>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Bill/Invoice card ──
function BillInvoiceCard({ bill, variant, onDownload, onMarkPaid, onDelete }) {
  const isInvoice = variant === 'invoice';
  const c = statusColors[bill.status] || 'bg-muted text-muted-foreground';
  const { data } = bill;
  const items = data?.items?.length ? data.items : (bill.services || []);
  const totalItems = items.reduce((s, it) => s + (Number(it.quantity) || 1), 0);
  const iconBg = isInvoice ? 'bg-primary/10 text-primary' : 'bg-info/10 text-info';
  const IconComp = isInvoice ? Receipt : CreditCard;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="border-b border-border/40 hover:bg-muted/20 transition-colors">
      <div className="p-3.5">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
            <IconComp className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground text-sm truncate">{bill.patient}</p>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
              <span className="font-mono">{bill.invoiceId || bill.billId || 'N/A'}</span>
              <span>· {bill.date}</span>
            </div>
          </div>
          <Badge className={c + ' shrink-0 text-[10px]'}>{bill.status}</Badge>
        </div>
        <div className="flex items-center justify-between mt-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold text-foreground">₹{Number(bill.amount || 0).toLocaleString()}</span>
            <span className="text-[10px] text-muted-foreground">· ₹{Number(bill.paid || 0).toLocaleString()} paid</span>
            {totalItems > 0 && <span className="text-[10px] text-muted-foreground">· {totalItems} item{totalItems > 1 ? 's' : ''}</span>}
          </div>
          <div className="flex items-center gap-0.5">
            <button onClick={() => onDownload(bill)} title={`Download ${isInvoice ? 'Invoice' : 'Bill'} PDF`}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
              <Download className="w-3.5 h-3.5" />
            </button>
            {bill.status !== 'Paid' && (
              <button onClick={() => onMarkPaid(bill)} title="Mark Paid"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-success hover:bg-success/10 transition-colors">
                <CheckCircle className="w-3.5 h-3.5" />
              </button>
            )}
            <button onClick={() => onDelete(bill)} title="Delete"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1 truncate">{bill.service}</p>
      </div>
    </motion.div>
  );
}

// ── Doctor Records Dashboard (3 columns) ──
export default function DoctorRecordsDashboard({ records, bills, invoices, onRefresh, loading }) {
  const { user } = useAuth();

  // Search states per section
  const [rxSearch, setRxSearch] = useState('');
  const [billSearch, setBillSearch] = useState('');
  const [invSearch, setInvSearch] = useState('');

  // Modal states
  const [showRx, setShowRx] = useState(false);
  const [showBill, setShowBill] = useState(false);
  const [showInv, setShowInv] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});

  // Filters
  const [billStatus, setBillStatus] = useState('All');
  const [invStatus, setInvStatus] = useState('All');

  // ── Filtered lists ──
  const filteredRx = useMemo(() => (records || []).filter(r =>
    !rxSearch ||
    r.patient?.toLowerCase().includes(rxSearch.toLowerCase()) ||
    r.diagnosis?.toLowerCase().includes(rxSearch.toLowerCase()) ||
    r.data?.patient?.phone?.toLowerCase().includes(rxSearch.toLowerCase())
  ), [records, rxSearch]);

  const filteredBills = useMemo(() => (bills || []).filter(b => {
    const ms = !billSearch || b.patient?.toLowerCase().includes(billSearch.toLowerCase()) || b.invoiceId?.toLowerCase().includes(billSearch.toLowerCase());
    const st = billStatus === 'All' || b.status === billStatus;
    return ms && st;
  }), [bills, billSearch, billStatus]);

  const filteredInvoices = useMemo(() => (invoices || []).filter(b => {
    const ms = !invSearch || b.patient?.toLowerCase().includes(invSearch.toLowerCase()) || b.invoiceId?.toLowerCase().includes(invSearch.toLowerCase());
    const st = invStatus === 'All' || b.status === invStatus;
    return ms && st;
  }), [invoices, invSearch, invStatus]);

  // ── Helpers ──
  const showError = (e) => toast.error(e?.message || 'Something went wrong');

  // Prescription PDF
  const handleRxDownload = async (rec) => {
    try {
      await downloadPrescriptionPdf(rec._id, `prescription-${rec.patient || 'download'}.pdf`);
      toast.success('Prescription PDF downloaded');
    } catch (e) { showError(e); }
  };

  // Invoice PDF
  const handleInvDownload = async (bill) => {
    try {
      await downloadInvoicePdf(bill._id, `invoice-${bill.invoiceId || 'download'}.pdf`);
      toast.success('Invoice PDF downloaded');
    } catch (e) { showError(e); }
  };

  // Bill PDF via transaction if available
  const handleBillDownload = async (bill) => {
    try {
      if (bill.transactionId) {
        const { downloadBillPdf } = await import('@/lib/api');
        await downloadBillPdf(bill.transactionId, `bill-${bill.invoiceId || bill.billId || 'download'}.pdf`);
      } else {
        await downloadInvoicePdf(bill._id, `bill-${bill.invoiceId || bill.billId || 'download'}.pdf`);
      }
      toast.success('Bill PDF downloaded');
    } catch (e) { showError(e); }
  };

  // Create prescription
  const handleCreateRx = async () => {
    if (!form.patientName || !form.diagnosis) {
      toast.error('Patient name and diagnosis are required');
      return;
    }
    setSaving(true);
    try {
      const meds = (form.medications || []).filter(m => m.name?.trim());
      await api.createRecord({
        patient: form.patientName,
        doctor: user?.name,
        diagnosis: form.diagnosis,
        prescription: meds.map(m => `${m.name} - ${m.dosage} - ${m.frequency} ${m.instructions ? `(${m.instructions})` : ''}`).join('\n'),
        type: 'Prescription',
        notes: `Chief Complaints: ${form.chiefComplaints || ''}\nAdvice: ${form.advice || ''}\nFollow-up: ${form.followUp || ''}`,
        data: {
          patient: {
            name: form.patientName, age: form.age, gender: form.gender,
            phone: form.phone, email: form.email, address: form.address,
            photo: form.patientPhoto || '',
          },
          doctor: { name: user?.name, specialization: user?.specialization || '' },
          chiefComplaints: form.chiefComplaints,
          diagnosis: form.diagnosis,
          medications: meds,
          advice: form.advice,
          followUp: form.followUp,
          date: getISTDateString(),
        },
      });
      await api.createNotification({
        title: 'New Prescription',
        message: `Dr. ${user?.name} has generated a prescription for ${form.patientName}`,
        type: 'records',
      });
      setShowRx(false);
      setForm(initialPrescription);
      toast.success('Prescription created');
      onRefresh?.();
    } catch (e) { showError(e); }
    setSaving(false);
  };

  // Create bill/invoice
  const handleCreateBiz = async (isInvoice) => {
    if (!form.patient || !form.amount) {
      toast.error('Patient and amount are required');
      return;
    }
    setSaving(true);
    try {
      await api.createBill({
        patient: form.patient,
        doctor: form.doctor || user?.name,
        service: form.service || (isInvoice ? 'Invoice' : 'Bill'),
        amount: Number(form.amount),
        paid: Number(form.paid) || 0,
        status: form.status,
        date: form.date || getISTDateString(),
        dueDate: form.dueDate,
        items: (form.items || []).filter(it => it.name?.trim()),
        billType: isInvoice ? 'Invoice' : 'Bill',
        data: {
          items: (form.items || []).filter(it => it.name?.trim()).map(it => ({ ...it, price: Number(it.price) || 0, quantity: Number(it.quantity) || 1 })),
          type: isInvoice ? 'invoice' : 'bill',
        },
      });
      setShowBill(false);
      setShowInv(false);
      setForm({});
      toast.success(isInvoice ? 'Invoice created' : 'Bill created');
      onRefresh?.();
    } catch (e) { showError(e); }
    setSaving(false);
  };

  // Mark paid
  const handleMarkPaid = async (bill) => {
    try {
      await api.updateBill(bill._id, { status: 'Paid', paid: bill.amount });
      toast.success('Marked as paid');
      onRefresh?.();
    } catch (e) { showError(e); }
  };

  // Delete bill
  const handleDeleteBiz = async (bill) => {
    if (!confirm('Delete this record?')) return;
    try {
      await api.deleteBill(bill._id);
      toast.success('Deleted');
      onRefresh?.();
    } catch (e) { showError(e); }
  };

  // Add line item
  const addBillItem = (isInvoice) => {
    const current = structuredClone(form);
    const items = current.items || [{ name: '', price: '', quantity: 1 }];
    items.push({ name: '', price: '', quantity: 1 });
    setForm({ ...current, items });
  };

  const updateBillItem = (idx, field, value) => {
    const items = [...(form.items || [])];
    items[idx][field] = value;
    setForm({ ...form, items });
  };

  const removeBillItem = (idx) => {
    const items = (form.items || []).filter((_, i) => i !== idx);
    setForm({ ...form, items });
  };

  // Modal close helpers
  const closeModal = () => { setShowRx(false); setShowBill(false); setShowInv(false); setForm({}); };

  const loadingSpinner = (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (loading) return loadingSpinner;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Records Dashboard</h1>
        <p className="text-muted-foreground">
          {records?.length} prescriptions · {bills?.length} bills · {invoices?.length} invoices
        </p>
      </div>

      {/* Status Bar */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Prescriptions stats */}
        <div className="bg-card rounded-xl border border-success/20 p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
            <Pill className="w-5 h-5 text-success" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold text-foreground leading-none">{records?.length || 0}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Prescriptions</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border/60 p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5 text-success" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold text-foreground leading-none">{records?.filter(r => r.date === getISTDateString()).length || 0}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Today's Rx</p>
          </div>
        </div>

        {/* Bills stats */}
        <div className="bg-card rounded-xl border border-info/20 p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5 text-info" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold text-foreground leading-none">{bills?.length || 0}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Bills</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border/60 p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
            <CheckCircle className="w-5 h-5 text-info" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold text-foreground leading-none">₹{(bills || []).reduce((s, b) => s + (Number(b.paid) || 0), 0).toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Bills Collected</p>
          </div>
        </div>

        {/* Invoices stats */}
        <div className="bg-card rounded-xl border border-primary/20 p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Receipt className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold text-foreground leading-none">{invoices?.length || 0}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Invoices</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border/60 p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-warning" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold text-foreground leading-none">₹{((bills || []).reduce((s, b) => s + (Number(b.amount) || 0), 0) + (invoices || []).reduce((s, b) => s + (Number(b.amount) || 0), 0)).toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Total Billed</p>
          </div>
        </div>
      </div>

      {/* 3 Column Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-stretch">
        {/* LEFT: Prescriptions (patient details + PDF) */}
        <div className="min-w-0">
          <SectionCard
            title="Prescriptions"
            subtitle="Patient details & prescription PDFs"
            icon={FileText}
            accent="text-success"
            count={filteredRx.length}
            search={rxSearch}
            onSearch={setRxSearch}
            searchPlaceholder="Search prescriptions..."
            onNew={() => { setForm({ ...initialPrescription }); setShowRx(true); }}
            newLabel="Prescription"
          >
            {filteredRx.length === 0 ? (
              <EmptyState icon={Pill} title="No prescriptions found" hint="Create your first prescription" />
            ) : (
              filteredRx.map(rec => (
                <PrescriptionCard key={rec._id} rec={rec} onDownload={handleRxDownload} />
              ))
            )}
          </SectionCard>
        </div>

        {/* MIDDLE: Bills (patient details + bills) */}
        <div className="min-w-0">
          <SectionCard
            title="Bills"
            subtitle="Patient details & bills"
            icon={CreditCard}
            accent="text-info"
            count={filteredBills.length}
            search={billSearch}
            onSearch={setBillSearch}
            searchPlaceholder="Search bills..."
            onNew={() => { setForm({ ...initialBill }); setShowBill(true); }}
            newLabel="Bill"
          >
            <div className="flex items-center gap-1 px-3 py-2 border-b border-border/40 bg-muted/20 flex-wrap">
              {STATUSES.map(s => (
                <button key={s} onClick={() => setBillStatus(s)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${billStatus === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
                  {s}
                </button>
              ))}
            </div>
            {filteredBills.length === 0 ? (
              <EmptyState icon={CreditCard} title="No bills found" hint="Create your first bill" />
            ) : (
              filteredBills.map(bill => (
                <BillInvoiceCard key={bill._id} bill={bill} variant="bill"
                  onDownload={handleBillDownload} onMarkPaid={handleMarkPaid} onDelete={handleDeleteBiz} />
              ))
            )}
          </SectionCard>
        </div>

        {/* RIGHT: Invoices (patient details + invoices) */}
        <div className="min-w-0">
          <SectionCard
            title="Invoices"
            subtitle="Patient details & invoices"
            icon={Receipt}
            accent="text-primary"
            count={filteredInvoices.length}
            search={invSearch}
            onSearch={setInvSearch}
            searchPlaceholder="Search invoices..."
            onNew={() => { setForm({ ...initialInvoice }); setShowInv(true); }}
            newLabel="Invoice"
          >
            <div className="flex items-center gap-1 px-3 py-2 border-b border-border/40 bg-muted/20 flex-wrap">
              {STATUSES.map(s => (
                <button key={s} onClick={() => setInvStatus(s)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${invStatus === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
                  {s}
                </button>
              ))}
            </div>
            {filteredInvoices.length === 0 ? (
              <EmptyState icon={Receipt} title="No invoices found" hint="Create your first invoice" />
            ) : (
              filteredInvoices.map(bill => (
                <BillInvoiceCard key={bill._id} bill={bill} variant="invoice"
                  onDownload={handleInvDownload} onMarkPaid={handleMarkPaid} onDelete={handleDeleteBiz} />
              ))
            )}
          </SectionCard>
        </div>
      </div>

      {/* ─────────── MODALS ─────────── */}

      {/* New Prescription Modal */}
      {showRx && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={closeModal}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-xl font-bold text-foreground mb-4">Create Prescription</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Patient Name *</label>
                  <Input value={form.patientName || ''} onChange={e => setForm({ ...form, patientName: e.target.value })} placeholder="Full name" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Age</label>
                    <Input type="number" value={form.age || ''} onChange={e => setForm({ ...form, age: e.target.value })} placeholder="Age" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Gender</label>
                    <select value={form.gender || ''} onChange={e => setForm({ ...form, gender: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm">
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Phone</label>
                  <Input value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Phone number" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
                  <Input type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Email" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Address</label>
                <Input value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Patient address" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Chief Complaints</label>
                <Input value={form.chiefComplaints || ''} onChange={e => setForm({ ...form, chiefComplaints: e.target.value })} placeholder="Enter chief complaints" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Diagnosis *</label>
                <Input value={form.diagnosis || ''} onChange={e => setForm({ ...form, diagnosis: e.target.value })} placeholder="Enter diagnosis" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground">Medications</label>
                  <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => setForm({ ...form, medications: [...(form.medications || []), { name: '', dosage: '', frequency: '', instructions: '' }] })}>
                    <Plus className="w-3 h-3" /> Add Medication
                  </Button>
                </div>
                {(form.medications || []).map((med, idx) => (
                  <div key={idx} className="flex gap-2 mb-2 items-start">
                    <Input value={med.name} onChange={e => { const meds = [...(form.medications || [])]; meds[idx] = { ...meds[idx], name: e.target.value }; setForm({ ...form, medications: meds }); }} placeholder="Medicine name" className="flex-[2]" />
                    <Input value={med.dosage} onChange={e => { const meds = [...(form.medications || [])]; meds[idx] = { ...meds[idx], dosage: e.target.value }; setForm({ ...form, medications: meds }); }} placeholder="Dosage" className="w-20" />
                    <Input value={med.frequency} onChange={e => { const meds = [...(form.medications || [])]; meds[idx] = { ...meds[idx], frequency: e.target.value }; setForm({ ...form, medications: meds }); }} placeholder="Frequency" className="w-24" />
                    <Input value={med.instructions} onChange={e => { const meds = [...(form.medications || [])]; meds[idx] = { ...meds[idx], instructions: e.target.value }; setForm({ ...form, medications: meds }); }} placeholder="Instructions" className="flex-1" />
                    <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => setForm({ ...form, medications: (form.medications || []).filter((_, i) => i !== idx) })}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Advice</label>
                  <textarea value={form.advice || ''} onChange={e => setForm({ ...form, advice: e.target.value })}
                    placeholder="Diet, rest, precautions..."
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm resize-none h-20" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Follow-up</label>
                  <Input value={form.followUp || ''} onChange={e => setForm({ ...form, followUp: e.target.value })} placeholder="e.g., After 7 days" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={closeModal}>Cancel</Button>
              <Button className="flex-1 gap-2" onClick={handleCreateRx} disabled={!form.patientName || !form.diagnosis || saving}>
                <Send className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Prescription'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* New Bill / Invoice Modal (shared) */}
      {(showBill || showInv) && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={closeModal}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-xl font-bold text-foreground mb-4">{showInv ? 'Create Invoice' : 'Create Bill'}</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Patient Name *</label>
                  <Input value={form.patient || ''} onChange={e => setForm({ ...form, patient: e.target.value })} placeholder="Patient name" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Doctor</label>
                  <Input value={form.doctor || ''} onChange={e => setForm({ ...form, doctor: e.target.value })} placeholder={user?.name || 'Dr. Name'} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Service</label>
                <Input value={form.service || ''} onChange={e => setForm({ ...form, service: e.target.value })} placeholder="e.g. Consultation" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Amount (₹) *</label>
                  <Input type="number" value={form.amount || ''} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="500" min={0} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Amount Paid (₹)</label>
                  <Input type="number" value={form.paid || ''} onChange={e => setForm({ ...form, paid: e.target.value })} placeholder="0" min={0} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Date</label>
                  <Input type="date" value={form.date || ''} onChange={e => setForm({ ...form, date: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Due Date</label>
                  <Input type="date" value={form.dueDate || ''} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Status</label>
                <select value={form.status || 'Pending'} onChange={e => setForm({ ...form, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm">
                  {STATUSES.filter(s => s !== 'All').map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground">Line Items</label>
                  <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => addBillItem(showInv)}>
                    <Plus className="w-3 h-3" /> Add Item
                  </Button>
                </div>
                {(form.items || []).map((it, idx) => (
                  <div key={idx} className="flex gap-2 mb-2 items-start">
                    <Input value={it.name} onChange={e => updateBillItem(idx, 'name', e.target.value)} placeholder="Item name" className="flex-[2]" />
                    <Input type="number" value={it.price} onChange={e => updateBillItem(idx, 'price', e.target.value)} placeholder="Price" className="w-24" />
                    <Input type="number" value={it.quantity} onChange={e => updateBillItem(idx, 'quantity', e.target.value)} placeholder="Qty" className="w-16" />
                    <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => removeBillItem(idx)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              {form.amount && form.paid && Number(form.paid) > 0 && Number(form.paid) < Number(form.amount) && (
                <div className="text-xs text-info font-medium text-center bg-info/10 rounded-xl py-1.5">
                  Balance due: ₹{Number(form.amount) - Number(form.paid)}
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={closeModal}>Cancel</Button>
              <Button className="flex-1 gap-2" onClick={() => handleCreateBiz(showInv)} disabled={!form.patient || !form.amount || saving}>
                <Send className="w-4 h-4" /> {saving ? 'Saving...' : showInv ? 'Create Invoice' : 'Create Bill'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}