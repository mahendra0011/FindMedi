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
import { RiderOverviewTab } from '@/components/rider/RiderOverviewTab';
import { RiderRequestsTab } from '@/components/rider/RiderRequestsTab';
import { RiderActiveRideTab } from '@/components/rider/RiderActiveRideTab';
import { RiderHistoryTab } from '@/components/rider/RiderHistoryTab';
import { RiderEarningsTab } from '@/components/rider/RiderEarningsTab';
import { RiderVehicleTab } from '@/components/rider/RiderVehicleTab';
import { RiderDocumentsTab } from '@/components/rider/RiderDocumentsTab';
import { RiderRatingsTab } from '@/components/rider/RiderRatingsTab';
import { RiderSettingsTab } from '@/components/rider/RiderSettingsTab';
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

    // Wave-based instant dispatch alert (H3 radius expand engine)
    const handleInstantRideAlert = (payload: any) => {
      const normalized = {
        rideId: payload.requestId || payload.rideId,
        bookingNumber: payload.bookingNumber,
        vehicleType: payload.vehicleType || payload.type,
        isEmergency: payload.isEmergency,
        pickup: payload.pickup || payload.location,
        drop: payload.drop,
        distanceKm: payload.distanceKm,
        estimatedFare: payload.amount || payload.estimatedFare || 0,
        durationMin: payload.durationMin,
        countdown: payload.windowSeconds || 30,
        priorityRank: payload.priorityRank,
        userName: payload.userName,
        userPhone: payload.userPhone,
        isInstantWave: true,
      };
      setIncomingRequests((prev) => {
        if (prev.some((r) => r.rideId === normalized.rideId)) return prev;
        return [normalized, ...prev];
      });
    };

    if (activeRide?._id) {
      socket.emit('join_ride_room', { rideId: activeRide._id });
    }

    socket.on('new_ride_request', handleNewRequest);
    socket.on('ride:alert', handleInstantRideAlert);
    socket.on('ride_taken', handleRideTaken);
    socket.on('ride_status_update', handleRideStatusUpdate);
    socket.on('ride_cancelled', handleRideCancelled);
    socket.on('payment_received', handlePaymentReceived);

    return () => {
      if (activeRide?._id) {
        socket.emit('leave_ride_room', { rideId: activeRide._id });
      }
      socket.off('new_ride_request', handleNewRequest);
      socket.off('ride:alert', handleInstantRideAlert);
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

  const handleStartTrip = async (otp?: string) => {
    if (!activeRide) return;
    try {
      const res = await api.startRide(activeRide._id, otp ? { otp } : {});
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
        <RiderOverviewTab
          user={user}
          profile={profile}
          vehicle={vehicle}
          isOnline={isOnline}
          isVerified={isVerified}
          earnings={earnings}
          activeRide={activeRide}
          incomingRequests={incomingRequests}
          historyRides={historyRides}
          setEmergencyConfirm={setEmergencyConfirm}
          setWithdrawModalOpen={setWithdrawModalOpen}
          navigate={navigate}
        />
      )}

      {/* TAB CONTENT: 2. RIDE REQUESTS (LIVE) */}
      {activeTab === 'requests' && (
        <RiderRequestsTab
          isOnline={isOnline}
          incomingRequests={incomingRequests}
          handleAcceptRide={handleAcceptRide}
          handleDeclineRide={handleDeclineRide}
          navigate={navigate}
        />
      )}

      {/* TAB CONTENT: 3. ACTIVE RIDE */}
      {activeTab === 'active' && (
        <RiderActiveRideTab
          activeRide={activeRide}
          profile={profile}
          handleMarkArrived={handleMarkArrived}
          handleStartTrip={handleStartTrip}
          handleCompleteTrip={handleCompleteTrip}
          navigate={navigate}
        />
      )}

      {/* TAB CONTENT: 4. RIDE HISTORY */}
      {activeTab === 'history' && (
        <RiderHistoryTab
          historyRides={historyRides}
          earnings={earnings}
          navigate={navigate}
        />
      )}

      {/* TAB CONTENT: 5. EARNINGS & DEMO PAYOUT */}
      {activeTab === 'earnings' && (
        <RiderEarningsTab
          earnings={earnings}
          profile={profile}
          user={user}
          setWithdrawModalOpen={setWithdrawModalOpen}
          navigate={navigate}
        />
      )}

      {/* TAB CONTENT: 6. VEHICLE DETAILS */}
      {activeTab === 'vehicle' && (
        <RiderVehicleTab
          vehicle={vehicle}
          navigate={navigate}
        />
      )}

      {/* TAB CONTENT: 7. DOCUMENTS & KYC */}
      {activeTab === 'documents' && (
        <RiderDocumentsTab
          profile={profile}
          vehicle={vehicle}
          isVerified={isVerified}
          loadDashboardData={loadDashboardData}
          navigate={navigate}
        />
      )}

      {/* TAB CONTENT: 8. REVIEWS & RATINGS */}
      {activeTab === 'ratings' && (
        <RiderRatingsTab
          earnings={earnings}
          historyRides={historyRides}
          navigate={navigate}
        />
      )}

      {/* TAB CONTENT: 9. SETTINGS & PREFERENCES */}
      {activeTab === 'settings' && (
        <RiderSettingsTab
          user={user}
          profile={profile}
          setProfile={setProfile}
          navigate={navigate}
        />
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
