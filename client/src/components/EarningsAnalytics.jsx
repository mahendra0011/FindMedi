import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Wallet, IndianRupee, Clock, Award, ArrowUpRight, ArrowDownRight,
  CreditCard, Smartphone, Landmark, Banknote, Sparkles,
  Stethoscope, Receipt, TrendingUp, Trophy, Target, Activity,
  CalendarDays, CalendarRange,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const STATUS_META = {
  Paid: { color: 'hsl(var(--success))', dot: 'bg-success' },
  Pending: { color: 'hsl(var(--warning))', dot: 'bg-warning' },
  Partial: { color: 'hsl(var(--info))', dot: 'bg-info' },
  Overdue: { color: 'hsl(var(--destructive))', dot: 'bg-destructive' },
};

const METHOD_META = {
  card: { label: 'Card', icon: CreditCard, color: 'hsl(var(--primary))' },
  upi: { label: 'UPI', icon: Smartphone, color: 'hsl(var(--success))' },
  netbanking: { label: 'Netbanking', icon: Landmark, color: 'hsl(var(--info))' },
  cash: { label: 'Cash', icon: Banknote, color: 'hsl(var(--warning))' },
};

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function ChartTooltip({ active, payload, label, prefix = '₹' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border/60 bg-card px-3 py-2 shadow-lg text-sm">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="font-semibold text-foreground">
          {prefix}{Number(p.value || 0).toLocaleString('en-IN')}
        </p>
      ))}
    </div>
  );
}

