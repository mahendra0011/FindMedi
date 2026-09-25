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
import { AmbulanceActiveTab } from '@/components/ambulance/AmbulanceActiveTab';
import { AmbulanceHistoryTab } from '@/components/ambulance/AmbulanceHistoryTab';
import { AmbulanceVehicleTab } from '@/components/ambulance/AmbulanceVehicleTab';
import { AmbulanceSettingsTab } from '@/components/ambulance/AmbulanceSettingsTab';
import { AmbulanceOverviewTab } from '@/components/ambulance/AmbulanceOverviewTab';

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
      {/* ════════════════════════════════════════════════════════════════════════
          TAB: OVERVIEW
         ════════════════════════════════════════════════════════════════════════ */}
      {tab === 'overview' && (
        <AmbulanceOverviewTab
          amb={amb}
          job={job}
          isOnline={isOnline}
          gpsOk={gpsOk}
          stats={stats}
          recentJobs={recentJobs}
          totalJobsCount={totalJobsCount}
          weeklyDispatchData={WEEKLY_DISPATCH_DATA}
          emergencySeverityData={EMERGENCY_SEVERITY_DATA}
          setTab={setTab}
        />
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          TAB: ACTIVE MISSION
         ════════════════════════════════════════════════════════════════════════ */}
      {tab === 'active' && (
        <AmbulanceActiveTab
          job={job}
          step={step}
          advancing={advancing}
          advanceProgress={advanceProgress}
          completeJob={completeJob}
          mapsUrl={mapsUrl}
          amb={amb}
          setTab={setTab}
        />
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          TAB: MISSION HISTORY
         ════════════════════════════════════════════════════════════════════════ */}
      {tab === 'history' && (
        <AmbulanceHistoryTab
          allJobs={allJobs}
          totalJobsCount={totalJobsCount}
          setTab={setTab}
        />
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          TAB: VEHICLE & EQUIPMENT
         ════════════════════════════════════════════════════════════════════════ */}
      {tab === 'vehicle' && (
        <AmbulanceVehicleTab amb={amb} setTab={setTab} />
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          TAB: SETTINGS
         ════════════════════════════════════════════════════════════════════════ */}
      {tab === 'settings' && (
        <AmbulanceSettingsTab
          amb={amb}
          setAmb={setAmb}
          user={user}
          setTab={setTab}
        />
      )}
    </div>
  );
}
