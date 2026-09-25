import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  TrendingUp, Users, Stethoscope, Activity, DollarSign, Building2, FlaskConical, Pill,
  Clock, AlertTriangle, CalendarDays, BarChart3, Hospital, ShieldCheck,
  Headset, Siren, Gavel, UserPlus, ShieldAlert, Truck, FileCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

const AnimatedCard = ({ children, delay = 0 }) => (
  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.35 }}>
    <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">{children}</Card>
  </motion.div>
);

export default function PlatformKPIs() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const activeRef = useRef(true);
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [dash, commission, hospitals, users, pendingHosp, facilities, ticketStats, disputeStats, emergencyStats] = await Promise.all([
        api.dashboardStats(),
        api.getCommissionStats().catch(() => null),
        api.getHospitals({ limit: 1 }).catch(() => null),
        api.getUsers({ limit: 1 }).catch(() => null),
        api.getPendingHospitals().catch(() => null),
        api.getFacilities({ limit: 1 }).catch(() => null),
        api.getTicketStats().catch(() => null),
        api.getDisputeStats().catch(() => null),
        api.getEmergencyStats().catch(() => null),
      ]);
      if (!activeRef.current) return;
      setData({
        stats: dash.stats || dash,
        weeklyAppointments: dash.weeklyAppointments || [],
        revenueData: dash.revenueData || [],
        commission: commission,
        hospitalCount: hospitals?.total ?? (Array.isArray(hospitals?.data) ? hospitals.data.length : Array.isArray(hospitals) ? hospitals.length : 0),
        userCount: users?.total ?? (Array.isArray(users?.data) ? users.data.length : Array.isArray(users) ? users.length : 0),
        facilityCount: facilities?.total ?? (Array.isArray(facilities?.data) ? facilities.data.length : Array.isArray(facilities) ? facilities.length : 0),
        pendingCount: pendingHosp?.length || pendingHosp?.total || 0,
        openTickets: ticketStats?.open ?? ticketStats?.total ?? 0,
        urgentTickets: ticketStats?.urgent ?? 0,
        openDisputes: disputeStats?.open ?? 0,
        criticalDisputes: disputeStats?.critical ?? 0,
        activeEmergencies: emergencyStats?.active ?? emergencyStats?.count ?? 0,
        todayRegistrations: users?.todayCount ?? 0,
        fetchedAt: new Date(),
      });
    } catch { if (!silent) toast.error('Failed to load platform KPIs'); }
    if (!silent && activeRef.current) setLoading(false);
  }, []);

  useEffect(() => {
    activeRef.current = true;
    load();
    return () => { activeRef.current = false; };
  }, [load]);

  // SA-4: silent live refresh on critical platform events (throttled, no spinner).
  useEffect(() => {
    let socket;
    let timer;
    let lastRun = 0;
    const refresh = () => {
      const now = Date.now();
      const run = () => { lastRun = Date.now(); load(true); };
      if (now - lastRun < 15000) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(run, 15000);
        return;
      }
      run();
    };
    (async () => {
      try {
        const { getSocket } = await import('@/lib/socket');
        socket = getSocket();
        if (!socket) return;
        socket.on('support_ticket_created', refresh);
        socket.on('emergency_alert_critical', refresh);
        socket.on('dispute_created', refresh);
        socket.on('hospital_registered', refresh);
      } catch { /* socket unavailable — KPIs stay manual-refresh */ }
    })();
    return () => {
      if (timer) clearTimeout(timer);
      socket?.off('support_ticket_created', refresh);
      socket?.off('emergency_alert_critical', refresh);
      socket?.off('dispute_created', refresh);
      socket?.off('hospital_registered', refresh);
    };
  }, [load]);

  if (loading) return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[0,1,2,3].map(i => (
          <div key={i} className="rounded-2xl border p-5 animate-pulse">
            <div className="w-10 h-10 bg-muted rounded-xl mb-3" />
            <div className="h-6 w-16 bg-muted rounded mb-2" />
            <div className="h-3 w-24 bg-muted rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[0,1,2,3].map(i => (
          <div key={i} className="rounded-2xl border p-5 animate-pulse">
            <div className="w-10 h-10 bg-muted rounded-xl mb-3" />
            <div className="h-6 w-16 bg-muted rounded mb-2" />
            <div className="h-3 w-24 bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  );

  const { stats, weeklyAppointments, commission, hospitalCount, userCount, facilityCount, pendingCount, openTickets, urgentTickets, openDisputes, criticalDisputes, activeEmergencies, todayRegistrations } = data;

  const maxWeekly = Math.max(...weeklyAppointments.map(w => w.count), 1);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Platform Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">Live platform KPIs at a glance</p>
        </div>
        <Badge variant="outline" className="text-xs gap-1.5 px-3 py-1.5">
          <Clock className="w-3.5 h-3.5" />
          Updated {data?.fetchedAt ? data.fetchedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "just now"}
        </Badge>
      </motion.div>

      {/* Row 1: Core platform metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AnimatedCard delay={0}>
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-3">
              <Hospital className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-foreground">{(hospitalCount || 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Hospitals</p>
          </CardContent>
        </AnimatedCard>
        <AnimatedCard delay={0.05}>
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-3">
              <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-foreground">{(facilityCount || 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Clinics, Labs & Pharmacies</p>
          </CardContent>
        </AnimatedCard>
        <AnimatedCard delay={0.1}>
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-3">
              <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-2xl font-bold text-foreground">{(userCount || 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Users</p>
          </CardContent>
        </AnimatedCard>
        <AnimatedCard delay={0.15}>
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-3">
              <Activity className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-2xl font-bold text-foreground">{(stats?.todayAppointments || 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Today's Bookings</p>
          </CardContent>
        </AnimatedCard>
      </div>

      {/* Row 2: Financial metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AnimatedCard delay={0.2}>
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
              <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-foreground">₹{(commission?.totalEarnings || stats?.revenue || 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Platform Commission Revenue</p>
          </CardContent>
        </AnimatedCard>
        <AnimatedCard delay={0.25}>
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mb-3">
              <Clock className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            </div>
            <p className="text-2xl font-bold text-foreground">₹{(commission?.pendingPayoutAmount || 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Pending Payouts</p>
          </CardContent>
        </AnimatedCard>
        <AnimatedCard delay={0.3}>
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center mb-3">
              <Stethoscope className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            </div>
            <p className="text-2xl font-bold text-foreground">{(stats?.totalDoctors || 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Doctors</p>
          </CardContent>
        </AnimatedCard>
        <AnimatedCard delay={0.35}>
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <p className="text-2xl font-bold text-foreground">{(pendingCount || 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Pending Approvals</p>
          </CardContent>
        </AnimatedCard>
      </div>

      {/* Row 3: NEW — Operational metrics (emergencies, disputes, support, registrations) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AnimatedCard delay={0.4}>
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-3 relative">
              <Siren className="w-5 h-5 text-red-600 dark:text-red-400" />
              {activeEmergencies > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />}
            </div>
            <p className="text-2xl font-bold text-foreground">{activeEmergencies}</p>
            <p className="text-xs text-muted-foreground">Active Emergencies</p>
          </CardContent>
        </AnimatedCard>
        <AnimatedCard delay={0.45}>
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mb-3">
              <Gavel className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <p className="text-2xl font-bold text-foreground">{openDisputes}{criticalDisputes > 0 && <span className="text-sm text-destructive ml-1">({criticalDisputes} critical)</span>}</p>
            <p className="text-xs text-muted-foreground">Open Disputes</p>
          </CardContent>
        </AnimatedCard>
        <AnimatedCard delay={0.5}>
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-3">
              <Headset className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <p className="text-2xl font-bold text-foreground">{openTickets}{urgentTickets > 0 && <span className="text-sm text-destructive ml-1">({urgentTickets} urgent)</span>}</p>
            <p className="text-xs text-muted-foreground">Open Support Tickets</p>
          </CardContent>
        </AnimatedCard>
        <AnimatedCard delay={0.55}>
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center mb-3">
              <UserPlus className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <p className="text-2xl font-bold text-foreground">{todayRegistrations}</p>
            <p className="text-xs text-muted-foreground">New Registrations Today</p>
          </CardContent>
        </AnimatedCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Weekly Appointments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-40">
                {weeklyAppointments.map((w, i) => (
                  <motion.div key={i} className="flex-1 flex flex-col items-center gap-1.5"
                    initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: 0.65 + i * 0.05, duration: 0.4 }}
                    style={{ transformOrigin: 'bottom' }}>
                    <div
                      className="w-full bg-primary/20 dark:bg-primary/30 rounded-t-lg transition-all duration-500 hover:bg-primary/40"
                      style={{ height: `${(w.count / maxWeekly) * 100}%`, minHeight: w.count > 0 ? '8px' : '4px' }}
                    />
                    <span className="text-[10px] text-muted-foreground">{w.day}</span>
                    <span className="text-[10px] font-medium text-foreground">{w.count}</span>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Monthly Revenue Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              {commission?.monthlyTrend && commission.monthlyTrend.length > 0 ? (
                <div className="space-y-2">
                  {commission.monthlyTrend.map((m, i) => (
                    <motion.div key={i} className="flex items-center gap-3"
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 + i * 0.05 }}>
                      <span className="text-xs text-muted-foreground w-12">{m.month || m._id}</span>
                      <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-primary rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${(m.earnings || m.revenue || 0) / Math.max(...commission.monthlyTrend.map(x => x.earnings || x.revenue || 0), 1) * 100}%` }}
                          transition={{ delay: 0.75 + i * 0.05, duration: 0.6 }}
                        />
                      </div>
                      <span className="text-xs font-medium text-foreground w-20 text-right">₹{((m.earnings || m.revenue || 0)).toLocaleString()}</span>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                  No revenue data yet
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Link to="/superadmin/pending" className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-950/40 transition-colors">
                <Clock className="w-5 h-5 text-amber-600" />
                <span className="text-sm font-medium text-amber-800 dark:text-amber-300">Review Pending{pendingCount > 0 && ` (${pendingCount})`}</span>
              </Link>
              <Link to="/superadmin/users" className="flex items-center gap-2.5 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-950/40 transition-colors">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-800 dark:text-blue-300">Manage Users</span>
              </Link>
              <Link to="/superadmin/revenue" className="flex items-center gap-2.5 p-3 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 hover:bg-green-100 dark:hover:bg-green-950/40 transition-colors">
                <DollarSign className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-800 dark:text-green-300">Revenue Details</span>
              </Link>
              <Link to="/superadmin/tickets" className="flex items-center gap-2.5 p-3 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-950/40 transition-colors">
                <Headset className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-800 dark:text-purple-300">Support Tickets{openTickets > 0 && ` (${openTickets})`}</span>
              </Link>
              <Link to="/superadmin/disputes" className="flex items-center gap-2.5 p-3 rounded-xl bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/30 hover:bg-yellow-100 dark:hover:bg-yellow-950/40 transition-colors">
                <Gavel className="w-5 h-5 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Disputes{openDisputes > 0 && ` (${openDisputes})`}</span>
              </Link>
              <Link to="/superadmin/emergency" className="flex items-center gap-2.5 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors">
                <Siren className="w-5 h-5 text-red-600" />
                <span className="text-sm font-medium text-red-800 dark:text-red-300">Emergency War Room</span>
              </Link>
              <Link to="/superadmin/kyc" className="flex items-center gap-2.5 p-3 rounded-xl bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/30 hover:bg-teal-100 dark:hover:bg-teal-950/40 transition-colors">
                <FileCheck className="w-5 h-5 text-teal-600" />
                <span className="text-sm font-medium text-teal-800 dark:text-teal-300">KYC Verification</span>
              </Link>
              <Link to="/superadmin/delivery-partners" className="flex items-center gap-2.5 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-950/40 transition-colors">
                <Truck className="w-5 h-5 text-indigo-600" />
                <span className="text-sm font-medium text-indigo-800 dark:text-indigo-300">Delivery Partners</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