function SectionCard({ title, subtitle, children, className = '', action }) {
  return (
    <div className={`bg-card rounded-2xl border border-border/60 p-6 transition-shadow hover:shadow-lg hover:shadow-primary/5 ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-heading text-base font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

/**
 * Drop-in Earnings Analytics section.
 * Pass the `bills` array you already fetch on the dashboard (api.getBilling()),
 * and optionally `payments` (needs a `.method` field: card/upi/netbanking/cash)
 * for the payment-method breakdown card.
 */
export default function EarningsAnalytics({ bills = [], payments = [], title = 'Earnings Analytics' }) {
  const [range, setRange] = useState('6m'); // '6m' | '30d'

  const stats = useMemo(() => {
    const totalBilled = bills.reduce((s, b) => s + (Number(b.amount) || 0), 0);
    const totalEarned = bills.reduce((s, b) => s + (Number(b.paid) || 0), 0);
    const pending = Math.max(totalBilled - totalEarned, 0);
    const collectionRate = totalBilled > 0 ? Math.round((totalEarned / totalBilled) * 100) : 0;

    // --- monthly trend (last 6 months) ---
    const now = new Date();
    const monthlyMap = {};
    bills.forEach((b) => {
      if (!b.date) return;
      const key = String(b.date).slice(0, 7); // YYYY-MM
      if (!monthlyMap[key]) monthlyMap[key] = { earned: 0, billed: 0, count: 0 };
      monthlyMap[key].earned += Number(b.paid) || 0;
      monthlyMap[key].billed += Number(b.amount) || 0;
      if (Number(b.paid) > 0) monthlyMap[key].count += 1;
    });
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyTrend.push({
        label: MONTH_LABELS[d.getMonth()],
        earned: monthlyMap[key]?.earned || 0,
        billed: monthlyMap[key]?.billed || 0,
      });
    }
    const thisMonth = monthlyTrend[monthlyTrend.length - 1]?.earned || 0;
    const lastMonth = monthlyTrend[monthlyTrend.length - 2]?.earned || 0;
    const growth = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : (thisMonth > 0 ? 100 : 0);

    // --- last 7 days ---
    const dailyMap = {};
    bills.forEach((b) => {
      if (!b.date) return;
      dailyMap[b.date] = (dailyMap[b.date] || 0) + (Number(b.paid) || 0);
    });
    const weekly = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      weekly.push({ label: DAY_LABELS[d.getDay()], earned: dailyMap[key] || 0 });
    }
    const bestDay = [...weekly].sort((a, b) => b.earned - a.earned)[0];

    // --- today / this week / this month ---
    const todayEarned = dailyMap[now.toISOString().slice(0, 10)] || 0;
    const weekEarned = weekly.reduce((s, d) => s + d.earned, 0);
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthEarned = monthlyMap[monthKey]?.earned || 0;
    const monthBilled = monthlyMap[monthKey]?.billed || 0;

    // --- status breakdown ---
    const statusCounts = {};
    bills.forEach((b) => {
      const s = b.status || 'Pending';
      statusCounts[s] = (statusCounts[s] || 0) + (Number(b.amount) || 0);
    });
    const statusData = Object.entries(statusCounts)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value, color: STATUS_META[name]?.color || 'hsl(var(--muted-foreground))' }));

    // --- payment methods (optional) ---
    const methodCounts = {};
    payments.forEach((p) => {
      const m = (p.method || 'cash').toLowerCase();
      methodCounts[m] = (methodCounts[m] || 0) + (Number(p.amount) || 0);
    });
    const totalMethodAmt = Object.values(methodCounts).reduce((s, v) => s + v, 0);
    const methodData = Object.entries(methodCounts).map(([key, amount]) => ({
      key, amount, pct: totalMethodAmt > 0 ? Math.round((amount / totalMethodAmt) * 100) : 0,
    })).sort((a, b) => b.amount - a.amount);

    // --- top services ---
    const serviceCounts = {};
    bills.forEach((b) => {
      const name = b.service || 'General';
      serviceCounts[name] = (serviceCounts[name] || 0) + (Number(b.paid) || 0);
    });
    const topServices = Object.entries(serviceCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    const topServiceMax = topServices[0]?.value || 1;

    // --- transactions count + avg ticket ---
    const txCount = bills.filter((b) => Number(b.paid) > 0).length;
    const avgTicket = txCount > 0 ? Math.round(totalEarned / txCount) : 0;

    // --- monthly goal (target = 120% of last month, fallback 25k) ---
    const goal = lastMonth > 0 ? Math.round(lastMonth * 1.2) : 25000;
    const goalPct = goal > 0 ? Math.min(Math.round((thisMonth / goal) * 100), 100) : 0;

    // --- recent transactions ---
    const recent = [...bills]
      .filter((b) => b.date)
      .sort((a, b) => (b.date > a.date ? 1 : -1))
      .slice(0, 5);

    return { totalBilled, totalEarned, pending, collectionRate, monthlyTrend, weekly, growth, statusData, methodData, topServices, topServiceMax, txCount, avgTicket, bestDay, goal, goalPct, thisMonth, todayEarned, weekEarned, monthEarned, monthBilled, recent };
  }, [bills, payments]);

  const chartData = range === '6m' ? stats.monthlyTrend : stats.weekly;

  const insights = [
    { icon: Receipt, label: 'Total Billed', value: `₹${stats.totalBilled.toLocaleString('en-IN')}`, tint: 'text-primary bg-primary/10' },
    { icon: Activity, label: 'Transactions', value: stats.txCount.toLocaleString('en-IN'), tint: 'text-success bg-success/10' },
    { icon: TrendingUp, label: 'Avg Ticket', value: `₹${stats.avgTicket.toLocaleString('en-IN')}`, tint: 'text-warning bg-warning/10' },
    { icon: Trophy, label: 'Best Day', value: stats.bestDay?.earned > 0 ? stats.bestDay.label : '—', tint: 'text-info bg-info/10' },
  ];

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <h2 className="font-heading text-xl font-bold text-foreground">{title}</h2>
            <p className="text-xs text-muted-foreground">Live snapshot of your billing performance</p>
          </div>
        </div>
        <div className="flex gap-1 bg-muted/50 rounded-lg p-1 w-fit">
          {[{ k: '6m', l: '6 Months' }, { k: '30d', l: '7 Days' }].map((opt) => (
            <button
              key={opt.k}
              onClick={() => setRange(opt.k)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                range === opt.k ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.l}
            </button>
          ))}
        </div>
      </div>

      {/* Hero stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div whileHover={{ y: -3 }} className="relative overflow-hidden rounded-2xl border border-success/20 bg-gradient-to-br from-success/15 via-success/5 to-transparent p-5">
          <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-success/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-success/15 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-success" />
              </div>
              <span className={`flex items-center gap-0.5 text-xs font-semibold ${stats.growth >= 0 ? 'text-success' : 'text-destructive'}`}>
                {stats.growth >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {Math.abs(stats.growth)}%
              </span>
            </div>
            <p className="font-heading text-2xl font-bold text-foreground">₹{stats.totalEarned.toLocaleString('en-IN')}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Earned</p>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -3 }} className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-5">
          <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-primary/10 blur-2xl" />
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center mb-3">
              <IndianRupee className="w-5 h-5 text-primary" />
            </div>
            <p className="font-heading text-2xl font-bold text-foreground">₹{stats.monthEarned.toLocaleString('en-IN')}</p>
            <p className="text-xs text-muted-foreground mt-1">This Month</p>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -3 }} className="relative overflow-hidden rounded-2xl border border-info/20 bg-gradient-to-br from-info/15 via-info/5 to-transparent p-5">
          <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-info/10 blur-2xl" />
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-info/15 flex items-center justify-center mb-3">
              <CalendarRange className="w-5 h-5 text-info" />
            </div>
            <p className="font-heading text-2xl font-bold text-foreground">₹{stats.weekEarned.toLocaleString('en-IN')}</p>
            <p className="text-xs text-muted-foreground mt-1">This Week</p>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -3 }} className="relative overflow-hidden rounded-2xl border border-warning/20 bg-gradient-to-br from-warning/15 via-warning/5 to-transparent p-5">
          <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-warning/10 blur-2xl" />
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-warning/15 flex items-center justify-center mb-3">
              <CalendarDays className="w-5 h-5 text-warning" />
            </div>
            <p className="font-heading text-2xl font-bold text-foreground">₹{stats.todayEarned.toLocaleString('en-IN')}</p>
            <p className="text-xs text-muted-foreground mt-1">Today</p>
          </div>
        </motion.div>
      </div>

      {/* Pending + Collection rate */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div whileHover={{ y: -3 }} className="relative overflow-hidden rounded-2xl border border-warning/20 bg-gradient-to-br from-warning/10 via-warning/5 to-transparent p-5">
          <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-warning/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-warning/15 flex items-center justify-center">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="font-heading text-xl font-bold text-foreground">₹{stats.pending.toLocaleString('en-IN')}</p>
                <p className="text-xs text-muted-foreground">Pending Collection</p>
              </div>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${stats.totalBilled > 0 ? Math.min(Math.round((stats.pending / stats.totalBilled) * 100), 100) : 0}%` }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                className="h-full rounded-full bg-warning"
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">{stats.totalBilled > 0 ? Math.round((stats.pending / stats.totalBilled) * 100) : 0}% of billed is outstanding</p>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -3 }} className="relative overflow-hidden rounded-2xl border border-info/20 bg-gradient-to-br from-info/10 via-info/5 to-transparent p-5">
          <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-info/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-info/15 flex items-center justify-center">
                <Award className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="font-heading text-xl font-bold text-foreground">{stats.collectionRate}%</p>
                <p className="text-xs text-muted-foreground">Collection Rate</p>
              </div>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${stats.collectionRate}%` }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                className="h-full rounded-full bg-info"
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">{stats.collectionRate >= 70 ? 'Healthy collection performance' : 'Keep following up on pending bills'}</p>
          </div>
        </motion.div>
      </div>

      {/* Mini insights strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {insights.map((ins) => {
          const Icon = ins.icon;
          return (
            <div key={ins.label} className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/60 px-4 py-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${ins.tint}`}>
                <Icon className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground truncate">{ins.label}</p>
                <p className="font-heading text-sm font-bold text-foreground truncate">{ins.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Trend chart */}
      <SectionCard
        title="Earnings Trend"
        subtitle={range === '6m' ? 'Last 6 months' : 'Last 7 days'}
        action={<span className="text-xs font-medium text-success bg-success/10 px-2 py-1 rounded-full">{stats.growth >= 0 ? '▲' : '▼'} {Math.abs(stats.growth)}% vs last</span>}
      >
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="earningsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="earned" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#earningsFill)" activeDot={{ r: 5, fill: 'hsl(var(--primary))' }} />
          </AreaChart>
        </ResponsiveContainer>
      </SectionCard>

      {/* Status donut + weekly bars */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Signature donut with center collection-rate label */}
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border/60 p-6 transition-shadow hover:shadow-lg hover:shadow-primary/5">
          <h3 className="font-heading text-base font-semibold text-foreground mb-4">Payment Status</h3>
          <div className="relative">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={stats.statusData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={90} paddingAngle={3} strokeWidth={0}>
                  {stats.statusData.map((d) => <Cell key={d.name} fill={d.color} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="font-heading text-2xl font-bold text-foreground">{stats.collectionRate}%</p>
              <p className="text-[11px] text-muted-foreground">Collected</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {stats.statusData.length === 0 ? (
              <p className="text-xs text-muted-foreground col-span-2 text-center py-2">No billing data yet</p>
            ) : stats.statusData.map((d) => (
              <div key={d.name} className="flex items-center gap-2 text-sm">
                <span className={`w-2.5 h-2.5 rounded-full ${STATUS_META[d.name]?.dot || 'bg-muted-foreground'}`} />
                <span className="text-muted-foreground">{d.name}</span>
                <span className="ml-auto font-medium text-foreground">₹{d.value.toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly bars */}
        <div className="lg:col-span-3 bg-card rounded-2xl border border-border/60 p-6 transition-shadow hover:shadow-lg hover:shadow-primary/5">
          <h3 className="font-heading text-base font-semibold text-foreground mb-4">Last 7 Days</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.weekly} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="earned" fill="hsl(var(--success))" radius={[6, 6, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top services + monthly goal */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <SectionCard title="Top Services" subtitle="By earnings" className="lg:col-span-3">
          {stats.topServices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No service earnings yet</p>
          ) : (
            <div className="space-y-4">
              {stats.topServices.map((svc, i) => (
                <div key={svc.name}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="flex items-center gap-2 text-foreground font-medium min-w-0">
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${i === 0 ? 'bg-success/15 text-success' : i === 1 ? 'bg-primary/15 text-primary' : i === 2 ? 'bg-warning/15 text-warning' : 'bg-muted text-muted-foreground'}`}>
                        {i + 1}
                      </span>
                      <Stethoscope className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="truncate">{svc.name}</span>
                    </span>
                    <span className="text-muted-foreground shrink-0 ml-3">₹{svc.value.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.round((svc.value / stats.topServiceMax) * 100)}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className={`h-full rounded-full ${i === 0 ? 'bg-success' : i === 1 ? 'bg-primary' : i === 2 ? 'bg-warning' : 'bg-muted-foreground/40'}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Monthly Goal" subtitle={`Target ₹${stats.goal.toLocaleString('en-IN')} for this month`} className="lg:col-span-2">
          <div className="relative">
            <div className="relative h-40 rounded-xl bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border border-primary/20 flex flex-col items-center justify-center">
              <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-primary/10 blur-2xl" />
              <Target className="w-7 h-7 text-primary mb-2" />
              <p className="font-heading text-3xl font-bold text-foreground">₹{stats.thisMonth.toLocaleString('en-IN')}</p>
              <p className="text-xs text-muted-foreground mt-1">of ₹{stats.goal.toLocaleString('en-IN')} goal</p>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-semibold text-primary">{stats.goalPct}%</span>
              </div>
              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.goalPct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-primary to-success"
                />
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Payment methods + recent transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {stats.methodData.length > 0 && (
          <div className="lg:col-span-2 bg-card rounded-2xl border border-border/60 p-6 transition-shadow hover:shadow-lg hover:shadow-primary/5">
            <h3 className="font-heading text-base font-semibold text-foreground mb-4">Payment Methods</h3>
            <div className="space-y-4">
              {stats.methodData.map((m) => {
                const meta = METHOD_META[m.key] || METHOD_META.cash;
                const Icon = meta.icon;
                return (
                  <div key={m.key}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="flex items-center gap-2 text-foreground font-medium">
                        <Icon className="w-4 h-4" style={{ color: meta.color }} />
                        {meta.label}
                      </span>
                      <span className="text-muted-foreground">₹{m.amount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${m.pct}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: meta.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className={`bg-card rounded-2xl border border-border/60 p-6 transition-shadow hover:shadow-lg hover:shadow-primary/5 ${stats.methodData.length > 0 ? 'lg:col-span-3' : 'lg:col-span-5'}`}>
          <h3 className="font-heading text-base font-semibold text-foreground mb-4">Recent Transactions</h3>
          {stats.recent.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No transactions yet</p>
          ) : (
            <div className="space-y-1">
              {stats.recent.map((b) => (
                <div key={b._id || b.invoiceId} className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{b.patient || 'Patient'}</p>
                    <p className="text-xs text-muted-foreground truncate">{b.service || '—'} · {b.date}</p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-sm font-semibold text-foreground">₹{Number(b.amount || 0).toLocaleString('en-IN')}</p>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_META[b.status]?.dot ? `${STATUS_META[b.status].dot}/10 text-foreground` : 'bg-muted'}`} style={{ color: STATUS_META[b.status]?.color }}>
                      {b.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
