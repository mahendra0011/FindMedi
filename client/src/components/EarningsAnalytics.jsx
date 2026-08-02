import { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet, IndianRupee, Clock, Award, ArrowUpRight, ArrowDownRight,
  CreditCard, Smartphone, Landmark, Banknote, Sparkles,
  Stethoscope, Receipt, TrendingUp, Trophy, Target, Activity,
  CalendarDays, CalendarRange, ChevronRight, Eye, EyeOff,
  ArrowRight, Zap, PiggyBank, BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon,
  CircleDollarSign, BadgePercent, Flame, Crown, Timer, Layers,
  Download, Filter, RefreshCcw, MoreHorizontal, Check,
  TrendingDown, Minus, Star, Heart, Shield,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, Legend, ComposedChart, Line, LineChart,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { Tooltip as RadixTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/* ─── Constants ───────────────────────────────────── */
const STATUS_META = {
  Paid:    { color: 'hsl(var(--success))',     dot: 'bg-success',     bg: 'bg-success/10',     text: 'text-success' },
  Pending: { color: 'hsl(var(--warning))',     dot: 'bg-warning',     bg: 'bg-warning/10',     text: 'text-warning' },
  Partial: { color: 'hsl(var(--info))',        dot: 'bg-info',        bg: 'bg-info/10',        text: 'text-info' },
  Overdue: { color: 'hsl(var(--destructive))', dot: 'bg-destructive', bg: 'bg-destructive/10', text: 'text-destructive' },
};

const METHOD_META = {
  card:       { label: 'Card',       icon: CreditCard, color: 'hsl(var(--primary))',     gradient: 'from-primary/20 to-primary/5' },
  upi:        { label: 'UPI',        icon: Smartphone, color: 'hsl(var(--success))',     gradient: 'from-success/20 to-success/5' },
  netbanking: { label: 'Netbanking', icon: Landmark,   color: 'hsl(var(--info))',        gradient: 'from-info/20 to-info/5' },
  cash:       { label: 'Cash',       icon: Banknote,   color: 'hsl(var(--warning))',     gradient: 'from-warning/20 to-warning/5' },
};

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const GRADIENT_PRESETS = [
  { from: 'from-emerald-500', to: 'to-teal-600',   shadow: 'shadow-emerald-500/25' },
  { from: 'from-violet-500',  to: 'to-purple-600',  shadow: 'shadow-violet-500/25' },
  { from: 'from-blue-500',    to: 'to-cyan-600',    shadow: 'shadow-blue-500/25' },
  { from: 'from-amber-500',   to: 'to-orange-600',  shadow: 'shadow-amber-500/25' },
  { from: 'from-rose-500',    to: 'to-pink-600',    shadow: 'shadow-rose-500/25' },
];

/* ─── Animated Counter ────────────────────────────── */
function AnimatedCounter({ value, prefix = '', suffix = '', duration = 1200 }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    const startTime = Date.now();
    const startVal = 0;
    const endVal = value;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplay(Math.round(startVal + (endVal - startVal) * eased));
      if (progress < 1) ref.current = requestAnimationFrame(animate);
    };

    ref.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(ref.current);
  }, [value, duration]);

  return <>{prefix}{display.toLocaleString('en-IN')}{suffix}</>;
}

