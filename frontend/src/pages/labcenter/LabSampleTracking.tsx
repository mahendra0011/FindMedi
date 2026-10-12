import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search, TestTube, Loader2, ScanLine, CheckCircle2, AlertTriangle, FlaskConical, Truck, Clock, XCircle, PackageCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const STATUS_CLS: any = {
  Ordered: 'bg-muted text-muted-foreground',
  'Sample Needed': 'bg-warning/10 text-warning',
  'Sample Collected': 'bg-info/10 text-info',
  Rejected: 'bg-destructive/10 text-destructive',
  Received: 'bg-primary/10 text-primary',
  Processing: 'bg-info/10 text-info',
  'Under Verification': 'bg-warning/10 text-warning',
  Verified: 'bg-success/10 text-success',
  'Report Delivered': 'bg-success/10 text-success',
};

const timeline = (t: any) => [
  { label: 'Collected', at: t.sampleCollectedAt, icon: TestTube },
  { label: 'Received', at: t.receivedAt, icon: PackageCheck },
  { label: 'Result entered', at: t.resultEnteredAt, icon: FlaskConical },
  { label: 'Verified', at: t.verifiedAt, icon: CheckCircle2 },
];

export default function LabSampleTracking() {
  const [search, setSearch] = useState('');
  const [scan, setScan] = useState('');
  const [selected, setSelected] = useState<any | null>(null);

  const { data: worklist, isLoading } = useQuery({
    queryKey: ['lab-worklist'],
    queryFn: () => api.getLabWorklist({ limit: 200 }),
  });
  const { data: ordersData } = useQuery({ queryKey: ['lab-orders'], queryFn: () => api.getLabOrders({}) });
  const { data: receiving } = useQuery({ queryKey: ['lab-receiving'], queryFn: () => api.getLabReceiving({}) });

  const rows: any[] = worklist?.rows || worklist?.items || (Array.isArray(worklist) ? worklist : []);
  const orders: any[] = ordersData?.orders || [];
  const pendingReceipt = receiving?.total ?? rows.filter(r => !r.receivedAt).length;

  const orderById = useMemo(() => orders.reduce((m: any, o: any) => { m[o._id] = o; return m; }, {}), [orders]);

  const q = search.trim().toLowerCase();
  const filtered = rows.filter((r: any) => {
    if (!q) return true;
    return `${r.sampleId} ${r.sampleNo} ${r.orderNo} ${r.patientName} ${r.testName} ${r.section} ${r.status}`.toLowerCase().includes(q);
  });

  const counts = {
    total: rows.length,
    pending: rows.filter((r: any) => !r.receivedAt && r.status !== 'Rejected').length,
    processing: rows.filter((r: any) => ['Received', 'Processing', 'Under Verification'].includes(r.status)).length,
    rejected: rows.filter((r: any) => r.status === 'Rejected').length,
    verified: rows.filter((r: any) => ['Verified', 'Report Delivered'].includes(r.status)).length,
    outsourced: rows.filter((r: any) => r.outsourced).length,
  };

  const cards = [
    { label: 'Samples tracked', value: counts.total, icon: TestTube, cls: 'text-primary' },
    { label: 'Awaiting receipt', value: counts.pending, icon: Clock, cls: 'text-warning' },
    { label: 'In process', value: counts.processing, icon: FlaskConical, cls: 'text-info' },
    { label: 'Rejected', value: counts.rejected, icon: XCircle, cls: 'text-destructive' },
    { label: 'Verified', value: counts.verified, icon: CheckCircle2, cls: 'text-success' },
    { label: 'Outsourced', value: counts.outsourced, icon: Truck, cls: 'text-violet-500' },
  ];

  const openOrder = (row: any) => {
    const order = orderById[row.orderId];
    if (!order) return;
    const test = (order.tests || [])[row.testIndex];
    if (!test) return;
    setSelected({ order, test, testIndex: row.testIndex });
  };

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    const code = scan.trim().toLowerCase();
    if (!code) return;
    const hit = rows.find((r: any) =>
      [r.sampleId, r.sampleNo, r.orderNo].filter(Boolean).some((v: any) => String(v).toLowerCase() === code));
    if (hit) { openOrder(hit); setScan(''); }
    else toast.error('No sample matches that barcode');
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
          <h1 className="font-heading text-2xl font-bold text-foreground">Sample Tracking</h1>
          <p className="text-muted-foreground">Chain of custody from collection to verification</p>
        </div>
        <div className="flex flex-1 flex-wrap gap-2 lg:justify-end">
          <form onSubmit={handleScan} className="relative w-full sm:w-72">
            <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={scan} onChange={e => setScan(e.target.value)} placeholder="Scan barcode / sample ID..." className="pl-10" />
          </form>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter by sample, order, patient..." className="pl-10" />
          </div>
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
          <TestTube className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Sample register</p>
          <span className="ml-auto text-xs text-muted-foreground">
            {filtered.length} of {rows.length} sample line(s) · {pendingReceipt} awaiting receipt
          </span>
        </div>
        <div className="overflow-x-auto max-h-[540px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground sticky top-0">
              <tr>
                <th className="text-left px-5 py-3">Sample</th>
                <th className="text-left px-5 py-3">Order</th>
                <th className="text-left px-5 py-3">Patient</th>
                <th className="text-left px-5 py-3">Test</th>
                <th className="text-left px-5 py-3">Section</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Received</th>
                <th className="text-right px-5 py-3">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.map((r: any) => (
                <tr key={`${r.orderId}-${r.testIndex}`} className="hover:bg-muted/30">
                  <td className="px-5 py-3">
                    <p className="font-mono text-xs font-semibold text-foreground">{r.sampleId || '—'}</p>
                    <p className="text-[11px] text-muted-foreground">{r.sampleNo || 'no barcode'}</p>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-foreground">{r.orderNo}</td>
                  <td className="px-5 py-3 font-medium text-foreground">{r.patientName}</td>
                  <td className="px-5 py-3 text-foreground">{r.testName}</td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">{r.section || 'Unsectioned'}</td>
                  <td className="px-5 py-3">
                    <Badge className={`${STATUS_CLS[r.status] || 'bg-muted text-muted-foreground'} border-0 text-[10px]`}>{r.status}</Badge>
                    {r.outsourced && <Badge className="bg-violet-500/10 text-violet-600 border-0 text-[10px] ml-1">Outsourced</Badge>}
                  </td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">
                    {r.receivedAt ? new Date(r.receivedAt).toLocaleString() : <span className="text-warning">Not received</span>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => openOrder(r)}>Open</Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">
                    <AlertTriangle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    No samples match this filter
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setSelected(null)}>
          <div className="bg-card rounded-2xl border p-6 max-w-2xl w-full shadow-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <TestTube className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">{selected.test.testName}</h3>
                <p className="text-xs text-muted-foreground">
                  {selected.order.orderId} · {selected.order.patientName} · {selected.order.priority} · {selected.order.status}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setSelected(null)}>Close</Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
              <div className="rounded-xl border border-border/60 p-3">
                <p className="text-[11px] uppercase text-muted-foreground font-semibold">Sample ID</p>
                <p className="text-sm font-mono font-semibold text-foreground">{selected.test.sampleId || '—'}</p>
              </div>
              <div className="rounded-xl border border-border/60 p-3">
                <p className="text-[11px] uppercase text-muted-foreground font-semibold">Sample No</p>
                <p className="text-sm font-mono font-semibold text-foreground">{selected.test.sampleNo || '—'}</p>
              </div>
              <div className="rounded-xl border border-border/60 p-3">
                <p className="text-[11px] uppercase text-muted-foreground font-semibold">Section</p>
                <p className="text-sm font-semibold text-foreground">{selected.test.section || 'Unsectioned'}</p>
              </div>
              <div className="rounded-xl border border-border/60 p-3">
                <p className="text-[11px] uppercase text-muted-foreground font-semibold">Status</p>
                <Badge className={`${STATUS_CLS[selected.test.status] || 'bg-muted text-muted-foreground'} border-0 text-[10px] mt-1`}>{selected.test.status}</Badge>
              </div>
              <div className="rounded-xl border border-border/60 p-3">
                <p className="text-[11px] uppercase text-muted-foreground font-semibold">Recollected</p>
                <p className="text-sm font-semibold text-foreground">{selected.test.recollectCount || 0}×</p>
              </div>
              <div className="rounded-xl border border-border/60 p-3">
                <p className="text-[11px] uppercase text-muted-foreground font-semibold">Rejected</p>
                <p className="text-sm font-semibold text-foreground">{selected.test.rejectionReason || 'No'}</p>
              </div>
            </div>

            <p className="text-xs uppercase text-muted-foreground font-semibold mb-3">Chain of custody</p>
            <ol className="space-y-3 mb-5">
              {timeline(selected.test).map(s => (
                <li key={s.label} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.at ? 'bg-success/10' : 'bg-muted'}`}>
                    <s.icon className={`w-4 h-4 ${s.at ? 'text-success' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${s.at ? 'text-foreground' : 'text-muted-foreground'}`}>{s.label}</p>
                    <p className="text-[11px] text-muted-foreground">{s.at ? new Date(s.at).toLocaleString() : 'pending'}</p>
                  </div>
                </li>
              ))}
            </ol>

            {selected.test.outsourced?.lab && (
              <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-3 mb-5">
                <p className="text-xs font-semibold text-violet-600 mb-1">Outsourced to {selected.test.outsourced.lab}</p>
                <p className="text-xs text-muted-foreground">
                  Status: {selected.test.outsourced.status || 'Dispatched'}
                  {selected.test.outsourced.courierName ? ` · Courier ${selected.test.outsourced.courierName}` : ''}
                  {selected.test.outsourced.trackingNo ? ` · ${selected.test.outsourced.trackingNo}` : ''}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" asChild>
                <a href={`/lab/ops?order=${selected.order._id}`}>Open in receiving</a>
              </Button>
              <Button size="sm" onClick={() => setSelected(null)}>Done</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
