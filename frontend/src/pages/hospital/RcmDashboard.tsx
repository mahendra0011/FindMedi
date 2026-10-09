import { useEffect, useState } from 'react';
import { IndianRupee, Radar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';
import { StatusPill } from '@/components/clinical/StatusAtoms';
import { CountUp, EmptyState } from '@/components/clinical/SharedStates';

/** File 16 §16.1: RCM pipeline stages + open gaps + detect + daily metrics. */
export default function RcmDashboard() {
  const [stages, setStages] = useState<any[]>([]);
  const [gaps, setGaps] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [kind, setKind] = useState('');

  const load = async () => {
    try {
      const [p, m]: any[] = await Promise.all([api.rcmPipeline(), api.rcmMetrics()]);
      setStages(p?.stages || []);
      setGaps(p?.gaps || []);
      setMetrics(m?.metrics || []);
    } catch { toast.error('Failed to load RCM'); }
  };
  useEffect(() => { load(); }, []);

  const detect = async () => {
    try {
      const r: any = await api.rcmDetect();
      toast.success(`${r?.opened || 0} gaps opened`);
      load();
    } catch (e: any) { toast.error(e?.message || 'Detect failed'); }
  };

  const close = async (id: string) => {
    try {
      await api.rcmCloseGap(id);
      toast.success('Gap closed');
      load();
    } catch { toast.error('Close failed'); }
  };

  const shown = kind ? gaps.filter((g) => g.kind === kind) : gaps;
  const atRisk = gaps.reduce((a, g) => a + Number(g.amount || 0), 0);

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center gap-2">
        <h1 className="flex items-center gap-2 text-lg font-bold"><IndianRupee size={18} /> Revenue cycle</h1>
        <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-800">₹<CountUp value={atRisk} /> at risk</span>
        <div className="flex-1" />
        <Button size="sm" onClick={detect}><Radar size={14} /> Run detectors</Button>
      </div>
      <div className="grid gap-2 md:grid-cols-4">
        {stages.map((s) => (
          <Card key={s._id}><CardContent className="p-3">
            <p className="text-xs text-muted-foreground">{s._id}</p>
            <p className="text-xl font-bold"><CountUp value={s.count} /></p>
            <p className="text-xs">₹{(s.amount || 0).toLocaleString('en-IN')}</p>
          </CardContent></Card>
        ))}
        {stages.length === 0 ? <p className="text-sm text-muted-foreground">No events in trailing 30 days — run detectors.</p> : null}
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-sm">Open gaps ({shown.length})
          <select className="rounded-md border px-2 py-1 text-xs font-normal" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="">all kinds</option>
            {['auth_pending', 'uncoded', 'unbilled', 'unclaimed', 'denial_open', 'ar_90', 'writeoff_review', 'settlement_pending'].map((k) => <option key={k}>{k}</option>)}
          </select>
        </CardTitle></CardHeader>
        <CardContent className="space-y-1.5">
          {shown.slice(0, 60).map((g) => (
            <div key={g._id} className="flex items-center justify-between rounded-md border p-2 text-xs">
              <span><StatusPill status={g.kind} /> {g.entityRef?.model} · ₹{(g.amount || 0).toLocaleString('en-IN')} · owner {g.ownerRole || '—'}</span>
              <Button size="sm" variant="outline" onClick={() => close(g._id)}>Close</Button>
            </div>
          ))}
          {shown.length === 0 ? <EmptyState title="No open gaps" /> : null}
        </CardContent>
      </Card>
      {metrics.length > 0 ? (
        <Card><CardHeader><CardTitle className="text-sm">Daily RCM metrics</CardTitle></CardHeader>
          <CardContent className="flex max-w-full gap-4 overflow-x-auto text-xs">
            {metrics.slice(0, 14).map((m) => (
              <div key={m.day} className="min-w-28 rounded border p-2">
                <p className="font-semibold">{m.day}</p>
                <p>billed ₹{(m.billed || 0).toLocaleString('en-IN')}</p>
                <p>collected ₹{(m.collected || 0).toLocaleString('en-IN')}</p>
              </div>
            ))}
          </CardContent></Card>
      ) : null}
    </div>
  );
}
