import { useEffect, useState } from 'react';
import { Gauge, Brain, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';
import { CountUp } from '@/components/clinical/SharedStates';

/**
 * File 17 §17.2/§17.3/§17.4: KPI compute (nulls shown as —, never faked),
 * daily metrics, AI panel (discharge draft, no-show, forecast, log).
 */
const KPI_LABELS: Record<string, string> = {
  bed_occupancy: 'Bed occupancy %', avg_los: 'Avg LOS (days)', collection_ratio: 'Collection %',
  denial_rate: 'Denial %', opd_wait_p50: 'OPD wait p50', left_without_seen: 'LWBS %',
  lab_tat_breach: 'Lab TAT breach %', ot_utilization: 'OT utilization %',
  readmit_30: '30-day readmit %', recall_conversion: 'Recall conversion %',
};

export default function KpiDashboard() {
  const [kpis, setKpis] = useState<Record<string, number | null>>({});
  const [days, setDays] = useState<any[]>([]);
  const [invs, setInvs] = useState<any[]>([]);
  const [draft, setDraft] = useState('');
  const [draftFields, setDraftFields] = useState({ diagnosis: '', procedures: '', course: '', meds: '', followUp: '' });
  const [ns, setNs] = useState<any | null>(null);
  const [nsForm, setNsForm] = useState({ pastNoShows: '1', pastVisits: '5', leadDays: '3', hour: '10' });
  const [fc, setFc] = useState<any | null>(null);
  const [fcCounts, setFcCounts] = useState('22,25,21,28');

  const load = async () => {
    try {
      const [k, d, a]: any[] = await Promise.all([api.kpiCompute(), api.dailyMetrics(), api.aiInvocations()]);
      setKpis(k?.kpis || {});
      setDays(d?.days || []);
      setInvs(a?.invocations || []);
    } catch { toast.error('Failed to load KPIs'); }
  };
  useEffect(() => { load(); }, []);

  const doDraft = async () => {
    try {
      const r: any = await api.aiDischargeDraft(draftFields);
      setDraft(r?.draft || '');
      toast.success(`Draft ready (${r?.provider}, redacted: ${r?.redacted ? 'yes' : 'no'})`);
      load();
    } catch (e: any) { toast.error(e?.message || 'Draft failed (AI disabled?)'); }
  };

  const doNs = async () => {
    try {
      const r: any = await api.aiNoshow({
        pastNoShows: Number(nsForm.pastNoShows), pastVisits: Number(nsForm.pastVisits),
        leadDays: Number(nsForm.leadDays), hour: Number(nsForm.hour),
      });
      setNs(r);
    } catch { toast.error('Score failed'); }
  };

  const doFc = async () => {
    try {
      const counts = fcCounts.split(',').map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n));
      const r: any = await api.aiForecast(counts);
      setFc(r);
    } catch { toast.error('Forecast failed'); }
  };

  return (
    <div className="space-y-3 p-4">
      <h1 className="flex items-center gap-2 text-lg font-bold"><Gauge size={18} /> KPIs & intelligence</h1>
      <div className="grid gap-2 md:grid-cols-5">
        {Object.entries(KPI_LABELS).map(([k, label]) => (
          <Card key={k}><CardContent className="p-3">
            <p className="text-[11px] text-muted-foreground">{label}</p>
            <p className="text-xl font-bold">{kpis[k] == null ? <span className="text-muted-foreground">—</span> : <CountUp value={kpis[k] as number} />}</p>
          </CardContent></Card>
        ))}
      </div>
      {days.length > 0 ? (
        <Card><CardHeader><CardTitle className="text-sm">Daily metrics</CardTitle></CardHeader>
          <CardContent className="flex gap-3 overflow-x-auto text-xs">
            {days.slice(0, 10).map((d) => (
              <div key={d.day} className="min-w-32 rounded border p-2">
                <p className="font-semibold">{d.day}</p>
                <p>billed ₹{(d.metrics?.billed || 0).toLocaleString('en-IN')}</p>
                <p>collected ₹{(d.metrics?.collected || 0).toLocaleString('en-IN')}</p>
                <p>admissions {d.metrics?.admissions ?? 0}</p>
              </div>
            ))}
          </CardContent></Card>
      ) : null}
      <div className="grid gap-3 lg:grid-cols-3">
        <Card><CardHeader><CardTitle className="flex items-center gap-1 text-sm"><Brain size={14} /> Discharge draft</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {Object.keys(draftFields).map((f) => (
              <Input key={f} className="h-8 text-xs" placeholder={f} value={(draftFields as any)[f]} onChange={(e) => setDraftFields({ ...draftFields, [f]: e.target.value })} />
            ))}
            <Button size="sm" onClick={doDraft}>Draft (stub provider, logged)</Button>
            {draft ? <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded border bg-muted/40 p-2 text-xs">{draft}</pre> : null}
          </CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-1 text-sm"><TrendingUp size={14} /> No-show + forecast</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            <div className="flex gap-1">
              {Object.keys(nsForm).map((f) => (
                <Input key={f} className="h-8 text-xs" placeholder={f} value={(nsForm as any)[f]} onChange={(e) => setNsForm({ ...nsForm, [f]: e.target.value })} />
              ))}
            </div>
            <Button size="sm" onClick={doNs}>Score</Button>
            {ns ? <p className="text-sm">No-show risk: <b>{ns.score}/100</b></p> : null}
            <div className="flex gap-1 border-t pt-2">
              <Input className="h-8 font-mono text-xs" value={fcCounts} onChange={(e) => setFcCounts(e.target.value)} />
              <Button size="sm" onClick={doFc}>Forecast</Button>
            </div>
            {fc ? <p className="text-sm">Forecast: <b>{fc.forecast}</b> <span className="text-muted-foreground">({fc.basis})</span></p> : null}
          </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">AI invocations ({invs.length})</CardTitle></CardHeader>
          <CardContent className="max-h-64 space-y-1 overflow-auto">
            {invs.map((a) => (
              <p key={a._id} className="rounded border px-2 py-1 font-mono text-[11px]">{a.feature} · {a.provider} · {a.ok ? 'ok' : `ERR ${a.error}`} · {String(a.createdAt).slice(0, 16)}</p>
            ))}
            {invs.length === 0 ? <p className="text-xs text-muted-foreground">No invocations yet.</p> : null}
          </CardContent></Card>
      </div>
    </div>
  );
}
