import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { IndianRupee, Calendar, User, Search, Download, Plus, X, Send, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { api, downloadInvoicePdf } from '@/lib/api';
import { toast } from 'sonner';

const statusColors = { Paid: 'bg-success/10 text-success', Pending: 'bg-warning/10 text-warning', Overdue: 'bg-destructive/10 text-destructive' };

export default function ClinicBilling() {
  const { user } = useAuth();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [service, setService] = useState('Consultation');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const loadBills = async () => {
    setLoading(true);
    try {
      const data = await api.getBilling();
      const arr = data?.bills || data || [];
      setBills(arr.filter(b => b.doctor?.toLowerCase().includes(user?.name?.toLowerCase())));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadBills(); }, [user?.name]);

  const filtered = bills.filter(b => {
    const ms = !search || b.patient?.toLowerCase().includes(search.toLowerCase()) || b.invoiceId?.toLowerCase().includes(search.toLowerCase());
    const ms2 = statusFilter === 'All' || b.status === statusFilter;
    return ms && ms2;
  });

  const handleCreate = async () => {
    if (!patientName || !amount) return;
    setSaving(true);
    try {
      await api.createBill({
        patient: patientName, doctor: user?.name,
        service, amount: Number(amount), date: new Date().toISOString().split('T')[0], status: 'Pending',
      });
      setShowForm(false);
      setPatientName(''); setService('Consultation'); setAmount('');
      loadBills();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const totalBilled = bills.reduce((s, b) => s + (b.amount || 0), 0);
  const totalPaid = bills.reduce((s, b) => s + (b.paid || 0), 0);
  const pendingAmount = totalBilled - totalPaid;

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Billing & Payments</h1>
          <p className="text-muted-foreground">{filtered.length} invoices</p>
        </div>
        <Button className="gap-2" onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> New Invoice</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div whileHover={{ scale: 1.02 }} className="bg-gradient-to-br from-success/20 to-success/5 rounded-2xl border border-success/20 p-6">
          <p className="text-sm text-muted-foreground">Total Collected</p>
          <p className="font-heading text-3xl font-bold text-success">Rs {totalPaid.toLocaleString()}</p>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl border border-primary/20 p-6">
          <p className="text-sm text-muted-foreground">Total Billed</p>
          <p className="font-heading text-3xl font-bold text-foreground">Rs {totalBilled.toLocaleString()}</p>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="bg-gradient-to-br from-warning/20 to-warning/5 rounded-2xl border border-warning/20 p-6">
          <p className="text-sm text-muted-foreground">Pending</p>
          <p className="font-heading text-3xl font-bold text-warning">Rs {pendingAmount.toLocaleString()}</p>
        </motion.div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patient or invoice..." className="pl-10" />
        </div>
        <div className="flex gap-2">
          {['All', 'Paid', 'Pending', 'Overdue'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${statusFilter === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>{s}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-dashed">
          <CreditCard className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground text-lg">No invoices yet</p>
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
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Amount</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Paid</th>
                  <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(bill => (
                  <tr key={bill._id} className="border-b border-border/30 hover:bg-muted/30">
                    <td className="px-4 py-3 text-sm font-mono text-primary">{bill.invoiceId || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm font-medium">{bill.patient}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{bill.service}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{bill.date}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-right">Rs {bill.amount}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-success text-right">Rs {bill.paid || 0}</td>
                    <td className="px-4 py-3 text-center"><Badge className={statusColors[bill.status] || 'bg-muted'}>{bill.status}</Badge></td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="outline" onClick={async () => { try { await downloadInvoicePdf(bill._id, `invoice-${bill.invoiceId || 'download'}.pdf`); } catch (e) { toast.error(e.message || 'Unable to download invoice'); } }} className="gap-1">
                        <Download className="w-3.5 h-3.5" /> PDF
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border border-border w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-lg font-bold text-foreground mb-4">New Invoice</h3>
            <div className="space-y-4">
              <div><label className="text-sm font-medium mb-1.5 block">Patient Name *</label>
                <Input value={patientName} onChange={e => setPatientName(e.target.value)} placeholder="Patient name" /></div>
              <div><label className="text-sm font-medium mb-1.5 block">Service</label>
                <Input value={service} onChange={e => setService(e.target.value)} placeholder="e.g. Consultation" /></div>
              <div><label className="text-sm font-medium mb-1.5 block">Amount (Rs) *</label>
                <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="500" min={0} /></div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="flex-1 gap-2" onClick={handleCreate} disabled={!patientName || !amount || saving}>
                <Send className="w-4 h-4" /> Create Invoice
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