/* ─── Glassmorphic Tooltip ────────────────────────── */
function GlassTooltip({ active, payload, label, prefix = '₹' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-white/20 bg-card/90 backdrop-blur-xl px-4 py-3 shadow-2xl shadow-black/10">
      <p className="text-xs font-medium text-muted-foreground mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || p.stroke }} />
          <span className="text-xs text-muted-foreground capitalize">{p.dataKey}</span>
          <span className="ml-auto font-heading text-sm font-bold text-foreground">
            {prefix}{Number(p.value || 0).toLocaleString('en-IN')}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─── Glassmorphic Section Card ───────────────────── */
function GlassCard({ title, subtitle, children, className = '', action, icon: Icon, iconColor = 'text-primary', noPadding = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`group relative overflow-hidden rounded-3xl border border-border/40 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:border-border/60 ${className}`}
    >
      {/* Subtle corner glow */}
      <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-primary/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      {(title || action) && (
        <div className={`flex items-start justify-between ${noPadding ? 'px-6 pt-6' : 'px-6 pt-6'}`}>
          <div className="flex items-center gap-3">
            {Icon && (
              <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${iconColor === 'text-primary' ? 'from-primary/15 to-primary/5' : iconColor === 'text-success' ? 'from-success/15 to-success/5' : iconColor === 'text-warning' ? 'from-warning/15 to-warning/5' : iconColor === 'text-info' ? 'from-info/15 to-info/5' : 'from-primary/15 to-primary/5'} flex items-center justify-center shadow-sm`}>
                <Icon className={`w-5 h-5 ${iconColor}`} />
              </div>
            )}
            <div>
              <h3 className="font-heading text-base font-semibold text-foreground">{title}</h3>
              {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {action}
        </div>
      )}
      <div className={noPadding ? '' : 'p-6 pt-4'}>
        {children}
      </div>
    </motion.div>
  );
}

/* ─── Sparkline Mini Chart ────────────────────────── */
function Sparkline({ data, color = 'hsl(var(--primary))', height = 40 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        <defs>
          <linearGradient id={`spark-${color.replace(/[^a-z0-9]/gi, '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#spark-${color.replace(/[^a-z0-9]/gi, '')})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ─── Heatmap Day Cell ────────────────────────────── */
function HeatmapCell({ intensity, day, amount }) {
  const opacityClass = intensity === 0 ? 'bg-muted/30' : intensity <= 0.25 ? 'bg-success/20' : intensity <= 0.5 ? 'bg-success/40' : intensity <= 0.75 ? 'bg-success/60' : 'bg-success/90';
  return (
    <RadixTooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <div className={`w-full aspect-square rounded-md ${opacityClass} transition-all duration-200 hover:ring-2 hover:ring-success/50 hover:scale-110 cursor-default`} />
      </TooltipTrigger>
      <TooltipContent side="top" className="text-[10px] py-1 px-2 z-[100]">
        <p className="font-medium text-foreground">{day}</p>
        <p className="text-muted-foreground">₹{amount.toLocaleString('en-IN')}</p>
      </TooltipContent>
    </RadixTooltip>
  );
}


/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════ */
export default function EarningsAnalytics({ bills = [], payments = [], title = 'Earnings Analytics' }) {
  const [range, setRange] = useState('6m');
  const [showAmounts, setShowAmounts] = useState(true);
  const [activeChart, setActiveChart] = useState('area'); // 'area' | 'bar' | 'composed'

  /* ─── Compute all stats ─────────────────────────── */
  const stats = useMemo(() => {
    const totalBilled = bills.reduce((s, b) => s + (Number(b.amount) || 0), 0);
    const totalEarned = bills.reduce((s, b) => s + (Number(b.paid) || 0), 0);
    
    // Categorize earnings (heuristic based on type/service string)
    const testEarned = bills.reduce((s, b) => {
      const isTest = b.type === 'Test' || b.type === 'Lab' || b.type === 'investigation' || b.service?.toLowerCase().includes('test');
      return s + (isTest ? (Number(b.paid) || 0) : 0);
    }, 0);
    const appointmentEarned = Math.max(0, totalEarned - testEarned);

    const pending = Math.max(totalBilled - totalEarned, 0);
    const collectionRate = totalBilled > 0 ? Math.round((totalEarned / totalBilled) * 100) : 0;

    // Monthly trend (last 6 months)
    const now = new Date();
    const monthlyMap = {};
    bills.forEach((b) => {
      if (!b.date) return;
      const key = String(b.date).slice(0, 7);
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
        count: monthlyMap[key]?.count || 0,
      });
    }
    const thisMonth = monthlyTrend[monthlyTrend.length - 1]?.earned || 0;
    const lastMonth = monthlyTrend[monthlyTrend.length - 2]?.earned || 0;
    const growth = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : (thisMonth > 0 ? 100 : 0);

    // Last 30 days daily
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

    // Last 30 days for heatmap
    const last30 = [];
    let maxDayEarned = 0;
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const amt = dailyMap[key] || 0;
      if (amt > maxDayEarned) maxDayEarned = amt;
      last30.push({
        day: `${d.getDate()} ${MONTH_LABELS[d.getMonth()]}`,
        amount: amt,
      });
    }
    last30.forEach(d => { d.intensity = maxDayEarned > 0 ? d.amount / maxDayEarned : 0; });

    // Today / week / month
    const todayEarned = dailyMap[now.toISOString().slice(0, 10)] || 0;
    const weekEarned = weekly.reduce((s, d) => s + d.earned, 0);
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthEarned = monthlyMap[monthKey]?.earned || 0;
    const monthBilled = monthlyMap[monthKey]?.billed || 0;

    // Status breakdown
    const statusCounts = {};
    bills.forEach((b) => {
      const s = b.status || 'Pending';
      statusCounts[s] = (statusCounts[s] || 0) + (Number(b.amount) || 0);
    });
    const statusData = Object.entries(statusCounts)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value, color: STATUS_META[name]?.color || 'hsl(var(--muted-foreground))' }));

    // Payment methods
    const methodCounts = {};
    payments.forEach((p) => {
      const m = (p.method || 'cash').toLowerCase();
      methodCounts[m] = (methodCounts[m] || 0) + (Number(p.amount) || 0);
    });
    const totalMethodAmt = Object.values(methodCounts).reduce((s, v) => s + v, 0);
    const methodData = Object.entries(methodCounts).map(([key, amount]) => ({
      key, amount, pct: totalMethodAmt > 0 ? Math.round((amount / totalMethodAmt) * 100) : 0,
    })).sort((a, b) => b.amount - a.amount);

    // Top services
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

    // Transactions + avg
    const txCount = bills.filter((b) => Number(b.paid) > 0).length;
    const avgTicket = txCount > 0 ? Math.round(totalEarned / txCount) : 0;

    // Monthly goal
    const goal = lastMonth > 0 ? Math.round(lastMonth * 1.2) : 25000;
    const goalPct = goal > 0 ? Math.min(Math.round((thisMonth / goal) * 100), 100) : 0;

    // Recent transactions
    const recent = [...bills]
      .filter((b) => b.date)
      .sort((a, b) => (b.date > a.date ? 1 : -1))
      .slice(0, 6);

    // Hourly distribution (for radar chart)
    const hourlyDist = Array(24).fill(0);
    bills.forEach((b) => {
      if (b.time) {
        const hour = parseInt(b.time.split(':')[0]) || 0;
        hourlyDist[hour] += Number(b.paid) || 0;
      }
    });
    const peakHours = [
      { slot: '6-9 AM',   value: hourlyDist.slice(6, 9).reduce((s, v) => s + v, 0),   label: 'Morning' },
      { slot: '9-12 PM',  value: hourlyDist.slice(9, 12).reduce((s, v) => s + v, 0),  label: 'Late Morning' },
      { slot: '12-3 PM',  value: hourlyDist.slice(12, 15).reduce((s, v) => s + v, 0), label: 'Afternoon' },
      { slot: '3-6 PM',   value: hourlyDist.slice(15, 18).reduce((s, v) => s + v, 0), label: 'Evening' },
      { slot: '6-9 PM',   value: hourlyDist.slice(18, 21).reduce((s, v) => s + v, 0), label: 'Night' },
      { slot: '9-12 AM',  value: hourlyDist.slice(21, 24).reduce((s, v) => s + v, 0), label: 'Late Night' },
    ];

    // Sparkline data for hero cards
    const earnedSparkline = weekly.map(d => ({ v: d.earned }));
    const billedSparkline = monthlyTrend.map(d => ({ v: d.billed }));

    // Month-over-month comparison
    const momComparison = monthlyTrend.slice(-2);

    // Streak — consecutive days with earnings
    let streak = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      if (dailyMap[key] > 0) streak++;
      else break;
    }

    return {
      totalBilled, totalEarned, testEarned, appointmentEarned, pending, collectionRate,
      monthlyTrend, weekly, growth, statusData, methodData,
      topServices, topServiceMax, txCount, avgTicket,
      bestDay, goal, goalPct, thisMonth, lastMonth,
      todayEarned, weekEarned, monthEarned, monthBilled,
      recent, last30, peakHours, earnedSparkline,
      billedSparkline, momComparison, streak,
    };
  }, [bills, payments]);

  const chartData = range === '6m' ? stats.monthlyTrend : stats.weekly;
  const fmt = (v) => showAmounts ? `₹${v.toLocaleString('en-IN')}` : '₹••••••';

  /* ─── Render ────────────────────────────────────── */
  return (
    <div className="space-y-6">

      {/* ═══ HEADER ═══ */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/25">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-success border-2 border-card flex items-center justify-center">
              <Check className="w-2.5 h-2.5 text-success-foreground" />
            </div>
          </div>
          <div>
            <h2 className="font-heading text-2xl font-bold text-foreground tracking-tight">{title}</h2>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              Live performance snapshot
              {stats.streak > 0 && (
                <span className="inline-flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500 text-xs font-semibold">
                  <Flame className="w-3 h-3" /> {stats.streak}-day streak
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Show/Hide toggle */}
          <button
            onClick={() => setShowAmounts(!showAmounts)}
            className="p-2 rounded-xl border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
            title={showAmounts ? 'Hide amounts' : 'Show amounts'}
          >
            {showAmounts ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>

          {/* Range toggle */}
          <div className="flex gap-1 bg-muted/50 rounded-xl p-1 border border-border/30">
            {[
              { k: '6m', l: '6 Months', icon: CalendarRange },
              { k: '30d', l: '7 Days', icon: CalendarDays },
            ].map((opt) => (
              <button
                key={opt.k}
                onClick={() => setRange(opt.k)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  range === opt.k
                    ? 'bg-card text-foreground shadow-sm border border-border/50'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <opt.icon className="w-3.5 h-3.5" />
                {opt.l}
              </button>
            ))}
          </div>
        </div>
      </motion.div>


      {/* ═══ 7 HERO STAT CARDS ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* 1. Total Earned */}
        <motion.div
          whileHover={{ y: -4, scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent p-4"
        >
          <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-emerald-500/10 blur-2xl" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center shadow-sm">
                <Wallet className="w-4 h-4 text-emerald-500" />
              </div>
              <span className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                stats.growth >= 0 ? 'text-emerald-600 bg-emerald-500/10' : 'text-rose-500 bg-rose-500/10'
              }`}>
                {stats.growth >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {Math.abs(stats.growth)}%
              </span>
            </div>
            <p className="font-heading text-lg font-extrabold text-foreground tracking-tight">
              {showAmounts ? <>₹<AnimatedCounter value={stats.totalEarned} /></> : '₹••••••'}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">Total Earned</p>
          </div>
        </motion.div>

        {/* 2. This Month */}
        <motion.div
          whileHover={{ y: -4, scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/15 via-violet-500/5 to-transparent p-4"
        >
          <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-violet-500/10 blur-2xl" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-600/10 flex items-center justify-center shadow-sm">
                <IndianRupee className="w-4 h-4 text-violet-500" />
              </div>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${stats.thisMonth >= stats.lastMonth ? 'text-success bg-success/10' : 'text-destructive bg-destructive/10'}`}>
                {stats.lastMonth > 0 ? `${stats.thisMonth >= stats.lastMonth ? '+' : ''}${Math.round(((stats.thisMonth - stats.lastMonth) / stats.lastMonth) * 100)}%` : 'New'}
              </span>
            </div>
            <p className="font-heading text-lg font-extrabold text-foreground tracking-tight">
              {showAmounts ? <>₹<AnimatedCounter value={stats.monthEarned} /></> : '₹••••••'}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">This Month</p>
          </div>
        </motion.div>

        {/* 3. This Week */}
        <motion.div
          whileHover={{ y: -4, scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/15 via-blue-500/5 to-transparent p-4"
        >
          <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-blue-500/10 blur-2xl" />
          <div className="relative z-10">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center shadow-sm mb-2">
              <CalendarRange className="w-4 h-4 text-blue-500" />
            </div>
            <p className="font-heading text-lg font-extrabold text-foreground tracking-tight">
              {showAmounts ? <>₹<AnimatedCounter value={stats.weekEarned} /></> : '₹••••••'}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">This Week</p>
          </div>
        </motion.div>

        {/* 4. Today */}
        <motion.div
          whileHover={{ y: -4, scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent p-4"
        >
          <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-amber-500/10 blur-2xl" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center shadow-sm">
                <CalendarDays className="w-4 h-4 text-amber-500" />
              </div>
              {stats.todayEarned > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                  <Zap className="w-2.5 h-2.5" /> Live
                </span>
              )}
            </div>
            <p className="font-heading text-lg font-extrabold text-foreground tracking-tight">
              {showAmounts ? <>₹<AnimatedCounter value={stats.todayEarned} /></> : '₹••••••'}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">Today</p>
          </div>
        </motion.div>

        {/* 5. Pending Collection */}
        <motion.div
          whileHover={{ y: -4, scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="relative overflow-hidden rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent p-4"
        >
          <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-rose-500/10 blur-2xl" />
          <div className="relative z-10">
            <div className="w-9 h-9 rounded-xl bg-rose-500/15 flex items-center justify-center mb-2">
              <Clock className="w-4 h-4 text-rose-500" />
            </div>
            <p className="font-heading text-lg font-extrabold text-foreground tracking-tight">
              {showAmounts ? <>₹<AnimatedCounter value={stats.pending} /></> : '₹••••••'}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">Pending</p>
            <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden mt-1.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${stats.totalBilled > 0 ? Math.min(Math.round((stats.pending / stats.totalBilled) * 100), 100) : 0}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-rose-400 to-rose-600"
              />
            </div>
          </div>
        </motion.div>

        {/* 6. Appointment Earning */}
        <motion.div
          whileHover={{ y: -4, scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/15 via-indigo-500/5 to-transparent p-4"
        >
          <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-indigo-500/10 blur-2xl" />
          <div className="relative z-10">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-600/10 flex items-center justify-center mb-2 shadow-sm">
              <CalendarDays className="w-4 h-4 text-indigo-500" />
            </div>
            <p className="font-heading text-lg font-extrabold text-foreground tracking-tight">
              {showAmounts ? <>₹<AnimatedCounter value={stats.appointmentEarned} /></> : '₹••••••'}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">Appt Earning</p>
          </div>
        </motion.div>

        {/* 7. Test Earning */}
        <motion.div
          whileHover={{ y: -4, scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="relative overflow-hidden rounded-2xl border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-500/15 via-fuchsia-500/5 to-transparent p-4"
        >
          <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-fuchsia-500/10 blur-2xl" />
          <div className="relative z-10">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-fuchsia-600/10 flex items-center justify-center mb-2 shadow-sm">
              <Stethoscope className="w-4 h-4 text-fuchsia-500" />
            </div>
            <p className="font-heading text-lg font-extrabold text-foreground tracking-tight">
              {showAmounts ? <>₹<AnimatedCounter value={stats.testEarned} /></> : '₹••••••'}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">Test Earning</p>
          </div>
        </motion.div>
      </div>





      {/* ═══ QUICK STATS STRIP ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Activity,   label: 'Transactions', value: stats.txCount.toLocaleString('en-IN'), color: 'text-primary',   bg: 'bg-primary/10' },
          { icon: Trophy,     label: 'Best Day',     value: stats.bestDay?.earned > 0 ? `${stats.bestDay.label} · ${fmt(stats.bestDay.earned)}` : '—', color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { icon: Flame,      label: 'Streak',       value: `${stats.streak} day${stats.streak !== 1 ? 's' : ''}`, color: 'text-orange-500', bg: 'bg-orange-500/10' },
          { icon: TrendingUp, label: 'Growth',       value: `${stats.growth >= 0 ? '+' : ''}${stats.growth}%`, color: stats.growth >= 0 ? 'text-success' : 'text-destructive', bg: stats.growth >= 0 ? 'bg-success/10' : 'bg-destructive/10' },
        ].map((ins) => {
          const Icon = ins.icon;
          return (
            <motion.div
              key={ins.label}
              whileHover={{ scale: 1.02 }}
              className="flex items-center gap-3 rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm px-4 py-3.5"
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${ins.bg}`}>
                <Icon className={`w-4.5 h-4.5 ${ins.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground truncate uppercase tracking-wider font-semibold">{ins.label}</p>
                <p className="font-heading text-sm font-bold text-foreground truncate">{ins.value}</p>
              </div>
            </motion.div>
          );
        })}
      </div>


      {/* ═══ EARNINGS TREND (MAIN CHART) ═══ */}
      <GlassCard
        title="Revenue Trend"
        subtitle={range === '6m' ? 'Last 6 months performance' : 'Last 7 days performance'}
        icon={LineChart}
        iconColor="text-primary"
        action={
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
              stats.growth >= 0 ? 'text-success bg-success/10' : 'text-destructive bg-destructive/10'
            }`}>
              {stats.growth >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(stats.growth)}% vs last
            </span>
            {/* Chart type switcher */}
            <div className="flex gap-0.5 bg-muted/50 rounded-lg p-0.5 border border-border/30">
              {[
                { k: 'area', icon: LineChart },
                { k: 'bar', icon: BarChart3 },
                { k: 'composed', icon: Layers },
              ].map(opt => (
                <button
                  key={opt.k}
                  onClick={() => setActiveChart(opt.k)}
                  className={`p-1.5 rounded-md transition-all ${activeChart === opt.k ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <opt.icon className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
          </div>
        }
      >
        <ResponsiveContainer width="100%" height={300}>
          {activeChart === 'area' ? (
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="earningsFillGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="billedFillGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--info))" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="hsl(var(--info))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
              <Tooltip content={<GlassTooltip />} />
              {range === '6m' && <Area type="monotone" dataKey="billed" stroke="hsl(var(--info))" strokeWidth={1.5} strokeDasharray="5 5" fill="url(#billedFillGrad)" dot={false} />}
              <Area type="monotone" dataKey="earned" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#earningsFillGrad)" activeDot={{ r: 6, fill: 'hsl(var(--primary))', stroke: 'hsl(var(--card))', strokeWidth: 3 }} />
            </AreaChart>
          ) : activeChart === 'bar' ? (
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="barEarnedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                </linearGradient>
                <linearGradient id="barBilledGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--info))" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="hsl(var(--info))" stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
              <Tooltip content={<GlassTooltip />} />
              {range === '6m' && <Bar dataKey="billed" fill="url(#barBilledGrad)" radius={[6, 6, 0, 0]} maxBarSize={28} />}
              <Bar dataKey="earned" fill="url(#barEarnedGrad)" radius={[6, 6, 0, 0]} maxBarSize={28} />
            </BarChart>
          ) : (
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="composedArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
              <Tooltip content={<GlassTooltip />} />
              {range === '6m' && <Bar dataKey="billed" fill="hsl(var(--info))" fillOpacity={0.3} radius={[6, 6, 0, 0]} maxBarSize={32} />}
              <Area type="monotone" dataKey="earned" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#composedArea)" />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </GlassCard>


      {/* ═══ STATUS DONUT + WEEKLY BARS ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Status Donut */}
        <GlassCard title="Payment Status" icon={PieChartIcon} iconColor="text-info" className="lg:col-span-2">
          <div className="relative">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie 
                  data={stats.statusData.length > 0 ? stats.statusData : [{ name: 'No Data', value: 1, color: 'hsl(var(--muted)/0.5)' }]} 
                  dataKey="value" 
                  nameKey="name" 
                  innerRadius={65} 
                  outerRadius={92} 
                  paddingAngle={4} 
                  strokeWidth={0}
                >
                  {(stats.statusData.length > 0 ? stats.statusData : [{ name: 'No Data', value: 1, color: 'hsl(var(--muted)/0.5)' }]).map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                {stats.statusData.length > 0 && <Tooltip content={<GlassTooltip />} />}
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="font-heading text-3xl font-extrabold text-foreground">{stats.collectionRate}%</p>
              <p className="text-[11px] text-muted-foreground font-medium">Collected</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            {stats.statusData.length === 0 ? (
              <p className="text-xs text-muted-foreground col-span-2 text-center py-2">No billing data yet</p>
            ) : stats.statusData.map((d) => (
              <div key={d.name} className={`flex items-center gap-2 text-sm px-3 py-2 rounded-xl ${STATUS_META[d.name]?.bg || 'bg-muted/30'}`}>
                <span className={`w-2.5 h-2.5 rounded-full ${STATUS_META[d.name]?.dot || 'bg-muted-foreground'}`} />
                <span className="text-muted-foreground text-xs">{d.name}</span>
                <span className="ml-auto font-heading text-xs font-bold text-foreground">{fmt(d.value)}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Weekly Bars */}
        <GlassCard title="Last 7 Days" subtitle="Daily earnings breakdown" icon={BarChart3} iconColor="text-success" className="lg:col-span-3">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.weekly} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="weeklyBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={1} />
                  <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0.5} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
              <Tooltip content={<GlassTooltip />} />
              <Bar dataKey="earned" fill="url(#weeklyBarGrad)" radius={[8, 8, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>


      {/* ═══ HEATMAP + PEAK HOURS ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* 30-Day Heatmap */}
        <GlassCard title="30-Day Earnings Map" subtitle="Contribution calendar" icon={CalendarDays} iconColor="text-success" className="lg:col-span-3">
          <TooltipProvider>
            <div className="grid grid-cols-10 gap-1.5">
              {stats.last30.map((d, i) => (
                <HeatmapCell key={i} intensity={d.intensity} day={d.day} amount={d.amount} />
              ))}
            </div>
          </TooltipProvider>
          <div className="flex items-center justify-end gap-2 mt-3">
            <span className="text-[10px] text-muted-foreground">Less</span>
            {[0, 0.25, 0.5, 0.75, 1].map((level) => (
              <div key={level} className={`w-3 h-3 rounded-sm ${
                level === 0 ? 'bg-muted/30' : level <= 0.25 ? 'bg-success/20' : level <= 0.5 ? 'bg-success/40' : level <= 0.75 ? 'bg-success/60' : 'bg-success/90'
              }`} />
            ))}
            <span className="text-[10px] text-muted-foreground">More</span>
          </div>
        </GlassCard>

        {/* Peak Hours Radar */}
        <GlassCard title="Peak Hours" subtitle="Revenue by time slot" icon={Timer} iconColor="text-warning" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={stats.peakHours} margin={{ top: 5, right: 25, left: 25, bottom: 5 }}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <Radar name="Revenue" dataKey="value" stroke="hsl(var(--warning))" fill="hsl(var(--warning))" fillOpacity={0.25} strokeWidth={2} />
              <Tooltip content={<GlassTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>


      {/* ═══ TOP SERVICES + MONTHLY GOAL ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <GlassCard title="Revenue Trend" subtitle="Daily performance (30D)" icon={TrendingUp} iconColor="text-success" className="lg:col-span-3">
          <div className="flex justify-between items-end mb-4">
            <div>
              <p className="text-3xl font-heading font-extrabold text-foreground">
                {showAmounts ? <>₹<AnimatedCounter value={stats.monthEarned} /></> : '₹••••••'}
              </p>
              <p className={`flex items-center gap-1 text-sm font-semibold mt-1 ${stats.growth >= 0 ? 'text-success' : 'text-destructive'}`}>
                {stats.growth >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {Math.abs(stats.growth)}% from last month
              </p>
            </div>
          </div>
          <div className="h-[220px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.last30} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="hsl(var(--border))" opacity={0.6} />
                <XAxis 
                  dataKey="day" 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
                  dy={10} 
                  minTickGap={30} 
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
                  tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(1)}k` : val}
                />
                <Tooltip 
                  content={<GlassTooltip />} 
                  cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '3 3' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  name="Earned"
                  stroke="#3b82f6" 
                  strokeWidth={2} 
                  dot={{ r: 2.5, fill: '#3b82f6', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#3b82f6', strokeWidth: 0, stroke: '#fff' }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Revenue Breakdown */}
        <GlassCard title="Revenue Breakdown" subtitle="Billed vs Collected analysis" icon={PiggyBank} iconColor="text-primary" className="lg:col-span-2">
          <div className="space-y-4">
            {/* Billed vs Earned visual comparison */}
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="flex items-center gap-2 text-foreground font-medium">
                    <Receipt className="w-4 h-4 text-primary" /> Billed
                  </span>
                  <span className="font-heading font-bold text-foreground">{fmt(stats.totalBilled)}</span>
                </div>
                <div className="h-3 bg-muted/50 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="flex items-center gap-2 text-foreground font-medium">
                    <Wallet className="w-4 h-4 text-success" /> Collected
                  </span>
                  <span className="font-heading font-bold text-foreground">{fmt(stats.totalEarned)}</span>
                </div>
                <div className="h-3 bg-muted/50 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.collectionRate}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                    className="h-full rounded-full bg-gradient-to-r from-success/60 to-success"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="flex items-center gap-2 text-foreground font-medium">
                    <Clock className="w-4 h-4 text-rose-500" /> Outstanding
                  </span>
                  <span className="font-heading font-bold text-foreground">{fmt(stats.pending)}</span>
                </div>
                <div className="h-3 bg-muted/50 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.totalBilled > 0 ? Math.round((stats.pending / stats.totalBilled) * 100) : 0}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: 0.4 }}
                    className="h-full rounded-full bg-gradient-to-r from-rose-400/60 to-rose-500"
                  />
                </div>
              </div>
            </div>

            {/* Performance health indicators */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/30">
              <div className="rounded-xl bg-muted/30 px-3 py-2.5 text-center">
                <p className="font-heading text-lg font-extrabold text-foreground">{stats.txCount}</p>
                <p className="text-[10px] text-muted-foreground font-medium">Transactions</p>
              </div>
              <div className="rounded-xl bg-muted/30 px-3 py-2.5 text-center">
                <p className="font-heading text-lg font-extrabold text-foreground">{fmt(stats.avgTicket)}</p>
                <p className="text-[10px] text-muted-foreground font-medium">Avg Ticket</p>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>


      {/* ═══ PAYMENT METHODS + RECENT TRANSACTIONS ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Payment Methods */}
        {stats.methodData.length > 0 && (
          <GlassCard title="Payment Methods" subtitle="Revenue by channel" icon={CreditCard} iconColor="text-primary" className="lg:col-span-2">
            <div className="space-y-4">
              {stats.methodData.map((m) => {
                const meta = METHOD_META[m.key] || METHOD_META.cash;
                const Icon = meta.icon;
                return (
                  <div key={m.key}>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="flex items-center gap-2.5 text-foreground font-medium">
                        <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center`}>
                          <Icon className="w-4 h-4" style={{ color: meta.color }} />
                        </div>
                        {meta.label}
                      </span>
                      <div className="text-right">
                        <span className="font-heading text-sm font-bold text-foreground">{fmt(m.amount)}</span>
                        <span className="text-xs text-muted-foreground ml-1.5">{m.pct}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
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
          </GlassCard>
        )}

        {/* Recent Transactions */}
        <GlassCard
          title="Recent Transactions"
          subtitle={`${stats.recent.length} latest entries`}
          icon={Receipt}
          iconColor="text-info"
          className={stats.methodData.length > 0 ? 'lg:col-span-3' : 'lg:col-span-5'}
        >
          {stats.recent.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-16 h-16 rounded-3xl bg-muted/30 flex items-center justify-center mx-auto mb-3">
                <Receipt className="w-8 h-8 text-muted-foreground/30" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">No transactions yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Transactions will appear here as they come in</p>
            </div>
          ) : (
            <div className="space-y-1">
              {stats.recent.map((b, i) => (
                <motion.div
                  key={b._id || b.invoiceId || i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between py-3 px-3 -mx-1 rounded-xl hover:bg-muted/30 transition-colors border-b border-border/20 last:border-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${STATUS_META[b.status]?.bg || 'bg-muted/30'}`}>
                      <CircleDollarSign className={`w-4.5 h-4.5 ${STATUS_META[b.status]?.text || 'text-muted-foreground'}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{b.patient || 'Patient'}</p>
                      <p className="text-xs text-muted-foreground truncate">{b.service || '—'} · {b.date}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="font-heading text-sm font-bold text-foreground">{fmt(Number(b.amount || 0))}</p>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_META[b.status]?.bg || 'bg-muted'} ${STATUS_META[b.status]?.text || 'text-muted-foreground'}`}>
                      {b.status === 'Paid' && <Check className="w-2.5 h-2.5" />}
                      {b.status}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

    </div>
  );
}
