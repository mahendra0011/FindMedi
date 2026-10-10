import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BedDouble, Users, Wallet, CheckCircle, TrendingUp, TrendingDown, ListVideo, EyeOff, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '@/lib/api';

/**
 * File 09 §02 — hospital admin dashboard v2: live ops strip (single call),
 * money (billed/collected/outstanding), alerts action center, bed heatmap,
 * revenue split, TPA pipeline, staff on duty. Every tile degrades
 * independently (per-tile error flags from the backend).
 */
const inr = (n: any) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function HospitalDashboardV2() {
  const [ops, setOps] = useState<any>(null);
  const [rev, setRev] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [beds, setBeds] = useState<any>(null);
  const [staff, setStaff] = useState<any>(null);
  const [tpa, setTpa] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // File 22 P0-7: range + compare + live queue + per-user widget prefs.
  const [range, setRange] = useState('7');
  const [compare, setCompare] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [queue, setQueue] = useState<any>(null);
  const [hidden, setHidden] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('dashv2-hidden') || '[]'); } catch { return []; }
  });

  const toggleWidget = (k: string) => {
    setHidden((h) => {
      const next = h.includes(k) ? h.filter((x) => x !== k) : [...h, k];
      try { localStorage.setItem('dashv2-hidden', JSON.stringify(next)); } catch { /* noop */ }
      return next;
    });
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [o, r, b, s, t] = await Promise.all([
          (api as any).getOpsTiles().catch((e: any) => ({ _err: String(e?.message || e) })),
          (api as any).getRevenueSplit().catch((e: any) => ({ _err: String(e?.message || e) })),
          (api as any).getBedHeatmap().catch((e: any) => ({ _err: String(e?.message || e) })),
          (api as any).getStaffOnDuty().catch((e: any) => ({ _err: String(e?.message || e) })),
          (api as any).getTpaPipeline().catch((e: any) => ({ _err: String(e?.message || e) })),
        ]);
        if (cancelled) return;
        const errs: Record<string, string> = {};
        if (o?._err) errs.ops = o._err; else setOps(o?.data || o);
        if (r?._err) errs.rev = r._err; else setRev(r);
        if (b?._err) errs.beds = b._err; else setBeds(b);
        if (s?._err) errs.staff = s._err; else setStaff(s);
        if (t?._err) errs.tpa = t._err; else setTpa(t);
        setErrors(errs);
        const a: any = await (api as any).getDashAlerts().catch(() => null);
        if (!cancelled && a) setAlerts(a?.alerts || []);
      } catch { /* tiles degrade independently */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // Overview (range + compare) + live queue, refreshed with range/compare.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const to = new Date().toISOString().slice(0, 10);
      const from = new Date(Date.now() - (Number(range) - 1) * 86400000).toISOString().slice(0, 10);
      const [ov, q] = await Promise.all([
        api.getDashOverview({ from, to, compare: compare ? '1' : '0' }).catch(() => null),
        api.getDashQueue().catch(() => null),
      ]);
      if (cancelled) return;
      if (ov) setOverview(ov);
      if (q) setQueue(q);
    })();
    const t = setInterval(async () => {
      const q = await api.getDashQueue().catch(() => null);
      if (!cancelled && q) setQueue(q);
    }, 60000);
    return () => { cancelled = true; clearInterval(t); };
  }, [range, compare]);

  const ack = async (id: string) => {
    try {
      await (api as any).ackDashAlert(id, {});
      setAlerts((p) => p.filter((a) => String(a._id || a.id) !== String(id)));
    } catch { /* noop */ }
  };

  const money = ops?.money || {};

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">Hospital Overview</h1>
          <p className="text-sm text-muted-foreground">Live ops · money · alerts — one round-trip per section.</p>
        </div>
        <div className="flex items-center gap-2">
          <select aria-label="Range" className="h-9 rounded-md border px-2 text-sm" value={range} onChange={(e) => setRange(e.target.value)}>
            <option value="1">Today</option>
            <option value="7">7 days</option>
            <option value="30">30 days</option>
          </select>
          <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} /> compare</label>
          <Link to="/dashboard"><Button variant="outline" size="sm">Classic view</Button></Link>
        </div>
      </div>

      {/* P0-7: KPI overview with compare deltas + collection sparkline */}
      {!hidden.includes('kpis') && overview ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              Period {overview.from} → {overview.to}
              <Button size="sm" variant="ghost" onClick={() => toggleWidget('kpis')}><EyeOff size={13} /> hide</Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
              {[
                { k: 'collected', label: 'Collected', money: true },
                { k: 'billed', label: 'Billed', money: true },
                { k: 'appointments', label: 'Appointments', money: false },
                { k: 'admissions', label: 'Admissions', money: false },
              ].map(({ k, label, money: isMoney }) => {
                const v = overview.kpis?.[k];
                if (!v) return null;
                const up = (v.deltaPct ?? 0) >= 0;
                return (
                  <div key={k} className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-lg font-bold">{isMoney ? inr(v.value) : (v.value ?? 0).toLocaleString('en-IN')}</p>
                    {compare && v.deltaPct != null ? (
                      <p className={`flex items-center gap-1 text-xs font-semibold ${up ? 'text-green-700' : 'text-red-700'}`}>
                        {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}{Math.abs(v.deltaPct)}% vs prev
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={overview.spark || []}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d: string) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: any) => [`₹${Number(v).toLocaleString('en-IN')}`, 'collected']} />
                  <Area type="monotone" dataKey="paid" stroke="hsl(174,62%,38%)" fill="hsl(174,62%,38%,0.25)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ) : null}
      {hidden.includes('kpis') ? (
        <Button size="sm" variant="outline" onClick={() => toggleWidget('kpis')}>Show KPI overview</Button>
      ) : null}

      {/* P0-7: live OPD queue */}
      {!hidden.includes('queue') && queue ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2"><ListVideo size={15} /> Live OPD queue ({queue.total}) · longest wait {queue.longestMin}m</span>
              <Button size="sm" variant="ghost" onClick={() => toggleWidget('queue')}><EyeOff size={13} /> hide</Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {(queue.departments || []).map((d: any) => (
              <span key={d.dept} className="rounded-md border px-2.5 py-1 text-xs">
                <b>{d.dept}</b> · {d.waiting} waiting · longest {d.longestMin}m
              </span>
            ))}
            {!(queue.departments || []).length ? <p className="text-sm text-muted-foreground">Queue empty.</p> : null}
          </CardContent>
        </Card>
      ) : null}
      {hidden.includes('queue') ? (
        <Button size="sm" variant="outline" onClick={() => toggleWidget('queue')}>Show live queue</Button>
      ) : null}

      {/* Money row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Billed', value: inr(money.billed), icon: Wallet },
          { label: 'Collected', value: inr(money.collectedToday ?? money.collected), icon: CheckCircle },
          { label: 'Outstanding', value: inr(money.outstanding), icon: AlertTriangle },
          { label: 'Occupancy', value: `${ops?.beds?.occupancyPct ?? '—'}%`, icon: BedDouble },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <k.icon className="w-5 h-5 text-primary shrink-0" />
              <div><p className="text-xs text-muted-foreground">{k.label}</p><p className="text-lg font-bold">{k.value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>
      {errors.ops && <p className="text-xs text-destructive">Ops tiles failed: {errors.ops} <button className="underline" onClick={() => window.location.reload()}>retry</button></p>}

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Alerts */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-4 h-4" />Action center ({alerts.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-auto">
            {alerts.slice(0, 20).map((a: any) => (
              <div key={a._id || a.id} className="flex items-center gap-2 text-sm rounded-lg border border-border/50 p-2.5">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${a.severity === 'critical' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'}`}>{a.severity}</span>
                <span className="flex-1 min-w-0 truncate">{a.message || a.type}</span>
                <Button size="sm" variant="outline" onClick={() => ack(a._id || a.id)}>Ack</Button>
              </div>
            ))}
            {alerts.length === 0 && <p className="text-sm text-muted-foreground">All clear 🎉</p>}
          </CardContent>
        </Card>

        {/* Beds */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><BedDouble className="w-4 h-4" />Beds {beds ? `(ALOS ${beds.alosDays}d)` : ''}</CardTitle></CardHeader>
          <CardContent className="space-y-1.5 max-h-80 overflow-auto">
            {(beds?.wards || []).map((w: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="w-24 truncate font-medium">{w._id?.ward || 'Ward'}</span>
                <span className="text-muted-foreground">{w._id?.status}: <b className="text-foreground">{w.count}</b></span>
              </div>
            ))}
            {!(beds?.wards || []).length && <p className="text-sm text-muted-foreground">{errors.beds || 'No bed data.'}</p>}
          </CardContent>
        </Card>

        {/* Revenue */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Wallet className="w-4 h-4" />Revenue by source</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {(rev?.bySource || []).map((r: any, i: number) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="capitalize">{r._id || 'Other'}</span>
                <span className="font-bold">{inr(r.collected)} <span className="text-muted-foreground font-normal">/ {inr(r.billed)}</span></span>
              </div>
            ))}
            {!(rev?.bySource || []).length && <p className="text-sm text-muted-foreground">{errors.rev || 'No revenue data.'}</p>}
          </CardContent>
        </Card>

        {/* Staff + TPA */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4" />Staff</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>On leave today: <b>{staff?.onLeave ?? (errors.staff || '—')}</b></p>
            <div className="flex flex-wrap gap-1.5">
              {(staff?.byRole || []).map((r: any, i: number) => (
                <span key={i} className="text-[11px] bg-muted px-2 py-0.5 rounded-md">{r._id}: {r.count}</span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* File 22 P0-left: insurance pipeline funnel */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4" />Insurance pipeline</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Pre-auth</p>
            <div className="flex flex-wrap gap-1.5">
              {(tpa?.preauth || []).map((p: any, i: number) => (
                <span key={i} className="text-[11px] bg-muted px-2 py-0.5 rounded-md">{p._id}: {p.count} ({inr(p.amount || 0)})</span>
              ))}
              {!(tpa?.preauth || []).length && <span className="text-xs text-muted-foreground">No pre-auths</span>}
            </div>
            <p className="text-xs font-semibold uppercase text-muted-foreground pt-1">Claims</p>
            <div className="flex flex-wrap gap-1.5">
              {(tpa?.claims || []).map((c: any, i: number) => (
                <span key={i} className="text-[11px] bg-muted px-2 py-0.5 rounded-md">{c._id}: {c.count} ({inr(c.amount || 0)})</span>
              ))}
              {!(tpa?.claims || []).length && <span className="text-xs text-muted-foreground">No claims</span>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
