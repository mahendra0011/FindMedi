import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TestTube, Clock, CheckCircle2, Truck, MapPin, RotateCcw, AlertTriangle, Loader2, PlayCircle, PackageCheck, Send, XCircle, Printer, Search, FlaskConical, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const FAIL_REASONS = ['Patient Not Available', 'Collection Not Possible', 'Insufficient Sample', 'Incorrect Container', 'Label Issue', 'Other'];

const BOOKING_STATUS_COLORS: any = {
  Pending: 'bg-warning/10 text-warning',
  Confirmed: 'bg-info/10 text-info',
  Assigned: 'bg-primary/10 text-primary',
  'On Route': 'bg-violet-500/10 text-violet-600',
  Collected: 'bg-success/10 text-success',
  'Sample Collected': 'bg-success/10 text-success',
  Submitted: 'bg-info/10 text-info',
  Received: 'bg-success/10 text-success',
  Failed: 'bg-destructive/10 text-destructive',
  Completed: 'bg-success/10 text-success',
  Cancelled: 'bg-muted text-muted-foreground',
  Verified: 'bg-success/10 text-success',
  Rejected: 'bg-destructive/10 text-destructive',
};

const ORDER_STATUS_COLORS: any = {
  'Collection Pending': 'bg-warning/10 text-warning',
  'Out for Collection': 'bg-primary/10 text-primary',
  Collected: 'bg-success/10 text-success',
  Received: 'bg-info/10 text-info',
  Processing: 'bg-info/10 text-info',
  Finalized: 'bg-success/10 text-success',
};

const modalClass = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4';

