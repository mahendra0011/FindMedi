import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppointmentRealtime } from '@/lib/useAppointmentRealtime';
import {
  Stethoscope, CalendarDays, CreditCard, Clock, TrendingUp, UserRound,
  RotateCcw, Globe, Building2, CheckCircle, AlertCircle,
  Video, Phone, MessageCircle, MapPin, CalendarClock, ChevronRight, Sparkles
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { AnimatePresence, motion } from 'framer-motion';
import StatCard from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useAuth } from '@/context/AuthContext';
import { useSelector } from 'react-redux';
import { selectSetting } from '@/store/slices/settingsSlice';
import { applyUserSettings } from '@/lib/settings';
import { getISTDateString } from '@/lib/dateUtils';

const COLORS = ['hsl(174,62%,38%)','hsl(210,80%,55%)','hsl(38,92%,50%)','hsl(152,60%,42%)','hsl(210,12%,50%)'];

const EMPTY_DASHBOARD = {
  stats: { totalPatients: 0, totalDoctors: 0, todayAppointments: 0, revenue: 0 },
  weeklyAppointments: [],
  revenueData: [],
  departmentData: [],
  recentAppointments: [],
  refunds: [],
};

const statusCls = { Confirmed:'bg-success/10 text-success', Pending:'bg-warning/10 text-warning', Cancelled:'bg-destructive/10 text-destructive', Completed:'bg-info/10 text-info' };
const tooltipStyle = { borderRadius:'0.75rem', border:'1px solid hsl(200,20%,90%)', fontSize:12 };

