import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  TrendingUp, Users, Stethoscope, Activity, DollarSign, Building2, FlaskConical, Pill,
  Clock, AlertTriangle, CalendarDays, BarChart3, Hospital, ShieldCheck,
  Headset, Siren, Gavel, UserPlus, ShieldAlert, Truck, FileCheck, Calculator,
  Scale, Layers, CheckCircle2, Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';
import OpsHealthCard from '@/components/OpsHealthCard';
import {
  BUSINESS_MODEL_CANVAS,
  REVENUE_STREAMS,
  CATEGORY_BENCHMARKS,
  LEGAL_COMMERCIAL_GUARDRAILS,
  calculateContributionMargin,
  calculatePatientLtv,
  calculateBreakEvenBookings,
  calculateLtvCacRatio,
} from '@/lib/unitEconomics';
import type { Unmodelled } from '@/lib/apiTypes';

const AnimatedCard = ({ children, delay = 0 }: Unmodelled) => (
  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.35 }}>
    <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">{children}</Card>
  </motion.div>
);

export default function PlatformKPIs() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isUnitEconomicsOpen, setIsUnitEconomicsOpen] = useState(false);

  // Unit Economics Simulator live state
  const [calcAov, setCalcAov] = useState(800);
  const [calcTakeRate, setCalcTakeRate] = useState(12);
  const [calcFixedCosts, setCalcFixedCosts] = useState(800000);
  const [calcSubRevenue, setCalcSubRevenue] = useState(199800);
  const [calcCac, setCalcCac] = useState(120);

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

  const maxWeekly = Math.max(...weeklyAppointments.map((w: Unmodelled) => w.count), 1);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Platform Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">Live platform KPIs at a glance</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsUnitEconomicsOpen(true)}
            className="gap-1.5 h-8 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
            data-testid="unit-economics-btn"
          >
            <DollarSign className="w-3.5 h-3.5" /> Unit Economics (Doc 16)
          </Button>
          <Badge variant="outline" className="text-xs gap-1.5 px-3 py-1.5">
            <Clock className="w-3.5 h-3.5" />
            Updated {data?.fetchedAt ? data.fetchedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "just now"}
          </Badge>
        </div>
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

      {/* ADM-M-05: ops freshness/health widgets - superadmin-only snapshot,
          polls itself every 60s, reports (never gates) so the card renders
          even while the platform is degraded. */}
      <OpsHealthCard />

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
                {weeklyAppointments.map((w: Unmodelled, i: Unmodelled) => (
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
                  {commission.monthlyTrend.map((m: Unmodelled, i: Unmodelled) => (
                    <motion.div key={i} className="flex items-center gap-3"
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 + i * 0.05 }}>
                      <span className="text-xs text-muted-foreground w-12">{m.month || m._id}</span>
                      <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-primary rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${(m.earnings || m.revenue || 0) / Math.max(...commission.monthlyTrend.map((x: Unmodelled) => x.earnings || x.revenue || 0), 1) * 100}%` }}
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
              <Link to="/superadmin/join-applications" className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 transition-colors">
                <FileCheck className="w-5 h-5 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Join Applications</span>
              </Link>
              <Link to="/superadmin/onboarding-metrics" className="flex items-center gap-2.5 p-3 rounded-xl bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-900/30 hover:bg-cyan-100 dark:hover:bg-cyan-950/40 transition-colors">
                <BarChart3 className="w-5 h-5 text-cyan-600" />
                <span className="text-sm font-medium text-cyan-800 dark:text-cyan-300">Onboarding Funnel</span>
              </Link>
              <Link to="/superadmin/kyc-workspace" className="flex items-center gap-2.5 p-3 rounded-xl bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/30 hover:bg-teal-100 dark:hover:bg-teal-950/40 transition-colors">
                <FileCheck className="w-5 h-5 text-teal-600" />
                <span className="text-sm font-medium text-teal-800 dark:text-teal-300">KYC Review Desk</span>
              </Link>
              <Link to="/superadmin/incident-command" className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-950/40 transition-colors">
                <Siren className="w-5 h-5 text-rose-600" />
                <span className="text-sm font-medium text-rose-800 dark:text-rose-300">Incident Command</span>
              </Link>
              <Link to="/superadmin/emergency-war-room" className="flex items-center gap-2.5 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors">
                <Siren className="w-5 h-5 text-red-600" />
                <span className="text-sm font-medium text-red-800 dark:text-red-300">Emergency War Room</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      {/* Document 16 — Business Model & Unit Economics Console */}
      <Dialog open={isUnitEconomicsOpen} onOpenChange={setIsUnitEconomicsOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto" data-testid="unit-economics-dialog">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 border-emerald-300">
                Document 16
              </Badge>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                Business Model & Unit Economics Console
              </DialogTitle>
            </div>
            <DialogDescription>
              Platform commercial canvas, category take rates, contribution margin simulator & statutory guardrails.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="simulator" className="mt-2">
            <TabsList className="grid grid-cols-4 w-full h-9">
              <TabsTrigger value="simulator" className="text-xs">Live Simulator</TabsTrigger>
              <TabsTrigger value="benchmarks" className="text-xs">Category Benchmarks</TabsTrigger>
              <TabsTrigger value="streams" className="text-xs">Revenue Streams</TabsTrigger>
              <TabsTrigger value="guardrails" className="text-xs">Legal Guardrails</TabsTrigger>
            </TabsList>

            {/* Tab 1: Live Simulator */}
            <TabsContent value="simulator" className="space-y-4 pt-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Calculator className="w-3.5 h-3.5 text-primary" /> Inputs (Simulated Booking)
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold">Average Order Value (AOV ₹)</Label>
                      <Input
                        type="number"
                        value={calcAov}
                        onChange={(e) => setCalcAov(Number(e.target.value))}
                        className="mt-1 h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Take Rate (%)</Label>
                      <Input
                        type="number"
                        value={calcTakeRate}
                        onChange={(e) => setCalcTakeRate(Number(e.target.value))}
                        className="mt-1 h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Monthly Fixed Costs (₹)</Label>
                      <Input
                        type="number"
                        value={calcFixedCosts}
                        onChange={(e) => setCalcFixedCosts(Number(e.target.value))}
                        className="mt-1 h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Subscription Revenue (₹)</Label>
                      <Input
                        type="number"
                        value={calcSubRevenue}
                        onChange={(e) => setCalcSubRevenue(Number(e.target.value))}
                        className="mt-1 h-8 text-xs"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs font-semibold">Patient Acquisition Cost (CAC ₹)</Label>
                      <Input
                        type="number"
                        value={calcCac}
                        onChange={(e) => setCalcCac(Number(e.target.value))}
                        className="mt-1 h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Outputs */}
                <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> Unit Economics Outputs
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2.5 rounded-lg border bg-card">
                      <div className="text-[10px] text-muted-foreground uppercase">Contribution / Booking</div>
                      <div className="text-lg font-bold text-foreground">₹{calculateContributionMargin({ aov: calcAov, takeRatePercent: calcTakeRate }).contribution}</div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        {calculateContributionMargin({ aov: calcAov, takeRatePercent: calcTakeRate }).contributionMarginPercent}% margin
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg border bg-card">
                      <div className="text-[10px] text-muted-foreground uppercase">Patient LTV (2-Yr)</div>
                      <div className="text-lg font-bold text-foreground">
                        ₹{calculatePatientLtv({ contributionPerBooking: calculateContributionMargin({ aov: calcAov, takeRatePercent: calcTakeRate }).contribution, bookingsPerYear: 3, retentionYears: 2 })}
                      </div>
                      <div className="text-[10px] text-muted-foreground">3 bookings/yr</div>
                    </div>
                    <div className="p-2.5 rounded-lg border bg-card">
                      <div className="text-[10px] text-muted-foreground uppercase">LTV : CAC Ratio</div>
                      <div className="text-lg font-bold text-foreground flex items-center gap-1.5">
                        {calculateLtvCacRatio({ ltv: calculatePatientLtv({ contributionPerBooking: calculateContributionMargin({ aov: calcAov, takeRatePercent: calcTakeRate }).contribution, bookingsPerYear: 3, retentionYears: 2 }), cac: calcCac }).ratio}x
                        <Badge variant="outline" className={`text-[9px] uppercase ${calculateLtvCacRatio({ ltv: calculatePatientLtv({ contributionPerBooking: calculateContributionMargin({ aov: calcAov, takeRatePercent: calcTakeRate }).contribution, bookingsPerYear: 3, retentionYears: 2 }), cac: calcCac }).status === 'healthy' || calculateLtvCacRatio({ ltv: calculatePatientLtv({ contributionPerBooking: calculateContributionMargin({ aov: calcAov, takeRatePercent: calcTakeRate }).contribution, bookingsPerYear: 3, retentionYears: 2 }), cac: calcCac }).status === 'excellent' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-amber-50 text-amber-700 border-amber-300'}`}>
                          {calculateLtvCacRatio({ ltv: calculatePatientLtv({ contributionPerBooking: calculateContributionMargin({ aov: calcAov, takeRatePercent: calcTakeRate }).contribution, bookingsPerYear: 3, retentionYears: 2 }), cac: calcCac }).status}
                        </Badge>
                      </div>
                      <div className="text-[10px] text-muted-foreground">Target ≥ 3.0x</div>
                    </div>
                    <div className="p-2.5 rounded-lg border bg-card">
                      <div className="text-[10px] text-muted-foreground uppercase">Monthly Break-even</div>
                      <div className="text-lg font-bold text-foreground">
                        {calculateBreakEvenBookings({ fixedCostsMonthly: calcFixedCosts, subscriptionRevenueMonthly: calcSubRevenue, blendedContributionPerBooking: calculateContributionMargin({ aov: calcAov, takeRatePercent: calcTakeRate }).contribution }).toLocaleString()}
                      </div>
                      <div className="text-[10px] text-muted-foreground">bookings / month</div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab 2: Category Benchmarks */}
            <TabsContent value="benchmarks" className="space-y-3 pt-3">
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted text-muted-foreground uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5">AOV</th>
                      <th className="p-2.5">Take Rate</th>
                      <th className="p-2.5">Variable Costs</th>
                      <th className="p-2.5">Contribution</th>
                      <th className="p-2.5">Frequency/Yr</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {Object.entries(CATEGORY_BENCHMARKS).map(([key, cat]) => {
                      const res = calculateContributionMargin({ aov: cat.aov, takeRatePercent: cat.takeRatePercent, gatewayFeePercent: cat.gatewayFeePercent, notifCost: cat.notifCost, supportCost: cat.supportCost, refundLeakagePercent: cat.refundLeakagePercent });
                      return (
                        <tr key={key} className="hover:bg-muted/30">
                          <td className="p-2.5 font-medium text-foreground">{cat.name}</td>
                          <td className="p-2.5">₹{cat.aov}</td>
                          <td className="p-2.5 font-semibold text-primary">{cat.takeRatePercent}%</td>
                          <td className="p-2.5 text-muted-foreground">₹{res.variableCosts}</td>
                          <td className="p-2.5 font-bold text-emerald-600 dark:text-emerald-400">₹{res.contribution} ({res.contributionMarginPercent}%)</td>
                          <td className="p-2.5">{cat.targetFrequencyYr}x</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* Tab 3: Revenue Streams */}
            <TabsContent value="streams" className="space-y-2.5 pt-3">
              {REVENUE_STREAMS.map((s, idx) => (
                <div key={idx} className="p-3 rounded-lg border border-border/70 bg-card space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-foreground">{s.stream}</span>
                    <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                      Active Stream
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    <strong className="text-foreground">Structure: </strong>{s.structure}
                  </div>
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-300 flex items-start gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-600" />
                    <span><strong>Safeguard: </strong>{s.regulatorySafeguard}</span>
                  </div>
                </div>
              ))}
            </TabsContent>

            {/* Tab 4: Legal & Statutory Guardrails */}
            <TabsContent value="guardrails" className="space-y-2.5 pt-3">
              {LEGAL_COMMERCIAL_GUARDRAILS.map((g, idx) => (
                <div key={idx} className="p-3 rounded-lg border border-border/70 bg-card space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-foreground">{g.rule}</span>
                    <Badge variant="outline" className="text-[10px] text-amber-700 bg-amber-50 dark:bg-amber-950/30 border-amber-300">
                      {g.regulation}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground leading-relaxed">
                    {g.requirement}
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>

          <DialogFooter className="pt-3 border-t border-border/60">
            <Button variant="outline" onClick={() => setIsUnitEconomicsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
