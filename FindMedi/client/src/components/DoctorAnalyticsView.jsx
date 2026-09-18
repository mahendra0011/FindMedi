import { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays, TrendingUp,
  Activity, PieChart as PieChartIcon, LineChart as LineChartIcon,
  Clock, CalendarRange, FlaskConical, TestTube, Hourglass,
  CalendarCheck, Calendar, BarChart3, Stethoscope, Zap,
  Users, Timer, Flame, Target, ArrowUpRight, ArrowDownRight,
  CheckCircle2, XCircle, AlertCircle
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar
} from 'recharts';
import { Tooltip as RadixTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/* ─── Animated Counter ─────────────────────────────── */
function AnimatedCounter({ value, duration = 1200 }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) ref.current = requestAnimationFrame(animate);
    };
    ref.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(ref.current);
  }, [value, duration]);
  return <>{display.toLocaleString('en-IN')}</>;
}

/* ─── Glass Tooltip for Charts ─────────────────────── */
const GlassTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-white/20 bg-card/90 backdrop-blur-xl px-4 py-3 shadow-2xl shadow-black/10">
      <p className="text-xs font-medium text-muted-foreground mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || p.fill || p.stroke }} />
          <span className="text-xs text-muted-foreground capitalize">{p.dataKey || p.name}</span>
          <span className="ml-auto font-heading text-sm font-bold text-foreground">{Number(p.value || 0).toLocaleString('en-IN')}</span>
        </div>
      ))}
    </div>
  );
};

