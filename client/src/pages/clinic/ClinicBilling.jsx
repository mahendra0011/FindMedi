import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { IndianRupee, Search, Download, Plus, X, Send, CreditCard, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { api, downloadInvoicePdf } from '@/lib/api';
import { toast } from 'sonner';
import { getISTDateString } from '@/lib/dateUtils';

const statusColors = {
  Paid: 'bg-success/10 text-success',
  Pending: 'bg-warning/10 text-warning',
  Overdue: 'bg-destructive/10 text-destructive',
  Partial: 'bg-info/10 text-info',
};
const STATUSES = ['All', 'Paid', 'Pending', 'Overdue', 'Partial'];
const emptyForm = {
  patient: '', doctor: '', service: 'Consultation', amount: '', paid: '0',
  status: 'Pending', date: getISTDateString(), dueDate: '',
};

export default function ClinicBilling() {
  const { user } = useAuth();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadBills = async () => {
    setLoading(true);
    try {
      const data = await api.getBilling();
      const arr = data?.data || data?.bills || data || [];
      setBills(arr.filter(b => b.doctor?.toLowerCase().includes(user?.name?.toLowerCase())));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadBills(); }, [user?.name]);

  const filtered = bills.filter(b => {
    const ms = !search || b.patient?.toLowerCase().includes(search.toLowerCase()) || b.invoiceId?.toLowerCase().includes(search.toLowerCase());
    const ms2 = statusFilter === 'All' || b.status === statusFilter;
    return ms && ms2;
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleCreate = async () => {
    if (!form.patient || !form.amount) return;
    setSaving(true);
    try {
      await api.createBill({
        patient: form.patient,
        doctor: form.doctor || user?.name,
        service: form.service,
        amount: Number(form.amount),
        paid: Number(form.paid) || 0,
        status: form.status,
        date: form.date || getISTDateString(),
        dueDate: form.dueDate,
      });
      setShowForm(false);
      setForm(emptyForm);
      toast.success('Invoice created');
      loadBills();
    } catch (e) { toast.error(e.message || 'Failed to create invoice'); }
    setSaving(false);
  };

  const handleMarkPaid = async (bill) => {
    try {
      await api.updateBill(bill._id, { status: 'Paid', paid: bill.amount });
      toast.success('Invoice marked as paid');
      loadBills();
    } catch (e) { toast.error(e.message || 'Failed to update invoice'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this invoice?')) return;
    try {
      await api.deleteBill(id);
      toast.success('Invoice deleted');
      loadBills();
    } catch (e) { toast.error(e.message || 'Failed to delete invoice'); }
  };

  const handleDownload = async (bill) => {
    try {
      await downloadInvoicePdf(bill._id, `invoice-${bill.invoiceId || 'download'}.pdf`);
    } catch (e) { toast.error(e.message || 'Unable to download invoice'); }
  };

  const totalBilled = bills.reduce((s, b) => s + (b.amount || 0), 0);
  const totalPaid = bills.reduce((s, b) => s + (b.paid || 0), 0);
  const pendingAmount = totalBilled - totalPaid;
  const totalInvoices = bills.length;
  const paidCount = bills.filter(b => b.status === 'Paid').length;
  const pendingCount = bills.filter(b => b.status === 'Pending' || b.status === 'Overdue' || b.status === 'Partial').length;

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Billing & Payments</h1>
          <p className="text-muted-foreground">{filtered.length} invoices</p>
        </div>
        <Button className="gap-2" onClick={() => { setForm(emptyForm); setShowForm(true); }}><Plus className="w-4 h-4" /> New Invoice</Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div whileHover={{ scale: 1.02 }} className="bg-gradient-to-br from-success/20 to-success/5 rounded-2xl border border-success/20 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
              <CheckCircle className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Collected</p>
              <p className="font-heading text-2xl font-bold text-success">₹{totalPaid.toLocaleString()}</p>
            </div>
          </div>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl border border-primary/20 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <IndianRupee className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Billed</p>
              <p className="font-heading text-2xl font-bold text-foreground">₹{totalBilled.toLocaleString()}</p>
            </div>
          </div>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="bg-gradient-to-br from-warning/20 to-warning/5 rounded-2xl border border-warning/20 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="font-heading text-2xl font-bold text-warning">₹{pendingAmount.toLocaleString()}</p>
            </div>
          </div>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="bg-gradient-to-br from-info/20 to-info/5 rounded-2xl border border-info/20 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5 text-info" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Invoices</p>
              <p className="font-heading text-2xl font-bold text-foreground">{totalInvoices}</p>
              <p className="text-[10px] text-muted-foreground">{paidCount} paid · {pendingCount} pending</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patient or invoice..." className="pl-10" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUSES.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${statusFilter === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>{s}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-dashed">
          <CreditCard className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground text-lg">No invoices yet</p>
          <p className="text-sm text-muted-foreground/70">Create your first invoice to get started</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Invoice</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Patient</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Service</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Date</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Due Date</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Amount</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Paid</th>
                  <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(bill => (
                  <tr key={bill._id} className="border-b border-border/30 hover:bg-muted/30 group">
                    <td className="px-4 py-3 text-sm font-mono text-primary">{bill.invoiceId || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm font-medium">{bill.patient}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground max-w-[180px] truncate">{bill.service}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{bill.date}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{bill.dueDate || '—'}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-right">₹{bill.amount?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-success text-right">₹{bill.paid?.toLocaleString() || 0}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={statusColors[bill.status] || 'bg-muted'}>{bill.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Download PDF" onClick={() => handleDownload(bill)}>
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                        {bill.status !== 'Paid' && (
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-success hover:text-success" title="Mark Paid" onClick={() => handleMarkPaid(bill)}>
                            <CheckCircle className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive" title="Delete" onClick={() => handleDelete(bill._id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Invoice Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto" onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border border-border w-full max-w-lg p-6 my-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading text-lg font-bold text-foreground">New Invoice</h3>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Patient Name *</label>
                  <Input value={form.patient} onChange={e => set('patient', e.target.value)} placeholder="Patient name" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Doctor</label>
                  <Input value={form.doctor} onChange={e => set('doctor', e.target.value)} placeholder={user?.name || 'Dr. Name'} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Service</label>
                <Input value={form.service} onChange={e => set('service', e.target.value)} placeholder="e.g. Consultation" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Amount (Rs) *</label>
                  <Input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="500" min={0} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Amount Paid (Rs)</label>
                  <Input type="number" value={form.paid} onChange={e => set('paid', e.target.value)} placeholder="0" min={0} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Invoice Date</label>
                  <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Due Date</label>
                  <Input type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Status</label>
                <select value={form.status} onChange={e => set('status', e.target.value)} className="w-full bg-card border border-border/60 rounded-xl px-3 py-2 text-sm">
                  {['Pending', 'Paid', 'Partial', 'Overdue'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {form.amount && form.paid && Number(form.paid) > 0 && Number(form.paid) < Number(form.amount) && (
                <div className="text-xs text-info font-medium text-center bg-info/10 rounded-xl py-1.5">
                  Balance due: ₹{Number(form.amount) - Number(form.paid)}
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="flex-1 gap-2" onClick={handleCreate} disabled={!form.patient || !form.amount || saving}>
                <Send className="w-4 h-4" /> {saving ? 'Creating...' : 'Create Invoice'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}