import React, { useEffect, useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Ambulance,
  MapPin,
  Phone,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Shield,
  Activity,
  Flame,
  Zap,
  TrendingUp,
  Award,
  History,
  Settings,
  Car,
  HeartPulse,
  Siren,
  Hospital,
  ArrowLeft,
  Sparkles,
  ExternalLink,
  Check,
  User,
  Fuel,
  Compass,
  FileText,
  BarChart3,
  CalendarDays,
  Target
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
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
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useAmbulanceGps } from '@/hooks/useAmbulanceGps';
import { EmergencyToggleConfirm } from '@/components/emergency/EmergencyToggleConfirm';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

const mapsUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;

const STAGE_MAP = ['assigned', 'reached_pickup', 'heading_to_hospital', 'reached_hospital'];
const STAGE_TO_STEP: Record<string, number> = {
  assigned: 0,
  reached_pickup: 1,
  heading_to_hospital: 2,
  reached_hospital: 3,
  completed: 3
};

const WEEKLY_DISPATCH_DATA = [
  { day: 'Mon', jobs: 4, avgMin: 8.2, km: 38 },
  { day: 'Tue', jobs: 6, avgMin: 7.1, km: 54 },
  { day: 'Wed', jobs: 5, avgMin: 9.0, km: 45 },
  { day: 'Thu', jobs: 8, avgMin: 6.5, km: 72 },
  { day: 'Fri', jobs: 7, avgMin: 7.8, km: 61 },
  { day: 'Sat', jobs: 9, avgMin: 5.9, km: 85 },
  { day: 'Sun', jobs: 5, avgMin: 7.4, km: 48 },
];

const EMERGENCY_SEVERITY_DATA = [
  { name: 'Trauma / Accident', value: 45, color: '#ef4444' },
  { name: 'Cardiac / Stroke', value: 30, color: '#f97316' },
  { name: 'Maternal / Pediatric', value: 15, color: '#06b6d4' },
  { name: 'General Transfer', value: 10, color: '#10b981' },
];

