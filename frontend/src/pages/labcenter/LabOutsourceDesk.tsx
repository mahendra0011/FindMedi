import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Truck, Loader2, PackageCheck, IndianRupee, ArrowRight, Send, ClipboardList, Search, CheckCircle2, Boxes, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const STATUSES = ['Dispatch Pending', 'Dispatched', 'Received by Reference Lab', 'Processing', 'Result Received', 'Review Pending', 'Finalized'];

const STATUS_CLS: any = {
  'Dispatch Pending': 'bg-warning/10 text-warning',
  Dispatched: 'bg-info/10 text-info',
  'Received by Reference Lab': 'bg-primary/10 text-primary',
  Processing: 'bg-violet-500/10 text-violet-600',
  'Result Received': 'bg-success/10 text-success',
  'Review Pending': 'bg-warning/10 text-warning',
  Finalized: 'bg-success/10 text-success',
};

const modalClass = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4';

export default function LabOutsourceDesk() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [labFilter, setLabFilter] = useState('');
  const [statusTarget, setStatusTarget] = useState<any | null>(null);
  const [nextStatus, setNextStatus] = useState('');
  const [resultTarget, setResultTarget] = useState<any | null>(null);
  const [resultForm, setResultForm] = useState<any>({ resultValue: '', normalRange: '', unit: '', externalReportNo: '', externalResultUrl: '', outsourceCost: '', vendorInvoiceNo: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['lab-outsourced'],
    queryFn: () => api.getOutsourcedLab({}),
  });

  const rows: any[] = data?.outsourced || [];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['lab-outsourced'] });
    qc.invalidateQueries({ queryKey: ['lab-orders'] });
    qc.invalidateQueries({ queryKey: ['lab-worklist'] });
    qc.invalidateQueries({ queryKey: ['lab-stats'] });
  };

  const statusMut = useMutation({
    mutationFn: ({ id, idx, status }: any) => api.updateOutsourceStatus(id, idx, { status }),
    onSuccess: () => { toast.success('Outsource status advanced'); invalidate(); setStatusTarget(null); },
    onError: (e: any) => toast.error(e?.message || 'Status update failed'),
  });
  const resultMut = useMutation({
    mutationFn: ({ id, idx, body }: any) => api.uploadOutsourceResult(id, idx, body),
    onSuccess: () => { toast.success('Reference-lab result recorded'); invalidate(); setResultTarget(null); },
    onError: (e: any) => toast.error(e?.message || 'Result save failed'),
  });

  const labs = useMemo(() => [...new Set(rows.map((r: any) => r.lab).filter(Boolean))], [rows]);
  const q = search.trim().toLowerCase();
  const filtered = rows.filter((r: any) => {
    if (labFilter && r.lab !== labFilter) return false;
    if (!q) return true;
    return `${r.orderNo} ${r.patientName} ${r.testName} ${r.lab} ${r.courierName || ''} ${r.trackingNo || ''}`.toLowerCase().includes(q);
  });

  const cost = rows.reduce((s: number, r: any) => s + Number(r.outsourceCost || 0), 0);
  const cards = [
    { label: 'Outsourced lines', value: rows.length, icon: Truck, cls: 'text-primary' },
    { label: 'Awaiting dispatch', value: rows.filter((r: any) => !r.status || r.status === 'Dispatch Pending').length, icon: Boxes, cls: 'text-warning' },
    { label: 'With reference lab', value: rows.filter((r: any) => ['Dispatched', 'Received by Reference Lab', 'Processing'].includes(r.status)).length, icon: Send, cls: 'text-info' },
    { label: 'Results to review', value: rows.filter((r: any) => ['Result Received', 'Review Pending'].includes(r.status)).length, icon: ClipboardList, cls: 'text-violet-500' },
    { label: 'Finalized', value: rows.filter((r: any) => r.status === 'Finalized').length, icon: CheckCircle2, cls: 'text-success' },
    { label: 'Outsource spend', value: `₹${cost.toLocaleString()}`, icon: IndianRupee, cls: 'text-success' },
  ];

  const openStatus = (r: any) => {
    const idx = STATUSES.indexOf(r.status || 'Dispatch Pending');
    const options = STATUSES.slice(Math.max(0, idx + 1));
    setNextStatus(options[0] || '');
    setStatusTarget(r);
  };

  const openResult = (r: any) => {
    setResultForm({ resultValue: '', normalRange: '', unit: '', externalReportNo: '', externalResultUrl: '', outsourceCost: '', vendorInvoiceNo: '' });
    setResultTarget(r);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Outsource Desk</h1>
          <p className="text-muted-foreground">Reference-lab dispatch, courier tracking and result landing</p>
        </div>
        <div className="flex flex-1 flex-wrap gap-2 lg:justify-end">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search order, test, courier..." className="pl-10" />
          </div>
          <select value={labFilter} onChange={e => setLabFilter(e.target.value)}
            className="h-10 px-3 rounded-lg border border-input bg-background text-sm">
            <option value="">All reference labs</option>
            {labs.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {cards.map((c, i) => (
          <motion.div key={c.label} whileHover={{ scale: 1.02 }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="bg-card rounded-2xl border border-border/60 p-4">
            <c.icon className={`w-6 h-6 mb-2 ${c.cls}`} />
            <p className="text-2xl font-bold text-foreground">{c.value}</p>
            <p className="text-[11px] text-muted-foreground uppercase font-semibold">{c.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="bg-card rounded-2xl border border-border/60 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border/60">
          <Truck className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Outsourced test lines</p>
          <span className="ml-auto text-xs text-muted-foreground">{filtered.length} line(s)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-5 py-3">Order / patient</th>
                <th className="text-left px-5 py-3">Test</th>
                <th className="text-left px-5 py-3">Reference lab</th>
                <th className="text-left px-5 py-3">Courier</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-right px-5 py-3">Cost</th>
                <th className="text-right px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.map((r: any) => (
                <tr key={`${r.orderId}-${r.testIndex}`} className="hover:bg-muted/30">
                  <td className="px-5 py-3">
                    <p className="font-mono text-xs font-semibold text-foreground">{r.orderNo}</p>
                    <p className="text-[11px] text-muted-foreground">{r.patientName} · {r.priority}</p>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-foreground">{r.testName}</p>
                    <p className="text-[11px] text-muted-foreground">{r.section || 'Unsectioned'} · {r.testStatus}</p>
                  </td>
                  <td className="px-5 py-3 text-foreground">{r.lab}</td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">
                    {r.courierName || '—'}<br />{r.trackingNo || ''}
                  </td>
                  <td className="px-5 py-3">
                    <Badge className={`${STATUS_CLS[r.status] || 'bg-muted text-muted-foreground'} border-0 text-[10px]`}>{r.status || 'Dispatch Pending'}</Badge>
                    {r.sentAt && <p className="text-[11px] text-muted-foreground mt-1">sent {new Date(r.sentAt).toLocaleDateString()}</p>}
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-foreground">
                    {r.outsourceCost ? `₹${Number(r.outsourceCost).toLocaleString()}` : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => openStatus(r)}>
                        Advance <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => openResult(r)}>
                        <Upload className="w-3.5 h-3.5" /> Result
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">
                    <Truck className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    No outsourced tests match this filter
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {statusTarget && (
        <div className={modalClass} onClick={() => setStatusTarget(null)}>
          <div className="bg-card rounded-2xl border p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><ArrowRight className="w-5 h-5 text-primary" /></div>
              <div>
                <h3 className="font-semibold text-foreground">Advance outsource status</h3>
                <p className="text-xs text-muted-foreground">{statusTarget.testName} · {statusTarget.orderNo}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">New status</label>
                <select value={nextStatus} onChange={e => setNextStatus(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                  {STATUSES.slice(Math.max(0, STATUSES.indexOf(statusTarget.status || 'Dispatch Pending') + 1)).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  Current: {statusTarget.status || 'Dispatch Pending'} · chain only moves forward
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStatusTarget(null)}>Cancel</Button>
                <Button className="flex-1" disabled={!nextStatus || statusMut.isPending}
                  onClick={() => statusMut.mutate({ id: statusTarget.orderId, idx: statusTarget.testIndex, status: nextStatus })}>
                  {statusMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {resultTarget && (
        <div className={modalClass} onClick={() => setResultTarget(null)}>
          <div className="bg-card rounded-2xl border p-6 max-w-lg w-full shadow-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center"><PackageCheck className="w-5 h-5 text-success" /></div>
              <div>
                <h3 className="font-semibold text-foreground">Land reference-lab result</h3>
                <p className="text-xs text-muted-foreground">{resultTarget.testName} · {resultTarget.orderNo}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-sm font-medium text-foreground mb-1.5 block">Result value</label>
                <textarea rows={3} value={resultForm.resultValue} onChange={e => setResultForm((f: any) => ({ ...f, resultValue: e.target.value }))}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="e.g. 7.2 mmol/L" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Normal range</label>
                <Input value={resultForm.normalRange} onChange={e => setResultForm((f: any) => ({ ...f, normalRange: e.target.value }))} placeholder="4.0 - 6.0" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Unit</label>
                <Input value={resultForm.unit} onChange={e => setResultForm((f: any) => ({ ...f, unit: e.target.value }))} placeholder="mmol/L" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">External report no.</label>
                <Input value={resultForm.externalReportNo} onChange={e => setResultForm((f: any) => ({ ...f, externalReportNo: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">External result URL</label>
                <Input value={resultForm.externalResultUrl} onChange={e => setResultForm((f: any) => ({ ...f, externalResultUrl: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Outsource cost (₹)</label>
                <Input type="number" value={resultForm.outsourceCost} onChange={e => setResultForm((f: any) => ({ ...f, outsourceCost: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Vendor invoice no.</label>
                <Input value={resultForm.vendorInvoiceNo} onChange={e => setResultForm((f: any) => ({ ...f, vendorInvoiceNo: e.target.value }))} />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Recorded results land as "Result Pending" and still need in-house verification.
            </p>
            <div className="flex gap-3 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => setResultTarget(null)}>Cancel</Button>
              <Button className="flex-1" disabled={resultMut.isPending || !resultForm.resultValue.trim()}
                onClick={() => {
                  const body: any = {
                    resultValue: resultForm.resultValue.trim(),
                    externalReportNo: resultForm.externalReportNo,
                    externalResultUrl: resultForm.externalResultUrl,
                  };
                  if (resultForm.normalRange) body.normalRange = resultForm.normalRange;
                  if (resultForm.unit) body.unit = resultForm.unit;
                  if (resultForm.outsourceCost !== '') body.outsourceCost = Number(resultForm.outsourceCost);
                  if (resultForm.vendorInvoiceNo) body.vendorInvoiceNo = resultForm.vendorInvoiceNo;
                  resultMut.mutate({ id: resultTarget.orderId, idx: resultTarget.testIndex, body });
                }}>
                {resultMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save result'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
