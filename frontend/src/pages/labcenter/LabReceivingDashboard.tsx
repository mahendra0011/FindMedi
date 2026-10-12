import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Inbox, ScanLine, CheckCircle2, XCircle, RotateCcw, AlertTriangle, Search, Loader2, PackageCheck, FlaskConical, Link2Off } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const REJECTION_REASONS = [
  'Hemolyzed', 'Insufficient Quantity', 'Wrong Container', 'Wrong Sample',
  'Clotted Sample', 'Leaking Container', 'Label Mismatch', 'Contamination',
  'Improper Transport', 'Incorrect Storage', 'Other',
];

const CONDITIONS = ['Good', 'Slightly Hemolyzed', 'Hemolyzed', 'Clotted', 'Lipemic', 'Icteric', 'Leaking', 'Insufficient Quantity', 'Label Mismatch'];

const PRIORITY_COLORS: any = {
  Routine: 'bg-muted text-muted-foreground',
  Urgent: 'bg-warning/10 text-warning',
  STAT: 'bg-destructive/10 text-destructive',
};

const modalClass = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4';

export default function LabReceivingDashboard() {
  const qc = useQueryClient();
  const [scan, setScan] = useState('');
  const [dialog, setDialog] = useState<any | null>(null);
  const [form, setForm] = useState<any>({ sampleNo: '', condition: 'Good', notes: '', section: '', reason: '', detail: '', testIndex: '' });
  const [busy, setBusy] = useState(false);

  const { data: receivingData, isLoading } = useQuery({
    queryKey: ['lab-receiving'],
    queryFn: () => api.getLabReceiving({}),
  });
  const { data: ordersData } = useQuery({ queryKey: ['lab-orders'], queryFn: () => api.getLabOrders({}) });
  const { data: sectionsData } = useQuery({ queryKey: ['lab-sections'], queryFn: () => api.getLabSections() });

  const incoming: any[] = receivingData?.orders || [];
  const allOrders: any[] = ordersData?.orders || [];
  const sections: any[] = sectionsData?.sections || [];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['lab-receiving'] });
    qc.invalidateQueries({ queryKey: ['lab-orders'] });
    qc.invalidateQueries({ queryKey: ['lab-stats'] });
  };

  const receiveMut = useMutation({
    mutationFn: ({ id, body }: any) => api.receiveLabOrder(id, body),
    onSuccess: () => { toast.success('Sample received at intake'); invalidate(); setDialog(null); },
    onError: (e: any) => toast.error(e?.message || 'Receive failed'),
  });
  const acceptMut = useMutation({
    mutationFn: ({ id, idx, body }: any) => api.acceptLabSample(id, idx, body),
    onSuccess: () => { invalidate(); },
    onError: (e: any) => toast.error(e?.message || 'Accept failed'),
  });
  const rejectMut = useMutation({
    mutationFn: ({ id, idx, body }: any) => api.rejectLabSample(id, idx, body),
    onSuccess: () => { toast.success('Sample rejected — recollection required'); invalidate(); setDialog(null); },
    onError: (e: any) => toast.error(e?.message || 'Reject failed'),
  });
  const recollectMut = useMutation({
    mutationFn: ({ id, idx }: any) => api.recollectLabSample(id, idx),
    onSuccess: () => { invalidate(); },
    onError: (e: any) => toast.error(e?.message || 'Recollection failed'),
  });

  const open = (type: string, order: any) => {
    setForm({ sampleNo: order?.sampleIds?.[0] || '', condition: 'Good', notes: '', section: sections[0]?.section || 'Biochemistry', reason: 'Hemolyzed', detail: '', testIndex: String(order?.pendingTests?.[0]?.testIndex ?? 0) });
    setDialog({ type, order });
  };

  const runAccept = async (order: any) => {
    setBusy(true);
    try {
      for (const t of order.pendingTests || []) {
        await acceptMut.mutateAsync({ id: order._id, idx: t.testIndex, body: { section: form.section } });
      }
      toast.success(`Accepted ${order.pendingTests?.length || 0} sample line(s) into ${form.section}`);
      setDialog(null);
    } catch (e: any) {
      toast.error(e?.message || 'Accept failed');
    }
    setBusy(false);
  };

  const runReject = async (order: any) => {
    setBusy(true);
    try {
      const idx = form.testIndex === '' ? (order.pendingTests || []).map((t: any) => t.testIndex) : [Number(form.testIndex)];
      for (const i of idx) {
        await rejectMut.mutateAsync({ id: order._id, idx: i, body: { reason: form.reason, detail: form.detail } });
      }
      setDialog(null);
    } catch (e: any) {
      toast.error(e?.message || 'Reject failed');
    }
    setBusy(false);
  };

  const runRecollect = async (order: any) => {
    setBusy(true);
    try {
      const rejected = (order.tests || []).map((t: any, i: number) => ({ t, i })).filter((r: any) => r.t.status === 'Rejected');
      for (const r of rejected) {
        await recollectMut.mutateAsync({ id: order._id, idx: r.i });
      }
      toast.success(`Recollection requested for ${rejected.length} line(s)`);
      invalidate();
      setDialog(null);
    } catch (e: any) {
      toast.error(e?.message || 'Recollection failed');
    }
    setBusy(false);
  };

  const q = scan.trim().toLowerCase();
  const filtered = incoming.filter((o: any) => {
    if (!q) return true;
    const hay = [
      o.orderId, o.patientName, o.accessionNo,
      ...(o.sampleIds || []),
      ...(o.pendingTests || []).map((t: any) => `${t.sampleNo || ''} ${t.sampleId || ''} ${t.testName || ''}`),
    ].join(' ').toLowerCase();
    return hay.includes(q);
  });

  const allTests = allOrders.flatMap((o: any) => o.tests || []);
  const acceptedCount = allTests.filter((t: any) => t.receivedAt).length;
  const rejectedCount = allTests.filter((t: any) => t.status === 'Rejected').length;
  const recollectCount = allTests.filter((t: any) => Number(t.recollectCount || 0) > 0).length;
  const unmatched = incoming.filter((o: any) => !(o.sampleIds || []).length && !(o.pendingTests || []).some((t: any) => t.sampleNo || t.sampleId)).length;
  const urgentCount = incoming.filter((o: any) => o.priority === 'Urgent' || o.priority === 'STAT').length;
  const awaitingReceipt = incoming.reduce((a: number, o: any) => a + (o.pendingTests?.length || 0), 0);

  const cards = [
    { label: 'Incoming', value: receivingData?.total ?? incoming.length, icon: Inbox, cls: 'bg-primary/10 text-primary' },
    { label: 'Awaiting Receipt', value: awaitingReceipt, icon: ScanLine, cls: 'bg-warning/10 text-warning' },
    { label: 'Accepted', value: acceptedCount, icon: CheckCircle2, cls: 'bg-success/10 text-success' },
    { label: 'Rejected', value: rejectedCount, icon: XCircle, cls: 'bg-destructive/10 text-destructive' },
    { label: 'Recollection Required', value: recollectCount, icon: RotateCcw, cls: 'bg-orange-500/10 text-orange-600' },
    { label: 'Urgent / STAT', value: urgentCount, icon: AlertTriangle, cls: 'bg-red-500/10 text-red-600' },
    { label: 'Unmatched', value: unmatched, icon: Link2Off, cls: 'bg-violet-500/10 text-violet-600' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Sample Receiving</h1>
          <p className="text-muted-foreground">Scan or type a barcode / sample number to filter the intake bench</p>
        </div>
        <div className="relative w-full sm:w-80">
          <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input autoFocus value={scan} onChange={(e) => setScan(e.target.value)}
            placeholder="Scan barcode / sample no / order no" className="pl-9 font-mono" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
        {cards.map((c, i) => (
          <motion.div key={c.label} whileHover={{ scale: 1.02 }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="bg-card rounded-2xl border border-border/60 p-4">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${c.cls}`}>
              <c.icon className="w-4.5 h-4.5" />
            </div>
            <p className="font-heading text-2xl font-bold text-foreground">{c.value}</p>
            <p className="text-[11px] text-muted-foreground uppercase font-semibold">{c.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="bg-card rounded-2xl border border-border/60 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border/60">
          <Search className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">Collected orders awaiting receipt</p>
          <span className="ml-auto text-xs text-muted-foreground">{filtered.length} of {incoming.length}</span>
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <PackageCheck className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Intake bench is clear</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-5 py-3">Order</th>
                  <th className="text-left px-5 py-3">Patient</th>
                  <th className="text-left px-5 py-3">Pending samples</th>
                  <th className="text-left px-5 py-3">Priority</th>
                  <th className="text-left px-5 py-3">Received</th>
                  <th className="text-right px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map((o: any) => {
                  const rejected = (o.tests || []).filter((t: any) => t.status === 'Rejected');
                  const hasRecollect = rejected.length > 0;
                  return (
                    <tr key={o._id} className="hover:bg-muted/30">
                      <td className="px-5 py-3">
                        <p className="font-mono text-xs font-semibold text-foreground">{o.orderId}</p>
                        <p className="text-[11px] text-muted-foreground">{o.doctorName || '—'}</p>
                      </td>
                      <td className="px-5 py-3 font-medium text-foreground">{o.patientName}</td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {(o.pendingTests || []).map((t: any) => (
                            <span key={t.testIndex} className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-mono">
                              {t.sampleNo || t.sampleId || t.testName}
                            </span>
                          ))}
                          {(o.pendingTests || []).length === 0 && <span className="text-xs text-success">All received</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <Badge className={`${PRIORITY_COLORS[o.priority] || ''} border-0 text-[10px]`}>{o.priority}</Badge>
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">{o.createdAt ? new Date(o.createdAt).toLocaleString() : '—'}</td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-2">
                          {(o.pendingTests || []).length > 0 && (
                            <>
                              <Button size="sm" className="gap-1 text-xs" onClick={() => open('receive', o)}>
                                <PackageCheck className="w-3.5 h-3.5" /> Receive
                              </Button>
                              <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => open('accept', o)}>
                                <CheckCircle2 className="w-3.5 h-3.5" /> Accept
                              </Button>
                              <Button size="sm" variant="outline" className="gap-1 text-xs text-destructive hover:bg-destructive/10" onClick={() => open('reject', o)}>
                                <XCircle className="w-3.5 h-3.5" /> Reject
                              </Button>
                            </>
                          )}
                          {hasRecollect && (
                            <Button size="sm" variant="outline" className="gap-1 text-xs text-orange-600 hover:bg-orange-500/10"
                              onClick={() => open('recollect', o)} disabled={recollectMut.isPending}>
                              <RotateCcw className="w-3.5 h-3.5" /> Recollect
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {dialog && (
        <div className={modalClass} onClick={() => setDialog(null)}>
          <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-card rounded-2xl border border-border/60 p-6 max-w-lg w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                {dialog.type === 'receive' && <PackageCheck className="w-5 h-5 text-primary" />}
                {dialog.type === 'accept' && <CheckCircle2 className="w-5 h-5 text-success" />}
                {dialog.type === 'reject' && <XCircle className="w-5 h-5 text-destructive" />}
                {dialog.type === 'recollect' && <RotateCcw className="w-5 h-5 text-orange-600" />}
              </div>
              <div>
                <h3 className="font-semibold text-foreground capitalize">{dialog.type === 'recollect' ? 'Request Recollection' : `${dialog.type} sample`}</h3>
                <p className="text-xs text-muted-foreground font-mono">{dialog.order.orderId} · {dialog.order.patientName}</p>
              </div>
            </div>

            {dialog.type === 'receive' && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Sample / Barcode No.</label>
                  <Input value={form.sampleNo} onChange={(e) => setForm((f: any) => ({ ...f, sampleNo: e.target.value }))} placeholder="Scan or type sample number" className="font-mono" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Sample condition</label>
                  <select value={form.condition} onChange={(e) => setForm((f: any) => ({ ...f, condition: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                    {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Notes</label>
                  <textarea value={form.notes} onChange={(e) => setForm((f: any) => ({ ...f, notes: e.target.value }))} rows={3}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="Intake observations..." />
                </div>
                <Button className="w-full gap-2" disabled={receiveMut.isPending}
                  onClick={() => receiveMut.mutate({ id: dialog.order._id, body: { sampleNo: form.sampleNo, condition: form.condition, notes: form.notes } })}>
                  {receiveMut.isPending ? 'Receiving...' : 'Confirm Receipt'}
                </Button>
              </div>
            )}

            {dialog.type === 'accept' && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Section</label>
                  <select value={form.section} onChange={(e) => setForm((f: any) => ({ ...f, section: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                    {sections.length === 0 && <option value="">No sections available</option>}
                    {sections.map((s: any) => <option key={s.section} value={s.section}>{s.section} ({s.pending} pending)</option>)}
                  </select>
                </div>
                <p className="text-xs text-muted-foreground">
                  {(dialog.order.pendingTests || []).length} sample line(s) will be accepted and routed to {form.section || 'the selected section'}.
                </p>
                <Button className="w-full gap-2" disabled={busy || acceptMut.isPending} onClick={() => runAccept(dialog.order)}>
                  {busy ? 'Accepting...' : 'Accept into section'}
                </Button>
              </div>
            )}

            {dialog.type === 'reject' && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Sample line</label>
                  <select value={form.testIndex} onChange={(e) => setForm((f: any) => ({ ...f, testIndex: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                    <option value="">All pending lines</option>
                    {(dialog.order.pendingTests || []).map((t: any) => (
                      <option key={t.testIndex} value={String(t.testIndex)}>{t.testName} ({t.sampleNo || t.sampleId || 'no sample no'})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Rejection reason</label>
                  <select value={form.reason} onChange={(e) => setForm((f: any) => ({ ...f, reason: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                    {REJECTION_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Notes</label>
                  <textarea value={form.detail} onChange={(e) => setForm((f: any) => ({ ...f, detail: e.target.value }))} rows={3}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="What went wrong with the sample..." />
                </div>
                <Button variant="destructive" className="w-full gap-2" disabled={busy} onClick={() => runReject(dialog.order)}>
                  <XCircle className="w-4 h-4" /> {busy ? 'Rejecting...' : 'Reject sample'}
                </Button>
              </div>
            )}

            {dialog.type === 'recollect' && (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-sm text-orange-700 dark:text-orange-300">
                  {(dialog.order.tests || []).filter((t: any) => t.status === 'Rejected').map((t: any) => (
                    <p key={t.testName} className="flex items-center gap-2">
                      <FlaskConical className="w-3.5 h-3.5" /> {t.testName} — {t.rejectionReason || 'Rejected'} {t.recollectReason ? `(${t.recollectReason})` : ''}
                    </p>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Rejected lines go back to “Sample Needed” so the phlebotomist can redraw.</p>
                <Button className="w-full gap-2" disabled={busy} onClick={() => runRecollect(dialog.order)}>
                  <RotateCcw className="w-4 h-4" /> {busy ? 'Requesting...' : 'Request recollection'}
                </Button>
              </div>
            )}

            <Button variant="outline" className="w-full mt-3" onClick={() => setDialog(null)}>Cancel</Button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