/* ─── Glass Section Card ──────────────────────────── */
function GlassCard({ title, subtitle, children, className = '', action, icon: Icon, iconColor = 'text-primary' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`group relative overflow-hidden rounded-3xl border border-border/40 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:border-border/60 ${className}`}
    >
      <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-primary/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      {(title || action) && (
        <div className="flex items-start justify-between px-6 pt-6">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${
                iconColor === 'text-primary' ? 'from-primary/15 to-primary/5' :
                iconColor === 'text-success' ? 'from-success/15 to-success/5' :
                iconColor === 'text-warning' ? 'from-warning/15 to-warning/5' :
                iconColor === 'text-fuchsia-500' ? 'from-fuchsia-500/15 to-fuchsia-500/5' :
                iconColor === 'text-indigo-500' ? 'from-indigo-500/15 to-indigo-500/5' :
                iconColor === 'text-amber-500' ? 'from-amber-500/15 to-amber-500/5' :
                iconColor === 'text-emerald-500' ? 'from-emerald-500/15 to-emerald-500/5' :
                iconColor === 'text-blue-500' ? 'from-blue-500/15 to-blue-500/5' :
                'from-primary/15 to-primary/5'
              } flex items-center justify-center shadow-sm`}>
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
      <div className="p-6 pt-4">{children}</div>
    </motion.div>
  );
}

/* ─── Hero Stat Card (Premium) ────────────────────── */
function HeroCard({ icon: Icon, label, value, color, gradient, shadow, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      whileHover={{ y: -5, scale: 1.03 }}
      className={`relative overflow-hidden rounded-2xl border ${`border-${color}-500/20`} bg-gradient-to-br ${gradient} p-4 cursor-default`}
    >
      {/* Glow blob */}
      <div className={`absolute -right-4 -top-4 w-20 h-20 rounded-full bg-${color}-500/15 blur-2xl`} />
      <div className={`absolute -left-2 -bottom-2 w-12 h-12 rounded-full bg-${color}-500/10 blur-xl`} />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2.5">
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br from-${color}-500/25 to-${color}-600/10 flex items-center justify-center shadow-sm backdrop-blur-sm border border-${color}-500/10`}>
            <Icon className={`w-4 h-4 text-${color}-500`} />
          </div>
        </div>
        <p className="font-heading text-2xl font-extrabold text-foreground tracking-tight leading-none">
          <AnimatedCounter value={value} />
        </p>
        <p className="text-[10px] text-muted-foreground mt-1.5 font-semibold uppercase tracking-wider">{label}</p>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */
export default function DoctorAnalyticsView({ appointments = [], patients = [], bills = [], labBookings = [], title = 'Analytics' }) {
  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const sixMonthsAgo = new Date(now); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const sixMonthsAgoStr = sixMonthsAgo.toISOString().slice(0, 10);
    const weekStart = new Date(now);
    const dow = weekStart.getDay(); const diff = dow === 0 ? 6 : dow - 1;
    weekStart.setDate(weekStart.getDate() - diff);
    const weekStartStr = weekStart.toISOString().slice(0, 10);

    // ═══ APPOINTMENT STATS ═══
    const totalAppts = appointments.length;
    const todayAppts = appointments.filter(a => a.date?.slice(0, 10) === todayStr).length;
    const thisWeekAppts = appointments.filter(a => { const d = a.date?.slice(0, 10); return d >= weekStartStr && d <= todayStr; }).length;
    const thisMonthAppts = appointments.filter(a => a.date?.startsWith(monthKey)).length;
    const sixMonthAppts = appointments.filter(a => a.date?.slice(0, 10) >= sixMonthsAgoStr).length;
    const pendingAppts = appointments.filter(a => ['Pending', 'Confirmed', 'In Queue'].includes(a.status)).length;
    const completedAppts = appointments.filter(a => a.status === 'Completed').length;
    const cancelledAppts = appointments.filter(a => a.status === 'Cancelled').length;
    const completionRate = totalAppts > 0 ? Math.round((completedAppts / totalAppts) * 100) : 0;

    // ═══ TEST STATS ═══
    const bd = (t) => { try { return t.bookingDate?.slice?.(0, 10) || new Date(t.bookingDate).toISOString().slice(0, 10); } catch { return ''; } };
    const totalTests = labBookings.length;
    const todayTests = labBookings.filter(t => bd(t) === todayStr).length;
    const thisWeekTests = labBookings.filter(t => { const d = bd(t); return d >= weekStartStr && d <= todayStr; }).length;
    const thisMonthTests = labBookings.filter(t => bd(t)?.startsWith(monthKey)).length;
    const sixMonthTests = labBookings.filter(t => bd(t) >= sixMonthsAgoStr).length;
    const pendingTests = labBookings.filter(t => ['Pending', 'Confirmed', 'Sample Collected', 'Processing'].includes(t.status)).length;
    const completedTests = labBookings.filter(t => t.status === 'Completed').length;

    // ═══ DAILY TRENDS (30d) ═══
    const dailyApptMap = {};
    appointments.forEach(a => {
      if (!a.date) return;
      const key = a.date.slice(0, 10);
      if (!dailyApptMap[key]) dailyApptMap[key] = { total: 0, completed: 0 };
      dailyApptMap[key].total++;
      if (a.status === 'Completed') dailyApptMap[key].completed++;
    });
    const last30 = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      last30.push({ day: `${d.getDate()} ${MONTH_LABELS[d.getMonth()]}`, Total: dailyApptMap[key]?.total || 0, Completed: dailyApptMap[key]?.completed || 0 });
    }

    // ═══ STATUS PIE ═══
    const sc = {};
    appointments.forEach(a => { const s = a.status || 'Pending'; sc[s] = (sc[s] || 0) + 1; });
    const sColors = { 'Completed': '#10b981', 'Cancelled': '#ef4444', 'Pending': '#f59e0b', 'Confirmed': '#3b82f6', 'In Queue': '#6366f1', 'Serving': '#8b5cf6', 'Missed': '#94a3b8' };
    const statusData = Object.entries(sc).map(([name, value]) => ({ name, value, color: sColors[name] || '#6366f1' }));

    // ═══ TYPE PIE ═══
    const tc = {};
    appointments.forEach(a => { const t = a.type || 'Consultation'; tc[t] = (tc[t] || 0) + 1; });
    const tColors = { 'Consultation': '#3b82f6', 'Follow-up': '#8b5cf6', 'Check-up': '#10b981', 'Emergency': '#ef4444' };
    const typeData = Object.entries(tc).map(([name, value]) => ({ name, value, color: tColors[name] || '#6366f1' }));

    // ═══ MONTHLY (6m) ═══
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyData.push({
        month: MONTH_LABELS[d.getMonth()],
        Appointments: appointments.filter(a => a.date?.startsWith(mKey)).length,
        Completed: appointments.filter(a => a.date?.startsWith(mKey) && a.status === 'Completed').length,
        Tests: labBookings.filter(t => bd(t)?.startsWith(mKey)).length,
      });
    }

    // ═══ PEAK HOURS ═══
    const hourlyDist = new Array(24).fill(0);
    appointments.forEach(a => { if (a.time) { const h = parseInt(a.time.split(':')[0]) || 0; hourlyDist[h]++; } });
    const peakHours = [
      { slot: '6–9 AM', value: hourlyDist.slice(6, 9).reduce((s, v) => s + v, 0), emoji: '🌅' },
      { slot: '9–12 PM', value: hourlyDist.slice(9, 12).reduce((s, v) => s + v, 0), emoji: '☀️' },
      { slot: '12–3 PM', value: hourlyDist.slice(12, 15).reduce((s, v) => s + v, 0), emoji: '🌤' },
      { slot: '3–6 PM', value: hourlyDist.slice(15, 18).reduce((s, v) => s + v, 0), emoji: '🌇' },
      { slot: '6–9 PM', value: hourlyDist.slice(18, 21).reduce((s, v) => s + v, 0), emoji: '🌙' },
    ];
    const peakSlot = [...peakHours].sort((a, b) => b.value - a.value)[0];

    // ═══ HEATMAP (proper calendar weeks, Mon-Sun) ═══
    const heatmapRows = [];
    // Go back 27 days to cover ~4 weeks, find the Monday of that week
    const startRef = new Date(now);
    startRef.setDate(startRef.getDate() - 27);
    const startDow = startRef.getDay();
    const mondayOffset = startDow === 0 ? -6 : 1 - startDow;
    startRef.setDate(startRef.getDate() + mondayOffset);

    const HEAT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    for (let w = 0; w < 4; w++) {
      const weekRow = { week: `W${w + 1}`, cells: [] };
      for (let d = 0; d < 7; d++) {
        const cellDate = new Date(startRef);
        cellDate.setDate(startRef.getDate() + w * 7 + d);
        const key = cellDate.toISOString().slice(0, 10);
        const dayLabel = HEAT_DAYS[d];
        const dateLabel = `${cellDate.getDate()} ${MONTH_LABELS[cellDate.getMonth()]}`;
        weekRow.cells.push({
          day: dayLabel,
          date: dateLabel,
          value: dailyApptMap[key]?.total || 0,
        });
      }
      heatmapRows.push(weekRow);
    }
    let heatMax = 0;
    heatmapRows.forEach(w => w.cells.forEach(c => { if (c.value > heatMax) heatMax = c.value; }));

    // ═══ TEST STATUS ═══
    const tsc = {};
    labBookings.forEach(t => { const s = t.status || 'Pending'; tsc[s] = (tsc[s] || 0) + 1; });
    const tsColors = { 'Pending': '#f59e0b', 'Confirmed': '#3b82f6', 'Sample Collected': '#8b5cf6', 'Processing': '#6366f1', 'Completed': '#10b981', 'Cancelled': '#ef4444', 'Rescheduled': '#f97316' };
    const testStatusData = Object.entries(tsc).map(([name, value]) => ({ name, value, color: tsColors[name] || '#6366f1' }));

    return {
      totalAppts, todayAppts, thisWeekAppts, thisMonthAppts, sixMonthAppts, pendingAppts, completedAppts, cancelledAppts, completionRate,
      totalTests, todayTests, thisWeekTests, thisMonthTests, sixMonthTests, pendingTests, completedTests,
      last30, statusData, typeData, monthlyData, peakHours, peakSlot,
      heatmapRows, heatMax, testStatusData,
    };
  }, [appointments, labBookings]);

  return (
    <div className="space-y-8">
      {/* ═══ HEADER ═══ */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-success border-2 border-card flex items-center justify-center">
              <CheckCircle2 className="w-2.5 h-2.5 text-success-foreground" />
            </div>
          </div>
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-black tracking-tight text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" /> Live performance dashboard
            </p>
          </div>
        </div>
        {/* Quick insight badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-success/10 text-success text-xs font-semibold border border-success/20">
            <CheckCircle2 className="w-3 h-3" /> {stats.completedAppts} Completed
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-warning/10 text-warning text-xs font-semibold border border-warning/20">
            <Clock className="w-3 h-3" /> {stats.pendingAppts} Pending
          </span>
          {stats.cancelledAppts > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-semibold border border-destructive/20">
              <XCircle className="w-3 h-3" /> {stats.cancelledAppts} Cancelled
            </span>
          )}
        </div>
      </motion.div>

      {/* ═══ APPOINTMENT CARDS ═══ */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center">
            <CalendarDays className="w-4 h-4 text-blue-500" />
          </div>
          <h2 className="font-heading text-lg font-bold text-foreground">Appointments</h2>
          <div className="flex-1 h-px bg-gradient-to-r from-border/60 to-transparent ml-2" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <HeroCard icon={CalendarDays} label="Total" value={stats.totalAppts} color="blue" gradient="from-blue-500/15 via-blue-500/5 to-transparent" delay={0} />
          <HeroCard icon={CalendarCheck} label="Today" value={stats.todayAppts} color="emerald" gradient="from-emerald-500/15 via-emerald-500/5 to-transparent" delay={0.05} />
          <HeroCard icon={CalendarRange} label="This Week" value={stats.thisWeekAppts} color="violet" gradient="from-violet-500/15 via-violet-500/5 to-transparent" delay={0.1} />
          <HeroCard icon={Calendar} label="This Month" value={stats.thisMonthAppts} color="amber" gradient="from-amber-500/15 via-amber-500/5 to-transparent" delay={0.15} />
          <HeroCard icon={TrendingUp} label="6 Months" value={stats.sixMonthAppts} color="indigo" gradient="from-indigo-500/15 via-indigo-500/5 to-transparent" delay={0.2} />
          <HeroCard icon={Hourglass} label="Pending" value={stats.pendingAppts} color="rose" gradient="from-rose-500/15 via-rose-500/5 to-transparent" delay={0.25} />
        </div>
      </div>

      {/* ═══ TEST CARDS ═══ */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-fuchsia-600/10 flex items-center justify-center">
            <FlaskConical className="w-4 h-4 text-fuchsia-500" />
          </div>
          <h2 className="font-heading text-lg font-bold text-foreground">Test Bookings</h2>
          <div className="flex-1 h-px bg-gradient-to-r from-border/60 to-transparent ml-2" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <HeroCard icon={FlaskConical} label="Total Tests" value={stats.totalTests} color="fuchsia" gradient="from-fuchsia-500/15 via-fuchsia-500/5 to-transparent" delay={0} />
          <HeroCard icon={TestTube} label="Today" value={stats.todayTests} color="teal" gradient="from-teal-500/15 via-teal-500/5 to-transparent" delay={0.05} />
          <HeroCard icon={CalendarRange} label="This Week" value={stats.thisWeekTests} color="purple" gradient="from-purple-500/15 via-purple-500/5 to-transparent" delay={0.1} />
          <HeroCard icon={Calendar} label="This Month" value={stats.thisMonthTests} color="orange" gradient="from-orange-500/15 via-orange-500/5 to-transparent" delay={0.15} />
          <HeroCard icon={TrendingUp} label="6 Months" value={stats.sixMonthTests} color="sky" gradient="from-sky-500/15 via-sky-500/5 to-transparent" delay={0.2} />
          <HeroCard icon={Clock} label="Pending" value={stats.pendingTests} color="rose" gradient="from-rose-600/15 via-rose-600/5 to-transparent" delay={0.25} />
        </div>
      </div>

      {/* ═══ ROW 1: Trends + Status ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard title="Appointment Trends" subtitle="Last 30 days" icon={LineChartIcon} iconColor="text-primary" className="lg:col-span-2">
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.last30} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="trendGradA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="trendGradB" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} dy={10} minTickGap={30} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip content={<GlassTooltip />} />
                <Area type="monotone" dataKey="Total" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#trendGradA)" dot={false} activeDot={{ r: 5, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }} />
                <Area type="monotone" dataKey="Completed" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#trendGradB)" dot={false} activeDot={{ r: 4, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard title="Status Breakdown" subtitle="All time" icon={PieChartIcon} iconColor="text-warning">
          <div className="h-[230px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.statusData.length ? stats.statusData : [{ name: 'No Data', value: 1, color: '#334155' }]}
                  dataKey="value" nameKey="name" innerRadius={60} outerRadius={88} paddingAngle={3} strokeWidth={0}>
                  {(stats.statusData.length ? stats.statusData : [{ name: 'No Data', value: 1, color: '#334155' }]).map(d => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                {stats.statusData.length > 0 && <Tooltip content={<GlassTooltip />} />}
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="font-heading text-3xl font-black">{stats.totalAppts}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Total</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            {stats.statusData.map(d => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs py-1">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: d.color }} />
                <span className="text-muted-foreground truncate">{d.name}</span>
                <span className="ml-auto font-heading font-bold">{d.value}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* ═══ ROW 2: Monthly + Heatmap ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard title="Monthly Overview" subtitle="Appointments vs Tests — 6 months" icon={BarChart3} iconColor="text-indigo-500" className="lg:col-span-2">
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={4}>
                <defs>
                  <linearGradient id="barGrad1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.6} />
                  </linearGradient>
                  <linearGradient id="barGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.6} />
                  </linearGradient>
                  <linearGradient id="barGrad3" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d946ef" />
                    <stop offset="100%" stopColor="#d946ef" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip content={<GlassTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.1)' }} />
                <Bar dataKey="Appointments" fill="url(#barGrad1)" radius={[8, 8, 0, 0]} maxBarSize={24} />
                <Bar dataKey="Completed" fill="url(#barGrad2)" radius={[8, 8, 0, 0]} maxBarSize={24} />
                <Bar dataKey="Tests" fill="url(#barGrad3)" radius={[8, 8, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-5 mt-2">
            {[{ l: 'Appointments', c: '#6366f1' }, { l: 'Completed', c: '#10b981' }, { l: 'Tests', c: '#d946ef' }].map(x => (
              <div key={x.l} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <div className="w-3 h-3 rounded-md" style={{ background: x.c }} />
                {x.l}
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard title="Test Status" subtitle="Lab booking breakdown" icon={FlaskConical} iconColor="text-fuchsia-500" className="lg:col-span-1">
          <div className="h-[200px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.testStatusData.length ? stats.testStatusData : [{ name: 'No Data', value: 1, color: '#334155' }]}
                  dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={3} strokeWidth={0}>
                  {(stats.testStatusData.length ? stats.testStatusData : [{ name: 'No Data', value: 1, color: '#334155' }]).map(d => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                {stats.testStatusData.length > 0 && <Tooltip content={<GlassTooltip />} />}
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="font-heading text-2xl font-black">{stats.totalTests}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Tests</p>
            </div>
          </div>
          <div className="space-y-1.5 mt-2">
            {stats.testStatusData.map(d => (
              <div key={d.name} className="flex items-center gap-2 text-xs py-1 px-2 rounded-lg hover:bg-muted/30 transition-colors">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: d.color }} />
                <span className="text-muted-foreground font-medium truncate">{d.name}</span>
                <span className="ml-auto font-heading font-bold">{d.value}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* ═══ ROW 3: Peak Hours + Completion + Test Status ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Peak Hours */}
        <GlassCard title="Peak Hours" subtitle="Busiest time slots" icon={Timer} iconColor="text-amber-500">
          <div className="space-y-4">
            {stats.peakHours.map((h, i) => {
              const maxVal = Math.max(...stats.peakHours.map(p => p.value), 1);
              const pct = Math.round((h.value / maxVal) * 100);
              const isPeak = h.slot === stats.peakSlot?.slot && h.value > 0;
              return (
                <div key={h.slot}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold flex items-center gap-1.5">
                      <span>{h.emoji}</span>
                      <span className={isPeak ? 'text-amber-500' : 'text-foreground'}>{h.slot}</span>
                      {isPeak && <span className="text-[9px] bg-amber-500/15 text-amber-500 px-1.5 py-0.5 rounded-full font-bold border border-amber-500/20">PEAK</span>}
                    </span>
                    <span className="font-heading text-sm font-bold text-foreground">{h.value}</span>
                  </div>
                  <div className="h-2.5 bg-muted/30 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${pct}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
                      className={`h-full rounded-full shadow-sm ${isPeak ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 shadow-amber-500/30' : 'bg-gradient-to-r from-primary/70 to-primary/40'}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>

        {/* Completion Rate */}
        <GlassCard title="Completion Rate" subtitle="Overall performance" icon={Target} iconColor="text-success">
          <div className="h-[180px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart cx="50%" cy="55%" innerRadius="65%" outerRadius="95%" startAngle={180} endAngle={0}
                data={[{ name: 'Rate', value: stats.completionRate, fill: '#10b981' }]}>
                <defs>
                  <linearGradient id="radGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#34d399" />
                  </linearGradient>
                </defs>
                <RadialBar background={{ fill: 'hsl(var(--muted)/0.2)' }} dataKey="value" cornerRadius={12} fill="url(#radGrad)" />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ marginTop: '-15px' }}>
              <p className="font-heading text-4xl font-black bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">{stats.completionRate}%</p>
              <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">appointments done</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <motion.div whileHover={{ scale: 1.03 }} className="rounded-2xl bg-gradient-to-br from-success/10 to-success/5 border border-success/20 p-3.5 text-center">
              <p className="font-heading text-xl font-black text-success">{stats.completedAppts}</p>
              <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Completed</p>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} className="rounded-2xl bg-gradient-to-br from-rose-500/10 to-rose-500/5 border border-rose-500/20 p-3.5 text-center">
              <p className="font-heading text-xl font-black text-rose-500">{stats.pendingAppts}</p>
              <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Pending</p>
            </motion.div>
          </div>
        </GlassCard>

        {/* Test Status */}
        <GlassCard title="Activity Heatmap" subtitle="Last 4 weeks — appointments per day" icon={Flame} iconColor="text-emerald-500">
          <TooltipProvider>
            <div className="flex justify-center h-full items-center">
              <div>
                {/* Day headers */}
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="w-8" />
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                    <div key={d} className="w-8 text-center text-[9px] text-muted-foreground font-bold uppercase">{d}</div>
                  ))}
                </div>
                {/* Week rows */}
                {stats.heatmapRows.map((week, wi) => (
                  <div key={wi} className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-8 text-[9px] text-muted-foreground font-bold">{week.week}</div>
                    {week.cells.map((cell, ci) => {
                      const intensity = stats.heatMax > 0 ? cell.value / stats.heatMax : 0;
                      
                      // Enhanced styling for cells
                      const baseClass = "w-8 h-8 rounded-md transition-all duration-300 flex items-center justify-center cursor-default relative overflow-hidden";
                      
                      let bgClass = "";
                      let borderClass = "";
                      
                      if (intensity === 0) {
                        bgClass = "bg-muted/30";
                        borderClass = "border border-border/50";
                      } else if (intensity <= 0.25) {
                        bgClass = "bg-emerald-500/20";
                        borderClass = "border border-emerald-500/30";
                      } else if (intensity <= 0.5) {
                        bgClass = "bg-emerald-500/40";
                        borderClass = "border border-emerald-500/40";
                      } else if (intensity <= 0.75) {
                        bgClass = "bg-emerald-500/60";
                        borderClass = "border border-emerald-500/50 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)]";
                      } else {
                        bgClass = "bg-emerald-500/90 shadow-[0_0_10px_rgba(16,185,129,0.3)]";
                        borderClass = "border border-emerald-400/60 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)]";
                      }

                      return (
                        <RadixTooltip key={ci} delayDuration={0}>
                          <TooltipTrigger asChild>
                            <motion.div
                              whileHover={{ scale: 1.15, zIndex: 10 }}
                              className={`${baseClass} ${bgClass} ${borderClass} hover:ring-2 hover:ring-emerald-500/40 hover:shadow-lg`}
                            >
                              {cell.value > 0 && <span className="text-[10px] font-bold text-emerald-950 dark:text-emerald-50 z-10">{cell.value}</span>}
                            </motion.div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-[10px] py-1 px-2.5 rounded-lg">
                            <p className="font-bold">{cell.day}, {cell.date}</p>
                            <p className="text-muted-foreground">{cell.value} appt{cell.value !== 1 ? 's' : ''}</p>
                          </TooltipContent>
                        </RadixTooltip>
                      );
                    })}
                  </div>
                ))}
                {/* Legend */}
                <div className="flex items-center justify-end gap-1 mt-3">
                  <span className="text-[9px] text-muted-foreground font-medium mr-1">Less</span>
                  <div className="w-4 h-4 rounded-[4px] bg-muted/30 border border-border/50" />
                  <div className="w-4 h-4 rounded-[4px] bg-emerald-500/20 border border-emerald-500/30" />
                  <div className="w-4 h-4 rounded-[4px] bg-emerald-500/40 border border-emerald-500/40" />
                  <div className="w-4 h-4 rounded-[4px] bg-emerald-500/60 border border-emerald-500/50" />
                  <div className="w-4 h-4 rounded-[4px] bg-emerald-500/90 border border-emerald-400/60" />
                  <span className="text-[9px] text-muted-foreground font-medium ml-1">More</span>
                </div>
              </div>
            </div>
          </TooltipProvider>
        </GlassCard>
      </div>
    </div>
  );
}