export default function PhlebotomistDashboard() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [failTarget, setFailTarget] = useState<any | null>(null);
  const [failForm, setFailForm] = useState<any>({ reason: 'Patient Not Available', notes: '' });

  const { data: bookingsData, isLoading } = useQuery({
    queryKey: ['lab-bookings'],
    queryFn: () => api.getLabBookings({}),
  });
  const { data: ordersData } = useQuery({
    queryKey: ['lab-orders', 'collection'],
    queryFn: () => api.getLabOrders({ status: 'Collection Pending' }),
  });
  const { data: allOrdersData } = useQuery({
    queryKey: ['lab-orders'],
    queryFn: () => api.getLabOrders({}),
  });

  const bookings: any[] = bookingsData?.bookings || [];
  const collectionOrders: any[] = ordersData?.orders || [];
  const allOrders: any[] = allOrdersData?.orders || [];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['lab-bookings'] });
    qc.invalidateQueries({ queryKey: ['lab-orders'] });
    qc.invalidateQueries({ queryKey: ['lab-stats'] });
  };

  const visitMut = useMutation({
    mutationFn: ({ id, body }: any) => api.visitLabBooking(id, body),
    onSuccess: (_d, vars: any) => {
      toast.success(`Visit ${vars.body.action} recorded`);
      invalidate();
      setFailTarget(null);
    },
    onError: (e: any) => toast.error(e?.message || 'Visit update failed'),
  });
  const receiveMut = useMutation({
    mutationFn: ({ id, status }: any) => api.updateLabBooking(id, { status }),
    onSuccess: () => { toast.success('Sample received at lab'); invalidate(); },
    onError: (e: any) => toast.error(e?.message || 'Status update failed'),
  });

  const q = search.trim().toLowerCase();
  const visibleBookings = bookings.filter((b: any) => {
    if (!q) return true;
    return `${b.patientName} ${b.bookingId} ${(b.tests || []).join(' ')} ${b.phlebotomist || ''}`.toLowerCase().includes(q);
  });
  const visibleOrders = collectionOrders.filter((o: any) => {
    if (!q) return true;
    return `${o.orderId} ${o.patientName} ${(o.tests || []).map((t: any) => t.testName).join(' ')}`.toLowerCase().includes(q);
  });

  const homeVisits = bookings.filter((b: any) => b.visitType === 'Home Collection');
  const assignedVisits = homeVisits.filter((b: any) => ['Assigned', 'On Route'].includes(b.status));
  const pendingCollection = collectionOrders.length + bookings.filter((b: any) => ['Pending', 'Confirmed'].includes(b.status)).length;
  const waiting = bookings.filter((b: any) => ['Confirmed', 'Assigned'].includes(b.status)).length
    + allOrders.filter((o: any) => o.status === 'Out for Collection').length;
  const collected = bookings.filter((b: any) => ['Collected', 'Sample Collected'].includes(b.status)).length
    + allOrders.filter((o: any) => o.status === 'Collected').length;
  const submitted = bookings.filter((b: any) => b.status === 'Submitted').length;
  const recollection = allOrders.reduce((n, o: any) =>
    n + (o.tests || []).filter((t: any) => Number(t.recollectCount || 0) > 0 || t.status === 'Rejected').length, 0);
  const issues = bookings.filter((b: any) => b.status === 'Failed').length
    + allOrders.reduce((n, o: any) => n + (o.tests || []).filter((t: any) => t.status === 'Rejected').length, 0);

  const cards = [
    { label: 'Pending Collection', value: pendingCollection, icon: TestTube, cls: 'bg-warning/10 text-warning' },
    { label: 'Waiting', value: waiting, icon: Clock, cls: 'bg-info/10 text-info' },
    { label: 'Collected', value: collected, icon: CheckCircle2, cls: 'bg-success/10 text-success' },
    { label: 'Submitted', value: submitted, icon: Truck, cls: 'bg-primary/10 text-primary' },
    { label: 'Home Collections Assigned', value: assignedVisits.length, icon: MapPin, cls: 'bg-violet-500/10 text-violet-600' },
    { label: 'Recollection', value: recollection, icon: RotateCcw, cls: 'bg-orange-500/10 text-orange-600' },
    { label: 'Issues', value: issues, icon: AlertTriangle, cls: 'bg-destructive/10 text-destructive' },
  ];

  const printLabel = async (b: any) => {
    try {
      const res: any = await api.renderLabel({
        type: 'accession',
        code: b.bookingId || String(b._id),
        title: 'Home Collection',
        subtitle: `${b.patientName || ''} · ${(b.tests || []).join(', ')}`.slice(0, 48),
      });
      if (!res?.png) { toast.error('Label could not be rendered'); return; }
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(`<html><head><title>Label ${b.bookingId || ''}</title></head><body style="margin:0;display:flex;justify-content:center"><img src="data:image/png;base64,${res.png}" onload="window.print()" /></body></html>`);
        w.document.close();
      }
    } catch (e: any) {
      toast.error(e?.message || 'Label print failed');
    }
  };

  const canVisit = (b: any) => b.visitType === 'Home Collection';

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
          <h1 className="font-heading text-2xl font-bold text-foreground">Phlebotomist Dashboard</h1>
          <p className="text-muted-foreground">Collection queue, home visits and sample handover</p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patient, booking, test..." className="pl-10" />
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
          <MapPin className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Home collection visits</p>
          <span className="ml-auto text-xs text-muted-foreground">{visibleBookings.filter((b: any) => b.visitType === 'Home Collection').length} visit(s)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-5 py-3">Booking</th>
                <th className="text-left px-5 py-3">Patient</th>
                <th className="text-left px-5 py-3">Address / slot</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-right px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {visibleBookings.filter((b: any) => b.visitType === 'Home Collection').map((b: any) => (
                <tr key={b._id} className="hover:bg-muted/30">
                  <td className="px-5 py-3">
                    <p className="font-mono text-xs font-semibold text-foreground">{b.bookingId}</p>
                    <p className="text-[11px] text-muted-foreground">{(b.tests || []).join(', ')}</p>
                  </td>
                  <td className="px-5 py-3 font-medium text-foreground">{b.patientName}</td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">
                    <p>{b.homeCollectionAddress || '—'}</p>
                    <p>{b.bookingDate ? new Date(b.bookingDate).toLocaleDateString() : ''} {b.timeSlot || ''}</p>
                  </td>
                  <td className="px-5 py-3">
                    <Badge className={`${BOOKING_STATUS_COLORS[b.status] || 'bg-muted text-muted-foreground'} border-0 text-[10px]`}>{b.status}</Badge>
                    {b.failedReason && <p className="text-[11px] text-destructive mt-1">{b.failedReason}</p>}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2 flex-wrap">
                      <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => printLabel(b)}>
                        <Printer className="w-3.5 h-3.5" /> Label
                      </Button>
                      {canVisit(b) && ['Pending', 'Confirmed', 'Assigned'].includes(b.status) && (
                        <Button size="sm" className="gap-1 text-xs" disabled={visitMut.isPending}
                          onClick={() => visitMut.mutate({ id: b._id, body: { action: 'start' } })}>
                          <PlayCircle className="w-3.5 h-3.5" /> Start
                        </Button>
                      )}
                      {canVisit(b) && ['Assigned', 'On Route'].includes(b.status) && (
                        <Button size="sm" className="gap-1 text-xs bg-success hover:bg-success/90" disabled={visitMut.isPending}
                          onClick={() => visitMut.mutate({ id: b._id, body: { action: 'complete' } })}>
                          <TestTube className="w-3.5 h-3.5" /> Collected
                        </Button>
                      )}
                      {canVisit(b) && ['Collected', 'On Route'].includes(b.status) && (
                        <Button size="sm" variant="outline" className="gap-1 text-xs" disabled={visitMut.isPending}
                          onClick={() => visitMut.mutate({ id: b._id, body: { action: 'handover' } })}>
                          <Send className="w-3.5 h-3.5" /> Submit
                        </Button>
                      )}
                      {b.status === 'Submitted' && (
                        <Button size="sm" variant="outline" className="gap-1 text-xs" disabled={receiveMut.isPending}
                          onClick={() => receiveMut.mutate({ id: b._id, status: 'Received' })}>
                          <PackageCheck className="w-3.5 h-3.5" /> Receive
                        </Button>
                      )}
                      {canVisit(b) && ['Pending', 'Confirmed', 'Assigned', 'On Route'].includes(b.status) && (
                        <Button size="sm" variant="outline" className="gap-1 text-xs text-destructive hover:bg-destructive/10"
                          onClick={() => { setFailForm({ reason: 'Patient Not Available', notes: '' }); setFailTarget(b); }}>
                          <XCircle className="w-3.5 h-3.5" /> Fail
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {visibleBookings.filter((b: any) => b.visitType === 'Home Collection').length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">
                    <MapPin className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    No home collection visits assigned
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border/60 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border/60">
          <FlaskConical className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">In-lab collection queue</p>
          <span className="ml-auto text-xs text-muted-foreground">{visibleOrders.length} order(s)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-5 py-3">Order</th>
                <th className="text-left px-5 py-3">Patient</th>
                <th className="text-left px-5 py-3">Tests</th>
                <th className="text-left px-5 py-3">Priority</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-right px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {visibleOrders.map((o: any) => (
                <tr key={o._id} className="hover:bg-muted/30">
                  <td className="px-5 py-3 font-mono text-xs font-semibold text-foreground">{o.orderId}</td>
                  <td className="px-5 py-3 font-medium text-foreground">{o.patientName}</td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">{(o.tests || []).map((t: any) => t.testName).join(', ')}</td>
                  <td className="px-5 py-3">
                    <Badge className={`border-0 text-[10px] ${o.priority === 'STAT' ? 'bg-destructive/10 text-destructive' : o.priority === 'Urgent' ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'}`}>
                      {o.priority}
                    </Badge>
                  </td>
                  <td className="px-5 py-3">
                    <Badge className={`${ORDER_STATUS_COLORS[o.status] || 'bg-muted text-muted-foreground'} border-0 text-[10px]`}>{o.status}</Badge>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Button size="sm" variant="outline" className="gap-1 text-xs" asChild>
                      <Link to="/lab">Open <UserCheck className="w-3.5 h-3.5" /></Link>
                    </Button>
                  </td>
                </tr>
              ))}
              {visibleOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                    <TestTube className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    No orders waiting for collection
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {failTarget && (
        <div className={modalClass} onClick={() => setFailTarget(null)}>
          <div className="bg-card rounded-2xl border p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center"><XCircle className="w-5 h-5 text-destructive" /></div>
              <div>
                <h3 className="font-semibold text-foreground">Mark visit failed</h3>
                <p className="text-xs text-muted-foreground">{failTarget.patientName} · {failTarget.bookingId}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Failure reason</label>
                <select value={failForm.reason} onChange={e => setFailForm((f: any) => ({ ...f, reason: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                  {FAIL_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Notes</label>
                <textarea rows={3} value={failForm.notes} onChange={e => setFailForm((f: any) => ({ ...f, notes: e.target.value }))}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="What happened at the doorstep..." />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setFailTarget(null)}>Cancel</Button>
                <Button variant="destructive" className="flex-1" disabled={visitMut.isPending}
                  onClick={() => visitMut.mutate({ id: failTarget._id, body: { action: 'fail', reason: `${failForm.reason}${failForm.notes ? `: ${failForm.notes}` : ''}` } })}>
                  Mark Failed
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
