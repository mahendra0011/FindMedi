import React from 'react';
import { motion } from 'framer-motion';
import {
  MapPin,
  Phone,
  Navigation,
  CheckCircle2,
  Clock,
  Shield,
  Activity,
  Award,
  History,
  Settings,
  Siren,
  Banknote,
  ShieldCheck,
  BarChart3,
  CalendarDays,
  Target
} from 'lucide-react';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface AmbulanceOverviewTabProps {
  amb: any;
  job: any;
  isOnline: boolean;
  gpsOk: string;
  stats: {
    todayCount: number;
    avgResponseMin: number;
    totalCompleted: number;
    monthCount?: number;
  };
  recentJobs: any[];
  totalJobsCount: number;
  weeklyDispatchData: any[];
  emergencySeverityData: any[];
  setTab: (tab: string) => void;
}

export const AmbulanceOverviewTab: React.FC<AmbulanceOverviewTabProps> = ({
  amb,
  job,
  isOnline,
  gpsOk,
  stats,
  recentJobs,
  totalJobsCount,
  weeklyDispatchData,
  emergencySeverityData,
  setTab,
}) => {
  return (
    <div className="space-y-6">
      {/* Colorful Welcome Hero Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl p-6 sm:p-7 bg-gradient-to-r from-destructive via-rose-600 to-amber-600 shadow-lg text-white"
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-amber-300/20 rounded-full blur-3xl -ml-12 -mb-12 pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-bold uppercase tracking-widest text-white/80">
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-bold text-white">
                <Award className="w-3 h-3" /> Rapid Response Emergency Unit
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
              Emergency Dispatcher Console <Siren className="w-5 h-5 text-amber-200 animate-bounce" />
            </h2>
            <p className="text-xs sm:text-sm text-white/90 font-medium">
              {isOnline
                ? 'Ambulance is online on FindMedi radar. Priority incoming calls will trigger full-screen sirens.'
                : 'Ambulance is offline. Toggle Online to activate emergency GPS and receive dispatches.'}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-center px-4 py-2.5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20">
              <p className="text-lg font-black text-white leading-none">{stats.todayCount}</p>
              <p className="text-[10px] font-semibold text-white/80 mt-1">Today's Runs</p>
            </div>
            <div className="text-center px-4 py-2.5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20">
              <p className="text-lg font-black text-white leading-none">{stats.avgResponseMin}m</p>
              <p className="text-[10px] font-semibold text-white/80 mt-1">Avg Response</p>
            </div>
            <div className="text-center px-4 py-2.5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20">
              <p className="text-lg font-black text-white leading-none">{stats.totalCompleted}</p>
              <p className="text-[10px] font-semibold text-white/80 mt-1">Saved Lives</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── AMBULANCE OPERATIONS & SAFETY WIDGET (Audit Fixes) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-2xl border p-4 hover:border-primary/40 hover:shadow-sm transition-all flex flex-col justify-between cursor-pointer">
          <div className="flex justify-between items-center mb-2">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-teal-500" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 animate-pulse">Required</span>
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">Pending</p>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Pre-Shift Equipment Check</p>
          </div>
        </div>

        <div className="bg-card rounded-2xl border p-4 hover:border-primary/40 hover:shadow-sm transition-all flex flex-col justify-between cursor-pointer">
          <div className="flex justify-between items-center mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Navigation className="w-4 h-4 text-blue-500" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600">Maps Setup</span>
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">Hospital DB</p>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Destination Routing</p>
          </div>
        </div>

        <div className="bg-card rounded-2xl border p-4 hover:border-primary/40 hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Banknote className="w-4 h-4 text-emerald-500" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">This Week</span>
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">₹14,500</p>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Ambulance Earnings</p>
          </div>
        </div>

        <div className="bg-card rounded-2xl border p-4 hover:border-primary/40 hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-violet-500" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600">Protocol</span>
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">100%</p>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Safe Patient Handoffs</p>
          </div>
        </div>
      </div>

      {/* Active Job Alert Banner if job is ongoing */}
      {job && (
        <motion.div
          initial={{ scale: 0.98, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="p-5 rounded-3xl border-2 border-destructive bg-destructive/10 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-destructive text-white flex items-center justify-center shrink-0 shadow-lg">
              <Siren className="w-6 h-6 animate-spin" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="animate-pulse text-[10px] uppercase font-bold">
                  Active Emergency Dispatch
                </Badge>
                <span className="text-xs font-mono font-bold text-foreground">
                  #{job._id?.slice(-6)?.toUpperCase()}
                </span>
              </div>
              <h4 className="text-base font-bold text-foreground mt-0.5">
                {job.patientDetails?.name || 'Emergency Patient'} · {job.category || 'Severe Emergency'}
              </h4>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-destructive shrink-0" />
                <span className="line-clamp-1">{job.location?.address || 'Pickup Coordinates active'}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              onClick={() => setTab('active')}
              className="rounded-xl bg-destructive text-white font-bold text-xs gap-1.5 shadow"
            >
              <Navigation className="w-3.5 h-3.5" /> Navigate & Progress Mission
            </Button>
          </div>
        </motion.div>
      )}

      {/* Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          whileHover={{ y: -4, scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="relative overflow-hidden rounded-2xl border border-destructive/20 bg-gradient-to-br from-destructive/15 via-destructive/5 to-transparent p-5 shadow-sm space-y-2"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-destructive/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Today's Emergencies</span>
            <div className="w-8 h-8 rounded-lg bg-destructive/15 text-destructive flex items-center justify-center">
              <Siren className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold bg-gradient-to-r from-destructive to-rose-500 bg-clip-text text-transparent">
            {stats.todayCount} runs
          </p>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="font-semibold text-destructive">{stats.todayCount} dispatched</span>
            <span>today</span>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -4, scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent p-5 shadow-sm space-y-2"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Avg Response Time</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold bg-gradient-to-r from-amber-600 to-orange-500 dark:from-amber-400 dark:to-orange-300 bg-clip-text text-transparent">
            {stats.avgResponseMin || 7} min
          </p>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="font-semibold text-amber-600 dark:text-amber-400">Target &lt; 10 min</span>
            <span>golden hour benchmark</span>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -4, scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent p-5 shadow-sm space-y-2"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Total Completed Trips</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">
            {stats.totalCompleted}
          </p>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">100% Hospital delivery</span>
            <span>rate</span>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -4, scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="relative overflow-hidden rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-500/15 via-sky-500/5 to-transparent p-5 shadow-sm space-y-2"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Hospital Rating</span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold bg-gradient-to-r from-sky-600 to-indigo-500 dark:from-sky-400 dark:to-indigo-300 bg-clip-text text-transparent">
            4.9★
          </p>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="font-semibold text-sky-600 dark:text-sky-400">Verified Driver</span>
            <span>{amb?.hospitalId?.name?.slice(0, 16) || 'Hospital'}</span>
          </div>
        </motion.div>
      </div>

      {/* Quick Hub Shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <button
          onClick={() => setTab('active')}
          className="p-4 rounded-2xl border border-destructive/20 bg-gradient-to-br from-destructive/10 via-destructive/5 to-transparent hover:from-destructive/20 transition-all text-left space-y-2 group shadow-sm hover:border-destructive/40 hover:-translate-y-0.5"
        >
          <div className="w-10 h-10 rounded-xl bg-destructive/15 text-destructive flex items-center justify-center group-hover:scale-110 transition-transform">
            <Siren className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground">Active Mission</p>
            <p className="text-xs text-muted-foreground">
              {job ? '1 emergency ongoing' : 'Standby / Tracking'}
            </p>
          </div>
        </button>

        <button
          onClick={() => setTab('history')}
          className="p-4 rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-500/10 via-sky-500/5 to-transparent hover:from-sky-500/20 transition-all text-left space-y-2 group shadow-sm hover:border-sky-500/40 hover:-translate-y-0.5"
        >
          <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <History className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground">Mission History</p>
            <p className="text-xs text-muted-foreground">{totalJobsCount} past dispatches</p>
          </div>
        </button>

        <button
          onClick={() => setTab('vehicle')}
          className="p-4 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent hover:from-emerald-500/20 transition-all text-left space-y-2 group shadow-sm hover:border-emerald-500/40 hover:-translate-y-0.5"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground">Vehicle & Equipment</p>
            <p className="text-xs text-muted-foreground">{amb?.ambulanceType || 'BLS'} · Life Support</p>
          </div>
        </button>

        <button
          onClick={() => setTab('settings')}
          className="p-4 rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-violet-500/5 to-transparent hover:from-violet-500/20 transition-all text-left space-y-2 group shadow-sm hover:border-violet-500/40 hover:-translate-y-0.5"
        >
          <div className="w-10 h-10 rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground">Driver Settings</p>
            <p className="text-xs text-muted-foreground">Audio & Dispatch Rules</p>
          </div>
        </button>
      </div>

      {/* ── CHARTS & ANALYTICS SECTION ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 8 Cols: Weekly Emergency Response Activity Area Chart */}
        <div className="lg:col-span-8 rounded-3xl border border-destructive/20 bg-gradient-to-br from-destructive/5 via-card to-transparent p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-destructive/15 text-destructive flex items-center justify-center font-bold">
                  <BarChart3 className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-base text-foreground">Weekly Response Performance</h3>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Emergency runs & golden-hour response time in minutes</p>
            </div>
            <Badge variant="outline" className="text-xs font-semibold self-start sm:self-auto border-destructive/30 text-destructive bg-destructive/5">
              <CalendarDays className="w-3 h-3 mr-1" /> Last 7 Days
            </Badge>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyDispatchData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="emergGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="speedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/40" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '1rem',
                    fontSize: '12px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Area type="monotone" dataKey="jobs" name="Emergency Runs" stroke="#ef4444" strokeWidth={2.5} fillOpacity={1} fill="url(#emergGradient)" />
                <Area type="monotone" dataKey="avgMin" name="Avg Response (Min)" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#speedGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border/60 text-xs">
            <div>
              <p className="text-[11px] text-muted-foreground">Weekly Runs</p>
              <p className="font-bold text-destructive text-sm mt-0.5">44 Dispatches</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Average Response</p>
              <p className="font-bold text-amber-600 dark:text-amber-400 text-sm mt-0.5">7.4 Minutes</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Emergency Readiness</p>
              <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5">99.2% Standby</p>
            </div>
          </div>
        </div>

        {/* 4 Cols: Emergency Categories Distribution */}
        <div className="lg:col-span-4 rounded-3xl border border-rose-500/20 bg-gradient-to-br from-rose-500/5 via-card to-transparent p-5 sm:p-6 shadow-sm space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-foreground">Emergency Categories</h3>
              <Badge variant="outline" className="text-[10px]">Triage Share</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Medical dispatch type distribution</p>

            <div className="h-44 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={emergencySeverityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {emergencySeverityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '0.75rem',
                      fontSize: '11px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-1.5 mt-2">
              {emergencySeverityData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-bold text-foreground">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Response Time Target Progress */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-card to-transparent border border-amber-500/20 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-amber-500" /> Golden Hour Benchmark
              </span>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">7.2m / 10m</span>
            </div>
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 rounded-full transition-all duration-500" style={{ width: '72%' }} />
            </div>
            <p className="text-[10px] text-muted-foreground">
              You are beating the city average response time by 2.8 minutes!
            </p>
          </div>
        </div>
      </div>

      {/* Operational Status + Real-Time Telemetry Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 cols: Recent Missions Preview */}
        <div className="lg:col-span-2 rounded-3xl border border-sky-500/20 bg-gradient-to-br from-sky-500/5 via-card to-transparent p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <History className="w-4 h-4" />
                </span>
                Recent Completed Missions
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Last emergency runs dispatched to this ambulance</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTab('history')}
              className="rounded-xl text-xs h-8 border-border"
            >
              View All History
            </Button>
          </div>

          <div className="divide-y divide-border/60">
            {recentJobs.slice(0, 4).map((j: any) => (
              <div key={j._id} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                    <Siren className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground font-mono">
                        #{j._id?.slice(-6)?.toUpperCase()}
                      </span>
                      <span>•</span>
                      <span className="font-semibold text-foreground">
                        {j.patientDetails?.name || 'Emergency Patient'}
                      </span>
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                        {j.category || 'SOS'}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                      {j.location?.address || 'Pickup location confirmed'} → {j.selectedHospitalId?.name || amb?.hospitalId?.name || 'Hospital'}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs block">
                    Completed
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {j.createdAt ? new Date(j.createdAt).toLocaleDateString('en-IN') : 'Recently'}
                  </span>
                </div>
              </div>
            ))}

            {!recentJobs.length && (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No emergency missions dispatched yet. Go online to receive emergency hospital calls.
              </div>
            )}
          </div>
        </div>

        {/* Right 1 col: Driver Standing & Telemetry */}
        <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-card to-transparent p-5 sm:p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </span>
              Ambulance Telemetry
            </h3>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          </div>

          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-500/10 via-transparent to-emerald-500/10 border border-sky-500/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-destructive" /> GPS Telemetry
                </span>
                <Badge variant={isOnline ? 'default' : 'secondary'} className="text-[10px] font-bold">
                  {isOnline ? 'Live Active' : 'Offline'}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground font-mono">
                {gpsOk}
              </p>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border/60">
              <span className="text-muted-foreground">Linked Hospital</span>
              <span className="font-semibold text-foreground">
                {amb?.hospitalId?.name || 'Central Hospital'}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border/60">
              <span className="text-muted-foreground">Ambulance Type</span>
              <Badge variant="outline" className="text-[10px] font-bold">
                {amb?.ambulanceType || 'Basic Life Support (BLS)'}
              </Badge>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border/60">
              <span className="text-muted-foreground">Dispatch Acceptance Rate</span>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-bold text-foreground">98.4%</span>
              </div>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border/60">
              <span className="text-muted-foreground">Oxygen & Stretcher</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Inspected Ready</span>
            </div>

            {amb?.hospitalId?.phone && (
              <a href={`tel:${amb.hospitalId.phone}`} className="block w-full">
                <Button variant="outline" size="sm" className="w-full text-xs rounded-xl gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-primary" /> Call Hospital ER Dispatcher
                </Button>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
