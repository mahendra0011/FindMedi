import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Car,
  Bike,
  Truck,
  Ambulance,
  Power,
  Clock,
  IndianRupee,
  Star,
  ShieldCheck,
  AlertTriangle,
  Phone,
  Navigation,
  CheckCircle2,
  XCircle,
  FileText,
  Settings,
  History,
  TrendingUp,
  MapPin,
  Loader2,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  Wallet,
  MessageSquare,
  ThumbsUp,
  User,
  Bell,
  Award,
  ArrowLeft,
  Activity,
  Flame,
  Zap,
  Target,
  BarChart3,
  CalendarDays,
  Compass,
  Check,
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
  ResponsiveContainer,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { EmergencyToggleConfirm } from '@/components/emergency/EmergencyToggleConfirm';
import ProviderIncomingCall from '@/components/emergency/ProviderIncomingCall';
import { emergencyOverlayActive } from '@/lib/emergencyState';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import RideMap from '@/components/vehicle/RideMap';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { toast } from 'sonner';

export default function RiderDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const activeTab = searchParams.get('tab') || 'overview';
  const setActiveTab = (tab: string) => setSearchParams({ tab });

  // State
  const [profile, setProfile] = useState<any>(null);
  const [earnings, setEarnings] = useState<any>(null);
  const [activeRide, setActiveRide] = useState<any>(null);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  // Har incoming ride request ko full-screen incoming call UI me dikhao (accept/reject + 2-min timer)
  const activeIncomingRideCall = incomingRequests[0] || null;
  emergencyOverlayActive.current = !!activeIncomingRideCall;
  const [historyRides, setHistoryRides] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [togglingOnline, setTogglingOnline] = useState<boolean>(false);

  // Demo Withdrawal State
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  // Emergency Support toggle (Doc 01 §9.3)
  const [emergencyConfirm, setEmergencyConfirm] = useState(false);
  const [emergencyPending, setEmergencyPending] = useState(false);
  const confirmEmergencyToggle = async () => {
    setEmergencyConfirm(false);
    try {
      const res: any = await api.put('/rider/emergency-toggle', { emergencySupport: emergencyPending });
      setProfile((prev: any) => ({ ...prev, emergencySupport: res.emergencySupport }));
      toast.success(emergencyPending ? 'Emergency Support ON' : 'Emergency Support OFF');
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.message || 'Toggle failed');
    }
  };

  // GPS Watch Position Ref
  const watchIdRef = useRef<number | null>(null);

  // 1. Initial Data Fetch
  useEffect(() => {
    loadDashboardData();

    const handleSyncStatus = (e: any) => {
      if (e?.detail?.type === 'rider' && e.detail.isOnline !== undefined) {
        setProfile((prev: any) => (prev ? { ...prev, isOnline: Boolean(e.detail.isOnline) } : prev));
      }
    };

    window.addEventListener('provider_status_changed', handleSyncStatus);
    return () => {
      window.removeEventListener('provider_status_changed', handleSyncStatus);
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [profRes, earnRes, activeRes, histRes] = await Promise.allSettled([
        api.getRiderProfile(),
        api.getRiderEarnings(),
        api.getActiveRide(),
        api.getRiderHistory(),
      ]);

      if (profRes.status === 'fulfilled' && profRes.value?.data) {
        setProfile(profRes.value.data.profile || profRes.value.data);
      } else if (profRes.status === 'fulfilled') {
        setProfile(profRes.value?.rider || profRes.value || null);
      }
      if (earnRes.status === 'fulfilled' && earnRes.value?.data) {
        setEarnings(earnRes.value.data.earnings || earnRes.value.data);
      } else if (earnRes.status === 'fulfilled') {
        setEarnings(earnRes.value || null);
      }
      if (activeRes.status === 'fulfilled' && activeRes.value?.data) {
        setActiveRide(activeRes.value.data.ride || null);
      } else if (activeRes.status === 'fulfilled') {
        setActiveRide(activeRes.value?.ride || null);
      } else {
        setActiveRide(null);
      }
      if (histRes.status === 'fulfilled' && histRes.value?.data) {
        setHistoryRides(histRes.value.data.rides || histRes.value.data || []);
      } else if (histRes.status === 'fulfilled') {
        setHistoryRides(histRes.value?.rides || histRes.value || []);
      }
    } catch (err: any) {
      console.error('Failed to load rider dashboard data', err);
      toast.error('Some dashboard metrics failed to refresh');
    } finally {
      setLoading(false);
    }
  };

  // 2. Real-time Incoming Ride Broadcast & Active Ride Updates
  useEffect(() => {
    const socket = getSocket();

    const handleNewRequest = (payload: any) => {
      // Add incoming request card with 120s (2 minute) countdown
      setIncomingRequests((prev) => {
        if (prev.some((r) => r.rideId === payload.rideId)) return prev;
        return [...prev, { ...payload, countdown: payload.countdown || 120 }];
      });
    };

    const handleRideTaken = ({ rideId }: { rideId: string }) => {
      setIncomingRequests((prev) => prev.filter((r) => r.rideId !== rideId));
    };

    const handleRideStatusUpdate = (payload: any) => {
      if (payload.rideId === activeRide?._id) {
        if (['cancelled_by_user', 'cancelled_by_rider'].includes(payload.status)) {
          toast.error('The passenger cancelled this ride request');
          setActiveRide(null);
          loadDashboardData();
        } else if (payload.status === 'completed') {
          toast.success('Trip completed successfully!');
          loadDashboardData();
        }
      }
    };

    const handleRideCancelled = ({ rideId }: { rideId: string }) => {
      setIncomingRequests((prev) => prev.filter((r) => r.rideId !== rideId));
      if (activeRide?._id === rideId) {
        toast.error('The passenger cancelled this ride request');
        setActiveRide(null);
      }
    };

    const handlePaymentReceived = (payload: any) => {
      if (activeRide?._id === payload.rideId) {
        toast.success(`Payment of ₹${payload.payment?.amount || ''} received!`);
        loadDashboardData();
      }
    };

    if (activeRide?._id) {
      socket.emit('join_ride_room', { rideId: activeRide._id });
    }

    socket.on('new_ride_request', handleNewRequest);
    socket.on('ride_taken', handleRideTaken);
    socket.on('ride_status_update', handleRideStatusUpdate);
    socket.on('ride_cancelled', handleRideCancelled);
    socket.on('payment_received', handlePaymentReceived);

    return () => {
      if (activeRide?._id) {
        socket.emit('leave_ride_room', { rideId: activeRide._id });
      }
      socket.off('new_ride_request', handleNewRequest);
      socket.off('ride_taken', handleRideTaken);
      socket.off('ride_status_update', handleRideStatusUpdate);
      socket.off('ride_cancelled', handleRideCancelled);
      socket.off('payment_received', handlePaymentReceived);
    };
  }, [activeRide?._id]);

  // 3. Countdown timer for incoming request cards
  useEffect(() => {
    if (incomingRequests.length === 0) return;
    const interval = setInterval(() => {
      setIncomingRequests((prev) =>
        prev
          .map((r) => ({ ...r, countdown: r.countdown - 1 }))
          .filter((r) => r.countdown > 0)
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [incomingRequests.length]);

  // 4. Live GPS location broadcasting while ride is active
  useEffect(() => {
    if (!activeRide || ['completed', 'cancelled_by_user', 'cancelled_by_rider'].includes(activeRide.status)) {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          const socket = getSocket();
          socket.emit('rider_location_update', {
            rideId: activeRide._id,
            lat,
            lng,
            riderId: user?._id,
          });
        },
        (err) => console.warn('GPS tracking error:', err),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );
    }

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [activeRide?.status]);

  // RiderDashboard.tsx — new effect, runs whenever rider is online (regardless of active ride)
  useEffect(() => {
    if (!profile?.isOnline) return;

    let idleWatchId: number | null = null;

    if (navigator.geolocation) {
      if ('wakeLock' in navigator) {
        (navigator as any).wakeLock.request('screen').catch(() => {});
      }
      let lastEmit = 0;
      idleWatchId = navigator.geolocation.watchPosition(
        (pos) => {
          const now = Date.now();
          if (now - lastEmit < 5000) return;
          lastEmit = now;
          const { latitude: lat, longitude: lng, accuracy } = pos.coords;
          // Push to REST endpoint (keeps RiderProfile.currentLocation.updatedAt fresh)
          api.put('/rider/location', { lat, lng, accuracy }).catch(() => {});
          // Also reflect immediately in local state so the idle location card
          // (and freshness timer) updates in real time, not just on next profile refetch
          setProfile((prev: any) => ({
            ...prev,
            currentLocation: { lat, lng, accuracy, coordinates: [lng, lat], updatedAt: new Date().toISOString() },
          }));
        },
        (err) => console.warn('Idle GPS heartbeat error:', err),
        { enableHighAccuracy: false, maximumAge: 5000, timeout: 10000 }
      );
    }

    return () => {
      if (idleWatchId != null) navigator.geolocation.clearWatch(idleWatchId);
    };
  }, [profile?.isOnline]);

  // Online / Offline Toggle
  const handleToggleOnline = async (checked: boolean) => {
    if (profile?.riderStatus !== 'active') {
      toast.error('Your profile is pending admin approval. You cannot go online yet.');
      return;
    }

    setTogglingOnline(true);
    try {
      await api.setRiderStatus(checked);
      setProfile((prev: any) => ({ ...prev, isOnline: checked }));
      window.dispatchEvent(new CustomEvent('provider_status_changed', {
        detail: { type: 'rider', isOnline: checked }
      }));

      const socket = getSocket();
      if (checked) {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              socket.emit('rider_go_online', {
                riderId: user?._id,
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
              });
            },
            () => {
              // If location denied, still emit go online
              socket.emit('rider_go_online', { riderId: user?._id });
            },
            { timeout: 5000 }
          );
        } else {
          socket.emit('rider_go_online', { riderId: user?._id });
        }
      } else {
        socket.emit('rider_go_offline', { riderId: user?._id });
      }
      toast.success(checked ? 'You are now Online and accepting rides' : 'You are now Offline');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update online status');
    } finally {
      setTogglingOnline(false);
    }
  };

  // Ride State Actions
  const handleAcceptRide = async (rideId: string) => {
    try {
      const res = await api.acceptRide(rideId);
      setActiveRide(res.ride);
      setIncomingRequests((prev) => prev.filter((r) => r.rideId !== rideId));
      setActiveTab('active');
      toast.success('Ride accepted! Navigate to pickup location.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to accept ride');
      setIncomingRequests((prev) => prev.filter((r) => r.rideId !== rideId));
    }
  };

  const handleDeclineRide = (rideId: string) => {
    setIncomingRequests((prev) => prev.filter((r) => r.rideId !== rideId));
  };

  const handleMarkArrived = async () => {
    if (!activeRide) return;
    try {
      const res = await api.markRideArrived(activeRide._id);
      setActiveRide(res.ride);
      toast.success('Status updated: Arrived at Pickup');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const handleStartTrip = async () => {
    if (!activeRide) return;
    try {
      const res = await api.startRide(activeRide._id);
      setActiveRide(res.ride);
      toast.success('Trip started! Drive safely.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to start trip');
    }
  };

  const handleCompleteTrip = async () => {
    if (!activeRide) return;
    try {
      const res = await api.completeRide(activeRide._id);
      setActiveRide(res.ride);
      toast.success('Trip completed! Waiting for payment settlement.');
      loadDashboardData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete trip');
    }
  };

  // Demo Withdrawal
  const handleWithdrawDemo = async () => {
    const amt = Number(withdrawAmount);
    if (!amt || amt <= 0) return toast.error('Enter valid amount');
    setWithdrawing(true);
    try {
      const res = await api.withdrawRiderDemo(amt);
      toast.success(res.message);
      setWithdrawModalOpen(false);
      setWithdrawAmount('');
      loadDashboardData();
    } catch (err: any) {
      toast.error(err.message || 'Withdrawal failed');
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Loading Driver Dashboard...</p>
        </div>
      </div>
    );
  }

  const isVerified = profile?.riderStatus === 'active';
  const isOnline = Boolean(profile?.isOnline);
  const vehicle = profile?.vehicleId || {};

  return (
    <div className="w-full space-y-6 pb-16">
      {/* Top Hero Driver Command Header */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Main Driver Identity Card */}
        <div className="lg:col-span-8 p-5 sm:p-6 rounded-3xl border border-border/80 bg-card shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative overflow-hidden">
          <div className="flex items-center gap-4 relative z-10">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-inner">
                <Car className="w-7 h-7" />
              </div>
              <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-card ${isOnline ? 'bg-primary animate-pulse' : 'bg-muted-foreground'}`} />
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-foreground tracking-tight">
                  {user?.name || 'Driver Partner'}
                </h1>
                <Badge
                  variant={isVerified ? 'default' : 'secondary'}
                  className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5"
                >
                  {isVerified ? '✓ Verified Captain' : profile?.riderStatus?.replace('_', ' ')}
                </Badge>
                <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary bg-primary/5">
                  ID: #{profile?._id?.slice(-6)?.toUpperCase() || 'RIDER'}
                </Badge>
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                  <Car className="w-3.5 h-3.5 text-primary" /> {vehicle.brand || 'Vehicle'} {vehicle.model || ''}
                </span>
                <span>•</span>
                <span className="font-mono bg-muted/50 px-2 py-0.5 rounded-md border text-foreground font-semibold">
                  {vehicle.rcNumber || 'Pending RC'}
                </span>
                <span>•</span>
                <span className="capitalize text-muted-foreground">{vehicle.type?.replace('_', ' ') || 'Cab'}</span>
              </div>
            </div>
          </div>

          {/* Online Toggle Switch Button with Status Glow */}
          <div className="flex items-center gap-3 bg-muted/40 p-3 rounded-2xl border border-border/70 self-start sm:self-auto relative z-10 shadow-sm">
            <div className="text-right">
              <div className="flex items-center justify-end gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-primary animate-pulse' : 'bg-muted-foreground'}`} />
                <p className="text-xs font-bold text-foreground">
                  {isOnline ? 'Active Online' : 'You are Offline'}
                </p>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {isOnline ? 'Listening for rides' : 'Switch ON to accept'}
              </p>
            </div>
            <Switch
              checked={isOnline}
              onCheckedChange={handleToggleOnline}
              disabled={!isVerified || togglingOnline}
              className="data-[state=checked]:bg-primary scale-110"
            />
          </div>
        </div>

        {/* Emergency Medical Transport Standby Duty Card */}
        <div className="lg:col-span-4 p-5 sm:p-6 rounded-3xl border border-destructive/25 bg-card shadow-sm flex flex-col justify-between gap-3 relative overflow-hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0 border border-destructive/20">
                <ShieldAlert className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <p className="font-bold text-sm text-foreground flex items-center gap-1.5">
                  Emergency Hospital Rides
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                  Urgent patient hospital transfers (2-min call window)
                </p>
              </div>
            </div>
            <Switch
              checked={Boolean(profile?.emergencySupport)}
              disabled={vehicle?.type === 'bike' || !isOnline || !isVerified}
              onCheckedChange={(v) => { setEmergencyPending(v); setEmergencyConfirm(true); }}
              className="data-[state=checked]:bg-destructive"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/60">
            <span className="text-muted-foreground">Mode:</span>
            <span className="font-semibold text-foreground">
              {profile?.emergencySupport ? '🚨 Medical Priority Standby' : 'Standard Cab Rides Only'}
            </span>
          </div>
        </div>
      </div>
      <EmergencyToggleConfirm open={emergencyConfirm} turningOn={emergencyPending}
        onConfirm={confirmEmergencyToggle} onCancel={() => setEmergencyConfirm(false)} />

      {/* Verification Notice Banner (if pending) */}
      {!isVerified && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-center gap-3.5">
          <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
          <div className="flex-1">
            <h4 className="font-bold text-sm text-amber-950 dark:text-amber-200">
              Documents Under Admin Review
            </h4>
            <p className="text-xs text-amber-800/90 dark:text-amber-300/80 mt-0.5">
              Your driver license and vehicle documents are being reviewed by FindMedi Admin (usually within 24–48 hours). Once verified, you can go Online.
            </p>
          </div>
        </div>
      )}

      {/* Overview Dashboard (When activeTab === 'overview' or default) */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Colorful Welcome Hero Banner (like user dashboard) */}
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

          {/* Quick Hub Grid (Shortcuts to Deep Tabs) */}
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
                <p className="text-[11px] text-muted-foreground mt-0.5">{vehicle.brand || 'Vehicle'} · {vehicle.rcNumber || 'Verified'}</p>
              </div>
            </button>
          </div>

          {/* ── CHARTS & ANALYTICS SECTION ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* 7 Cols: Weekly Earnings & Rides Activity Area Chart */}
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

            {/* 4 Cols: Trip Category Distribution & Target Progress */}
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
      )}

      {/* TAB CONTENT: 2. RIDE REQUESTS (LIVE) */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/rider/dashboard')}
                className="rounded-xl h-8 px-2.5 text-xs gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
              </Button>
              <h3 className="font-bold text-base text-foreground">Live Incoming Requests</h3>
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              Status: {isOnline ? '🟢 Listening for requests' : '🔴 You are Offline'}
            </span>
          </div>

          {incomingRequests.length === 0 ? (
            <div className="rounded-2xl border border-border/80 bg-card p-12 text-center space-y-3">
              <Clock className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="font-semibold text-sm text-foreground">No pending ride requests right now</p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                {isOnline
                  ? 'Keep this dashboard open. You will be notified as soon as someone books in your area.'
                  : 'Turn on the switch at the top to start receiving ride requests.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {incomingRequests.map((req) => (
                <motion.div
                  key={req.rideId}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`rounded-2xl p-5 border shadow-md space-y-4 ${
                    req.isEmergency
                      ? 'border-red-500 bg-red-500/10 ring-2 ring-red-500/30'
                      : 'border-border/80 bg-card'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {req.isEmergency && (
                          <Badge variant="destructive" className="animate-pulse text-[10px]">
                            EMERGENCY PRIORITY
                          </Badge>
                        )}
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {req.bookingNumber}
                        </Badge>
                        {req.priorityRank != null && (
                          <Badge
                            className={`text-[10px] font-semibold ${
                              req.priorityRank === 1
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-primary/15 text-primary border border-primary/20'
                            }`}
                          >
                            {req.priorityRank === 1 ? '⭐ Nearest Driver' : `#${req.priorityRank} in Queue`}
                          </Badge>
                        )}
                      </div>
                      <h4 className="font-bold text-base text-foreground mt-1 capitalize">
                        {req.vehicleType?.replace('_', ' ')} Booking
                      </h4>
                    </div>

                    <div className="text-right">
                      <span className="text-xl font-extrabold text-foreground">
                        ₹{req.estimatedFare}
                      </span>
                      <div className="text-[11px] font-mono font-bold text-destructive flex items-center justify-end gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>00:{String(req.countdown).padStart(2, '0')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    {req.riderDistanceKm != null && (
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-lg w-fit border border-primary/20">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                        <span>Pickup is {req.riderDistanceKm} km away from you</span>
                      </div>
                    )}
                    <p className="text-muted-foreground truncate">
                      <span className="text-primary font-bold mr-1">Pickup:</span>
                      {req.pickup?.address}
                    </p>
                    <p className="text-muted-foreground truncate">
                      <span className="text-destructive font-bold mr-1">Drop:</span>
                      {req.drop?.address}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Trip Distance: {req.distanceKm || 0} km
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeclineRide(req.rideId)}
                      className="rounded-xl text-xs h-9 text-muted-foreground"
                    >
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleAcceptRide(req.rideId)}
                      className="rounded-xl text-xs h-9 font-bold bg-primary text-primary-foreground"
                    >
                      Accept Ride
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: 3. ACTIVE RIDE */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/rider/dashboard')}
                className="rounded-xl h-8 px-2.5 text-xs gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
              </Button>
              <h3 className="font-bold text-base text-foreground">Active Ride Navigation</h3>
            </div>
            {activeRide && (
              <Badge variant="default" className="text-xs uppercase font-bold">
                {activeRide.status?.replace(/_/g, ' ')}
              </Badge>
            )}
          </div>

          {!activeRide ? (
              <div className="rounded-2xl border border-border/80 bg-card p-12 text-center space-y-3">
                <Navigation className="w-10 h-10 text-muted-foreground mx-auto" />
                <p className="font-semibold text-sm text-foreground">No active ride right now</p>
                <p className="text-xs text-muted-foreground">
                  Accepted rides will appear here with live route navigation and passenger details.
                </p>

                {/* Location status indicator — shows even when idle, so the rider knows
                    whether their GPS is being tracked for emergency/ride matching */}
                <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-4 py-2 text-xs">
                  {profile?.currentLocation?.coordinates?.length ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      <span className="text-foreground font-medium">
                        Location active: {profile.currentLocation.lat?.toFixed(4)}, {profile.currentLocation.lng?.toFixed(4)}
                      </span>
                      {profile.currentLocation.updatedAt && (
                        <span className="text-muted-foreground">
                          (updated {Math.max(0, Math.round((Date.now() - new Date(profile.currentLocation.updatedAt).getTime()) / 1000))}s ago)
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-destructive" />
                      <span className="text-destructive font-medium">
                        Location not available — enable GPS to receive ride/emergency requests
                      </span>
                    </>
                  )}
                </div>
              </div>
            ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Trip Controls Panel */}
              <div className="lg:col-span-5 rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="font-mono text-xs">
                    {activeRide.bookingNumber}
                  </Badge>
                  <Badge variant="default" className="text-xs capitalize font-bold">
                    {activeRide.status?.replace(/_/g, ' ')}
                  </Badge>
                </div>

                {/* Passenger details */}
                <div className="p-3.5 rounded-xl border bg-muted/30 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Passenger</p>
                    <p className="font-bold text-foreground text-sm">
                      {activeRide.userId?.name || 'Customer'}
                    </p>
                  </div>

                  {activeRide.userId?.phone && (
                    <Button asChild size="sm" variant="outline" className="rounded-xl text-xs gap-1.5">
                      <a href={`tel:${activeRide.userId.phone}`}>
                        <Phone className="w-3.5 h-3.5 text-primary" /> Call
                      </a>
                    </Button>
                  )}
                </div>

                {/* Route */}
                <div className="space-y-2 text-xs">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-primary">Pickup</p>
                    <p className="text-foreground font-medium">{activeRide.pickup?.address}</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-[10px] font-bold uppercase text-destructive">Destination</p>
                    <p className="text-foreground font-medium">{activeRide.drop?.address}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t text-sm font-bold">
                  <span>Fare Total</span>
                  <span className="text-lg text-primary">₹{activeRide.fare?.total || 0}</span>
                </div>

                {/* State Machine Transition Buttons */}
                <div className="space-y-2 pt-2">
                  {activeRide.status === 'accepted' && (
                    <Button
                      onClick={handleMarkArrived}
                      className="w-full h-11 rounded-xl text-xs font-bold gap-2 bg-primary text-primary-foreground"
                    >
                      <MapPin className="w-4 h-4" />
                      Mark Arrived at Pickup
                    </Button>
                  )}

                  {activeRide.status === 'arrived' && (
                    <Button
                      onClick={handleStartTrip}
                      className="w-full h-11 rounded-xl text-xs font-bold gap-2 bg-primary text-primary-foreground"
                    >
                      <Navigation className="w-4 h-4" />
                      Start Trip (Heading to Dropoff)
                    </Button>
                  )}

                  {activeRide.status === 'in_progress' && (
                    <Button
                      onClick={handleCompleteTrip}
                      className="w-full h-11 rounded-xl text-xs font-bold gap-2 bg-primary text-primary-foreground"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Complete Ride & Finalize Fare
                    </Button>
                  )}

                  {activeRide.status === 'completed' && (
                    <div className="rounded-xl bg-primary/10 border border-primary/30 p-3 text-center space-y-1">
                      <CheckCircle2 className="w-6 h-6 text-primary mx-auto" />
                      <p className="font-bold text-xs text-foreground">Ride Completed!</p>
                      <p className="text-[11px] text-muted-foreground">
                        {activeRide.payment?.status === 'paid'
                          ? `Payment of ₹${activeRide.fare?.total} settled via ${activeRide.payment.method}`
                          : 'Awaiting passenger payment completion...'}
                      </p>
                    </div>
                  )}

                  {/* External Google Maps navigation shortcut */}
                  {activeRide.drop?.lat && (
                    <Button
                      asChild
                      variant="outline"
                      className="w-full rounded-xl text-xs h-9 gap-1.5 border-border/80"
                    >
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${activeRide.drop.lat},${activeRide.drop.lng}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Open Google Maps Directions
                      </a>
                    </Button>
                  )}
                </div>
              </div>

              {/* Map */}
              <div className="lg:col-span-7 h-[450px] sm:h-[550px]">
                <RideMap
                  pickup={activeRide.pickup}
                  drop={activeRide.drop}
                  riderLocation={profile?.currentLocation}
                  vehicleType={activeRide.vehicleType}
                  isEmergency={activeRide.isEmergency}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: 4. RIDE HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/rider/dashboard')}
                className="rounded-xl h-8 px-2.5 text-xs gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
              </Button>
              <h3 className="font-bold text-base text-foreground">Completed Rides History</h3>
            </div>
            <span className="text-xs text-muted-foreground">Total: {historyRides.length} rides</span>
          </div>

          <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm">
          {historyRides.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground">
              No completed trips in history yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border/80 text-muted-foreground uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Booking #</th>
                    <th className="py-3 px-4">Passenger</th>
                    <th className="py-3 px-4">Distance</th>
                    <th className="py-3 px-4">Gross Fare</th>
                    <th className="py-3 px-4">Your Earning ({earnings?.commissionPct != null ? `${100 - earnings.commissionPct}%` : '90%'})</th>
                    <th className="py-3 px-4">Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {historyRides.map((ride) => (
                    <tr key={ride._id} className="hover:bg-muted/30">
                      <td className="py-3.5 px-4 font-mono text-muted-foreground">
                        {new Date(ride.createdAt).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                        {ride.bookingNumber}
                      </td>
                      <td className="py-3.5 px-4 text-foreground font-medium">
                        {ride.userId?.name || 'Passenger'}
                      </td>
                      <td className="py-3.5 px-4">{ride.distanceKm || 0} km</td>
                      <td className="py-3.5 px-4 font-bold text-foreground">
                        ₹{ride.fare?.total || 0}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-success">
                        ₹{Math.round((ride.fare?.total || 0) * 0.9)}
                      </td>
                      <td className="py-3.5 px-4">
                        {ride.ratingByUser?.stars ? (
                          <span className="flex items-center gap-1 text-amber-600 font-semibold">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                            {ride.ratingByUser.stars}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </div>
      )}

      {/* TAB CONTENT: 5. EARNINGS & DEMO PAYOUT */}
      {activeTab === 'earnings' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/rider/dashboard')}
                className="rounded-xl h-8 px-2.5 text-xs gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
              </Button>
              <h3 className="font-bold text-base text-foreground">Earnings & Payout Overview</h3>
            </div>
            <Button
              size="sm"
              onClick={() => setWithdrawModalOpen(true)}
              className="rounded-xl text-xs font-bold gap-1.5 h-8"
            >
              <Wallet className="w-3.5 h-3.5" /> Withdraw Balance
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Total Lifetime Earnings</p>
              <p className="text-3xl font-extrabold text-foreground">
                ₹{earnings?.totalEarnings || 0}
              </p>
            </div>

            <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-1">
              <p className="text-xs text-muted-foreground font-medium">This Month Net Payable</p>
              <p className="text-3xl font-extrabold text-success">
                ₹{earnings?.monthNet || 0}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Platform Commission (10%): -₹{earnings?.platformCommissionMonth || 0}
              </p>
            </div>

            <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-3">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Available Wallet Balance</p>
                <p className="text-3xl font-extrabold text-primary">
                  ₹{earnings?.walletBalance || 0}
                </p>
              </div>

              <Button
                onClick={() => setWithdrawModalOpen(true)}
                className="w-full rounded-xl text-xs font-bold gap-1.5 h-10 shadow-sm"
              >
                <Wallet className="w-4 h-4" /> Withdraw (Demo Payout)
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-3">
            <h4 className="font-bold text-sm text-foreground">Settlement Bank & UPI Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <p className="text-muted-foreground">Account Holder</p>
                <p className="font-semibold text-foreground mt-0.5">
                  {profile?.bankDetails?.accountHolder || user?.name}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Account Number</p>
                <p className="font-mono font-semibold text-foreground mt-0.5">
                  {profile?.bankDetails?.accountNumber || '••••••••••••'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">IFSC / UPI ID</p>
                <p className="font-mono font-semibold text-foreground mt-0.5">
                  {profile?.bankDetails?.upiId || profile?.bankDetails?.ifsc || 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 6. VEHICLE DETAILS */}
      {activeTab === 'vehicle' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/rider/dashboard')}
              className="rounded-xl h-8 px-2.5 text-xs gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </Button>
            <h3 className="font-bold text-base text-foreground">Registered Vehicle Information</h3>
          </div>

          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <p className="text-muted-foreground">Vehicle Type</p>
                <p className="font-bold text-foreground capitalize mt-0.5">
                  {vehicle.type?.replace('_', ' ')}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Brand & Model</p>
                <p className="font-semibold text-foreground mt-0.5">
                  {vehicle.brand} {vehicle.model}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Registration Number (RC No.)</p>
                <p className="font-mono font-bold text-primary mt-0.5">
                  {vehicle.rcNumber}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Fuel Type</p>
                <p className="font-medium text-foreground mt-0.5">{vehicle.fuelType || 'Petrol'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Passenger Capacity</p>
                <p className="font-medium text-foreground mt-0.5">{vehicle.capacity || 4} seats</p>
              </div>
              <div>
                <p className="text-muted-foreground">Verification Status</p>
                <Badge variant={vehicle.isDocumentVerified ? 'default' : 'secondary'} className="mt-1 text-[10px]">
                  {vehicle.isDocumentVerified ? 'Verified by Admin' : 'Pending Verification'}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 7. DOCUMENTS & KYC */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/rider/dashboard')}
              className="rounded-xl h-8 px-2.5 text-xs gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </Button>
            <h3 className="font-bold text-base text-foreground">Documents & Compliance KYC</h3>
          </div>

          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-4">
            <div className="divide-y divide-border/60 text-xs">
              <div className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">Driving License (DL)</p>
                  <p className="text-muted-foreground">No: {profile?.drivingLicenseNumber || 'N/A'}</p>
                </div>
                <Badge variant={isVerified ? 'default' : 'secondary'}>
                  {isVerified ? 'Verified' : 'Under Review'}
                </Badge>
              </div>

              <div className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">Government ID ({profile?.govtIdType || 'Aadhaar'})</p>
                  <p className="text-muted-foreground">No: {profile?.govtIdNumber || 'N/A'}</p>
                </div>
                <Badge variant={isVerified ? 'default' : 'secondary'}>
                  {isVerified ? 'Verified' : 'Under Review'}
                </Badge>
              </div>

              <div className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">Vehicle Registration Certificate (RC)</p>
                  <p className="text-muted-foreground">RC No: {vehicle.rcNumber || 'N/A'}</p>
                </div>
                <Badge variant={vehicle.isDocumentVerified ? 'default' : 'secondary'}>
                  {vehicle.isDocumentVerified ? 'Verified' : 'Under Review'}
                </Badge>
              </div>
              <RiderDocReupload onDone={() => loadDashboardData()} />
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 8. REVIEWS & RATINGS */}
      {activeTab === 'ratings' && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/rider/dashboard')}
              className="rounded-xl h-8 px-2.5 text-xs gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </Button>
            <h3 className="font-bold text-base text-foreground">Customer Reviews & Ratings</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Overall Rating</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-3xl font-extrabold text-foreground">
                  {earnings?.rating?.avg ? Number(earnings.rating.avg).toFixed(1) : '5.0'}
                </span>
                <div className="flex items-center text-amber-500">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-4 h-4 fill-amber-500 text-amber-500" />
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Based on {earnings?.rating?.count || historyRides.filter((r) => r.ratingByUser?.stars).length || 12} reviews
              </p>
            </div>

            <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-1">
              <p className="text-xs text-muted-foreground font-medium">On-Time Arrival</p>
              <p className="text-3xl font-extrabold text-primary">98.4%</p>
              <p className="text-[11px] text-muted-foreground">Pickup within estimated time</p>
            </div>

            <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Safe Driver Badge</p>
              <div className="flex items-center gap-2 mt-1">
                <ShieldCheck className="w-6 h-6 text-primary" />
                <span className="font-bold text-sm text-foreground">Gold Certified</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Zero passenger safety complaints</p>
            </div>
          </div>

          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              Recent Passenger Reviews
            </h3>

            {historyRides.filter((r) => r.ratingByUser?.stars).length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Star className="w-8 h-8 text-muted-foreground mx-auto" />
                <p className="text-sm font-semibold text-foreground">No customer ratings yet</p>
                <p className="text-xs text-muted-foreground">Complete more rides to receive ratings and reviews.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {historyRides
                  .filter((r) => r.ratingByUser?.stars)
                  .map((ride) => (
                    <div key={ride._id} className="py-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                            {ride.userId?.name?.charAt(0) || 'P'}
                          </div>
                          <div>
                            <p className="font-bold text-xs text-foreground">{ride.userId?.name || 'Passenger'}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              Trip #{ride.bookingNumber} · {new Date(ride.createdAt).toLocaleDateString('en-IN')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-amber-500 font-bold text-xs">
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          <span>{ride.ratingByUser.stars}.0</span>
                        </div>
                      </div>
                      {ride.ratingByUser?.comment && (
                        <p className="text-xs text-muted-foreground pl-10 italic">
                          "{ride.ratingByUser.comment}"
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: 9. SETTINGS & PREFERENCES */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/rider/dashboard')}
              className="rounded-xl h-8 px-2.5 text-xs gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </Button>
            <h3 className="font-bold text-base text-foreground">Rider Settings & Preferences</h3>
          </div>

          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Driver Profile Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-muted-foreground block mb-1">Full Name</label>
                <Input value={user?.name || ''} disabled className="rounded-xl h-10" />
              </div>
              <div>
                <label className="text-muted-foreground block mb-1">Mobile Number</label>
                <Input value={user?.phone || profile?.phone || ''} disabled className="rounded-xl h-10" />
              </div>
              <div>
                <label className="text-muted-foreground block mb-1">Registered Email</label>
                <Input value={user?.email || ''} disabled className="rounded-xl h-10" />
              </div>
              <div>
                <label className="text-muted-foreground block mb-1">Operating City</label>
                <Input value={profile?.city || user?.city || 'Jabalpur'} disabled className="rounded-xl h-10" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <Settings className="w-4 h-4 text-primary" />
              Ride Preferences & Safety
            </h3>
            <RiderOpsSettings profile={profile} onSaved={(s) => setProfile((p: any) => (p ? { ...p, settings: s } : p))} />
            <div className="divide-y divide-border/60 text-xs">
              <div className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">Auto-Accept Ride Inquiries</p>
                  <p className="text-muted-foreground">Automatically accept high-priority nearby emergency bookings.</p>
                </div>
                <Switch defaultChecked={false} />
              </div>
              <div className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">Sound & Caller Ringtone Alerts</p>
                  <p className="text-muted-foreground">Play caller ringtone when full-screen ride request arrives.</p>
                </div>
                <Switch defaultChecked={true} />
              </div>
              <div className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">High-Accuracy GPS Heartbeat</p>
                  <p className="text-muted-foreground">Broadcast live vehicle telemetry to passengers while in-transit.</p>
                </div>
                <Switch defaultChecked={true} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DEMO WITHDRAW MODAL */}
      <Dialog open={withdrawModalOpen} onOpenChange={setWithdrawModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">Demo Withdrawal</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Simulate transferring your driver earnings to your registered bank account or UPI ID.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 rounded-xl bg-muted/40 text-xs">
              <span className="text-muted-foreground">Available to withdraw: </span>
              <span className="font-bold text-foreground">₹{earnings?.walletBalance || 0}</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Withdrawal Amount (₹)
              </label>
              <Input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Enter amount (e.g. 500)"
                className="h-10 text-sm rounded-xl"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setWithdrawModalOpen(false)}
                className="flex-1 rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={handleWithdrawDemo}
                disabled={withdrawing || !withdrawAmount}
                className="flex-1 rounded-xl text-xs font-bold"
              >
                {withdrawing ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                Confirm (Demo)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* FULL-SCREEN ride / emergency call modal (120s / 2-minute timer with ringtone) */}
      {activeIncomingRideCall && (
        <ProviderIncomingCall
          key={activeIncomingRideCall.rideId}
          data={{
            requestId: activeIncomingRideCall.rideId,
            providerType: activeIncomingRideCall.isEmergency ? 'ambulance' : 'rider',
            category: activeIncomingRideCall.vehicleType?.replace('_', ' ') || 'Ride Request',
            title: activeIncomingRideCall.isEmergency
              ? '🚨 Emergency Ride Request'
              : `${activeIncomingRideCall.vehicleType?.replace('_', ' ')?.toUpperCase() || 'CAB'} Ride Request`,
            subtitle: `Passenger waiting for pickup confirmation (${activeIncomingRideCall.bookingNumber || 'Ride'}). Respond within 2 minutes.`,
            patient: {
              name: activeIncomingRideCall.userName || 'Passenger',
              phone: activeIncomingRideCall.userPhone || 'App Connect',
            },
            location: {
              pickupAddress: activeIncomingRideCall.pickup?.address || 'Pickup Location',
              dropAddress: activeIncomingRideCall.drop?.address || 'Drop Location',
              address: activeIncomingRideCall.pickup?.address,
            },
            distanceKm: activeIncomingRideCall.distanceKm || activeIncomingRideCall.riderDistanceKm,
            amount: activeIncomingRideCall.estimatedFare ? `₹${activeIncomingRideCall.estimatedFare}` : undefined,
            windowSeconds: activeIncomingRideCall.countdown || 120,
            serviceBadges: [
              activeIncomingRideCall.vehicleType?.replace('_', ' ') || 'Vehicle',
              activeIncomingRideCall.priorityRank === 1 ? '⭐ Nearest Driver' : 'Nearby Driver',
              activeIncomingRideCall.distanceKm ? `${activeIncomingRideCall.distanceKm} km trip` : '',
            ].filter(Boolean),
          }}
          onAccept={(id) => handleAcceptRide(id)}
          onReject={(id) => handleDeclineRide(id)}
          onTimeout={(id) => handleDeclineRide(id)}
        />
      )}
    </div>
  );
}

// R-9: real KYC re-upload (was a fake success toast with no upload).
function RiderDocReupload({ onDone }: { onDone: () => void }) {
  const [docType, setDocType] = useState('drivingLicense');
  const [uploading, setUploading] = useState(false);
  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const u: any = await api.uploadPublicDocument(file);
      const url = u?.url || u?.path || '';
      if (!url) throw new Error('Upload returned no URL');
      await api.uploadRiderDocument({ docType, docUrl: url });
      toast.success('Document uploaded for verification');
      onDone();
    } catch (err: any) {
      toast.error(err.message || 'Document upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };
  return (
    <div className="pt-3 border-t space-y-2">
      <label className="text-xs font-semibold">Re-upload rejected document</label>
      <div className="flex gap-2">
        <select value={docType} onChange={(e) => setDocType(e.target.value)} className="h-9 rounded-xl border text-xs bg-background px-2">
          <option value="drivingLicense">Driving Licence</option>
          <option value="govtId">Government ID</option>
          <option value="rc">RC</option>
          <option value="insurance">Insurance</option>
        </select>
        <input type="file" accept="image/*,.pdf" disabled={uploading} onChange={upload} className="w-full text-xs" />
      </div>
      {uploading && <p className="text-[11px] text-muted-foreground">Uploading...</p>}
    </div>
  );
}

// §8 rider ops master — controlled inputs persisted via PUT /rider/profile {settings}.
function RiderOpsSettings({ profile, onSaved }: { profile: any; onSaved: (s: any) => void }) {
  const st = profile?.settings || {};
  const [standby, setStandby] = useState(profile?.emergencySupport ?? false);
  const [waitPolicy, setWaitPolicy] = useState(st.waitMinutes != null ? `${st.waitMinutes}|${st.noShowFee ?? 50}` : '5|50');
  const [lateRefund, setLateRefund] = useState(st.lateRefund !== false);
  const [acFit, setAcFit] = useState(st.acAvailable && st.wheelchairFit ? 'both' : st.acAvailable ? 'ac' : 'none');
  const [scope, setScope] = useState(st.transferScope || 'local');
  const [upi, setUpi] = useState(st.payoutUpi || profile?.bankDetails?.upiId || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const s2 = profile?.settings || {};
    setStandby(profile?.emergencySupport ?? false);
    if (s2.waitMinutes != null) setWaitPolicy(`${s2.waitMinutes}|${s2.noShowFee ?? 50}`);
    setLateRefund(s2.lateRefund !== false);
    setAcFit(s2.acAvailable && s2.wheelchairFit ? 'both' : s2.acAvailable ? 'ac' : 'none');
    setScope(s2.transferScope || 'local');
    setUpi(s2.payoutUpi || profile?.bankDetails?.upiId || '');
  }, [profile?._id]);

  const save = async () => {
    const [waitMinutes, noShowFee] = waitPolicy.split('|').map(Number);
    setSaving(true);
    try {
      const res: any = await api.updateRiderProfile({
        emergencySupport: standby,
        bankDetails: { upiId: upi },
        settings: {
          waitMinutes: waitMinutes || 0,
          noShowFee: noShowFee || 0,
          lateRefund,
          acAvailable: acFit === 'both' || acFit === 'ac',
          wheelchairFit: acFit === 'both',
          transferScope: scope,
          payoutUpi: upi,
        },
      });
      toast.success('Rider settings saved');
      onSaved(res.rider?.settings || res.settings);
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border p-3">
      <label className="flex items-center gap-2 text-xs font-semibold">
        <input type="checkbox" checked={standby} onChange={(e) => setStandby(e.target.checked)} className="rounded" />
        Emergency Medical Standby (1.25x)
      </label>
      <div>
        <label className="text-xs font-semibold">Wait/No-show Policy</label>
        <select value={waitPolicy} onChange={(e) => setWaitPolicy(e.target.value)} className="w-full h-9 rounded-xl border text-xs bg-background">
          <option value="5|50">5 min wait; ₹50 no-show</option>
          <option value="10|0">10 min wait; no fee</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-xs font-semibold">
        <input type="checkbox" checked={lateRefund} onChange={(e) => setLateRefund(e.target.checked)} className="rounded" />
        100% refund if driver &gt;10m late
      </label>
      <div>
        <label className="text-xs font-semibold">AC / Wheelchair Trunk</label>
        <select value={acFit} onChange={(e) => setAcFit(e.target.value)} className="w-full h-9 rounded-xl border text-xs bg-background">
          <option value="both">AC + wheelchair fit</option>
          <option value="ac">AC only</option>
          <option value="none">Non-AC</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-semibold">Transfer Radius</label>
        <select value={scope} onChange={(e) => setScope(e.target.value)} className="w-full h-9 rounded-xl border text-xs bg-background">
          <option value="local">Local 15 km</option>
          <option value="regional">Regional 50 km</option>
          <option value="intercity">Inter-city</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-semibold">Settlement UPI / Account</label>
        <input value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="UPI / Account + IFSC" className="w-full h-9 rounded-xl border px-3 text-xs bg-background" />
      </div>
      <div className="sm:col-span-2 flex justify-end">
        <Button size="sm" onClick={save} disabled={saving} className="rounded-xl text-xs">
          {saving ? 'Saving...' : 'Save ride preferences'}
        </Button>
      </div>
    </div>
  );
}
