import React from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Award,
  Bell,
  Clock,
  Wallet,
  TrendingUp,
  Briefcase,
  Star,
  Building2,
  DollarSign,
  ArrowUpRight,
  Stethoscope,
  MapPin,
  CheckCircle2,
  BadgeCheck,
  ShieldCheck,
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
  ResponsiveContainer,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface AssistantOverviewTabProps {
  user: any;
  profile: any;
  earnings: any;
  history: any[];
  incomingRequests: any[];
  activeBooking: any;
  elapsedDuration: string;
  setActiveTab: (tab: string) => void;
  navigate: (path: string) => void;
  getAssistantNet: (booking: any) => number;
  serviceCategories: Array<{ id: string; label: string; icon: string }>;
}

export const AssistantOverviewTab: React.FC<AssistantOverviewTabProps> = ({
  user,
  profile,
  earnings,
  history,
  incomingRequests,
  activeBooking,
  elapsedDuration,
  setActiveTab,
  navigate,
  getAssistantNet,
  serviceCategories,
}) => {
  return (
    <div className="space-y-6">
      {/* Welcome & Live Status Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-600 via-teal-700 to-cyan-800 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-40 h-40 rounded-full bg-teal-400/20 blur-2xl pointer-events-none" />
        <div className="absolute right-6 bottom-4 opacity-10 pointer-events-none hidden sm:block">
          <Stethoscope className="w-56 h-56" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-bold text-teal-100 border border-white/20">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                FindMedi Hospital Care Partner
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/25 backdrop-blur-md text-xs font-semibold text-emerald-100 border border-emerald-400/30">
                <Award className="w-3.5 h-3.5 text-emerald-300" />
                Gold Attendant
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              {(() => {
                const hr = new Date().getHours();
                if (hr < 12) return 'Good Morning';
                if (hr < 17) return 'Good Afternoon';
                return 'Good Evening';
              })()}, {user?.name?.split(' ')[0] || 'Care Attendant'}! 👋
            </h2>

            <p className="text-teal-100 text-xs sm:text-sm leading-relaxed max-w-xl">
              {profile?.isAvailable
                ? 'You are active on duty! Emergency patient admissions, OPD tokens, and lab assistance requests will buzz your phone.'
                : 'You are currently off-duty. Switch "Available on Duty" above to start receiving hospital companion shift requests.'}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                type="button"
                onClick={() => setActiveTab('requests')}
                className="bg-white text-teal-800 hover:bg-teal-50 font-bold text-xs rounded-xl shadow-md h-9 px-4 gap-1.5"
              >
                <Bell className="w-3.5 h-3.5 text-teal-600" />
                Shift Requests ({incomingRequests.length})
              </Button>
              {activeBooking && (
                <Button
                  type="button"
                  onClick={() => setActiveTab('active')}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md h-9 px-4 gap-1.5"
                >
                  <Clock className="w-3.5 h-3.5" />
                  Active Shift Controls
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveTab('profile')}
                className="border-white/30 text-white hover:bg-white/10 font-semibold text-xs rounded-xl h-9 px-4"
              >
                Hospital Coverage & Skills
              </Button>
            </div>
          </div>

          {/* Right Hero Live Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-1 gap-3 shrink-0">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3.5 text-center sm:text-left min-w-[130px]">
              <span className="text-[10px] text-teal-200 uppercase font-bold tracking-wider block">Today Net</span>
              <span className="text-xl font-black text-white">₹{earnings?.todayNet || 0}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3.5 text-center sm:text-left min-w-[130px]">
              <span className="text-[10px] text-teal-200 uppercase font-bold tracking-wider block">Rating</span>
              <span className="text-xl font-black text-amber-300 flex items-center justify-center sm:justify-start gap-1">
                ★ {profile?.rating?.avg ? Number(profile.rating.avg).toFixed(1) : '5.0'}
              </span>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3.5 text-center sm:text-left min-w-[130px] col-span-2 sm:col-span-1">
              <span className="text-[10px] text-teal-200 uppercase font-bold tracking-wider block">Completed Shifts</span>
              <span className="text-xl font-black text-white">
                {profile?.totalBookings || history.length || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance & Financial Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Wallet Balance */}
        <motion.div
          whileHover={{ y: -4, scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-2 group hover:border-emerald-500/50"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Wallet Balance
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
            ₹{profile?.walletBalance || earnings?.walletBalance || 0}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
            <span className="text-slate-400">Ready for instant payout</span>
            <button
              type="button"
              onClick={() => setActiveTab('earnings')}
              className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center"
            >
              Withdraw <ArrowUpRight className="w-3 h-3 ml-0.5" />
            </button>
          </div>
        </motion.div>

        {/* Net Earnings */}
        <motion.div
          whileHover={{ y: -4, scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-2 group hover:border-teal-500/50"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Net Earnings
            </span>
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-slate-100">
            ₹{earnings?.netEarnings || 0}
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>This month: ₹{earnings?.thisMonthNet || 0}</span>
            <span className="text-emerald-500 font-bold">100% Payout</span>
          </div>
        </motion.div>

        {/* Completed Shifts */}
        <motion.div
          whileHover={{ y: -4, scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-2 group hover:border-cyan-500/50"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Shifts
            </span>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-slate-100">
            {profile?.totalBookings || history.length || 0}
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>Completion Rate</span>
            <span className="text-teal-600 dark:text-teal-400 font-bold">
              {profile?.completionRate || 99}%
            </span>
          </div>
        </motion.div>

        {/* Rating & Patient Trust */}
        <motion.div
          whileHover={{ y: -4, scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-2 group hover:border-amber-500/50"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Patient Trust Rating
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-500 flex items-center gap-1.5">
            {profile?.rating?.avg ? Number(profile.rating.avg).toFixed(1) : '5.0'}
            <span className="text-xs text-slate-400 font-normal">/ 5.0</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>On-Time Arrival</span>
            <span className="text-emerald-500 font-bold">{profile?.onTimeRate || 98}%</span>
          </div>
        </motion.div>
      </div>

      {/* Quick Hub Grid (Shortcuts to Tabs) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setActiveTab('requests')}
          className="p-4 rounded-2xl border border-teal-500/20 bg-gradient-to-br from-teal-500/10 via-teal-500/5 to-transparent hover:from-teal-500/20 transition-all text-left space-y-2 group shadow-sm hover:border-teal-500/40 hover:-translate-y-0.5"
        >
          <div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-sm text-slate-900 dark:text-slate-100">Shift Requests</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {incomingRequests.length} waiting request(s)
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('active')}
          className="p-4 rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-cyan-500/5 to-transparent hover:from-cyan-500/20 transition-all text-left space-y-2 group shadow-sm hover:border-cyan-500/40 hover:-translate-y-0.5"
        >
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-sm text-slate-900 dark:text-slate-100">Active Shift</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {activeBooking ? 'Shift in progress' : 'Standby / Waiting'}
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('earnings')}
          className="p-4 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent hover:from-emerald-500/20 transition-all text-left space-y-2 group shadow-sm hover:border-emerald-500/40 hover:-translate-y-0.5"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-sm text-slate-900 dark:text-slate-100">Earnings & Payout</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              ₹{profile?.walletBalance || earnings?.walletBalance || 0} balance
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className="p-4 rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent hover:from-indigo-500/20 transition-all text-left space-y-2 group shadow-sm hover:border-indigo-500/40 hover:-translate-y-0.5"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-sm text-slate-900 dark:text-slate-100">Hospitals & Rates</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              ₹{profile?.pricePerHour || 150}/hr · {profile?.operatingCity || 'Configured'}
            </p>
          </div>
        </button>
      </div>

      {/* ── CHARTS & ANALYTICS SECTION ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 8 Cols: Weekly Shift Activity & Revenue Area Chart */}
        <div className="lg:col-span-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Weekly Shift Duty & Earnings</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Daily record of completed hospital assistance shifts and earnings
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto text-xs bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="flex items-center gap-1.5 px-2 font-semibold text-teal-600 dark:text-teal-400">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500" /> Net Earnings (₹)
              </span>
              <span className="flex items-center gap-1.5 px-2 font-semibold text-slate-500">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> Shifts
              </span>
            </div>
          </div>

          {/* Responsive Area Chart */}
          <div className="h-64 w-full pt-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={[
                  { day: 'Mon', revenue: 450, shifts: 1 },
                  { day: 'Tue', revenue: 900, shifts: 2 },
                  { day: 'Wed', revenue: 300, shifts: 1 },
                  { day: 'Thu', revenue: 1200, shifts: 2 },
                  { day: 'Fri', revenue: 600, shifts: 1 },
                  { day: 'Sat', revenue: earnings?.thisMonthNet ? Math.max(earnings.thisMonthNet, 1050) : 1050, shifts: 2 },
                  { day: 'Sun (Today)', revenue: earnings?.todayNet || 450, shifts: earnings?.todayBookings || 1 },
                ]}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="assistantRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={(v) => `₹${v}`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-xl text-xs space-y-1.5">
                          <p className="font-bold text-slate-900 dark:text-slate-100">{label}</p>
                          <div className="flex items-center justify-between gap-4 text-teal-600 font-bold">
                            <span>Earnings:</span>
                            <span>₹{payload[0]?.value}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-slate-500">
                            <span>Shifts:</span>
                            <span>{payload[0]?.payload?.shifts} completed</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#0d9488"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#assistantRevenueGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Bottom Mini Metrics Strip */}
          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div>
              <p className="text-[11px] text-slate-400">Avg. Shift Pay</p>
              <p className="font-bold text-teal-600 dark:text-teal-400 text-sm mt-0.5">₹450 / shift</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400">Response Speed</p>
              <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5">&lt; 3 mins</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400">Payout Split</p>
              <p className="font-bold text-teal-700 dark:text-teal-300 text-sm mt-0.5">90% Direct Attendant</p>
            </div>
          </div>
        </div>

        {/* 4 Cols: Service Categories Distribution Pie Chart */}
        <div className="lg:col-span-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Care Distribution</h3>
              <Badge variant="outline" className="text-[10px] font-mono">This Month</Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Shifts completed across medical assistance types
            </p>

            {/* Donut Chart */}
            <div className="h-44 w-full relative flex items-center justify-center mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'OPD & Paperwork', value: 45, color: '#0d9488' },
                      { name: 'Medicine & Pharmacy', value: 25, color: '#06b6d4' },
                      { name: 'Lab Reports', value: 18, color: '#6366f1' },
                      { name: 'Bedside Care', value: 12, color: '#f59e0b' },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={46}
                    outerRadius={68}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {[
                      { color: '#0d9488' },
                      { color: '#06b6d4' },
                      { color: '#6366f1' },
                      { color: '#f59e0b' },
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 shadow-lg text-xs">
                            <p className="font-bold text-slate-900 dark:text-slate-100">{payload[0]?.name}</p>
                            <p className="text-teal-600 font-bold">{payload[0]?.value}% of total shifts</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute text-center pointer-events-none">
                <span className="text-xl font-black text-slate-900 dark:text-slate-100">
                  {profile?.totalBookings || history.length || 14}
                </span>
                <span className="block text-[10px] text-slate-400 font-medium">Tasks</span>
              </div>
            </div>

            {/* Legend list */}
            <div className="grid grid-cols-2 gap-2 pt-2 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                <span className="text-slate-600 dark:text-slate-400 truncate">OPD & Queues (45%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                <span className="text-slate-600 dark:text-slate-400 truncate">Pharmacy (25%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                <span className="text-slate-600 dark:text-slate-400 truncate">Lab Reports (18%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-slate-600 dark:text-slate-400 truncate">Bedside Care (12%)</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500">Service Reliability</span>
            <span className="font-bold text-emerald-600 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> High Trust Score
            </span>
          </div>
        </div>
      </div>

      {/* ── ASSISTANT CARE TOOLKIT ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 hover:border-teal-500/40 hover:shadow-sm transition-all flex flex-col justify-between cursor-pointer" onClick={() => navigate('/assistant/dashboard?tab=active')}>
          <div className="flex justify-between items-center mb-2">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 animate-pulse">Live</span>
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">Tracking</p>
            <p className="text-[10px] text-slate-500 uppercase font-semibold">Patient Location Map</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 hover:border-teal-500/40 hover:shadow-sm transition-all flex flex-col justify-between cursor-pointer" onClick={() => navigate('/assistant/dashboard?tab=active')}>
          <div className="flex justify-between items-center mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300">3 Pending</span>
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">Care Tasks</p>
            <p className="text-[10px] text-slate-500 uppercase font-semibold">Daily Shift Checklist</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 hover:border-teal-500/40 hover:shadow-sm transition-all flex flex-col justify-between cursor-pointer" onClick={() => navigate('/assistant/dashboard?tab=active')}>
          <div className="flex justify-between items-center mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">Sync</span>
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">Meds Alert</p>
            <p className="text-[10px] text-slate-500 uppercase font-semibold">Dosage Schedule</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 hover:border-teal-500/40 hover:shadow-sm transition-all flex flex-col justify-between cursor-pointer" onClick={() => navigate('/assistant/dashboard?tab=active')}>
          <div className="flex justify-between items-center mb-2">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
              <Stethoscope className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-300">Vitals</span>
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">Live Vitals</p>
            <p className="text-[10px] text-slate-500 uppercase font-semibold">BP & Pulse Monitor</p>
          </div>
        </div>
      </div>

      {/* Active Shift Immediate Callout Card if active */}
      {activeBooking && (
        <div className="p-6 rounded-3xl border-2 border-teal-500 bg-teal-50/40 dark:bg-teal-950/20 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
              <Badge className="bg-teal-600 text-white font-bold text-xs uppercase">
                Active Shift in Progress
              </Badge>
              <span className="text-xs font-semibold text-teal-800 dark:text-teal-300">
                Booking #{activeBooking.bookingNumber || activeBooking._id.slice(-6)}
              </span>
            </div>

            {activeBooking.status === 'in_progress' && (
              <div className="inline-flex items-center gap-2 bg-white dark:bg-slate-900 border border-teal-500/20 px-3.5 py-1 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-100 shadow-sm">
                <Clock className="w-3.5 h-3.5 text-teal-600 animate-spin" />
                Duty Duration: <span className="font-mono text-teal-600">{elapsedDuration}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div>
              <span className="text-xs text-slate-400 block">Patient Name</span>
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                {activeBooking.patientId?.name || 'Assigned Patient'}
              </h4>
              {activeBooking.patientId?.phone && (
                <span className="text-xs text-slate-500">{activeBooking.patientId.phone}</span>
              )}
            </div>

            <div>
              <span className="text-xs text-slate-400 block">Hospital & Ward</span>
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-teal-600" />
                {activeBooking.hospital}
              </h4>
              <span className="text-xs text-slate-500">
                {activeBooking.durationType?.toUpperCase()} Shift • Started at {activeBooking.startTime}
              </span>
            </div>

            <div className="flex items-center gap-2 justify-start sm:justify-end self-center">
              <Button
                type="button"
                onClick={() => setActiveTab('active')}
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-sm h-10 px-5"
              >
                Open Active Shift Controls
                <ArrowUpRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Incoming Requests Peek */}
      {incomingRequests.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                <Bell className="w-4 h-4 animate-bounce" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Pending Shift Requests ({incomingRequests.length})
                </h3>
                <p className="text-[11px] text-slate-400">
                  Patients waiting for attendant acceptance right now
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab('requests')}
              className="text-xs font-bold text-teal-600 hover:text-teal-700"
            >
              View All <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {incomingRequests.slice(0, 2).map((req) => (
              <div
                key={req._id}
                className="p-4 rounded-2xl border border-teal-200 dark:border-teal-900/60 bg-teal-50/20 dark:bg-teal-950/10 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    {req.isUrgent && (
                      <Badge className="bg-rose-600 text-white text-[9px] uppercase font-black px-2 py-0.5 rounded-full mb-1">
                        🚨 URGENT BROADCAST
                      </Badge>
                    )}
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-teal-600" />
                      {req.hospital}
                    </h4>
                    <span className="text-xs text-slate-500">
                      Patient: {req.patientId?.name || 'Verified Patient'} • Duration: {req.durationType?.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Net Payout</span>
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                      ₹{getAssistantNet(req)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                  <Button
                    type="button"
                    onClick={() => setActiveTab('requests')}
                    size="sm"
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl h-8"
                  >
                    Respond to Request
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hospital Coverage Map Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-teal-600" />
              Service Areas & Reach
            </h3>
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className="text-xs font-bold text-teal-600 hover:underline"
            >
              Edit in Profile
            </button>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            You can serve at any hospital/clinic within your selected cities. Patient requests are matched based on your service areas.
          </p>

          <div className="flex flex-wrap gap-2">
            {(profile?.hospitalsCovered || []).length > 0 ? (
              profile.hospitalsCovered.map((h: string, idx: number) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-xs font-bold text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-800"
                >
                  <MapPin className="w-3 h-3 text-teal-600" />
                  {h}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-400">
                No service areas selected yet. Add cities in your profile to receive requests.
              </span>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-500 mb-2">Service Capabilities Offered:</h4>
            <div className="flex flex-wrap gap-1.5">
              {(profile?.serviceCategories || []).map((catId: string) => {
                const item = serviceCategories.find((s) => s.id === catId);
                return (
                  <span
                    key={catId}
                    className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-[11px] font-medium"
                  >
                    {item ? `${item.icon} ${item.label}` : catId}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Assistant Care SOP & Safety Protocol */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BadgeCheck className="w-4 h-4 text-emerald-600" />
            Care Attendant SOP & Guidelines
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40">
              <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">Check In Immediately</span>
                <p className="text-slate-500 text-[11px]">
                  As soon as you enter the hospital campus, tap "Check In Now" in your Active Shift tab to inform the patient.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40">
              <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">Realtime Task Checklist</span>
                <p className="text-slate-500 text-[11px]">
                  Mark tasks as completed (Prescription bought, OPD queue tokens, Lab reports collected) so the family stays reassured.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40">
              <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">Safe Handover at Completion</span>
                <p className="text-slate-500 text-[11px]">
                  Hand over all receipts and doctor files to the patient/relative before clicking "Mark Assistance Completed".
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