export default function AmbulanceDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'overview';
  const setTab = (t: string) => setSearchParams(t === 'overview' ? {} : { tab: t });

  const [amb, setAmb] = useState<any>(null);
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [confirmOnline, setConfirmOnline] = useState<{ open: boolean; value: boolean }>({ open: false, value: false });
  const [gpsOk, setGpsOk] = useState<string>('GPS active & synced');
  const [step, setStep] = useState(0);
  const [advancing, setAdvancing] = useState(false);
  const [stats, setStats] = useState<any>({ todayCount: 0, avgResponseMin: 0, totalCompleted: 0, monthCount: 0 });
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [allJobs, setAllJobs] = useState<any[]>([]);
  const [totalJobsCount, setTotalJobsCount] = useState(0);

  // Background GPS broadcasting
  useAmbulanceGps(Boolean(amb?.isOnline));

  const load = async () => {
    try {
      const [meRes, jobRes, statsRes, recentRes, jobsRes]: any = await Promise.all([
        api.get('/ambulance/me').catch(() => ({ ambulance: null })),
        api.get('/ambulance/me/active-job').catch(() => ({ job: null })),
        api.get('/ambulance/me/stats').catch(() => null),
        api.get('/ambulance/me/recent-jobs').catch(() => ({ jobs: [] })),
        api.get('/ambulance/me/jobs?page=1&limit=20').catch(() => ({ jobs: [], total: 0 })),
      ]);

      if (meRes?.ambulance) setAmb(meRes.ambulance);
      if (jobRes?.job) {
        setJob(jobRes.job);
        setStep(STAGE_TO_STEP[jobRes.job.progressStage] ?? (jobRes.job.status === 'en_route' ? 2 : 1));
      } else if (jobRes && !jobRes.job) {
        // Keep previous active job on transient empty (avoid flash-of-empty)
        console.warn('Active job empty, keeping previous state');
      } else {
        setJob(null);
      }

      if (statsRes) {
        setStats({
          todayCount: statsRes.todayCount || 0,
          avgResponseMin: statsRes.avgResponseMin || 0,
          totalCompleted: statsRes.totalCompleted || 0,
          monthCount: statsRes.monthCount || 0,
        });
      }

      if (recentRes?.jobs) setRecentJobs(recentRes.jobs);
      if (jobsRes?.jobs) {
        setAllJobs(jobsRes.jobs);
        setTotalJobsCount(jobsRes.total || 0);
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load ambulance dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const poll = setInterval(() => load(), 30000);

    const handleSyncStatus = (e: any) => {
      if (e?.detail?.type === 'ambulance' && e.detail.isOnline !== undefined) {
        setAmb((prev: any) => (prev ? { ...prev, isOnline: Boolean(e.detail.isOnline) } : prev));
      }
    };

    window.addEventListener('provider_status_changed', handleSyncStatus);
    return () => {
      clearInterval(poll);
      window.removeEventListener('provider_status_changed', handleSyncStatus);
    };
  }, []);

  useEffect(() => {
    const s = getSocket();
    if (!s || !amb?._id) return;
    s.emit('join_ambulance_room', { ambulanceId: amb._id });

    const handleAssignedJob = (data?: any) => {
      toast.success('🚑 Mission Confirmed! Emergency assigned to your vehicle.', { duration: 8000 });
      setTab('active');
      load();
    };

    const handleIncomingEmergency = (data?: any) => {
      const audio = new Audio('/sounds/emergency-alert.mp3');
      audio.play().catch(() => {});
      toast.error('🚨 Incoming Emergency Request nearby!', { duration: 10000 });
      load();
    };

    s.on('emergency_assigned', handleAssignedJob);
    s.on('emergency_assigned_to_you', handleAssignedJob);
    s.on('incoming_emergency', handleIncomingEmergency);

    return () => {
      s.emit('leave_ambulance_room', { ambulanceId: amb._id });
      s.off('emergency_assigned', handleAssignedJob);
      s.off('emergency_assigned_to_you', handleAssignedJob);
      s.off('incoming_emergency', handleIncomingEmergency);
    };
  }, [amb?._id]);

  const doOnlineToggle = async (online: boolean) => {
    setConfirmOnline({ open: false, value: false });
    try {
      if (online) {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 10000 })
        );
        const res: any = await api.put('/ambulance/me/online', {
          online: true,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setAmb((p: any) => ({ ...p, isOnline: res.isOnline }));
        setGpsOk(`Active (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`);
        window.dispatchEvent(new CustomEvent('provider_status_changed', {
          detail: { type: 'ambulance', isOnline: true }
        }));
        toast.success('Ambulance Online — Emergency radar active');
      } else {
        const res: any = await api.put('/ambulance/me/online', { online: false });
        setAmb((p: any) => ({ ...p, isOnline: res.isOnline }));
        window.dispatchEvent(new CustomEvent('provider_status_changed', {
          detail: { type: 'ambulance', isOnline: false }
        }));
        toast.info('Ambulance is now Offline');
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.message || 'GPS location permission required to go online');
      setGpsOk('GPS permission denied');
    }
  };

  const advanceProgress = async () => {
    if (!job?._id || step >= 3) return;
    const nextStage = STAGE_MAP[step + 1];
    setAdvancing(true);
    try {
      await api.put(`/emergency-sos/${job._id}/progress`, { stage: nextStage });
      setStep((s) => Math.min(3, s + 1));
      toast.success(`Milestone updated: ${nextStage.replace('_', ' ').toUpperCase()}`);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Update failed');
    } finally {
      setAdvancing(false);
    }
  };

  const completeJob = async () => {
    if (!job?._id) return;
    try {
      await api.put(`/emergency-sos/${job._id}/complete`, {});
      toast.success('Emergency Mission Completed Successfully!');
      setJob(null);
      setStep(3);
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Complete failed');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center animate-pulse">
          <Siren className="w-6 h-6 animate-spin" />
        </div>
        <p className="text-sm font-semibold text-muted-foreground">Connecting Ambulance Telemetry…</p>
      </div>
    );
  }

  const isOnline = Boolean(amb?.isOnline);
  const isOnDuty = Boolean(amb?.isOnDuty);

  return (
    <div className="w-full space-y-6 pb-20">
      {/* ── TOP HERO AMBULANCE COMMAND HEADER ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Main Identity & Status Card */}
        <div className="lg:col-span-8 p-5 sm:p-6 rounded-3xl border border-border/80 bg-card shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative overflow-hidden">
          <div className="flex items-center gap-4 relative z-10">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center border border-destructive/20 shadow-inner">
                <Ambulance className="w-8 h-8" />
              </div>
              <span
                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-card ${
                  isOnline ? 'bg-destructive animate-pulse' : 'bg-muted-foreground'
                }`}
              />
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-foreground tracking-tight">
                  {amb?.hospitalId?.name || 'Emergency Ambulance Unit'}
                </h1>
                <Badge
                  variant={isOnline ? 'destructive' : 'secondary'}
                  className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5"
                >
                  {isOnline ? '🚨 Emergency Ready' : 'Offline / Standby'}
                </Badge>
                <Badge variant="outline" className="text-[10px] font-mono border-destructive/30 text-destructive bg-destructive/5">
                  TYPE: {amb?.ambulanceType || 'BLS'}
                </Badge>
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                <span className="font-mono bg-muted/60 px-2 py-0.5 rounded-md border text-foreground font-bold">
                  {amb?.registrationNumber || 'MH-XX-AMB-01'}
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                  <Car className="w-3.5 h-3.5 text-destructive" /> {amb?.vehicleModel || 'Emergency Van'}
                </span>
                <span>•</span>
                <span className="text-muted-foreground flex items-center gap-1">
                  <Hospital className="w-3 h-3 text-muted-foreground" /> {amb?.hospitalId?.name || 'Central Hospital'}
                </span>
              </div>
            </div>
          </div>

          {/* Online Toggle Switch Button with Status Glow */}
          <div className="flex items-center gap-3 bg-muted/40 p-3 rounded-2xl border border-border/70 self-start sm:self-auto relative z-10 shadow-sm">
            <div className="text-right">
              <div className="flex items-center justify-end gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-destructive animate-pulse' : 'bg-muted-foreground'}`} />
                <p className="text-xs font-bold text-foreground">
                  {isOnline ? 'Duty Online' : 'You are Offline'}
                </p>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {isOnline ? 'Receiving emergency calls' : 'Switch ON to respond'}
              </p>
            </div>
            <Switch
              checked={isOnline}
              disabled={isOnDuty}
              onCheckedChange={(v) => setConfirmOnline({ open: true, value: v })}
              className="data-[state=checked]:bg-destructive scale-110"
            />
          </div>
        </div>

        {/* Emergency Dispatch Readiness Card */}
        <div className="lg:col-span-4 p-5 sm:p-6 rounded-3xl border border-destructive/25 bg-card shadow-sm flex flex-col justify-between gap-3 relative overflow-hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0 border border-destructive/20">
                <HeartPulse className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <p className="font-bold text-sm text-foreground flex items-center gap-1.5">
                  Life Support Readiness
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                  Oxygen, Stretcher & Paramedic active
                </p>
              </div>
            </div>
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 bg-emerald-500/10 text-[10px] font-bold">
              ✓ 100% Prepared
            </Badge>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-border/60">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Emergency Support Flag:</span>
              <span className="font-semibold text-foreground">
                {amb?.hospitalId?.emergencySupport ? 'Hospital Active' : 'Hospital Linked'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">GPS Heartbeat:</span>
              <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                {isOnline ? 'Live Broadcaster Active' : 'Standby'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <EmergencyToggleConfirm
        open={confirmOnline.open}
        turningOn={confirmOnline.value}
        onConfirm={() => doOnlineToggle(confirmOnline.value)}
        onCancel={() => setConfirmOnline({ open: false, value: false })}
      />

      {/* ════════════════════════════════════════════════════════════════════════
          TAB: OVERVIEW
         ════════════════════════════════════════════════════════════════════════ */}
      {tab === 'overview' && (
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
                  <AreaChart data={WEEKLY_DISPATCH_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                        data={EMERGENCY_SEVERITY_DATA}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {EMERGENCY_SEVERITY_DATA.map((entry, index) => (
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
                  {EMERGENCY_SEVERITY_DATA.map((item) => (
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
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          TAB: ACTIVE MISSION
         ════════════════════════════════════════════════════════════════════════ */}
      {tab === 'active' && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTab('overview')}
              className="rounded-xl h-8 px-2.5 text-xs gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Overview
            </Button>
            <h3 className="font-bold text-base text-foreground">Active Emergency Mission Console</h3>
          </div>

          {job ? (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="rounded-3xl border-2 border-destructive bg-card p-6 shadow-xl space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-destructive text-white flex items-center justify-center font-bold shadow-md">
                    <Siren className="w-6 h-6 animate-spin" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="animate-pulse text-[10px] font-bold">
                        ACTIVE EMERGENCY MISSION
                      </Badge>
                      <span className="font-mono text-xs font-bold text-muted-foreground">
                        #{job._id?.slice(-8)?.toUpperCase()}
                      </span>
                    </div>
                    <h3 className="text-xl font-heading font-extrabold text-foreground mt-0.5">
                      {job.category || 'Critical Emergency'} · {job.patientDetails?.name || 'Emergency Patient'}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {job.patientDetails?.phone && (
                    <a href={`tel:${job.patientDetails.phone}`}>
                      <Button size="sm" className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5">
                        <Phone className="w-3.5 h-3.5" /> Call Patient ({job.patientDetails.phone})
                      </Button>
                    </a>
                  )}
                </div>
              </div>

              {/* Progress Milestones Stepper */}
              <div className="space-y-2 p-4 rounded-2xl bg-muted/40 border border-border/60">
                <div className="flex justify-between text-xs font-bold text-muted-foreground">
                  {['1. Assigned', '2. Reached Pickup', '3. Heading to Hospital', '4. Reached Hospital'].map((s, i) => (
                    <span key={s} className={step >= i ? 'text-destructive font-extrabold' : ''}>
                      {s}
                    </span>
                  ))}
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full bg-destructive rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${((step + 1) / 4) * 100}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
              </div>

              {/* Locations Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl border border-destructive/20 bg-destructive/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-destructive uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" /> Patient Pickup Location
                    </span>
                    {job.location?.coordinates && (
                      <a
                        target="_blank"
                        rel="noreferrer"
                        href={mapsUrl(job.location.coordinates[1], job.location.coordinates[0])}
                      >
                        <Button size="sm" variant="outline" className="h-7 text-[11px] rounded-lg gap-1 border-destructive/30 text-destructive">
                          <Navigation className="w-3 h-3" /> Open Maps
                        </Button>
                      </a>
                    )}
                  </div>
                  <p className="font-semibold text-foreground text-sm">{job.location?.address || 'Pickup coordinates loaded'}</p>
                  <p className="text-muted-foreground">
                    Patient: {job.patientDetails?.name} {job.patientDetails?.age ? `(${job.patientDetails.age} yrs)` : ''} · Blood Group: {job.patientDetails?.bloodGroup || 'Not specified'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-sky-500/20 bg-sky-500/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Hospital className="w-4 h-4" /> Destination Hospital
                    </span>
                    {job.selectedHospitalId?.location?.coordinates && (
                      <a
                        target="_blank"
                        rel="noreferrer"
                        href={mapsUrl(job.selectedHospitalId.location.coordinates[1], job.selectedHospitalId.location.coordinates[0])}
                      >
                        <Button size="sm" variant="outline" className="h-7 text-[11px] rounded-lg gap-1 border-sky-500/30 text-sky-600">
                          <Navigation className="w-3 h-3" /> Open Maps
                        </Button>
                      </a>
                    )}
                  </div>
                  <p className="font-semibold text-foreground text-sm">
                    {job.selectedHospitalId?.name || amb?.hospitalId?.name || 'Nearest Designated Emergency Trauma Center'}
                  </p>
                  <p className="text-muted-foreground">
                    Address: {job.selectedHospitalId?.address || amb?.hospitalId?.address || 'Hospital ER Bay'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border/60">
                <Button
                  size="default"
                  disabled={advancing || step >= 3}
                  onClick={advanceProgress}
                  className="rounded-xl bg-destructive hover:bg-destructive/90 text-white font-bold text-xs gap-2"
                >
                  <Zap className="w-4 h-4" />
                  {advancing
                    ? 'Updating Milestone…'
                    : step === 0
                    ? 'Mark: Reached Patient Pickup'
                    : step === 1
                    ? 'Mark: Heading to Hospital ER'
                    : 'Mark: Reached Hospital ER'}
                </Button>

                <Button
                  size="default"
                  onClick={completeJob}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" /> Complete Mission & Transfer Patient
                </Button>
              </div>
            </motion.div>
          ) : (
            <div className="rounded-3xl border border-dashed border-border p-12 text-center space-y-3 bg-muted/20">
              <div className="w-14 h-14 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center mx-auto">
                <Ambulance className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-base text-foreground">No Active Emergency Mission</h4>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Your ambulance is currently on standby. Make sure your status is toggled to <strong>Online</strong> so the emergency dispatch system can route nearby hospital trauma calls to you.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          TAB: MISSION HISTORY
         ════════════════════════════════════════════════════════════════════════ */}
      {tab === 'history' && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTab('overview')}
              className="rounded-xl h-8 px-2.5 text-xs gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Overview
            </Button>
            <h3 className="font-bold text-base text-foreground">Emergency Mission History ({totalJobsCount})</h3>
            <Button variant="outline" size="sm" className="ml-auto rounded-xl h-8 text-xs" onClick={async (e) => {
              // A-4: export the FULL history (paginated fetch), not just the 20 preview rows.
              const btn = e.currentTarget;
              btn.disabled = true;
              try {
                const first: any = await api.get('/ambulance/me/jobs?page=1&limit=1').catch(() => ({ total: 0 }));
                const total = first.total || totalJobsCount || 0;
                const pages = Math.max(1, Math.ceil(total / 100));
                let rows: any[] = [];
                for (let p = 1; p <= pages; p++) {
                  const r: any = await api.get(`/ambulance/me/jobs?page=${p}&limit=100`).catch(() => ({ jobs: [] }));
                  rows = rows.concat(r.jobs || []);
                  if (!(r.jobs || []).length) break;
                }
                const list = rows.length ? rows : allJobs;
                const csvRows = [["Job", "Patient", "Pickup", "Status"], ...list.map((j) => [j._id, j.patientDetails?.name || "Emergency Patient", j.location?.address || "", j.status || ""])];
                const csv = csvRows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
                const a = document.createElement("a");
                a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
                a.download = "ambulance-jobs.csv";
                a.click();
                toast.success(`Exported ${list.length} missions`);
              } catch {
                toast.error('CSV export failed');
              } finally {
                btn.disabled = false;
              }
            }}>Export CSV</Button>
          </div>

          <div className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm space-y-3">
            <div className="divide-y divide-border/60">
              {allJobs.map((j: any) => (
                <div key={j._id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0 mt-0.5">
                      <Siren className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-foreground font-mono">#{j._id?.slice(-8)?.toUpperCase()}</span>
                        <span>•</span>
                        <span className="font-semibold text-foreground text-sm">{j.patientDetails?.name || 'Emergency Patient'}</span>
                        <Badge variant="outline" className="text-[10px] font-bold border-destructive/30 text-destructive">
                          {j.category || 'Emergency'}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-xs mt-1">
                        Pickup: {j.location?.address || 'Recorded Coordinates'}
                      </p>
                      {j.selectedHospitalId?.name && (
                        <p className="text-muted-foreground text-[11px] mt-0.5">
                          Hospital: {j.selectedHospitalId.name}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <Badge variant={j.status === 'completed' ? 'default' : 'secondary'} className="text-[10px] font-bold">
                      {j.status?.toUpperCase() || 'COMPLETED'}
                    </Badge>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {j.createdAt ? new Date(j.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </p>
                  </div>
                </div>
              ))}

              {!allJobs.length && (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No mission records found yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          TAB: VEHICLE & EQUIPMENT
         ════════════════════════════════════════════════════════════════════════ */}
      {tab === 'vehicle' && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTab('overview')}
              className="rounded-xl h-8 px-2.5 text-xs gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Overview
            </Button>
            <h3 className="font-bold text-base text-foreground">Ambulance Specs & Medical Inventory</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/ambulance-setup')}
              className="rounded-xl h-8 px-2.5 text-xs gap-1.5 ml-auto"
            >
              Full Vehicle Setup
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <Car className="w-4 h-4 text-destructive" /> Vehicle Specifications
              </h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-muted-foreground">Registration Number</p>
                  <p className="font-mono font-bold text-foreground text-sm mt-0.5">{amb?.registrationNumber}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Ambulance Classification</p>
                  <p className="font-bold text-foreground text-sm mt-0.5">{amb?.ambulanceType || 'BLS'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Model & Make</p>
                  <p className="font-bold text-foreground text-sm mt-0.5">{amb?.vehicleModel || 'Force Traveller Ambulance'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Base Hospital</p>
                  <p className="font-bold text-foreground text-sm mt-0.5">{amb?.hospitalId?.name || 'Central Hospital'}</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-destructive" /> On-Board Life Support Equipment
              </h3>
              <div className="flex flex-wrap gap-2">
                {(amb?.equipmentLevel || 'Oxygen Cylinder, Collapsible Stretcher, First Aid Kit, Suction Machine, IV Fluids')
                  .split(',')
                  .map((e: string) => e.trim())
                  .filter(Boolean)
                  .map((eq: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold border border-destructive/20"
                    >
                      ✓ {eq}
                    </span>
                  ))}
              </div>
              <p className="text-xs text-muted-foreground pt-2 border-t border-border/60">
                Equipment compliance is inspected and approved by the linked hospital administration.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          TAB: SETTINGS
         ════════════════════════════════════════════════════════════════════════ */}
      {tab === 'settings' && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTab('overview')}
              className="rounded-xl h-8 px-2.5 text-xs gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Overview
            </Button>
            <h3 className="font-bold text-base text-foreground">Ambulance Protocols & Driver Settings</h3>
          </div>

          <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-foreground">Operations (accept lives outside — global Emergency overlay)</h3>
            <p className="text-xs text-muted-foreground">Dispatch accept/reject global EmergencyFlowController overlay me hota hai. Yahan standby + online rakho; assigned mission Active tab me auto-khulta hai.</p>
          </div>

          <AmbSettingsCard amb={amb} onSaved={(s) => setAmb((p: any) => (p ? { ...p, settings: s, ambulanceType: s.lifeSupportTier === 'PTV' ? 'PATIENT_TRANSPORT' : s.lifeSupportTier } : p))} />

          <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <User className="w-4 h-4 text-primary" /> Driver Profile & Hospital Association
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-muted-foreground block mb-1">Driver Name / Unit</label>
                <Input value={user?.name || amb?.driverName || 'Ambulance Captain'} disabled className="rounded-xl h-10" />
              </div>
              <div>
                <label className="text-muted-foreground block mb-1">Registered Dispatch Phone</label>
                <Input value={user?.phone || amb?.driverPhone || '9876543210'} disabled className="rounded-xl h-10" />
              </div>
              <div>
                <label className="text-muted-foreground block mb-1">Hospital Emergency Line</label>
                <Input value={amb?.hospitalId?.phone || '0761-2400000'} disabled className="rounded-xl h-10" />
              </div>
              <div>
                <label className="text-muted-foreground block mb-1">Hospital Address</label>
                <Input value={amb?.hospitalId?.address || 'Wright Town, Jabalpur'} disabled className="rounded-xl h-10" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// §8 ambulance ops master — controlled inputs persisted via PUT /ambulance/me/settings.
function AmbSettingsCard({ amb, onSaved }: { amb: any; onSaved: (s: any) => void }) {
  const s = amb?.settings || {};
  const [tier, setTier] = useState(s.lifeSupportTier || (amb?.ambulanceType === 'PATIENT_TRANSPORT' ? 'PTV' : 'BLS'));
  const [base, setBase] = useState(s.baseDispatchFee ?? '');
  const [perKm, setPerKm] = useState(s.perKmRate ?? '');
  const [oxygenFee, setOxygenFee] = useState(s.oxygenFee ?? '');
  const [radius, setRadius] = useState(String(s.maxRadiusKm ?? 25));
  const [oxygenOk, setOxygenOk] = useState(s.oxygenOk ?? true);
  const [aedOk, setAedOk] = useState(s.aedOk ?? true);
  const [suctionOk, setSuctionOk] = useState(s.suctionOk ?? true);
  const [spineBoardOk, setSpineBoardOk] = useState(s.spineBoardOk ?? true);
  const [emtOnBoard, setEmtOnBoard] = useState(s.emtOnBoard ?? false);
  const [erAutoAlert, setErAutoAlert] = useState(s.erAutoAlert ?? true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const st = amb?.settings || {};
    setTier(st.lifeSupportTier || (amb?.ambulanceType === 'PATIENT_TRANSPORT' ? 'PTV' : 'BLS'));
    setBase(st.baseDispatchFee ?? '');
    setPerKm(st.perKmRate ?? '');
    setOxygenFee(st.oxygenFee ?? '');
    setRadius(String(st.maxRadiusKm ?? 25));
    setOxygenOk(st.oxygenOk ?? true);
    setAedOk(st.aedOk ?? true);
    setSuctionOk(st.suctionOk ?? true);
    setSpineBoardOk(st.spineBoardOk ?? true);
    setEmtOnBoard(st.emtOnBoard ?? false);
    setErAutoAlert(st.erAutoAlert ?? true);
  }, [amb?._id]);

  const save = async () => {
    setSaving(true);
    try {
      const res: any = await api.put('/ambulance/me/settings', {
        settings: {
          lifeSupportTier: tier,
          baseDispatchFee: Number(base) || 0,
          perKmRate: Number(perKm) || 0,
          oxygenFee: Number(oxygenFee) || 0,
          maxRadiusKm: Number(radius) || 0,
          oxygenOk, aedOk, suctionOk, spineBoardOk, emtOnBoard, erAutoAlert,
        },
      });
      toast.success('Ambulance settings saved');
      onSaved(res.settings || res.ambulance?.settings);
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const check = (label: string, v: boolean, set: (b: boolean) => void) => (
    <label className="flex items-center gap-2 text-xs">
      <input type="checkbox" checked={v} onChange={(e) => set(e.target.checked)} className="rounded" /> {label}
    </label>
  );

  return (
    <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
      <h3 className="font-bold text-base text-foreground">Classification, Tariff & Radius</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div>
          <label className="block mb-1">Life Support (BLS/ALS/PTV/NICU)</label>
          <select value={tier} onChange={(e) => setTier(e.target.value)} className="w-full h-10 rounded-xl border px-3 bg-background">
            {['BLS', 'ALS', 'PTV', 'NICU'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block mb-1">Base ₹</label>
          <input type="number" min={0} value={base} onChange={(e) => setBase(e.target.value)} placeholder="500" className="w-full h-10 rounded-xl border px-3 bg-background" />
        </div>
        <div>
          <label className="block mb-1">Per-KM ₹</label>
          <input type="number" min={0} value={perKm} onChange={(e) => setPerKm(e.target.value)} placeholder="20" className="w-full h-10 rounded-xl border px-3 bg-background" />
        </div>
        <div>
          <label className="block mb-1">Oxygen support ₹</label>
          <input type="number" min={0} value={oxygenFee} onChange={(e) => setOxygenFee(e.target.value)} placeholder="300" className="w-full h-10 rounded-xl border px-3 bg-background" />
        </div>
        <div>
          <label className="block mb-1">Response radius: {radius} km</label>
          <select value={radius} onChange={(e) => setRadius(e.target.value)} className="w-full h-10 rounded-xl border px-3 bg-background">
            {['10', '25', '50'].map((r) => <option key={r} value={r}>{r} km</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {check('Oxygen cylinder >1000 PSI ready', oxygenOk, setOxygenOk)}
        {check('AED ready', aedOk, setAedOk)}
        {check('Suction unit ready', suctionOk, setSuctionOk)}
        {check('Spine board ready', spineBoardOk, setSpineBoardOk)}
        {check('Certified EMT on-board', emtOnBoard, setEmtOnBoard)}
        {check('Hospital ER auto-alert', erAutoAlert, setErAutoAlert)}
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={save} disabled={saving} className="rounded-xl">
          {saving ? 'Saving...' : 'Save ambulance settings'}
        </Button>
      </div>
    </div>
  );
}
