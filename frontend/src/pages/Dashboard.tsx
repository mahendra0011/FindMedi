import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Stethoscope, CalendarDays, CreditCard, Clock, TrendingUp, UserRound,
  RotateCcw, Globe, Save, Building2, Users, CheckCircle, AlertCircle,
  Video, Phone, MessageCircle, MapPin, CalendarClock, ChevronRight, CheckCircle2, Sparkles
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import StatCard from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useSelector } from 'react-redux';
import { selectSetting } from '@/store/slices/settingsSlice';
import { applyUserSettings } from '@/lib/settings';
import { getISTDateString, formatDisplayDate } from '@/lib/dateUtils';

const COLORS = ['hsl(174,62%,38%)','hsl(210,80%,55%)','hsl(38,92%,50%)','hsl(152,60%,42%)','hsl(210,12%,50%)'];

const FALLBACK = {
  stats: { totalPatients: 1247, totalDoctors: 48, todayAppointments: 32, revenue: 62400 },
  weeklyAppointments: [
    { day:'Mon',count:24},{day:'Tue',count:18},{day:'Wed',count:32},
    { day:'Thu',count:27},{day:'Fri',count:20},{day:'Sat',count:15},{day:'Sun',count:8},
  ],
  revenueData: [
    {month:'Jan',revenue:42000},{month:'Feb',revenue:38000},{month:'Mar',revenue:51000},
    {month:'Apr',revenue:47000},{month:'May',revenue:55000},{month:'Jun',revenue:62000},
  ],
  departmentData: [
    {name:'Cardiology',value:30},{name:'Neurology',value:22},{name:'Orthopedics',value:18},
    {name:'Pediatrics',value:15},{name:'Other',value:15},
  ],
  recentAppointments: [
    {_id:1,patient:'Sarah Johnson',doctor:'Dr. Smith',time:'10:00 AM',status:'Confirmed'},
    {_id:2,patient:'Mike Chen',doctor:'Dr. Patel',time:'11:30 AM',status:'Pending'},
    {_id:3,patient:'Emma Wilson',doctor:'Dr. Lee',time:'2:00 PM',status:'Confirmed'},
    {_id:4,patient:'James Brown',doctor:'Dr. Garcia',time:'3:30 PM',status:'Cancelled'},
    {_id:5,patient:'Lisa Davis',doctor:'Dr. Kim',time:'4:00 PM',status:'Confirmed'},
  ],
  refunds: [
    {_id:1,patient:'Sarah Johnson',amount:1500,status:'Refunded',date:'2026-07-20',reason:'Appointment Cancelled'},
    {_id:2,patient:'Mike Chen',amount:800,status:'Pending',date:'2026-07-22',reason:'Service Not Satisfactory'},
  ],
};

const statusCls = { Confirmed:'bg-success/10 text-success', Pending:'bg-warning/10 text-warning', Cancelled:'bg-destructive/10 text-destructive', Completed:'bg-info/10 text-info' };
const tooltipStyle = { borderRadius:'0.75rem', border:'1px solid hsl(200,20%,90%)', fontSize:12 };

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const settings = useSelector(selectSetting) || {};
  const [apptTab, setApptTab] = useState('pending');
  const { data = FALLBACK, isError, error } = useQuery({ queryKey:['dashboard'], queryFn: api.dashboardStats });
  const { data: apptsData } = useQuery({ queryKey:['admin-appointments'], queryFn: () => api.getAppointments({ limit: 50 }).catch(() => null) });
  const { data: refundsData } = useQuery({ queryKey:['refunds'], queryFn: () => api.getRefunds().catch(() => ({ payments: FALLBACK.refunds })) });

  const { stats, weeklyAppointments, revenueData, departmentData, recentAppointments: fallbackRecent = [] } = data;
  const rawAppts = apptsData?.data || apptsData?.appointments || apptsData || fallbackRecent;
  const appointmentsList = Array.isArray(rawAppts) && rawAppts.length > 0 ? rawAppts : fallbackRecent;

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
        <StatCard title="Total Patients" value={stats?.totalPatients?.toLocaleString() ?? '—'} change="+12% from last month" changeType="positive" icon={UserRound} />
        <StatCard title="Active Doctors" value={stats?.totalDoctors ?? '—'} change="+3 new this month" changeType="positive" icon={Stethoscope} iconColor="text-info" iconBg="bg-info/10" />
        <StatCard title="Appointments Today" value={stats?.todayAppointments ?? '—'} change={`${pendingAppts.length} pending`} changeType="neutral" icon={CalendarDays} iconColor="text-warning" iconBg="bg-warning/10" />
        <StatCard title="Revenue (MTD)" value={`₹${(stats?.revenue ?? 0).toLocaleString()}`} change="+18% from last month" changeType="positive" icon={CreditCard} iconColor="text-success" iconBg="bg-success/10" />
      </div>

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

          <div className="space-y-2">
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
          </div>

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
                <span className="font-medium text-xs text-card-foreground">{d.value}%</span>
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
            <p className="text-2xl font-bold text-warning">{refunds.filter(r => r.status === 'Pending' || r.status === 'pending').length}</p>
            <p className="text-xs text-muted-foreground">Pending Requests</p>
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

      {/* Platform Settings Section */}
      <div className="mt-6 bg-card rounded-xl border p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <Globe className="w-4 h-4 text-primary" />
          <h3 className="font-heading font-semibold text-lg text-card-foreground">Platform Settings</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-success/5 rounded-lg border border-success/20 p-4">
            <p className="text-2xl font-bold text-success">Active</p>
            <p className="text-xs text-muted-foreground">Platform Status</p>
          </div>
          <div className="bg-primary/5 rounded-lg border border-primary/20 p-4">
            <p className="text-2xl font-bold text-primary">{stats?.totalDoctors ?? '—'}</p>
            <p className="text-xs text-muted-foreground">Registered Doctors</p>
          </div>
          <div className="bg-info/5 rounded-lg border border-info/20 p-4">
            <p className="text-2xl font-bold text-info">{stats?.totalPatients ?? '—'}</p>
            <p className="text-xs text-muted-foreground">Registered Patients</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
            <div className="flex items-start gap-3">
              <Building2 className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm text-card-foreground">Auto Confirm Appointments</p>
                <p className="text-xs text-muted-foreground">Automatically confirm appointments after payment</p>
              </div>
            </div>
            <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary transition-colors">
              <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
            </button>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm text-card-foreground">Patient Self-Registration</p>
                <p className="text-xs text-muted-foreground">Allow patients to register without admin approval</p>
              </div>
            </div>
            <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-300 transition-colors">
              <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-1" />
            </button>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm text-card-foreground">Online Payments</p>
                <p className="text-xs text-muted-foreground">Enable online payment gateway for appointments</p>
              </div>
            </div>
            <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary transition-colors">
              <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
            </button>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm text-card-foreground">Emergency Access</p>
                <p className="text-xs text-muted-foreground">Allow emergency data access for critical cases</p>
              </div>
            </div>
            <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary transition-colors">
              <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-6 pt-6 border-t border-border">
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <Save className="w-4 h-4" />
            Save Platform Settings
          </button>
          <span className="text-xs text-muted-foreground">Changes apply platform-wide</span>
        </div>
      </div>
    </div>
  );
}
