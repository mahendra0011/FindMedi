import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { FileText, Upload, CheckCircle, Send, Search, Download, Calendar, User, AlertCircle, History, RotateCcw, Loader2, GitBranch, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { api, getApiBaseUrl } from '@/lib/api';
import type { ApiRow, Unmodelled } from '@/lib/apiTypes';

const statusColors: Unmodelled = {
  'Pending Upload': 'bg-warning/10 text-warning',
  'Uploaded': 'bg-info/10 text-info',
  'Delivered': 'bg-success/10 text-success',
};

const modalClass = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4';

function CorrectionsTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<any>(null);
  const [dlg, setDlg] = useState<any>(null);
  const [form, setForm] = useState<any>({ reason: '', testIndex: '', resultValue: '', notes: '' });

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['lab-orders'],
    queryFn: () => api.getLabOrders({}),
  });
  const orders: any[] = ordersData?.orders || [];

  const { data: versionsData, isLoading: versionsLoading } = useQuery({
    queryKey: ['lab-versions', selectedId],
    queryFn: () => api.getReportVersions(selectedId),
    enabled: Boolean(selectedId),
  });

  const correctMut = useMutation({
    mutationFn: ({ id, body }: any) => api.correctLabReport(id, body),
    onSuccess: (_d, vars: any) => {
      toast.success(`Report corrected · now version ${(versionsData?.reportVersion || 1) + 1}`);
      qc.invalidateQueries({ queryKey: ['lab-versions'] });
      qc.invalidateQueries({ queryKey: ['lab-orders'] });
      setDlg(null);
      setForm({ reason: '', testIndex: '', resultValue: '', notes: '' });
      setSelectedId(vars.id);
    },
    onError: (e: any) => toast.error(e?.message || 'Correction failed'),
  });

  const q = search.trim().toLowerCase();
  const filtered = orders.filter((o: any) =>
    !q || `${o.orderId} ${o.patientName} ${(o.tests || []).map((t: any) => t.testName).join(' ')}`.toLowerCase().includes(q));
  const selected: any = orders.find((o: any) => o._id === selectedId) || null;
  const versions: any[] = versionsData?.versions || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search order / patient / test..." className="pl-10" />
        </div>
        <p className="text-xs text-muted-foreground sm:ml-auto">
          {orders.filter((o: any) => Number(o.reportVersion || 1) > 1).length} corrected report(s) · {orders.length} order(s)
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="bg-card rounded-2xl border border-border/60 overflow-hidden lg:col-span-2">
          <div className="px-5 py-4 border-b border-border/60 flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Orders</p>
          </div>
          <div className="max-h-[520px] overflow-y-auto divide-y divide-border/50">
            {isLoading && (
              <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
            )}
            {filtered.map((o: any) => {
              const corrected = Number(o.reportVersion || 1) > 1;
              return (
                <button key={o._id} onClick={() => setSelectedId(o._id)}
                  className={`w-full text-left px-5 py-3 hover:bg-muted/40 transition-colors ${selectedId === o._id ? 'bg-primary/5 border-l-2 border-primary' : 'border-l-2 border-transparent'}`}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-foreground">{o.orderId}</span>
                    {corrected && <Badge className="bg-warning/10 text-warning border-0 text-[10px]">v{o.reportVersion}</Badge>}
                    <span className="ml-auto text-[11px] text-muted-foreground">{new Date(o.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-foreground">{o.patientName}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{(o.tests || []).map((t: any) => t.testName).join(', ')}</p>
                </button>
              );
            })}
            {!isLoading && filtered.length === 0 && (
              <p className="px-5 py-10 text-center text-muted-foreground text-sm">No orders found</p>
            )}
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border/60 p-6 lg:col-span-3">
          {!selected ? (
            <div className="py-16 text-center text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
              Pick an order to view its report versions
            </div>
          ) : (
            <>
              <div className="flex items-start gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <History className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{selected.orderId} · {selected.patientName}</h3>
                  <p className="text-xs text-muted-foreground">
                    Current version v{versionsData?.reportVersion ?? selected.reportVersion ?? 1} · {selected.status}
                  </p>
                </div>
                <Button size="sm" className="gap-1.5" onClick={() => { setForm({ reason: '', testIndex: '', resultValue: '', notes: '' }); setDlg(selected); }}>
                  <RotateCcw className="w-4 h-4" /> Correct report
                </Button>
              </div>

              {versionsLoading ? (
                <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
              ) : versions.length === 0 ? (
                <div className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
                  No corrections yet — this report is still at its original version
                </div>
              ) : (
                <div className="space-y-3">
                  {versions.map((v: any, i: number) => (
                    <div key={i} className="rounded-xl border border-border/60 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-muted text-muted-foreground border-0 text-[10px]">v{v.version}</Badge>
                        <Badge className="bg-info/10 text-info border-0 text-[10px]">{v.status}</Badge>
                        <span className="text-[11px] text-muted-foreground ml-auto">
                          {v.createdAt ? new Date(v.createdAt).toLocaleString() : ''}
                        </span>
                      </div>
                      <p className="text-sm text-foreground mt-2">{v.reason}</p>
                      {v.content && (
                        <pre className="mt-2 max-h-40 overflow-y-auto rounded-lg bg-muted/40 p-3 text-[11px] text-muted-foreground whitespace-pre-wrap">
                          {typeof v.content === 'string' ? v.content : JSON.stringify(v.content, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {dlg && (
        <div className={modalClass} onClick={() => setDlg(null)}>
          <div className="bg-card rounded-2xl border p-6 max-w-lg w-full shadow-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center"><RotateCcw className="w-5 h-5 text-warning" /></div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Correct released report</h3>
                <p className="text-xs text-muted-foreground">{dlg.orderId} · {dlg.patientName}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setDlg(null)}><X className="w-4 h-4" /></Button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Correction reason *</label>
                <textarea rows={2} value={form.reason} onChange={e => setForm((f: any) => ({ ...f, reason: e.target.value }))}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="Why is this report being amended?" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Test line to correct</label>
                <select value={form.testIndex} onChange={e => setForm((f: any) => ({ ...f, testIndex: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                  <option value="">Whole report (no line change)</option>
                  {(dlg.tests || []).map((t: any, idx: number) => (
                    <option key={idx} value={idx}>#{idx + 1} {t.testName} — {t.resultValue || 'no value'}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">New result value</label>
                <textarea rows={2} value={form.resultValue} onChange={e => setForm((f: any) => ({ ...f, resultValue: e.target.value }))}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="Corrected value (leave blank to keep)" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Notes</label>
                <Input value={form.notes} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} placeholder="Optional audit note" />
              </div>
              <p className="text-[11px] text-muted-foreground">
                A version snapshot is archived, reportVersion increments, and a corrected line returns to Result Pending for re-verification.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setDlg(null)}>Cancel</Button>
                <Button className="flex-1" disabled={correctMut.isPending || form.reason.trim().length < 3}
                  onClick={() => {
                    const body: any = { reason: form.reason.trim() };
                    if (form.notes) body.notes = form.notes;
                    if (form.testIndex !== '') {
                      body.testIndex = Number(form.testIndex);
                      if (form.resultValue) body.resultValue = form.resultValue;
                    }
                    correctMut.mutate({ id: dlg._id, body });
                  }}>
                  {correctMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit correction'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LabReports() {
  const [reports, setReports] = useState<ApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [tab, setTab] = useState('deliveries');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const data = await api.getLabBookings();
      const list = Array.isArray(data) ? data : (data?.bookings || data?.data || []);
      setReports(list || []);
    } catch (e: any) {
      console.error(e);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (id: Unmodelled) => {
    try {
      await api.updateLabBooking(id, { reportStatus: 'Uploaded', notes: 'Report uploaded', notified: false });
      setReports(prev => prev.map(r => r._id === id ? { ...r, reportStatus: 'Uploaded', notes: 'Report uploaded', notified: false } : r));
    } catch (e: any) { console.error(e); }
  };

  const handleDownload = async (id: Unmodelled) => {
    try {
      await api.updateLabBooking(id, { notified: true });
      window.open(getApiBaseUrl() + '/lab/bookings/' + id + '/report', '_blank');
    } catch (e: any) { console.error(e); }
  };

  const handleNotify = async (id: Unmodelled) => {
    try {
      await api.updateLabBooking(id, { reportStatus: 'Delivered', notified: true });
      setReports(prev => prev.map(r => r._id === id ? { ...r, reportStatus: 'Delivered', notified: true } : r));
      await api.createNotification({ title: 'Report Ready', message: 'Your lab report is ready for download', type: 'records' });
    } catch (e: any) { console.error(e); }
  };

  const dispatch = async (id: Unmodelled) => {
    const fee = prompt('Delivery fee for this report (₹)', '40');
    const res = await api.dispatchLabReport(id, { deliveryFee: Number(fee) || 0 }).catch(() => null);
    if (!res?.task) return;
    setReports(prev => prev.map(r => r._id === id ? { ...r, reportStatus: 'Uploaded', reportDeliveryMode: 'Courier', reportDeliveryTaskId: res.task._id, courierStatus: res.task.status } : r));
  };

  const courierChip = (r: Unmodelled) => {
    const s = r.courierStatus || (r.reportDeliveryTaskId ? 'Assigned' : null);
    if (!s) return null;
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600">{s}</span>;
  };

  const filtered = reports.filter(r => {
    const ms = !search || (r.patient || '').toLowerCase().includes(search.toLowerCase());
    const mf = filter === 'All' || r.status === filter;
    return ms && mf;
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Report Upload & Management</h1>
        <p className="text-muted-foreground">{reports.filter(r => r.status === 'Pending Upload').length} pending uploads</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[['deliveries', 'Delivery & Notifications', Upload], ['corrections', 'Corrections & Versions', History]].map(([key, label, Icon]: any) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${tab === key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {tab === 'corrections' ? <CorrectionsTab /> : (
      <div className="space-y-6">
      <div className="flex gap-2 flex-wrap">
        {['All', 'Pending Upload', 'Uploaded', 'Delivered'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
            {f} ({f === 'All' ? reports.length : reports.filter(r => r.status === f).length})
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patient..." className="pl-10" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-dashed">
          <FileText className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground text-lg">No reports found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((r, i) => (
            <motion.div key={r._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="bg-card rounded-2xl border border-border/60 p-5 hover:shadow-lg transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl ${statusColors[r.status] || 'bg-muted'} flex items-center justify-center`}>
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-foreground">{r.patient}</h3>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {r.tests?.map((t: Unmodelled, j: Unmodelled) => <Badge key={j} variant="secondary" className="text-[10px]">{t}</Badge>)}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" /> {r.date}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge className={statusColors[r.status] || 'bg-muted'}>{r.status}</Badge>
                  {courierChip(r)}
                  {r.status === 'Uploaded' && !r.notified && (
                    <span className="flex items-center gap-1 text-xs text-warning"><AlertCircle className="w-3 h-3" /> Not notified</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-4 pt-3 border-t border-border/40">
                {(r.reportStatus || r.status) === 'Pending Upload' && (
                  <Button size="sm" className="flex-1 gap-1" onClick={() => handleUpload(r._id)}>
                    <Upload className="w-4 h-4" /> Upload Report
                  </Button>
                )}
                {(r.reportStatus || r.status) === 'Uploaded' && !r.notified && (
                  <Button size="sm" className="flex-1 gap-1 bg-success hover:bg-success/90" onClick={() => handleNotify(r._id)}>
                    <Send className="w-4 h-4" /> Notify Patient
                  </Button>
                )}
                {(r.reportStatus || r.status) === 'Uploaded' && r.notified && (
                  <Button size="sm" variant="outline" className="flex-1 gap-1" disabled>
                    <CheckCircle className="w-4 h-4" /> Notified
                  </Button>
                )}
                {(r.reportStatus || r.status) === 'Uploaded' && (
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => dispatch(r._id)}>
                    Send by Delivery Boy
                  </Button>
                )}
                {((r.reportStatus || r.status) === 'Uploaded' || (r.reportStatus || r.status) === 'Delivered') && (
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => handleDownload(r._id)}>
                    <Download className="w-4 h-4" /> Download
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
      </div>
      )}
    </div>
  );
}
