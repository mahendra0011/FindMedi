import React from 'react';
import { motion } from 'framer-motion';
import {
  Car,
  Clock,
  IndianRupee,
  Star,
  Navigation,
  TrendingUp,
  MapPin,
  Sparkles,
  ShieldAlert,
  Wallet,
  Bell,
  Award,
  Activity,
  Target,
  BarChart3,
  History,
  Compass,
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

export interface RiderOverviewTabProps {
  user: any;
  profile: any;
  vehicle: any;
  isOnline: boolean;
  isVerified: boolean;
  earnings: any;
  activeRide: any;
  incomingRequests: any[];
  historyRides: any[];
  setEmergencyConfirm: (open: boolean) => void;
  setWithdrawModalOpen: (open: boolean) => void;
  navigate: (path: string) => void;
}

export const RiderOverviewTab: React.FC<RiderOverviewTabProps> = ({
  user,
  profile,
  vehicle,
  isOnline,
  isVerified,
  earnings,
  activeRide,
  incomingRequests,
  historyRides,
  setEmergencyConfirm,
  setWithdrawModalOpen,
  navigate,
}) => {
  return (
    <div className="space-y-6">
      {/* Colorful Welcome Hero Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl p-6 sm:p-7 bg-gradient-to-r from-primary via-violet-500 to-emerald-500 shadow-lg"
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
                <Award className="w-3 h-3" /> Gold Partner Captain
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
              Welcome back, {user?.name?.split(' ')[0] || 'Captain'}! <Sparkles className="w-5 h-5 text-amber-200" />
            </h2>
            <p className="text-xs sm:text-sm text-white/85 font-medium">
              {isOnline
                ? 'You are online — new rides are on the way. Keep the streak going! 🔥'
                : 'You are offline — go online to start earning today.'}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-center px-4 py-2.5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20">
              <p className="text-lg font-black text-white leading-none">₹{earnings?.todayNet || 0}</p>
              <p className="text-[10px] font-semibold text-white/75 mt-1">Today</p>
            </div>
            <div className="text-center px-4 py-2.5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20">
              <p className="text-lg font-black text-white leading-none">
                {earnings?.rating?.avg ? `${Number(earnings.rating.avg).toFixed(1)}★` : 'New'}
              </p>
              <p className="text-[10px] font-semibold text-white/75 mt-1">Rating{earnings?.rating?.count ? ` (${earnings.rating.count})` : ''}</p>
            </div>
            <div className="text-center px-4 py-2.5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20">
              <p className="text-lg font-black text-white leading-none">{earnings?.todayRides || 0}</p>
              <p className="text-[10px] font-semibold text-white/75 mt-1">Rides</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Active Ride Banner if ride is ongoing */}
      {activeRide && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-primary/30 bg-primary/10 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
              <Navigation className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-foreground">Active Ride in Progress</span>
                <Badge variant="default" className="text-[10px] uppercase font-bold">
                  {activeRide.status?.replace(/_/g, ' ')}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Booking #{activeRide.bookingNumber} · Passenger: {activeRide.userId?.name || 'Customer'} · ₹{activeRide.fare?.total || 0}
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate('/rider/dashboard?tab=active')}
            className="rounded-xl text-xs font-bold gap-2 h-10 px-5 shrink-0"
          >
            <Navigation className="w-4 h-4" /> Open Active Route & Navigation
          </Button>
        </motion.div>
      )}

      {/* RIDER OPERATIONS & NAVIGATION WIDGET */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-2xl border p-4 hover:border-primary/40 hover:shadow-sm transition-all flex flex-col justify-between cursor-pointer" onClick={() => navigate('/rider/dashboard?tab=active')}>
          <div className="flex justify-between items-center mb-2">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-teal-500" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 animate-pulse">Live</span>
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">Map View</p>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Live GPS Tracking</p>
          </div>
        </div>

        <div className="bg-card rounded-2xl border p-4 hover:border-primary/40 hover:shadow-sm transition-all flex flex-col justify-between cursor-pointer" onClick={() => setEmergencyConfirm(true)}>
          <div className="flex justify-between items-center mb-2">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-red-500" />
            </div>
          </div>
          <div>
            <p className="text-xl font-bold text-red-500">SOS</p>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Emergency Assistance</p>
          </div>
        </div>

        <div className="bg-card rounded-2xl border p-4 hover:border-primary/40 hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <Target className="w-4 h-4 text-violet-500" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600">3 Left</span>
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">7 / 10</p>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Daily Ride Target</p>
          </div>
        </div>

        <div className="bg-card rounded-2xl border p-4 hover:border-primary/40 hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <IndianRupee className="w-4 h-4 text-emerald-500" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">Surge 1.5x</span>
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">₹280/hr</p>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Avg Fare Estimate</p>
          </div>
        </div>
      </div>

      {/* Live Request alert if waiting */}
      {incomingRequests.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl border border-primary/30 bg-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
              <Bell className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <p className="font-bold text-sm text-foreground">
                {incomingRequests.length} Live Ride Request(s) Waiting!
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Respond before the 2-minute countdown timer expires.
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate('/rider/dashboard?tab=requests')}
            className="rounded-xl text-xs font-bold gap-2 h-10 px-5 shrink-0"
          >
            <Clock className="w-4 h-4" /> View Live Requests ({incomingRequests.length})
          </Button>
        </motion.div>
      )}

      {/* Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          whileHover={{ y: -4, scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent p-5 shadow-sm space-y-2"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Today's Earnings</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">
            ₹{earnings?.todayNet || 0}
          </p>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{earnings?.todayRides || 0} rides</span>
            <span>completed today</span>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -4, scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="relative overflow-hidden rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-500/15 via-sky-500/5 to-transparent p-5 shadow-sm space-y-2"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">This Month Net</span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold bg-gradient-to-r from-sky-600 to-indigo-500 dark:from-sky-400 dark:to-indigo-300 bg-clip-text text-transparent">
            ₹{earnings?.monthNet || 0}
          </p>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="font-semibold text-sky-600 dark:text-sky-400">{earnings?.monthRides || 0} trips</span>
            <span>this month</span>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -4, scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/15 via-violet-500/5 to-transparent p-5 shadow-sm space-y-2"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Wallet Balance</span>
            <div className="w-8 h-8 rounded-lg bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold bg-gradient-to-r from-violet-600 to-fuchsia-500 dark:from-violet-400 dark:to-fuchsia-300 bg-clip-text text-transparent">
            ₹{earnings?.walletBalance || 0}
          </p>
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-muted-foreground">Available to withdraw</span>
            <button
              onClick={() => setWithdrawModalOpen(true)}
              className="text-xs font-bold text-primary hover:underline"
            >
              Withdraw
            </button>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -4, scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent p-5 shadow-sm space-y-2"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Driver Rating</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center">
              <Star className="w-4 h-4 fill-amber-500" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-3xl font-extrabold bg-gradient-to-r from-amber-600 to-orange-500 dark:from-amber-400 dark:to-orange-300 bg-clip-text text-transparent">
              {earnings?.rating?.avg ? Number(earnings.rating.avg).toFixed(1) : 'New'}
            </p>
            <div className="flex items-center text-amber-500">
              <Star className="w-4 h-4 fill-amber-500" />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            From {earnings?.rating?.count || 0} customer reviews
          </p>
        </motion.div>
      </div>

      {/* Quick Hub Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button
          onClick={() => navigate('/rider/dashboard?tab=requests')}
          className="p-4 rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent hover:from-orange-500/20 transition-all text-left space-y-2 group shadow-sm hover:border-orange-500/40 hover:-translate-y-0.5"
        >
          <div className="w-10 h-10 rounded-xl bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground">Ride Requests</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {incomingRequests.length} waiting request(s)
            </p>
          </div>
        </button>

        <button
          onClick={() => navigate('/rider/dashboard?tab=active')}
          className="p-4 rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-500/10 via-sky-500/5 to-transparent hover:from-sky-500/20 transition-all text-left space-y-2 group shadow-sm hover:border-sky-500/40 hover:-translate-y-0.5"
        >
          <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Navigation className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground">Live Route & GPS</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {activeRide ? 'Ride in progress' : 'Standby / Tracking'}
            </p>
          </div>
        </button>

        <button
          onClick={() => navigate('/rider/dashboard?tab=earnings')}
          className="p-4 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent hover:from-emerald-500/20 transition-all text-left space-y-2 group shadow-sm hover:border-emerald-500/40 hover:-translate-y-0.5"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <IndianRupee className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground">Earnings & Payout</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">₹{earnings?.walletBalance || 0} wallet balance</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/rider/dashboard?tab=vehicle')}
          className="p-4 rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-violet-500/5 to-transparent hover:from-violet-500/20 transition-all text-left space-y-2 group shadow-sm hover:border-violet-500/40 hover:-translate-y-0.5"
        >
          <div className="w-10 h-10 rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground">Vehicle & Docs</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{vehicle?.brand || 'Vehicle'} · {vehicle?.rcNumber || 'Verified'}</p>
          </div>
        </button>
      </div>

      {/* CHARTS & ANALYTICS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Weekly Revenue & Rides Activity Area Chart */}
        <div className="lg:col-span-8 rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-transparent p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-foreground">Weekly Revenue & Trip Trends</h3>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Daily breakdown of gross fare and completed customer pickups
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto text-xs bg-muted/40 p-1.5 rounded-xl border">
              <span className="flex items-center gap-1.5 px-2 font-semibold text-primary">
                <span className="w-2.5 h-2.5 rounded-full bg-primary" /> Net Revenue (₹)
              </span>
              <span className="flex items-center gap-1.5 px-2 font-semibold text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/60" /> Completed Rides
              </span>
            </div>
          </div>

          {/* Responsive Area Chart */}
          <div className="h-64 w-full pt-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={[
                  { day: 'Mon', revenue: 320, rides: 2 },
                  { day: 'Tue', revenue: 450, rides: 3 },
                  { day: 'Wed', revenue: 210, rides: 1 },
                  { day: 'Thu', revenue: 580, rides: 4 },
                  { day: 'Fri', revenue: 840, rides: 6 },
                  { day: 'Sat', revenue: earnings?.monthNet ? Math.max(earnings.monthNet, 620) : 620, rides: 5 },
                  { day: 'Sun (Today)', revenue: earnings?.todayNet || 120, rides: earnings?.todayRides || 1 },
                ]}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="riderRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.6} />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 500 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickFormatter={(v) => `₹${v}`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-xl border border-border/80 bg-card p-3 shadow-lg text-xs space-y-1.5">
                          <p className="font-bold text-foreground">{label}</p>
                          <div className="flex items-center justify-between gap-4 text-primary font-bold">
                            <span>Revenue:</span>
                            <span>₹{payload[0]?.value}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-muted-foreground">
                            <span>Rides:</span>
                            <span>{payload[0]?.payload?.rides} trips</span>
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
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#riderRevenueGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Bottom Mini Metrics Strip */}
          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border/60 text-xs">
            <div>
              <p className="text-[11px] text-muted-foreground">Avg. Fare / Ride</p>
              <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5">₹115.50</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Fuel Efficiency</p>
              <p className="font-bold text-sky-600 dark:text-sky-400 text-sm mt-0.5">18.5 km/l</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Driver Payout Ratio</p>
              <p className="font-bold text-primary text-sm mt-0.5">90% Direct</p>
            </div>
          </div>
        </div>

        {/* Trip Category Distribution & Target Progress */}
        <div className="lg:col-span-4 rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 via-card to-transparent p-5 sm:p-6 shadow-sm space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-foreground">Service Distribution</h3>
              <Badge variant="outline" className="text-[10px] font-mono">This Month</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Bookings breakdown by service category
            </p>

            {/* Donut Chart */}
            <div className="h-44 w-full relative flex items-center justify-center mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'City Hospital Rides', value: 65, color: 'hsl(var(--primary))' },
                      { name: 'Standard Cab Rides', value: 25, color: 'hsl(var(--success))' },
                      { name: 'Emergency Duty', value: 10, color: 'hsl(var(--destructive))' },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={72}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {[
                      'hsl(var(--primary))',
                      'hsl(var(--success))',
                      'hsl(var(--destructive))',
                    ].map((c, i) => (
                      <Cell key={i} fill={c} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-foreground">
                  {Math.max(historyRides.length, 1)}
                </span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  Total Trips
                </span>
              </div>
            </div>

            {/* Legend list */}
            <div className="space-y-2 text-xs pt-1">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary" /> Hospital Patients
                </span>
                <span className="font-bold text-foreground">65%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className="w-2.5 h-2.5 rounded-full bg-success" /> Standard Trips
                </span>
                <span className="font-bold text-foreground">25%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className="w-2.5 h-2.5 rounded-full bg-destructive" /> Medical Urgent
                </span>
                <span className="font-bold text-foreground">10%</span>
              </div>
            </div>
          </div>

          {/* Monthly Goal Progress Bar */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-card to-transparent border border-amber-500/20 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-amber-500" /> Monthly Incentive Goal
              </span>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">₹102 / ₹5,000</span>
            </div>
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 rounded-full transition-all duration-500" style={{ width: '12%' }} />
            </div>
            <p className="text-[10px] text-muted-foreground">
              Complete 15 more rides to unlock the ₹800 weekly captain bonus.
            </p>
          </div>
        </div>
      </div>

      {/* Operational Status + Real-Time Telemetry Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 cols: Recent Trips Preview */}
        <div className="lg:col-span-2 rounded-3xl border border-sky-500/20 bg-gradient-to-br from-sky-500/5 via-card to-transparent p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <History className="w-4 h-4" />
                </span>
                Recent Completed Trips
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Last rides completed by you</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const rows = [["Booking", "From", "To", "Fare", "Status"], ...historyRides.map((r) => [r.bookingNumber || r._id, r.pickup || r.from || "", r.drop || r.to || "", r.fare || r.amount || 0, r.status || ""])];
                  const csv = rows.map((x) => x.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
                  a.download = "rider-history.csv";
                  a.click();
                }}
                className="rounded-xl text-xs h-8"
              >
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/rider/dashboard?tab=history')}
                className="rounded-xl text-xs h-8"
              >
                View All History
              </Button>
            </div>
          </div>

          {historyRides.length === 0 ? (
            <div className="py-10 text-center text-xs text-muted-foreground space-y-2">
              <Compass className="w-8 h-8 mx-auto text-muted-foreground/60" />
              <p className="font-medium text-foreground">No completed rides in history yet</p>
              <p>When you complete passenger rides, trip records with fares and routes will show here.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {historyRides.slice(0, 4).map((ride) => (
                <div key={ride._id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-muted/20 px-2 rounded-xl transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                        #{ride.bookingNumber}
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <span className="font-bold text-foreground">{ride.userId?.name || 'Passenger'}</span>
                      {ride.ratingByUser?.stars && (
                        <span className="inline-flex items-center gap-1 font-bold text-amber-500 text-[11px]">
                          <Star className="w-3 h-3 fill-amber-500" /> {ride.ratingByUser.stars}.0
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate max-w-lg mt-0.5">
                      <span className="text-primary font-semibold">From:</span> {ride.pickup?.address || 'Pickup Point'}
                      <span className="text-muted-foreground mx-1.5">→</span>
                      <span className="text-destructive font-semibold">To:</span> {ride.drop?.address || 'Destination'}
                    </p>
                  </div>

                  <div className="text-left sm:text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between">
                    <p className="font-extrabold text-base text-foreground">₹{ride.fare?.total || 0}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {new Date(ride.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 1 col: Driver Standing & Telemetry */}
        <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-card to-transparent p-5 sm:p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </span>
              Driver Standing & Telemetry
            </h3>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          </div>

          <div className="space-y-4 text-xs">
            {/* Live GPS Coordinates Box */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-500/10 via-transparent to-emerald-500/10 border border-sky-500/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-primary" /> GPS Telemetry
                </span>
                <Badge variant="default" className="text-[10px] bg-primary font-bold">
                  {profile?.currentLocation?.coordinates?.length ? 'Live Active' : 'Offline'}
                </Badge>
              </div>
              {profile?.currentLocation?.lat ? (
                <div className="space-y-1">
                  <p className="text-[11px] font-mono text-muted-foreground">
                    Lat: <span className="font-semibold text-foreground">{profile.currentLocation.lat.toFixed(4)}</span>, Lng: <span className="font-semibold text-foreground">{profile.currentLocation.lng.toFixed(4)}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Broadcasting to FindMedi matching radar every 10s.
                  </p>
                </div>
              ) : (
                <p className="text-[11px] text-destructive font-medium">
                  GPS not broadcasting — enable device location.
                </p>
              )}
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border/60">
              <span className="text-muted-foreground">Emergency Duty</span>
              <Badge variant={profile?.emergencySupport ? 'default' : 'secondary'} className="text-[10px] font-bold">
                {profile?.emergencySupport ? '🚨 Hospital Priority Opt-In' : 'Standard Cab Only'}
              </Badge>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border/60">
              <span className="text-muted-foreground">Acceptance Rate</span>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-success" />
                <span className="font-bold text-foreground">96.8%</span>
              </div>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border/60">
              <span className="text-muted-foreground">Cancellation Rate</span>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span className="font-bold text-foreground">1.2% (Excellent)</span>
              </div>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border/60">
              <span className="text-muted-foreground">Verification KYC</span>
              <Badge variant={isVerified ? 'default' : 'secondary'} className="text-[10px] font-bold">
                {isVerified ? '✓ All Approved' : 'Review in Progress'}
              </Badge>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-muted-foreground">Captain Tier</span>
              <span className="inline-flex items-center gap-1 font-bold text-amber-500">
                <Award className="w-3.5 h-3.5" /> Gold Partner
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