function OperationsStrip() {
  const navigate = useNavigate();
  const [ops, setOps] = useState({ bedsFree: null, bedsTotal: null, erActive: null, pendingVerif: null, staffOnLeave: null });
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [bedStats, erStats, leavePending] = await Promise.all([
          api.getBedStats().catch(() => null),
          api.getEmergencyStats().catch(() => null),
          api.getPendingLeaveRequests().catch(() => null),
        ]);
        if (!alive) return;
        setOps({
          bedsFree: bedStats?.available ?? bedStats?.free ?? null,
          bedsTotal: bedStats?.total ?? null,
          erActive: erStats?.active ?? erStats?.count ?? null,
          pendingVerif: null,
          staffOnLeave: Array.isArray(leavePending) ? leavePending.length : leavePending?.count ?? null,
        });
        api.get('/prescriptions/verification-queue').then((v) => {
          if (!alive) return;
          const n = Array.isArray(v) ? v.length : v?.queue?.length ?? v?.count ?? null;
          setOps((o) => ({ ...o, pendingVerif: n }));
        }).catch(() => {});
      } catch {}
    })();
    return () => { alive = false; };
  }, []);
  const items = [
    { label: 'Beds Free/Total', value: ops.bedsFree != null && ops.bedsTotal != null ? `${ops.bedsFree}/${ops.bedsTotal}` : '—', path: '/admin/beds' },
    { label: 'ER Active', value: ops.erActive ?? '—', path: '/admin/emergency' },
    { label: 'Pending Verifications', value: ops.pendingVerif ?? '—', path: '/admin/prescription-verification' },
    { label: 'Staff On Leave', value: ops.staffOnLeave ?? '—', path: '/admin/leave-requests' },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {items.map((it) => (
        <button key={it.label} onClick={() => navigate(it.path)} className="rounded-2xl border p-4 text-left hover:border-primary/40 hover:shadow-md transition-all">
          <p className="text-2xl font-bold">{it.value}</p>
          <p className="text-xs text-muted-foreground">{it.label}</p>
        </button>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const settings = useSelector(selectSetting) || {};
  const [apptTab, setApptTab] = useState('pending');
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey:['dashboard'], queryFn: api.dashboardStats, refetchInterval: 60000 });
  const { data: apptsData } = useQuery({ queryKey:['admin-appointments'], queryFn: () => api.getAppointments({ limit: 200, page: 1 }).catch(() => null), refetchInterval: 60000 });
  const { data: refundsData } = useQuery({ queryKey:['refunds'], queryFn: () => api.getRefunds().catch(() => ({ payments: [] })) });
  useAppointmentRealtime(() => { queryClient.invalidateQueries({ queryKey: ['dashboard'] }); queryClient.invalidateQueries({ queryKey: ['admin-appointments'] }); });

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onNewAppointment = () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ['admin-appointments'] });
    };
    const onEmergency = () => {
      toast.error('New Emergency Case Registered in Triage!', { duration: 8000 });
      refetch();
    };
    socket.on('appointment:created', onNewAppointment);
    socket.on('appointment:statusChange', onNewAppointment);
    socket.on('emergency:alert', onEmergency);
    return () => {
      socket.off('appointment:created', onNewAppointment);
      socket.off('appointment:statusChange', onNewAppointment);
      socket.off('emergency:alert', onEmergency);
    };
  }, [refetch, queryClient]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[0,1,2,3].map((i) => (
          <div key={i} className="rounded-2xl border p-5 animate-pulse">
            <div className="h-4 w-24 bg-muted rounded mb-3" />
            <div className="h-8 w-16 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }
  const isNoHospital = error?.message?.includes('No hospital linked') || error?.response?.data?.message?.includes('No hospital linked');
  if (isError || !data) {
    return (
      <div className="rounded-2xl border p-8 text-center space-y-3">
        {isNoHospital ? (
          <>
            <p className="font-heading text-lg font-bold">Hospital link pending hai</p>
            <p className="text-sm text-muted-foreground">Aapke admin account se abhi koi hospital juda nahi hai. Onboarding team se hospital link karwao, phir dashboard yahin dikhega.</p>
          </>
        ) : (
          <p className="font-semibold">Dashboard load nahi hua{error?.message ? `: ${error.message}` : ""}</p>
        )}
        <Button onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  const { stats, weeklyAppointments = [], revenueData = [], departmentData = [], recentAppointments: fallbackRecent = [] } = { ...EMPTY_DASHBOARD, ...data };
  const rawAppts = apptsData?.data || apptsData?.appointments || apptsData || fallbackRecent;
  const appointmentsList = Array.isArray(rawAppts) ? rawAppts : [];

  const todayStr = getISTDateString();
  const pendingAppts = appointmentsList.filter(a => (a.status || '').toLowerCase() === 'pending');
  const upcomingAppts = appointmentsList.filter(a => {
    const s = (a.status || '').toLowerCase();
    return s === 'confirmed' || s === 'approved' || s === 'upcoming';
  });
  const todayAppts = appointmentsList.filter(a => {
    const s = (a.status || '').toLowerCase();
    if (['cancelled', 'completed'].includes(s)) return false;
    const d = a.date || a.bookingDate || '';
    return !d || d.startsWith(todayStr);
  });
  const completedAppts = appointmentsList.filter(a => (a.status || '').toLowerCase() === 'completed');

  const displayedAppts = apptTab === 'pending' ? pendingAppts
    : apptTab === 'upcoming' ? upcomingAppts
    : apptTab === 'today' ? todayAppts
    : completedAppts;

  const refunds = refundsData?.payments || refundsData?.data || refundsData || [];
  const totalRefundAmount = refunds.reduce((s, r) => s + (r.refund_amount || r.amount || 0), 0);

  // Apply appearance settings when dashboard mounts or settings change
  useEffect(() => {
    if (typeof document !== 'undefined') {
      applyUserSettings(settings);
    }
  }, [settings]);

  return (
    <div>
      <div className="page-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back, <span className="font-semibold text-foreground">{user?.name}</span>! Here's your hospital overview.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate('/appointments')} className="rounded-xl gap-1.5 text-xs font-semibold shadow-sm">
            <CalendarDays className="w-3.5 h-3.5" /> Manage All Appointments
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard title="Total Patients" value={stats?.totalPatients?.toLocaleString() ?? '—'} icon={UserRound} />
        <StatCard title="Active Doctors" value={stats?.totalDoctors ?? '—'} icon={Stethoscope} iconColor="text-info" iconBg="bg-info/10" />
        <StatCard title="Appointments Today" value={stats?.todayAppointments ?? '—'} change={`${pendingAppts.length} pending`} changeType="neutral" icon={CalendarDays} iconColor="text-warning" iconBg="bg-warning/10" />
        <StatCard title="Revenue (MTD)" value={`₹${(stats?.revenueMTD ?? stats?.revenue ?? 0).toLocaleString()}`} icon={CreditCard} iconColor="text-success" iconBg="bg-success/10" />
      </div>

      {/* Operations strip: beds, ER, verifications, leave */}
      <OperationsStrip />

      {/* 5 Consultation Modes Hub (Hospital OPD Suite) */}
      <div className="rounded-3xl border border-border/60 bg-gradient-to-br from-card via-card to-primary/5 p-5 sm:p-6 shadow-sm mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-bold text-lg text-foreground">Hospital Consultation & Clinical Services Hub</h3>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  5 Clinical Modes
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage In Hospital OPD visits, home doctor visits with live tracking, video calls, audio calling, and patient chat.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* 1. In Hospital */}
          <div
            onClick={() => navigate('/appointments')}
            className="group relative rounded-2xl border border-blue-500/20 bg-blue-500/5 dark:bg-blue-950/20 p-4 hover:border-blue-500 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <Building2 className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500 text-white">
                  Hospital OPD
                </span>
              </div>
              <h4 className="font-heading font-bold text-foreground text-sm group-hover:text-blue-600 transition-colors">
                In Hospital
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Physical in-hospital consultations, OPD token queue, and ward admissions.
              </p>
            </div>
            <div className="mt-4 pt-2.5 border-t border-blue-500/20 flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400">
              <span>OPD Desk</span>
              <span className="flex items-center gap-0.5">View <ChevronRight className="w-3.5 h-3.5" /></span>
            </div>
          </div>

          {/* 2. Home Visits */}
          <div
            onClick={() => navigate('/doctor/home-visit')}
            className="group relative rounded-2xl border border-violet-500/20 bg-violet-500/5 dark:bg-violet-950/20 p-4 hover:border-violet-500 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <MapPin className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500 text-white">
                  GPS Route
                </span>
              </div>
              <h4 className="font-heading font-bold text-foreground text-sm group-hover:text-violet-600 transition-colors">
                Home Visits
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                At-home doctor visits, live location navigation, and bedside clinical care.
              </p>
            </div>
            <div className="mt-4 pt-2.5 border-t border-violet-500/20 flex items-center justify-between text-xs font-semibold text-violet-600 dark:text-violet-400">
              <span>Track Visits</span>
              <span className="flex items-center gap-0.5">Live Map <ChevronRight className="w-3.5 h-3.5" /></span>
            </div>
          </div>

          {/* 3. Video Consult */}
          <div
            onClick={() => navigate('/doctor/video-calls')}
            className="group relative rounded-2xl border border-cyan-500/20 bg-cyan-500/5 dark:bg-cyan-950/20 p-4 hover:border-cyan-500 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="w-10 h-10 rounded-xl bg-cyan-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <Video className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500 text-white">
                  1080p HD
                </span>
              </div>
              <h4 className="font-heading font-bold text-foreground text-sm group-hover:text-cyan-600 transition-colors">
                Video Consult
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Full HD 1080p video consultation rooms with screen sharing and recordings.
              </p>
            </div>
            <div className="mt-4 pt-2.5 border-t border-cyan-500/20 flex items-center justify-between text-xs font-semibold text-cyan-600 dark:text-cyan-400">
              <span>HD Telehealth</span>
              <span className="flex items-center gap-0.5">Open <ChevronRight className="w-3.5 h-3.5" /></span>
            </div>
          </div>

          {/* 4. Voice Calls */}
          <div
            onClick={() => navigate('/doctor/calls')}
            className="group relative rounded-2xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/20 p-4 hover:border-emerald-500 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <Phone className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                  WebRTC
                </span>
              </div>
              <h4 className="font-heading font-bold text-foreground text-sm group-hover:text-emerald-600 transition-colors">
                Voice Calls
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Opus 48kHz audio calling with noise reduction and call session logs.
              </p>
            </div>
            <div className="mt-4 pt-2.5 border-t border-emerald-500/20 flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <span>Audio Line</span>
              <span className="flex items-center gap-0.5">Dial <ChevronRight className="w-3.5 h-3.5" /></span>
            </div>
          </div>

          {/* 5. Messages & Chat */}
          <div
            onClick={() => navigate('/doctor/chat')}
            className="group relative rounded-2xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-950/20 p-4 hover:border-amber-500 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white">
                  Encrypted
                </span>
              </div>
              <h4 className="font-heading font-bold text-foreground text-sm group-hover:text-amber-600 transition-colors">
                Patient Chat
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Instant patient messaging, symptom queries, and report exchanges.
              </p>
            </div>
            <div className="mt-4 pt-2.5 border-t border-amber-500/20 flex items-center justify-between text-xs font-semibold text-amber-600 dark:text-amber-400">
              <span>Live Chat</span>
              <span className="flex items-center gap-0.5">Chat <ChevronRight className="w-3.5 h-3.5" /></span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-card rounded-xl border p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <CalendarDays className="w-4 h-4 text-primary" />
            <h3 className="font-heading font-semibold text-lg text-card-foreground">Weekly Appointments</h3>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={weeklyAppointments}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(200,20%,90%)" />
              <XAxis dataKey="day" stroke="hsl(210,12%,50%)" fontSize={12} />
              <YAxis stroke="hsl(210,12%,50%)" fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="hsl(174,62%,38%)" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl border p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="font-heading font-semibold text-lg text-card-foreground">Revenue Trend</h3>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(200,20%,90%)" />
              <XAxis dataKey="month" stroke="hsl(210,12%,50%)" fontSize={12} />
              <YAxis stroke="hsl(210,12%,50%)" fontSize={12} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={tooltipStyle} formatter={v => [`₹${v.toLocaleString()}`, 'Revenue']} />
              <Line type="monotone" dataKey="revenue" stroke="hsl(174,62%,38%)" strokeWidth={3} dot={{ fill:'hsl(174,62%,38%)',r:5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 4-Tab Appointments Hub */}
        <div className="lg:col-span-2 bg-card rounded-xl border p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              <div>
                <h3 className="font-heading font-semibold text-lg text-card-foreground">Appointments Hub</h3>
                <p className="text-xs text-muted-foreground">Manage OPD, online and home appointments across 4 stages</p>
              </div>
            </div>

            {/* 4 Tabs: Pending, Upcoming, Today, Complete */}
            <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-2xl border border-border/50 overflow-x-auto">
              <button
                type="button"
                onClick={() => setApptTab('pending')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  apptTab === 'pending'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Pending</span>
                {pendingAppts.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${apptTab === 'pending' ? 'bg-white/20 text-white' : 'bg-amber-500/20 text-amber-600'}`}>
                    {pendingAppts.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setApptTab('upcoming')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  apptTab === 'upcoming'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <CalendarClock className="w-3.5 h-3.5" />
                <span>Upcoming</span>
                {upcomingAppts.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${apptTab === 'upcoming' ? 'bg-white/20 text-white' : 'bg-primary/20 text-primary'}`}>
                    {upcomingAppts.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setApptTab('today')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  apptTab === 'today'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Today</span>
                {todayAppts.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${apptTab === 'today' ? 'bg-white/20 text-white' : 'bg-emerald-600/20 text-emerald-600'}`}>
                    {todayAppts.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setApptTab('complete')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  apptTab === 'complete'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Complete</span>
                {completedAppts.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${apptTab === 'complete' ? 'bg-white/20 text-white' : 'bg-purple-600/20 text-purple-600'}`}>
                    {completedAppts.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={apptTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-2"
            >
            {displayedAppts.slice(0, 5).map((apt, i) => (
              <div key={apt._id ?? i} className="flex items-center justify-between py-3 border-b border-border last:border-0 hover:bg-muted/20 px-2 rounded-xl transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-sm font-bold text-accent-foreground">
                    {(apt.patient || apt.patientName || 'P')?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-card-foreground">{apt.patient || apt.patientName || 'Patient'}</p>
                    <p className="text-xs text-muted-foreground">{apt.doctor || apt.doctorName || 'Assigned Doctor'}</p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />{apt.time || apt.timeSlot || 'Scheduled'}
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusCls[apt.status] ?? 'bg-muted text-muted-foreground'}`}>
                    {apt.status || 'Pending'}
                  </span>
                </div>
              </div>
            ))}
            {displayedAppts.length === 0 && (
              <div className="text-center py-10 text-muted-foreground">
                <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">No {apptTab} appointments found</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Check full schedule in appointments section</p>
              </div>
            )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-4 pt-3 border-t border-border flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => navigate('/appointments')} className="text-xs text-primary hover:text-primary gap-1">
              View All In Appointments <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <div className="bg-card rounded-xl border p-6 shadow-sm">
          <h3 className="font-heading font-semibold text-lg text-card-foreground mb-4">Departments</h3>
          <ResponsiveContainer width="100%" height={190}>
            <PieChart>
              <Pie data={departmentData} cx="50%" cy="50%" innerRadius={48} outerRadius={75} paddingAngle={4} dataKey="value">
                {departmentData?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-3">
            {departmentData?.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-muted-foreground text-xs">{d.name}</span>
                </div>
                <span className="font-medium text-xs text-card-foreground">{d.value} appts</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Refund Section */}
      <div className="mt-6 bg-card rounded-xl border p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <RotateCcw className="w-4 h-4 text-destructive" />
          <h3 className="font-heading font-semibold text-lg text-card-foreground">Refunds</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-destructive/5 rounded-lg border border-destructive/20 p-4">
            <p className="text-2xl font-bold text-destructive">₹{totalRefundAmount.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Refunded</p>
          </div>
          <div className="bg-warning/5 rounded-lg border border-warning/20 p-4">
            <p className="text-2xl font-bold text-warning">{refunds.filter(r => { const d = new Date(r.date || r.createdAt || 0); const n = new Date(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); }).length}</p>
            <p className="text-xs text-muted-foreground">This Month</p>
          </div>
          <div className="bg-info/5 rounded-lg border border-info/20 p-4">
            <p className="text-2xl font-bold text-info">{refunds.length}</p>
            <p className="text-xs text-muted-foreground">Total Refunds</p>
          </div>
        </div>
        <div className="space-y-2">
          {refunds.slice(0, 5).map((r, i) => (
            <div key={r._id ?? i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                  <RotateCcw className="w-4 h-4 text-destructive" />
                </div>
                <div>
                  <p className="font-medium text-sm text-card-foreground">{r.patient || r.patientName || '—'}</p>
                  <p className="text-xs text-muted-foreground">{r.reason || r.description || 'Refund'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-sm text-card-foreground">₹{(r.refund_amount || r.amount || 0).toLocaleString()}</p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.status === 'Refunded' || r.status === 'refunded' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'}`}>
                  {r.status}
                </span>
              </div>
            </div>
          ))}
          {refunds.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <RotateCcw className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No refunds found</p>
            </div>
          )}
        </div>
      </div>

      {/* Hospital Settings shortcut (platform toggles live in /admin/hospital-settings) */}
      <div className="mt-6 bg-card rounded-xl border p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <Globe className="w-4 h-4 text-primary" />
          <h3 className="font-heading font-semibold text-lg text-card-foreground">Hospital Settings</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-primary/5 rounded-lg border border-primary/20 p-4">
            <p className="text-2xl font-bold text-primary">{stats?.totalDoctors ?? '—'}</p>
            <p className="text-xs text-muted-foreground">Registered Doctors</p>
          </div>
          <div className="bg-info/5 rounded-lg border border-info/20 p-4">
            <p className="text-2xl font-bold text-info">{stats?.totalPatients ?? '—'}</p>
            <p className="text-xs text-muted-foreground">Registered Patients</p>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-2 pt-4 border-t border-border">
          <Button onClick={() => navigate('/admin/hospital-settings')} className="gap-2">
            Open Hospital Settings
          </Button>
          <span className="text-xs text-muted-foreground">Modes, emergency, ambulance, refund & profile settings</span>
        </div>
      </div>
    </div>
  );
}
