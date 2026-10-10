import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, TrendingDown, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '@/lib/api';

interface Kpi { value: number; prev: number | null; deltaPct: number | null }
interface SparkPoint { date: string; paid: number }
interface OverviewData {
  from: string;
  to: string;
  spanDays: number;
  kpis: Record<string, Kpi | undefined>;
  spark: SparkPoint[];
  prevWindow: { from: string; to: string } | null;
}

const inr = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const KPI_TILES = [
  { k: 'collected', label: 'Collected', money: true },
  { k: 'billed', label: 'Billed', money: true },
  { k: 'appointments', label: 'Appointments', money: false },
  { k: 'admissions', label: 'Admissions', money: false },
];

export default function DashboardOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('7');
  const [compare, setCompare] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const to = new Date().toISOString().slice(0, 10);
      const from = new Date(Date.now() - (Number(range) - 1) * 86400000).toISOString().slice(0, 10);
      try {
        const res = await api.getDashOverview({ from, to, compare: compare ? '1' : '0' });
        if (!cancelled) { setData(res as OverviewData); setError(''); }
      } catch (e) {
        if (!cancelled) { setData(null); setError(e instanceof Error ? e.message : 'Overview unavailable'); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [range, compare]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">Dashboard Overview</h1>
          <p className="text-sm text-muted-foreground">Collections, billed and activity for the selected window.</p>
        </div>
        <div className="flex items-center gap-2">
          <select aria-label="Range" className="h-9 rounded-md border px-2 text-sm" value={range} onChange={(e) => setRange(e.target.value)}>
            <option value="1">Today</option>
            <option value="7">7 days</option>
            <option value="30">30 days</option>
          </select>
          <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} /> compare</label>
          <Link to="/dashboard/v2"><Button variant="outline" size="sm"><ArrowLeft size={13} /> Dashboard</Button></Link>
        </div>
      </div>

      {error ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Overview could not be loaded — {error}. Open the V2 dashboard for the tiles that did load.
          </CardContent>
        </Card>
      ) : loading && !data ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">Loading overview…</CardContent></Card>
      ) : data ? (
        <Card>
            <CardHeader>
              <CardTitle className="text-base">Period {data.from} → {data.to} ({data.spanDays} day{data.spanDays === 1 ? '' : 's'})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {KPI_TILES.map(({ k, label, money: isMoney }) => {
                  const v = data.kpis?.[k];
                  const up = (v?.deltaPct ?? 0) >= 0;
                  return (
                    <div key={k} className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-lg font-bold">{isMoney ? inr(v?.value ?? 0) : (v?.value ?? 0).toLocaleString('en-IN')}</p>
                      {compare && v?.deltaPct != null ? (
                        <p className={`text-xs flex items-center gap-1 ${up ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {up ? '+' : ''}{v.deltaPct}% vs {data.prevWindow?.from ?? 'prev'} → {data.prevWindow?.to ?? ''}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">no comparison</p>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.spark}>
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} width={54} />
                    <Tooltip />
                    <Area type="monotone" dataKey="paid" stroke="#16a34a" fill="#16a34a" fillOpacity={0.15} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
      ) : null}
    </div>
  );
}
