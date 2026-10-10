import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, IndianRupee, AlertCircle, CheckCircle, X, Trash2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataGrid } from '@/components/ui/System';
import { api, downloadInvoicePdf } from '@/lib/api';
import { toast } from 'sonner';
import PatientBanner from '@/components/clinical/PatientBanner';

const statusCls = {
  Paid:    'bg-success/10 text-success',
  Pending: 'bg-warning/10 text-warning',
  Overdue: 'bg-destructive/10 text-destructive',
  Partial: 'bg-info/10 text-info',
};
const STATUSES = ['All','Paid','Pending','Overdue','Partial'];
const empty = { patient:'', doctor:'', service:'', amount:'', discount:'', paid:'0', status:'Pending', date:'', dueDate:'' };

export default function Billing() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  // File 22 P0-1: over-policy discount approval — server returns 409 with the
  // request id; the biller retries the same invoice once it is approved.
  const [approval, setApproval] = useState<{ id: string; roles: string[] } | null>(null);
  const [selectedBill, setSelectedBill] = useState<any | null>(null);
  // File 22 P1-14: split collection legs.
  const [legs, setLegs] = useState([{ mode: 'Cash', amount: '', txnRef: '' }]);

  const { data, isLoading } = useQuery({
    queryKey: ['billing', search, statusFilter],
    queryFn: () => api.getBilling({ ...(search && { search }), ...(statusFilter !== 'All' && { status: statusFilter }) }),
    select: (res) => ({ bills: res?.data || [], summary: res?.summary || { total: 0, paid: 0 } }),
  });
  const { bills, summary } = data || { bills:[], summary:{total:0,paid:0} };

  const createMut = useMutation({
    mutationFn: api.createBill,
    onSuccess: () => { qc.invalidateQueries(['billing']); setModal(false); setForm(empty); setApproval(null); },
    onError: (err: any) => {
      const data = err?.response?.data;
      if (data?.code === 'NEEDS_APPROVAL' && data?.approvalId) {
        setApproval({ id: data.approvalId, roles: data.approverRoles || [] });
        toast.warning(`Discount needs approval (${(data.approverRoles || []).join('/')}). Request ${data.approvalId} raised — submit again once approved.`);
      } else {
        toast.error(data?.message || err?.message || 'Could not create invoice');
      }
    },
  });
  const deleteMut = useMutation({ mutationFn: api.deleteBill, onSuccess: () => qc.invalidateQueries(['billing']) });
  const markPaidMut = useMutation({ mutationFn: ({ id, amount }) => api.updateBill(id, { status:'Paid', paid: amount }), onSuccess: () => qc.invalidateQueries(['billing']) });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const submit = (e) => {
    e.preventDefault();
    createMut.mutate({
      ...form, amount: Number(form.amount), discount: Number(form.discount) || 0, paid: Number(form.paid),
      ...(approval ? { approvalId: approval.id } : {}),
    });
  };
  const downloadInvoice = async (bill) => {
    try {
      await downloadInvoicePdf(bill._id, `${bill.invoiceId || 'invoice'}.pdf`);
    } catch (error) {
      toast.error(error.message || 'Unable to download invoice');
    }
  };

  const outstanding = (summary.total ?? 0) - (summary.paid ?? 0);

  return (
    <div>
      <div className="page-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Billing</h1>
          <p className="page-subtitle">Invoice management & revenue tracking</p>
        </div>
        <Button className="gap-2 w-full sm:w-auto" onClick={() => setModal(true)}><Plus className="w-4 h-4" /> New Invoice</Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <div className="bg-card rounded-xl border p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <IndianRupee className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total Invoiced</p>
            <p className="text-2xl font-bold font-heading text-card-foreground">₹{(summary.total ?? 0).toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-6 h-6 text-success" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Collected</p>
            <p className="text-2xl font-bold font-heading text-success">₹{(summary.paid ?? 0).toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-6 h-6 text-warning" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Outstanding</p>
            <p className="text-2xl font-bold font-heading text-warning">₹{outstanding.toLocaleString()}</p>
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
      {/* File 22 P0-2: flag chips for the selected bill's patient */}
      {selectedBill && <PatientBanner patientId={selectedBill.patientId || ''} />}
      {/* File 22 P1-14: split collection for the selected bill */}
      {selectedBill && selectedBill.status !== 'Paid' && selectedBill.status !== 'Cancelled' ? (
        <div className="rounded-xl border p-3 space-y-2">
          <p className="text-sm font-semibold">Collect — {selectedBill.invoiceId} (balance ₹{Number(selectedBill.balance ?? selectedBill.amount ?? 0).toLocaleString('en-IN')})</p>
          {legs.map((l, i) => (
            <div key={i} className="flex gap-2">
              <select className="h-9 rounded-md border px-2 text-sm" value={l.mode} onChange={(e) => setLegs(legs.map((x, j) => j === i ? { ...x, mode: e.target.value } : x))}>
                {['Cash', 'Card', 'UPI', 'Cheque', 'Insurance', 'Online', 'Other'].map((m) => <option key={m}>{m}</option>)}
              </select>
              <Input className="w-32" type="number" placeholder="Amount" value={l.amount} onChange={(e) => setLegs(legs.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))} />
              <Input className="w-40" placeholder="Txn ref (optional)" value={l.txnRef} onChange={(e) => setLegs(legs.map((x, j) => j === i ? { ...x, txnRef: e.target.value } : x))} />
              {legs.length > 1 ? <Button size="sm" variant="ghost" onClick={() => setLegs(legs.filter((_, j) => j !== i))}>×</Button> : null}
            </div>
          ))}
          <div className="flex gap-2">
            {legs.length < 6 ? <Button size="sm" variant="outline" onClick={() => setLegs([...legs, { mode: 'UPI', amount: '', txnRef: '' }])}>+ leg</Button> : null}
            <Button size="sm" onClick={async () => {
              try {
                await api.collectBill(selectedBill._id, legs.filter((l) => Number(l.amount) > 0).map((l) => ({ mode: l.mode, amount: Number(l.amount), txnRef: l.txnRef })));
                toast.success('Collection recorded');
                setLegs([{ mode: 'Cash', amount: '', txnRef: '' }]);
                setSelectedBill(null);
                qc.invalidateQueries(['billing']);
              } catch (err: any) { toast.error(err?.response?.data?.message || 'Collection failed'); }
            }}>Collect ₹{legs.reduce((s, l) => s + (Number(l.amount) || 0), 0).toLocaleString('en-IN')}</Button>
            <Button size="sm" variant="outline" onClick={async () => {
              const reason = window.prompt('Cancel reason:');
              if (!reason) return;
              try {
                await api.cancelBill(selectedBill._id, reason);
                toast.success('Bill cancelled');
                setSelectedBill(null);
                qc.invalidateQueries(['billing']);
              } catch (err: any) {
                const d = err?.response?.data;
                toast.error(d?.code === 'NEEDS_APPROVAL' ? `Paid bill — approval ${d.approvalId} raised for ${d.approverRoles?.join('/')}` : (d?.message || 'Cancel failed'));
              }
            }}>Cancel bill</Button>
            {/* File 22 P0-left: share a payment link for remote collection */}
            <Button size="sm" variant="outline" onClick={async () => {
              try {
                const r: any = await api.post('/checkout/payment-links', {
                  amount: Number(selectedBill.balance ?? selectedBill.amount ?? 0),
                  description: `Bill ${selectedBill.invoiceId}`,
                });
                if (r.url) { window.open(r.url, '_blank'); toast.success('Payment link opened'); }
                else if (r.params) { toast.info('PayU params ready — POST to gateway URL'); }
                else toast.success('Payment link created');
              } catch (err: any) { toast.error(err?.response?.data?.message || 'Payment link failed'); }
            }}>Payment link</Button>
          </div>
        </div>
      ) : null}
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-4 bg-muted rounded animate-pulse" />)}
          </div>
        ) : (
          /* Page owns search + status chips, so showSearch off; no server paging. */
          <DataGrid
            columns={[
              { key: 'invoiceId', label: 'Invoice', sortable: false, render: (v) => <span className="text-xs font-mono text-muted-foreground">{v}</span> },
              { key: 'patient', label: 'Patient', sortable: false, render: (v) => <span className="text-sm font-medium text-card-foreground">{v}</span> },
              { key: 'doctor', label: 'Doctor', sortable: false, render: (v) => <span className="text-sm text-muted-foreground">{v}</span> },
              { key: 'service', label: 'Service', sortable: false, render: (v) => <span className="text-sm text-muted-foreground max-w-[180px] truncate block">{v}</span> },
              { key: 'amount', label: 'Amount', sortable: false, render: (v) => <span className="text-sm font-semibold text-card-foreground">₹{v?.toLocaleString()}</span> },
              { key: 'paid', label: 'Paid', sortable: false, render: (v) => <span className="text-sm text-success font-medium">₹{v?.toLocaleString()}</span> },
              { key: 'status', label: 'Status', sortable: false, render: (v) => <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusCls[v] ?? 'bg-muted text-muted-foreground'}`}>{v}</span> },
              { key: 'dueDate', label: 'Due Date', sortable: false, render: (v) => <span className="text-xs text-muted-foreground">{v}</span> },
              {
                key: '_actions', label: '', sortable: false,
                render: (_v, b) => (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
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
                ),
              },
            ]}
            rows={bills}
            rowKey="_id"
            empty="No invoices found"
            showSearch={false}
            manualPagination
            onRowClick={(b) => setSelectedBill(selectedBill?._id === b._id ? null : b)}
            rowClassName={(b) => (selectedBill?._id === b._id ? 'bg-muted/40' : '')}
          />
        )}
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
                <div><label className="text-sm font-medium mb-1.5 block">Discount (Rs)</label><Input type="number" value={form.discount} onChange={e=>set('discount',e.target.value)} placeholder="0" /></div>
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
              {approval && (
                <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
                  Approval <span className="font-mono font-semibold">{approval.id}</span> pending
                  {approval.roles.length ? <> ({approval.roles.join('/')})</> : null} —{' '}
                  <a href="/hospital/approvals" className="underline">open approvals</a>, then submit again.
                  <button type="button" className="ml-2 underline" onClick={() => setApproval(null)}>clear</button>
                </div>
              )}
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
