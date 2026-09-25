import React from 'react';
import { motion } from 'framer-motion';
import {
  Scale,
  Sparkles,
  Award,
  Power,
  Bell,
  Clock,
  Wallet,
  ArrowUpRight,
  TrendingUp,
  Briefcase,
  Star,
  FileText,
  CalendarDays,
  BookOpen,
  PieChart as PieChartIcon,
  Video,
  History,
  IndianRupee,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface LawyerOverviewTabProps {
  user: any;
  profile: any;
  isPendingApproval: boolean;
  togglingAvailable: boolean;
  handleToggleAvailable: () => Promise<void>;
  incomingRequests: any[];
  activeBooking: any;
  earnings: any;
  history: any[];
  weeklyData: any[];
  caseMix: any[];
  setActiveTab: (tab: string) => void;
}

export const LawyerOverviewTab: React.FC<LawyerOverviewTabProps> = ({
  user,
  profile,
  isPendingApproval,
  togglingAvailable,
  handleToggleAvailable,
  incomingRequests,
  activeBooking,
  earnings,
  history,
  weeklyData,
  caseMix,
  setActiveTab,
}) => {
  return (
    <div className="space-y-6">
      {/* Welcome & Live Status Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-black via-slate-900 to-slate-800 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-40 h-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute right-6 bottom-4 opacity-10 pointer-events-none hidden sm:block">
          <Scale className="w-56 h-56" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-bold text-slate-100 border border-white/20">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Medical Negligence & Health Law Council
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/25 backdrop-blur-md text-xs font-semibold text-emerald-100 border border-emerald-400/30">
                <Award className="w-3.5 h-3.5 text-emerald-300" />
                Senior Advocate
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              {(() => {
                const hr = new Date().getHours();
                if (hr < 12) return 'Good Morning';
                if (hr < 17) return 'Good Afternoon';
                return 'Good Evening';
              })()}
              , {user?.name?.split(' ')[0] || 'Counsel'}! ⚖️
            </h2>

            <p className="text-slate-100 text-xs sm:text-sm leading-relaxed max-w-xl">
              {profile?.isAvailable
                ? 'Your legal chamber is online! Clients requiring urgent medical negligence, insurance disputes, or hospital consumer claims will connect directly.'
                : 'You are currently offline. Switch "Available for Consult" above to accept tele-law advisory and chamber sessions.'}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                type="button"
                disabled={isPendingApproval || togglingAvailable}
                onClick={handleToggleAvailable}
                className={`font-bold text-xs rounded-xl shadow-md h-9 px-4 gap-1.5 ${
                  profile?.isAvailable
                    ? 'bg-rose-500 hover:bg-rose-600 text-white'
                    : 'bg-emerald-400 hover:bg-emerald-500 text-emerald-950'
                } ${isPendingApproval ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {togglingAvailable ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Power className="w-3.5 h-3.5" />
                )}
                {togglingAvailable
                  ? 'Updating...'
                  : profile?.isAvailable
                  ? 'Go Offline / In Court'
                  : 'Go Online — Accept Clients'}
              </Button>
              <Button
                type="button"
                onClick={() => setActiveTab('requests')}
                className="bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs rounded-xl shadow-md h-9 px-4 gap-1.5"
              >
                <Bell className="w-3.5 h-3.5 text-slate-900" />
                Consultation Requests ({incomingRequests.length})
              </Button>
              {activeBooking && (
                <Button
                  type="button"
                  onClick={() => setActiveTab('active')}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md h-9 px-4 gap-1.5"
                >
                  <Clock className="w-3.5 h-3.5" />
                  Active Legal Session
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveTab('profile')}
                className="border-white/30 text-white hover:bg-white/10 font-semibold text-xs rounded-xl h-9 px-4"
              >
                Chamber Fees & Specialization
              </Button>
            </div>
          </div>

          {/* Right Hero Live Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-1 gap-3 shrink-0">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3.5 text-center sm:text-left min-w-[130px]">
              <span className="text-[10px] text-slate-200 uppercase font-bold tracking-wider block">
                Wallet Balance
              </span>
              <span className="text-xl font-black text-white">
                ₹{earnings?.walletBalance?.toLocaleString() || 0}
              </span>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3.5 text-center sm:text-left min-w-[130px]">
              <span className="text-[10px] text-slate-200 uppercase font-bold tracking-wider block">
                Rating
              </span>
              <span className="text-xl font-black text-amber-300 flex items-center justify-center sm:justify-start gap-1">
                ★ {profile?.rating?.avg ? Number(profile.rating.avg).toFixed(1) : '5.0'}
              </span>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3.5 text-center sm:text-left min-w-[130px] col-span-2 sm:col-span-1">
              <span className="text-[10px] text-slate-200 uppercase font-bold tracking-wider block">
                Completed Cases
              </span>
              <span className="text-xl font-black text-white">
                {earnings?.completedConsultationsCount ?? history.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metric Cards */}
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
            ₹{earnings?.walletBalance?.toLocaleString() || 0}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
            <span className="text-slate-400">Available to withdraw</span>
            <button
              type="button"
              onClick={() => setActiveTab('earnings')}
              className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center"
            >
              Withdraw <ArrowUpRight className="w-3 h-3 ml-0.5" />
            </button>
          </div>
        </motion.div>

        {/* Total Earned */}
        <motion.div
          whileHover={{ y: -4, scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-2 group hover:border-slate-900/50 dark:hover:border-white/30"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-slate-800/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Revenue
            </span>
            <div className="w-9 h-9 rounded-xl bg-slate-800/10 text-slate-900 dark:text-slate-100 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-slate-100">
            ₹{earnings?.totalEarnings?.toLocaleString() || 0}
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>Commission: 10%</span>
            <span className="text-emerald-500 font-bold">90% Net Payout</span>
          </div>
        </motion.div>

        {/* Cases Advised */}
        <motion.div
          whileHover={{ y: -4, scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-2 group hover:border-slate-900/40 dark:hover:border-white/30"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-slate-700/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Consultations
            </span>
            <div className="w-9 h-9 rounded-xl bg-slate-700/10 text-slate-900 dark:text-slate-100 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-slate-100">
            {earnings?.totalBookings || history.length || 0}
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>Success Rate</span>
            <span className="text-slate-900 dark:text-slate-100 font-bold">100% Settled</span>
          </div>
        </motion.div>

        {/* Rating Score */}
        <motion.div
          whileHover={{ y: -4, scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-2 group hover:border-amber-500/50"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Client Rating
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-500 flex items-center gap-1.5">
            {profile?.rating?.avg ? profile.rating.avg.toFixed(1) : '5.0'}
            <span className="text-xs text-slate-400 font-normal">/ 5.0</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>Verified Feedback</span>
            <span className="text-amber-500 font-bold">
              ({profile?.rating?.count || history.length || 0} reviews)
            </span>
          </div>
        </motion.div>
      </div>

      {/* ── LEGAL OPERATIONS & CONSULTATION TOOLKIT (Audit Fixes) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-2xl border p-4 hover:border-slate-400 hover:shadow-sm transition-all flex flex-col justify-between cursor-pointer">
          <div className="flex justify-between items-center mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <FileText className="w-4 h-4 text-blue-500" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600">
              Case Files
            </span>
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">Docs Mgmt</p>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">
              Legal Client Briefs
            </p>
          </div>
        </div>

        <div className="bg-card rounded-2xl border p-4 hover:border-slate-400 hover:shadow-sm transition-all flex flex-col justify-between cursor-pointer">
          <div className="flex justify-between items-center mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <CalendarDays className="w-4 h-4 text-emerald-500" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
              3 Today
            </span>
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">Calendar</p>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">
              Consultation Schedule
            </p>
          </div>
        </div>

        <div className="bg-card rounded-2xl border p-4 hover:border-slate-400 hover:shadow-sm transition-all flex flex-col justify-between cursor-pointer">
          <div className="flex justify-between items-center mb-2">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-violet-500" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600">
              Templates
            </span>
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">Library</p>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">
              NDA & Legal Drafts
            </p>
          </div>
        </div>

        <div className="bg-card rounded-2xl border p-4 hover:border-slate-400 hover:shadow-sm transition-all flex flex-col justify-between cursor-pointer">
          <div className="flex justify-between items-center mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <PieChartIcon className="w-4 h-4 text-amber-500" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
              New
            </span>
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">Estimator</p>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">
              Fee Calculator
            </p>
          </div>
        </div>
      </div>

      {/* Quick Hub Grid (Shortcuts to Tabs) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setActiveTab('requests')}
          className="p-4 rounded-2xl border border-slate-900/20 bg-gradient-to-br from-slate-800/10 via-slate-700/5 to-transparent hover:from-slate-800/20 transition-all text-left space-y-2 group shadow-sm hover:border-slate-900/25 hover:-translate-y-0.5"
        >
          <div className="w-10 h-10 rounded-xl bg-slate-800/15 text-slate-900 dark:text-slate-100 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-sm text-slate-900 dark:text-slate-100">Booking Requests</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {incomingRequests.length} pending request(s)
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('active')}
          className="p-4 rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-cyan-500/5 to-transparent hover:from-cyan-500/20 transition-all text-left space-y-2 group shadow-sm hover:border-cyan-500/40 hover:-translate-y-0.5"
        >
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Active Consultation
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {activeBooking ? 'Session in progress' : 'Chamber Standby'}
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cases')}
          className="p-4 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent hover:from-emerald-500/20 transition-all text-left space-y-2 group shadow-sm hover:border-emerald-500/40 hover:-translate-y-0.5"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <History className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-sm text-slate-900 dark:text-slate-100">Case History</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {history.length} cases logged
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('earnings')}
          className="p-4 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent hover:from-amber-500/20 transition-all text-left space-y-2 group shadow-sm hover:border-amber-500/40 hover:-translate-y-0.5"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <IndianRupee className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-sm text-slate-900 dark:text-slate-100">Earnings & Payout</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              ₹{earnings?.walletBalance?.toLocaleString() || 0} wallet
            </p>
          </div>
        </button>
      </div>

      {/* ── CHARTS & ANALYTICS SECTION ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 8 Cols: Weekly Consultations & Revenue Area Chart */}
        <div className="lg:col-span-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-slate-800/10 text-slate-900 dark:text-slate-100 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  Weekly Consultations & Earnings
                </h3>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto text-xs bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="flex items-center gap-1.5 px-2 font-semibold text-slate-900 dark:text-slate-100">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-900" /> Revenue (₹)
                </span>
                <span className="flex items-center gap-1.5 px-2 font-semibold text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> Cases
                </span>
              </div>
            </div>
          </div>

          {/* Responsive Area Chart */}
          <div className="h-64 w-full pt-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={weeklyData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="lawyerRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="currentColor"
                  className="text-slate-200 dark:text-slate-800"
                />
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
                          <div className="flex items-center justify-between gap-4 text-slate-900 dark:text-slate-100 font-bold">
                            <span>Revenue:</span>
                            <span>₹{payload[0]?.value}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-slate-500">
                            <span>Consultations:</span>
                            <span>{payload[0]?.payload?.cases} cases</span>
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
                  stroke="#4f46e5"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#lawyerRevenueGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Bottom Mini Metrics Strip */}
          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div>
              <p className="text-[11px] text-slate-400">Avg. Consultation Fee</p>
              <p className="font-bold text-slate-900 dark:text-slate-100 text-sm mt-0.5">
                ₹{profile?.consultationFee || 500} / session
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400">Follow-Up Fee</p>
              <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5">
                ₹{profile?.followUpFee || 500}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400">Advocate Payout</p>
              <p className="font-bold text-slate-900 dark:text-slate-100 text-sm mt-0.5">
                90% Direct Net
              </p>
            </div>
          </div>
        </div>

        {/* 4 Cols: Legal Practice Domain Distribution */}
        <div className="lg:col-span-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                Practice Distribution
              </h3>
              <Badge variant="outline" className="text-[10px] font-mono">
                This Month
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Consultations categorized by healthcare law topics
            </p>

            {/* Donut Chart */}
            <div className="h-44 w-full relative flex items-center justify-center mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={
                      caseMix.length > 0
                        ? caseMix
                        : [{ name: 'No cases yet', value: 100, color: '#e2e8f0' }]
                    }
                    cx="50%"
                    cy="50%"
                    innerRadius={46}
                    outerRadius={68}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {(
                      (caseMix.length > 0
                        ? caseMix
                        : [{ color: '#e2e8f0' }]) as any[]
                    ).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={(entry as any).color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 shadow-lg text-xs">
                            <p className="font-bold text-slate-900 dark:text-slate-100">
                              {payload[0]?.name}
                            </p>
                            <p className="text-slate-900 dark:text-slate-100 font-bold">
                              {payload[0]?.value}% of consultations
                            </p>
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
                  {earnings?.completedConsultationsCount ?? history.length}
                </span>
                <span className="block text-[10px] text-slate-400 font-medium">Cases</span>
              </div>
            </div>

            {/* Legend list */}
            <div className="grid grid-cols-2 gap-2 pt-2 text-[11px]">
              {caseMix.length === 0 && (
                <span className="text-slate-400 col-span-2">
                  No consultations yet — complete a case to see mix.
                </span>
              )}
              {caseMix.map((c) => (
                <div key={c.name} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
                  <span className="text-slate-600 dark:text-slate-400 truncate">
                    {c.name} ({c.value}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500">Legal Compliance</span>
            <span className="font-bold text-emerald-600 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> High Court Enrolled
            </span>
          </div>
        </div>
      </div>

      {/* Active Consultation Spotlight */}
      {activeBooking && (
        <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-800/10 via-slate-700/5 to-cyan-500/10 border-2 border-slate-900/20 dark:border-white/20 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
              <Badge className="bg-slate-900 text-white text-[11px] uppercase font-bold tracking-wide">
                {activeBooking.status?.replace('_', ' ') || 'ACTIVE CONSULTATION'}
              </Badge>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Booking #{activeBooking.bookingNumber || activeBooking._id?.slice(-6)}
              </span>
            </div>

            <div className="inline-flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-900/20 px-3.5 py-1 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-100 shadow-sm">
              <Clock className="w-3.5 h-3.5 text-slate-900 dark:text-slate-100 animate-spin" />
              Mode:{' '}
              <span className="capitalize text-slate-900 dark:text-slate-100">
                {activeBooking.consultationMode?.replace('_', ' ')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div>
              <span className="text-xs text-slate-400 block">Client Name</span>
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                {activeBooking.userId?.name || 'Verified Client'}
              </h4>
              {activeBooking.userId?.phone && (
                <span className="text-xs text-slate-500">{activeBooking.userId.phone}</span>
              )}
            </div>

            <div>
              <span className="text-xs text-slate-400 block">Legal Category & Issue</span>
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 capitalize">
                {activeBooking.category?.replace(/_/g, ' ')}
              </h4>
              <span className="text-xs text-slate-500">Fee: ₹{activeBooking.fee}</span>
            </div>

            <div className="flex items-center gap-2 justify-start sm:justify-end self-center">
              <Button
                type="button"
                onClick={() => setActiveTab('active')}
                className="bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-sm h-10 px-5"
              >
                Open Consultation Room
                <ArrowUpRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
