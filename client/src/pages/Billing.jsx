import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, IndianRupee, AlertCircle, CheckCircle, X, Trash2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, downloadInvoicePdf } from '@/lib/api';

const statusCls = {
  Paid:    'bg-success/10 text-success',
  Pending: 'bg-warning/10 text-warning',
  Overdue: 'bg-destructive/10 text-destructive',
  Partial: 'bg-info/10 text-info',
};
const STATUSES = ['All','Paid','Pending','Overdue','Partial'];
const empty = { patient:'', doctor:'', service:'', amount:'', paid:'0', status:'Pending', date:'', dueDate:'' };

export default function Billing() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);

  const { data = { bills:[], summary:{total:0,paid:0} }, isLoading } = useQuery({
    queryKey: ['billing', search, statusFilter],
    queryFn: () => api.getBilling({ ...(search && { search }), ...(statusFilter !== 'All' && { status: statusFilter }) }),
  });
  const { bills, summary } = data;

  const createMut = useMutation({ mutationFn: api.createBill, onSuccess: () => { qc.invalidateQueries(['billing']); setModal(false); setForm(empty); } });
  const deleteMut = useMutation({ mutationFn: api.deleteBill, onSuccess: () => qc.invalidateQueries(['billing']) });
  const markPaidMut = useMutation({ mutationFn: ({ id, amount }) => api.updateBill(id, { status:'Paid', paid: amount }), onSuccess: () => qc.invalidateQueries(['billing']) });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const submit = (e) => { e.preventDefault(); createMut.mutate({ ...form, amount: Number(form.amount), paid: Number(form.paid) }); };
  const downloadInvoice = async (bill) => {
    try {
      await downloadInvoicePdf(bill._id, `${bill.invoiceId || 'invoice'}.pdf`);
    } catch (error) {
      alert(error.message || 'Unable to download invoice');
    }
  };

  const outstanding = (summary.total ?? 0) - (summary.paid ?? 0);

  return (
    <div>
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">Billing</h1>
          <p className="page-subtitle">Invoice management & revenue tracking</p>
        </div>
        <Button className="gap-2" onClick={() => setModal(true)}><Plus className="w-4 h-4" /> New Invoice</Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <div className="bg-card rounded-xl border p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <IndianRupee className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total Invoiced</p>
            <p className="text-2xl font-bold font-heading text-card-foreground">Rs {(summary.total ?? 0).toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-6 h-6 text-success" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Collected</p>
            <p className="text-2xl font-bold font-heading text-success">Rs {(summary.paid ?? 0).toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-6 h-6 text-warning" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Outstanding</p>
            <p className="text-2xl font-bold font-heading text-warning">Rs {outstanding.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search invoices…" className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUSES.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${statusFilter === s ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {['Invoice','Patient','Doctor','Service','Amount','Paid','Status','Due Date',''].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                [...Array(5)].map((_,i) => <tr key={i}><td colSpan={9} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td></tr>)
              ) : bills.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-16 text-muted-foreground">No invoices found</td></tr>
              ) : bills.map(b => (
                <tr key={b._id} className="hover:bg-muted/30 transition-colors group">
                  <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{b.invoiceId}</td>
                  <td className="px-4 py-3 text-sm font-medium text-card-foreground">{b.patient}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{b.doctor}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground max-w-[180px] truncate">{b.service}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-card-foreground">Rs {b.amount?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-success font-medium">Rs {b.paid?.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusCls[b.status] ?? 'bg-muted text-muted-foreground'}`}>{b.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{b.dueDate}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => downloadInvoice(b)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Download Invoice">
                        <Download className="w-4 h-4" />
                      </button>
                      {b.status !== 'Paid' && (
                        <button onClick={() => markPaidMut.mutate({ id: b._id, amount: b.amount })}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-success hover:bg-success/10 transition-colors" title="Mark Paid">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => { if (confirm('Delete invoice?')) deleteMut.mutate(b._id); }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Invoice Modal */}
      {modal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading text-xl font-bold">New Invoice</h2>
              <button onClick={() => setModal(false)} className="p-1 rounded-lg hover:bg-muted"><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium mb-1.5 block">Patient</label><Input value={form.patient} onChange={e=>set('patient',e.target.value)} placeholder="Patient name" required /></div>
                <div><label className="text-sm font-medium mb-1.5 block">Doctor</label><Input value={form.doctor} onChange={e=>set('doctor',e.target.value)} placeholder="Dr. Name" required /></div>
                <div className="col-span-2"><label className="text-sm font-medium mb-1.5 block">Service</label><Input value={form.service} onChange={e=>set('service',e.target.value)} placeholder="e.g. Cardiology Consultation" required /></div>
                <div><label className="text-sm font-medium mb-1.5 block">Amount (Rs)</label><Input type="number" value={form.amount} onChange={e=>set('amount',e.target.value)} placeholder="500" required /></div>
                <div><label className="text-sm font-medium mb-1.5 block">Amount Paid (Rs)</label><Input type="number" value={form.paid} onChange={e=>set('paid',e.target.value)} placeholder="0" /></div>
                <div><label className="text-sm font-medium mb-1.5 block">Invoice Date</label><Input type="date" value={form.date} onChange={e=>set('date',e.target.value)} required /></div>
                <div><label className="text-sm font-medium mb-1.5 block">Due Date</label><Input type="date" value={form.dueDate} onChange={e=>set('dueDate',e.target.value)} /></div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Status</label>
                  <select value={form.status} onChange={e=>set('status',e.target.value)} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    {['Pending','Paid','Partial','Overdue'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              {createMut.error && <p className="text-sm text-destructive">{createMut.error.message}</p>}
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setModal(false)}>Cancel</Button>
                <Button type="submit" className="flex-1" disabled={createMut.isPending}>{createMut.isPending ? 'Creating…' : 'Create Invoice'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
