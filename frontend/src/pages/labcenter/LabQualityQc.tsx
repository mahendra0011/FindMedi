import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Activity, FlaskConical, Loader2, Plus, AlertTriangle, CheckCircle2, Gauge, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const LEVELS = ['L1', 'L2', 'L3'];

export default function LabQualityQc() {
  const qc = useQueryClient();
  const [form, setForm] = useState<any>({ analyzer: '', testName: '', controlLevel: 'L1', mean: '', sd: '', value: '' });
  const [chartSel, setChartSel] = useState({ testName: '', analyzer: '' });

  const { data: testsData } = useQuery({ queryKey: ['lab-tests'], queryFn: () => api.getLabTests() });
  const { data: equipmentData } = useQuery({ queryKey: ['lab-equipment'], queryFn: () => api.getLabEquipment({}) });

  const tests: any[] = testsData?.tests || testsData?.items || (Array.isArray(testsData) ? testsData : []);
  const equipment: any[] = equipmentData?.equipment || [];

  const { data: chart, isLoading: chartLoading, isFetching: chartFetching } = useQuery({
    queryKey: ['qc-chart', chartSel.testName, chartSel.analyzer],
    queryFn: () => api.qcChart({ testName: chartSel.testName, ...(chartSel.analyzer ? { analyzer: chartSel.analyzer } : {}) }),
    enabled: Boolean(chartSel.testName),
  });

  const createMut = useMutation({
    mutationFn: () => api.qcCreate({
      analyzer: form.analyzer || '',
      testName: form.testName,
      controlLevel: form.controlLevel,
      mean: Number(form.mean),
      sd: Number(form.sd),
      value: Number(form.value),
    }),
    onSuccess: () => {
      toast.success('QC run recorded');
      qc.invalidateQueries({ queryKey: ['qc-chart'] });
      setChartSel({ testName: form.testName, analyzer: form.analyzer });
      setForm((f: any) => ({ ...f, value: '' }));
    },
    onError: (e: any) => toast.error(e?.message || 'QC run failed to save'),
  });

  const points: any[] = chart?.points || [];
  const geom = useMemo(() => {
    if (!points.length) return null;
    const mean = points[points.length - 1].mean;
    const sd = points[points.length - 1].sd;
    if (!(sd > 0)) return { mean, sd: 0, min: mean - 1, max: mean + 1 };
    const min = Math.min(...points.map(p => p.value), mean - 3.5 * sd);
    const max = Math.max(...points.map(p => p.value), mean + 3.5 * sd);
    return { mean, sd, min, max };
  }, [points]);

  const W = 720;
  const H = 260;
  const y = (v: number) => {
    if (!geom) return H / 2;
    const pad = 16;
    return pad + ((geom.max - v) / (geom.max - geom.min || 1)) * (H - pad * 2);
  };
  const x = (i: number) => points.length <= 1 ? W / 2 : 40 + (i / (points.length - 1)) * (W - 70);

  const flagged = points.filter(p => (p.flags || []).length);
  const valid = form.testName && Number(form.mean) > 0 && Number(form.sd) >= 0 && form.value !== '' && !Number.isNaN(Number(form.value));

  const cards = [
    { label: 'Runs charted', value: points.length, icon: History, cls: 'text-primary' },
    { label: 'Westgard violations', value: chart?.violations ?? 0, icon: AlertTriangle, cls: 'text-destructive' },
    { label: 'Mean', value: geom ? geom.mean : '—', icon: Gauge, cls: 'text-info' },
    { label: 'SD', value: geom && geom.sd ? geom.sd : '—', icon: Activity, cls: 'text-warning' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Quality Control</h1>
        <p className="text-muted-foreground">Record control runs and monitor Levey-Jennings / Westgard rules</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <motion.div key={c.label} whileHover={{ scale: 1.02 }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-card rounded-2xl border border-border/60 p-4">
            <c.icon className={`w-6 h-6 mb-2 ${c.cls}`} />
            <p className="text-2xl font-bold text-foreground">{c.value}</p>
            <p className="text-[11px] text-muted-foreground uppercase font-semibold">{c.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card rounded-2xl border border-border/60 p-6 lg:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <FlaskConical className="w-5 h-5 text-primary" />
            <h2 className="font-heading font-semibold text-foreground">Record a QC run</h2>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Test</label>
              <select value={form.testName} onChange={e => setForm((f: any) => ({ ...f, testName: e.target.value }))}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                <option value="">Select test...</option>
                {tests.map((t: any) => <option key={t._id || t.name} value={t.name}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Analyzer</label>
              <select value={form.analyzer} onChange={e => setForm((f: any) => ({ ...f, analyzer: e.target.value }))}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                <option value="">No analyzer / manual</option>
                {equipment.map((eq: any) => <option key={eq._id} value={eq.name}>{eq.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Control level</label>
              <div className="grid grid-cols-3 gap-2">
                {LEVELS.map(l => (
                  <Button key={l} size="sm" variant={form.controlLevel === l ? 'default' : 'outline'}
                    onClick={() => setForm((f: any) => ({ ...f, controlLevel: l }))}>{l}</Button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Mean</label>
                <Input type="number" step="any" value={form.mean} onChange={e => setForm((f: any) => ({ ...f, mean: e.target.value }))} placeholder="100" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">SD</label>
                <Input type="number" step="any" value={form.sd} onChange={e => setForm((f: any) => ({ ...f, sd: e.target.value }))} placeholder="2" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Observed value</label>
              <Input type="number" step="any" value={form.value} onChange={e => setForm((f: any) => ({ ...f, value: e.target.value }))} placeholder="103.4" />
            </div>
            <Button className="w-full gap-1.5" disabled={!valid || createMut.isPending} onClick={() => createMut.mutate()}>
              {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Record run
            </Button>
            <p className="text-[11px] text-muted-foreground">
              Westgard flags (1-2s, 1-3s, R-4s) are computed by the lab service on read.
            </p>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border/60 p-6 lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              <h2 className="font-heading font-semibold text-foreground">Levey-Jennings chart</h2>
            </div>
            <div className="flex gap-2 sm:ml-auto">
              <select value={chartSel.testName} onChange={e => setChartSel(s => ({ ...s, testName: e.target.value }))}
                className="h-9 px-3 rounded-lg border border-input bg-background text-xs">
                <option value="">Select test...</option>
                {tests.map((t: any) => <option key={t._id || t.name} value={t.name}>{t.name}</option>)}
              </select>
              <select value={chartSel.analyzer} onChange={e => setChartSel(s => ({ ...s, analyzer: e.target.value }))}
                className="h-9 px-3 rounded-lg border border-input bg-background text-xs">
                <option value="">All analyzers</option>
                {equipment.map((eq: any) => <option key={eq._id} value={eq.name}>{eq.name}</option>)}
              </select>
            </div>
          </div>

          {!chartSel.testName ? (
            <div className="py-16 text-center text-muted-foreground">
              <FlaskConical className="w-12 h-12 mx-auto mb-3 opacity-30" />
              Pick a test to plot its control history
            </div>
          ) : chartLoading || chartFetching ? (
            <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : !points.length ? (
            <div className="py-16 text-center text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              No QC runs recorded for this test yet
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-64" role="img" aria-label="Levey-Jennings chart">
                  {[3, 2, 1, 0, -1, -2, -3].map(k => {
                    const val = geom!.mean + k * geom!.sd;
                    const yy = y(val);
                    const lineColor = Math.abs(k) === 3 ? 'stroke-destructive/40' : Math.abs(k) === 2 ? 'stroke-warning/40' : k === 0 ? 'stroke-primary/70' : 'stroke-border';
                    return (
                      <g key={k}>
                        <line x1={36} x2={W - 20} y1={yy} y2={yy} stroke="currentColor" strokeWidth={k === 0 ? 1.5 : 1}
                          className={lineColor} strokeDasharray={Math.abs(k) === 3 || Math.abs(k) === 2 ? '5 4' : k === 0 ? '' : '2 4'} />
                        <text x={8} y={yy + 3} fontSize="9" fill="currentColor" className="text-muted-foreground">
                          {k === 0 ? 'μ' : k > 0 ? `+${k}sd` : `${k}sd`}
                        </text>
                      </g>
                    );
                  })}
                  <polyline fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground/60"
                    points={points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ')} />
                  {points.map((p, i) => {
                    const bad = (p.flags || []).length > 0;
                    return (
                      <circle key={i} cx={x(i)} cy={y(p.value)} r={bad ? 5.5 : 4}
                        fill={bad ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'}
                        stroke="hsl(var(--card))" strokeWidth="1.5">
                        <title>{`${new Date(p.at).toLocaleString()} · ${p.value} (${(p.flags || []).join(', ') || 'in control'})`}</title>
                      </circle>
                    );
                  })}
                  {points.map((p, i) => (p.flags || []).length ? (
                    <text key={`f${i}`} x={x(i)} y={y(p.value) - 10} fontSize="9" textAnchor="middle" className="fill-destructive">
                      {(p.flags || []).join('/')}
                    </text>
                  ) : null)}
                </svg>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" /> In control</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-destructive inline-block" /> Westgard flag</span>
                <span className="ml-auto">{flagged.length} flagged of {points.length} run(s)</span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-border/60 mt-4">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="text-left px-4 py-2.5">#</th>
                      <th className="text-left px-4 py-2.5">Run at</th>
                      <th className="text-right px-4 py-2.5">Value</th>
                      <th className="text-right px-4 py-2.5">Mean</th>
                      <th className="text-right px-4 py-2.5">SD</th>
                      <th className="text-right px-4 py-2.5">Z</th>
                      <th className="text-left px-4 py-2.5">Flags</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {[...points].reverse().map((p, i) => {
                      const z = p.sd > 0 ? ((p.value - p.mean) / p.sd) : 0;
                      const bad = (p.flags || []).length > 0;
                      return (
                        <tr key={i} className="hover:bg-muted/30">
                          <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{points.length - i}</td>
                          <td className="px-4 py-2 text-foreground">{new Date(p.at).toLocaleString()}</td>
                          <td className="px-4 py-2 text-right font-medium text-foreground">{p.value}</td>
                          <td className="px-4 py-2 text-right text-muted-foreground">{p.mean}</td>
                          <td className="px-4 py-2 text-right text-muted-foreground">{p.sd}</td>
                          <td className="px-4 py-2 text-right font-mono">{z.toFixed(2)}</td>
                          <td className="px-4 py-2">
                            {bad ? (
                              <Badge className="bg-destructive/10 text-destructive border-0 text-[10px]">{(p.flags || []).join(', ')}</Badge>
                            ) : (
                              <Badge className="bg-success/10 text-success border-0 text-[10px]">In control</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
