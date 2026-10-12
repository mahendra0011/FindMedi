import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Beaker, TrendingUp, Clock, IndianRupee, BarChart3, Activity, Loader2, FileBarChart, Play, AlertTriangle, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const REPORT_TYPES = [
  'Lab Statistics',
  'Lab Turnaround Time',
  'Lab Rejection Rate',
  'Lab Outsourcing',
  'Lab Section Workload',
];

const iso = (d: Date) => d.toISOString().slice(0, 10);

function flatten(value: any, prefix = ''): Array<[string, any]> {
  const rows: Array<[string, any]> = [];
  if (value === null || value === undefined) return rows;
  if (Array.isArray(value)) {
    rows.push([prefix || 'Items', `${value.length} record(s)`]);
    return rows;
  }
  if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      const key = prefix ? `${prefix} · ${k}` : k;
      if (v !== null && typeof v === 'object' && !Array.isArray(v)) rows.push(...flatten(v, key));
      else rows.push([key, Array.isArray(v) ? `${v.length} record(s)` : String(v)]);
    }
    return rows;
  }
  rows.push([prefix || 'Value', String(value)]);
  return rows;
}

export default function LabReportsAnalytics() {
  const today = new Date();
  const [range, setRange] = useState({ from: iso(new Date(today.getTime() - 30 * 86400000)), to: iso(today) });
  const [reportType, setReportType] = useState(REPORT_TYPES[0]);

  const { data: stats, isLoading: statsLoading } = useQuery({ queryKey: ['lab-stats'], queryFn: () => api.getLabStats() });
  const { data: tat } = useQuery({ queryKey: ['lab-tat'], queryFn: () => api.labTat() });
  const { data: ordersData } = useQuery({ queryKey: ['lab-orders'], queryFn: () => api.getLabOrders({}) });

  const genMut = useMutation({
    mutationFn: () => api.generateReport({ reportType, dateFrom: range.from, dateTo: range.to }),
    onSuccess: () => toast.success('Report generated'),
    onError: (e: any) => toast.error(e?.message || 'Report generation failed'),
  });

  const allOrders: any[] = ordersData?.orders || [];

  const popularTests = Object.values(
    allOrders.reduce((acc: any, o: any) => {
      for (const t of o.tests || []) {
        const key = t.testName || 'Unknown';
        acc[key] = acc[key] || { name: key, count: 0, revenue: 0 };
        acc[key].count += 1;
        acc[key].revenue += Number(t.price || 0);
      }
      return acc;
    }, {}),
  ) as Array<{ name: string; count: number; revenue: number }>;
  popularTests.sort((a, b) => b.count - a.count);

  const totalRevenue = allOrders.reduce((s: number, o: any) => s + Number(o.totalAmount || 0), 0);
  const maxRev = popularTests[0]?.count || 1;
  const tatRows = tat?.byPriority || { STAT: {}, Urgent: {}, Routine: {} };
  const avgTat = ['STAT', 'Urgent', 'Routine'].reduce((n, p) => {
    const v = tatRows[p]?.avgHrs;
    return v == null ? n : Math.max(n, Number(v));
  }, 0);

  const report: any = genMut.data;
  const reportRows: Array<[string, any]> = report?.data ? flatten(report.data) : [];
  const reportTable: Array<Record<string, any>> = (() => {
    if (!report?.data) return [];
    const arrKey = Object.keys(report.data).find(k => Array.isArray((report.data as any)[k]) && (report.data as any)[k].length && typeof (report.data as any)[k][0] === 'object');
    return arrKey ? (report.data as any)[arrKey] : [];
  })();

  const cards = [
    { label: 'Total Tests Conducted', value: stats?.total ?? 0, icon: Beaker, cls: 'from-primary/20 to-primary/5 border-primary/20', iconCls: 'text-primary' },
    { label: 'Completed', value: stats?.completed ?? 0, icon: TrendingUp, cls: 'from-success/20 to-success/5 border-success/20', iconCls: 'text-success' },
    { label: 'Pending / Processing', value: `${stats?.pending ?? 0} / ${stats?.processing ?? 0}`, icon: Activity, cls: 'from-info/20 to-info/5 border-info/20', iconCls: 'text-info' },
    { label: 'Avg TAT (worst SLA group)', value: avgTat ? `${avgTat} hrs` : '—', icon: Clock, cls: 'from-warning/20 to-warning/5 border-warning/20', iconCls: 'text-warning' },
    { label: 'Revenue (booked)', value: `₹${totalRevenue.toLocaleString()}`, icon: IndianRupee, cls: 'from-success/20 to-success/5 border-success/20', iconCls: 'text-success' },
    { label: 'Rejected Today', value: stats?.rejectedToday ?? 0, icon: AlertTriangle, cls: 'from-destructive/20 to-destructive/5 border-destructive/20', iconCls: 'text-destructive' },
  ];

  if (statsLoading) {
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
          <h1 className="font-heading text-2xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground">Lab performance metrics, TAT and generated reports</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="text-[11px] text-muted-foreground uppercase font-semibold">From</label>
            <Input type="date" value={range.from} onChange={e => setRange(r => ({ ...r, from: e.target.value }))} className="h-9 text-xs" />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground uppercase font-semibold">To</label>
            <Input type="date" value={range.to} onChange={e => setRange(r => ({ ...r, to: e.target.value }))} className="h-9 text-xs" />
          </div>
          <select value={reportType} onChange={e => setReportType(e.target.value)}
            className="h-9 px-3 rounded-lg border border-input bg-background text-xs">
            {REPORT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <Button size="sm" className="gap-1.5" disabled={genMut.isPending} onClick={() => genMut.mutate()}>
            {genMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Generate
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {cards.map((c, i) => (
          <motion.div key={c.label} whileHover={{ scale: 1.02 }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className={`bg-gradient-to-br rounded-2xl border p-5 ${c.cls}`}>
            <c.icon className={`w-7 h-7 mb-2 ${c.iconCls}`} />
            <p className="text-2xl font-bold text-foreground">{c.value}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </motion.div>
        ))}
      </div>

      {report && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-primary/30 p-6">
          <div className="flex items-center gap-2 mb-1">
            <FileBarChart className="w-5 h-5 text-primary" />
            <h2 className="font-heading font-semibold text-foreground">{report.reportType}</h2>
            <Badge className="bg-primary/10 text-primary border-0 text-[10px] ml-auto">
              {report.createdAt ? new Date(report.createdAt).toLocaleString() : 'just now'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-4">{report.summary}</p>

          {reportTable.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-border/60">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    {Object.keys(reportTable[0]).map(k => (
                      <th key={k} className="text-left px-4 py-2.5">{k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {reportTable.map((row, i) => (
                    <tr key={i} className="hover:bg-muted/30">
                      {Object.keys(reportTable[0]).map(k => (
                        <td key={k} className="px-4 py-2.5 text-foreground">{typeof row[k] === 'object' && row[k] !== null ? JSON.stringify(row[k]) : String(row[k] ?? '—')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
              {reportRows.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4 border-b border-border/40 py-1.5">
                  <span className="text-xs text-muted-foreground">{k}</span>
                  <span className="text-sm font-medium text-foreground">{v}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border/60 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-primary" />
            <h2 className="font-heading font-semibold text-foreground">Turnaround time vs SLA</h2>
          </div>
          <div className="space-y-4">
            {(['STAT', 'Urgent', 'Routine'] as const).map((p, i) => {
              const row = tatRows[p] || { n: 0, avgHrs: null };
              const sla = tat?.slaHours?.[p] ?? 0;
              const pct = sla ? Math.min(100, ((Number(row.avgHrs) || 0) / sla) * 100) : 0;
              const breach = Number(row.avgHrs) > sla;
              return (
                <div key={p}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-foreground">{p} <span className="text-muted-foreground font-normal">· {row.n} test(s)</span></span>
                    <span className={breach ? 'text-destructive font-semibold' : 'text-muted-foreground'}>
                      {row.avgHrs ?? '–'} hrs / {sla} hrs SLA
                    </span>
                  </div>
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: i * 0.06, duration: 0.5 }}
                      className={`h-full rounded-full ${breach ? 'bg-destructive' : 'bg-success'}`} />
                  </div>
                </div>
              );
            })}
            <p className="text-xs text-muted-foreground pt-1">
              {tat?.breached ?? 0} test line(s) breached SLA{tat?.slaHours ? ` (STAT <=${tat.slaHours.STAT}h · Urgent <=${tat.slaHours.Urgent}h · Routine <=${tat.slaHours.Routine}h)` : ''}
            </p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl border border-border/60 p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h2 className="font-heading font-semibold text-foreground">Most performed tests</h2>
            <span className="ml-auto text-xs text-muted-foreground">{popularTests.length} unique</span>
          </div>
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {popularTests.slice(0, 10).map((test, i) => (
              <div key={test.name} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-5 font-mono">{i + 1}</span>
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-foreground">{test.name}</span>
                    <span className="text-muted-foreground">{test.count}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${(test.count / maxRev) * 100}%` }} transition={{ delay: i * 0.05, duration: 0.5 }}
                      className="h-full bg-primary rounded-full" />
                  </div>
                  {test.revenue > 0 && (
                    <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
                      <span>{test.count} line(s)</span>
                      <span>₹{test.revenue.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {popularTests.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No test lines yet</p>
            )}
          </div>
        </motion.div>
      </div>

      <div className="bg-card rounded-2xl border border-border/60 p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-primary" />
          <h2 className="font-heading font-semibold text-foreground">Quick report types</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {REPORT_TYPES.map(t => (
            <Button key={t} size="sm" variant={reportType === t ? 'default' : 'outline'} className="gap-1.5 text-xs"
              onClick={() => { setReportType(t); genMut.mutate(); }} disabled={genMut.isPending}>
              <Download className="w-3.5 h-3.5" /> {t}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
