import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';
import PatientBanner from '@/components/clinical/PatientBanner';

/**
 * File 09 Flow E — lab ops queue: pending orders, verify (pathologist),
 * review-ack (ordering doctor). SoD: verify requires a non-entering role
 * server-side; review is the ordering doctor's ack.
 */
export default function LabOps() {
  const [rows, setRows] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [tat, setTat] = useState<any | null>(null);

  const load = async () => {
    try {
      const r: any = await (api as any).getLabOrders({});
      setRows(r?.orders || r?.data || []);
    } catch { toast.error('Failed to load lab queue'); }
    try {
      const t: any = await api.labTat();
      setTat(t);
    } catch { /* optional */ }
  };
  useEffect(() => { load(); }, []);

  const act = async (fn: () => Promise<any>, label: string) => {
    try { await fn(); toast.success(label); load(); }
    catch (err: any) { toast.error(err?.message || 'Failed (role may lack permission)'); }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-heading font-bold">Lab Queue ({rows.length})</h1>
      {/* File 22 P0-2: flag chips for the selected order's patient */}
      {selectedId && <PatientBanner patientId={rows.find((o: any) => o._id === selectedId)?.patientId || ''} />}
      {/* File 22 P1-11: TAT summary */}
      {tat ? (
        <div className="flex flex-wrap gap-2 text-xs">
          {Object.entries(tat.byPriority || {}).map(([p, v]: any) => (
            <span key={p} className={`rounded-md border px-2 py-1 ${v.breached ? 'border-red-300 bg-red-50' : ''}`}>
              <b>{p}</b> · avg {v.avgHrs}h · {v.breached}/{v.n} breached
            </span>
          ))}
        </div>
      ) : null}
      <div className="space-y-2">
        {rows.map((o: any) => (
          <Card key={o._id} className={selectedId === o._id ? 'border-primary' : ''}>
            <CardContent className="p-3 flex flex-wrap items-center gap-2 text-sm" onClick={() => setSelectedId(o._id === selectedId ? '' : o._id)}>
              <span className="font-mono text-xs">{o.orderId}</span>
              {o.accessionNo ? <span className="font-mono text-[11px] text-muted-foreground">{o.accessionNo}</span> : null}
              <span className="font-medium">{o.patientName}</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-muted">{o.status}</span>
              {o.reviewedAt && <span className="text-[11px] text-success">reviewed ✓</span>}
              <span className="flex-1" />
              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); act(() => (api as any).verifyLabResult(o._id, { approved: true }), 'Verified'); }}>Verify</Button>
              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); act(() => (api as any).reviewLabOrder(o._id), 'Marked reviewed'); }}>Review-ack</Button>
            </CardContent>
            {selectedId === o._id ? (
              <CardContent className="border-t pt-2 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                {(o.tests || []).map((t: any, i: number) => (
                  <div key={i} className="flex flex-wrap items-center gap-1.5 rounded border px-2 py-1 text-xs">
                    <b>{t.testName}</b>
                    <span className="text-muted-foreground">{t.resultValue || t.status}</span>
                    {t.flag ? <span className={`rounded px-1 font-bold ${t.flag === 'H' || t.flag === 'HH' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>{t.flag}</span> : null}
                    {t.deltaFlag ? <span className="rounded bg-violet-100 px-1 text-violet-800">Δ {t.deltaPct}% vs {t.prevValue}</span> : null}
                    {t.status === 'Rejected' ? <span className="text-red-700">rejected: {t.recollectReason}</span> : null}
                    {t.outsourced?.lab ? <span className="text-muted-foreground">out: {t.outsourced.lab}{t.outsourced.receivedAt ? ' ✓' : ''}</span> : null}
                    <span className="flex-1" />
                    {t.status !== 'Verified' && t.status !== 'Rejected' ? (
                      <Button size="sm" variant="ghost" onClick={() => {
                        const reason = window.prompt('Reject reason (sample):');
                        if (reason) act(() => api.labReject(o._id, i, reason), 'Sample rejected');
                      }}>Reject</Button>
                    ) : null}
                    {t.status === 'Rejected' ? (
                      <Button size="sm" variant="ghost" onClick={() => act(() => api.labRecollect(o._id, i), 'Recollect ordered')}>Recollect</Button>
                    ) : null}
                    <Button size="sm" variant="ghost" onClick={() => {
                      const lab = window.prompt('Outsource lab name (blank = mark received):', t.outsourced?.lab || '');
                      if (lab === null) return;
                      act(() => api.labOutsource(o._id, i, lab ? { lab } : { received: true }), 'Outsource updated');
                    }}>Outsource</Button>
                    <Button size="sm" variant="ghost" onClick={() => {
                      const to = window.prompt('Called back to (doctor/phone):');
                      if (to) act(() => api.labCallback(o._id, { testName: t.testName, calledTo: to }), 'Callback logged');
                    }}>Log callback</Button>
                  </div>
                ))}
                {(o.criticalCallbacks || []).length ? (
                  <p className="text-[11px] text-muted-foreground">Callbacks: {o.criticalCallbacks.map((c: any) => `${c.testName}→${c.calledTo}`).join(' · ')}</p>
                ) : null}
              </CardContent>
            ) : null}
          </Card>
        ))}
        {rows.length === 0 && <p className="text-sm text-muted-foreground">Queue empty.</p>}
      </div>
    </div>
  );
}
