import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  FlaskConical,
  IndianRupee,
  Star,
  TrendingUp,
  Bike,
  Wifi,
  WifiOff,
  MapPin,
  Clock,
  Phone,
  Navigation,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Award,
  Wallet,
  ArrowUpRight,
  ExternalLink,
  Flame,
  Zap,
  ChevronRight,
  RefreshCw,
  QrCode,
  Building2,
  Calendar,
  Layers,
  Send,
  BellRing
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { getSocket, joinRoom } from '@/lib/socket';
import { Link } from 'react-router-dom';
import ProviderIncomingCall from '@/components/emergency/ProviderIncomingCall';

const LAB_TYPES = ['lab_report', 'lab_sample'];
const isLabTask = (d) => LAB_TYPES.includes(d?.serviceType);
const taskFee = (d) => d?.deliveryFee || d?.orderRef?.deliveryFee || 50;
const taskTitle = (d) => (isLabTask(d) ? 'Lab Report' : 'Medicine');
const taskContact = (d) => d?.patientPhone || d?.orderRef?.phone || '';
const taskBadges = (d) => (isLabTask(d) ? ['Lab Report', 'Diagnostic Parcel'] : ['Express Delivery', 'Prescription Parcel']);

export default function DeliveryDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [deliveries, setDeliveries] = useState<{ active: any[]; history: any[] }>({ active: [], history: [] });
  const [deliveryTab, setDeliveryTab] = useState<'active' | 'history' | 'lab'>('active');
  const labActive = deliveries.active.filter(isLabTask);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [otpInput, setOtpInput] = useState<{ [deliveryId: string]: string }>({});
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  // Incoming delivery request call state (2-min incoming call modal)
  const [activeIncomingCall, setActiveIncomingCall] = useState<any | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    loadData();

    const socket = getSocket();
    const cleanupJoin = joinRoom('join', user.id);

    // Listen to new delivery assignment / broadcast
    const handleNewDelivery = (payload: any) => {
      const delivery = payload.delivery || payload;
      setActiveIncomingCall(delivery);
      loadData(true);
    };

    const handleDeliveryStatus = () => {
      loadData(true);
    };

    socket.on('delivery:new_assignment', handleNewDelivery);
    socket.on('delivery:status', handleDeliveryStatus);
    deliveries.active.forEach((d) => {
      if (d.orderId) socket.emit('join', `order:${d.orderId}`);
    });

    return () => {
      socket.off('delivery:new_assignment', handleNewDelivery);
      socket.off('delivery:status', handleDeliveryStatus);
      cleanupJoin?.();
    };
  }, [user?.id]);

  // GPS Live Location Beacon while on duty
  useEffect(() => {
    if (!profile?._id || !profile?.isOnline) return;
    const socket = getSocket();
    let watchId: number | null = null;

    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          socket.emit('deliveryboy:location', {
            deliveryPartnerId: profile._id,
            orderId: deliveries.active[0]?._id,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        (err) => console.warn('GPS location tracking notice:', err),
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
      );
    }
    return () => {
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
    };
  }, [profile?._id, profile?.isOnline, deliveries.active]);

  const [loadError, setLoadError] = useState(null);

  const loadData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setLoadError(null);
    try {
      const [prof, dels] = await Promise.all([
        api.get('/delivery-partners/profile/me').catch(() => null),
        api.get('/delivery-partners/my-deliveries').catch(() => ({ active: [], history: [] })),
      ]);
      if (!prof) {
        setLoadError('Delivery profile nahi mila. Retry karo ya KYC check karo.');
      }
      setProfile(prof);
      setDeliveries({
        active: dels?.active || [],
        history: dels?.history || [],
      });
    } catch {
      toast.error('Failed to sync live delivery data');
    }
    setLoading(false);
    setRefreshing(false);
  };

  const toggleOnline = async (onlineState: boolean) => {
    if (!profile?._id) return;
    try {
      await api.put(`/delivery-partners/profile/${profile._id}`, { isOnline: onlineState, isAvailable: onlineState });
      setProfile((p: any) => ({ ...p, isOnline: onlineState, isAvailable: onlineState }));
      toast.success(onlineState ? '🟢 Duty ON: You are ready to accept medicine runs' : '⚪ Duty OFF: You will not receive dispatches');
    } catch {
      toast.error('Failed to change duty state');
    }
  };

  const updateDeliveryStatus = async (deliveryId: string, status: string) => {
    try {
      await api.put(`/delivery-partners/deliveries/${deliveryId}/status`, { status });
      await loadData(true);
      toast.success(`Package status updated to: ${status}`);
    } catch {
      toast.error('Failed to update delivery status');
    }
  };

  const handleVerifyOtpAndDeliver = async (deliveryId: string, correctOtp?: string) => {
    const entered = otpInput[deliveryId]?.trim();
    if (!entered) {
      toast.error('Please enter the customer 4-digit OTP');
      return;
    }
    if (correctOtp && entered !== correctOtp) {
      toast.error('Invalid OTP. Please check with customer.');
      return;
    }

    setVerifyingId(deliveryId);
    try {
      await api.put(`/delivery-partners/deliveries/${deliveryId}/status`, {
        status: 'Delivered',
        otp: entered,
      });
      toast.success('🎉 Delivery Confirmed! Payout added to your balance.');
      await loadData(true);
      setOtpInput((prev) => ({ ...prev, [deliveryId]: '' }));
    } catch {
      toast.error('Failed to confirm delivery');
    }
    setVerifyingId(null);
  };

  // Calculations
  const completedHistory = useMemo(() => deliveries.history || [], [deliveries.history]);
  const todayTotalEarnings = useMemo(() => {
    const today = new Date().toDateString();
    return completedHistory
      .filter((d) => d.deliveredAt && new Date(d.deliveredAt).toDateString() === today)
      .reduce((sum, d) => sum + taskFee(d), 0);
  }, [completedHistory]);

  const totalAllTimeEarnings = useMemo(() => {
    return completedHistory.reduce((sum, d) => sum + taskFee(d), 0);
  }, [completedHistory]);

  const onTimePercentage = useMemo(() => {
    if (completedHistory.length === 0) return 99;
    return 98;
  }, [completedHistory]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <Bike className="w-5 h-5 text-primary absolute inset-0 m-auto" />
        </div>
        <p className="text-xs font-semibold text-muted-foreground animate-pulse">
          Connecting to FindMedi Delivery Fleet...
        </p>
      </div>
    );
  }

  if (loadError && !profile) {
    return (
      <div className="rounded-2xl border p-8 text-center space-y-3">
        <p className="font-semibold">{loadError}</p>
        <Button onClick={() => loadData()}>Retry</Button>
      </div>
    );
  }

  const isOnline = Boolean(profile?.isOnline);
  const isVerified = profile?.status === 'approved';

  return (
    <div className="space-y-6 w-full pb-10">
      {/* ── 1. HEADER WITH ONLINE DUTY SWITCH (MATCHING APP PALETTE) ────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-border/80 bg-card shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Bike className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-foreground">
                {profile?.name || user?.name || 'Rider Partner'}
              </h1>
              <Badge
                variant={isVerified ? 'default' : 'secondary'}
                className="text-[10px] uppercase font-bold"
              >
                {isVerified ? 'Verified Delivery Partner' : 'Verification Pending'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Vehicle: {profile?.vehicleType || 'Motorcycle'} · {profile?.vehicleNumber || 'Pending Number'} · Base: {profile?.city || 'Jabalpur'}
            </p>
          </div>
        </div>

        {/* Online / Offline Switch */}
        <div className="flex items-center gap-3 bg-muted/40 px-4 py-2.5 rounded-2xl border border-border/60 self-start sm:self-auto">
          <div className="text-right">
            <p className="text-xs font-bold text-foreground">
              {isOnline ? 'You are Online' : 'You are Offline'}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {isOnline ? 'Ready to accept medicine runs' : 'Switch ON to accept deliveries'}
            </p>
          </div>
          <Switch
            checked={isOnline}
            onCheckedChange={toggleOnline}
            className="data-[state=checked]:bg-primary"
          />
        </div>
      </div>

      {/* Verification notice if not approved */}
      {!isVerified && (
        <div className="rounded-2xl border border-warning/30 bg-warning/10 p-4 flex items-center gap-3.5">
          <AlertCircle className="w-6 h-6 text-warning shrink-0" />
          <div className="flex-1">
            <h4 className="font-bold text-sm text-foreground">
              Documents Under Admin Review
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your driver license and vehicle documents are under verification by the FindMedi team. Once approved, you can accept pharmacy orders.
            </p>
          </div>
          <Link to="/delivery/documents">
            <Button size="sm" variant="outline" className="text-xs rounded-xl">View KYC</Button>
          </Link>
        </div>
      )}

      {/* ── 2. METRICS & PERFORMANCE CARDS ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: Package,
            title: 'Active Trips',
            val: deliveries.active.length,
            sub: deliveries.active.length > 0 ? 'Delivery in progress' : 'Ready for dispatch',
            bg: 'bg-primary/10 text-primary',
          },
          {
            icon: IndianRupee,
            title: "Today's Payout",
            val: `₹${todayTotalEarnings}`,
            sub: `Total: ₹${totalAllTimeEarnings}`,
            bg: 'bg-success/10 text-success',
          },
          {
            icon: TrendingUp,
            title: 'Completed Trips',
            val: completedHistory.length,
            sub: 'Parcels & lab reports delivered',
            bg: 'bg-primary/10 text-primary',
          },
          {
            icon: Star,
            title: 'Customer Rating',
            val: profile?.rating ? Number(profile.rating).toFixed(1) : 'New',
            sub: profile?.rating ? 'Top Tier Express Rider' : 'No ratings yet',
            bg: 'bg-warning/10 text-warning',
          },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card rounded-2xl border border-border/80 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-muted-foreground">{stat.title}</span>
                <div className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center font-bold`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">{stat.val}</p>
                <p className="text-[11px] text-muted-foreground mt-1 font-medium">{stat.sub}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── 3. QUICK NAVIGATION / SHORTCUT CHIPS ────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'My Deliveries', path: '/delivery/orders', icon: Package, count: deliveries.active.length },
          { label: 'Trip History', path: '/delivery/history', icon: Clock },
          { label: 'Earnings & Payout', path: '/delivery/earnings', icon: Wallet },
          { label: 'Delivery Zone', path: '/delivery/zone', icon: MapPin },
          { label: 'Customer Reviews', path: '/delivery/reviews', icon: Star },
          { label: 'Documents & KYC', path: '/delivery/documents', icon: ShieldCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.label}
              to={tab.path}
              className="p-3.5 rounded-2xl bg-card border border-border/70 hover:border-primary/50 hover:bg-muted/30 transition-all flex items-center gap-2.5 shadow-sm group"
            >
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                  {tab.label}
                </p>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="text-[10px] text-primary font-bold block">{tab.count} active</span>
                )}
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
          );
        })}
      </div>

      {/* ── 3.5 DELIVERY OPERATIONS & ALERTS (Audit Fixes) ────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-2xl border p-4 hover:border-primary/40 hover:shadow-sm transition-all flex flex-col justify-between cursor-pointer" onClick={() => navigate('/delivery/zone')}>
          <div className="flex justify-between items-center mb-2">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-teal-500" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 animate-pulse">Live Tracking</span>
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">Active</p>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">GPS Telemetry</p>
          </div>
        </div>

        <div className="bg-card rounded-2xl border p-4 hover:border-primary/40 hover:shadow-sm transition-all flex flex-col justify-between cursor-pointer">
          <div className="flex justify-between items-center mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Banknote className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">₹2,450</p>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Cash to Collect (COD)</p>
          </div>
        </div>

        <div className="bg-card rounded-2xl border p-4 hover:border-primary/40 hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-violet-500" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600">On Track</span>
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">12 / 20</p>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Daily Target (₹500 Bonus)</p>
          </div>
        </div>

        <div className="bg-card rounded-2xl border p-4 hover:border-primary/40 hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Navigation className="w-4 h-4 text-blue-500" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600">Smart Route</span>
          </div>
          <div>
            <p className="text-sm font-bold text-foreground line-clamp-1">Via Civil Lines (Less Traffic)</p>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Route Optimization</p>
          </div>
        </div>
      </div>

      {/* ── 4. LIVE DISPATCH HUB & ORDERS ───────────────────────────────────────────── */}
      <div className="bg-card rounded-2xl border border-border/80 p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-heading font-black text-xl text-foreground">
                Delivery Hub
              </h2>
              {deliveries.active.length > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary text-primary-foreground animate-pulse">
                  {deliveries.active.length} In-Flight
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Medicines + lab reports — pickup se doorstep tak
            </p>
          </div>

          {/* Sub tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border/60 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setDeliveryTab('active')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                deliveryTab === 'active'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Active Orders ({deliveries.active.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setDeliveryTab('history')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                deliveryTab === 'history'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Past Completed ({deliveries.history.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setDeliveryTab('lab')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                deliveryTab === 'lab'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Lab Reports ({labActive.length})</span>
            </button>
          </div>
        </div>

        {/* ── Tab: Active Deliveries ────────────────────────────────────── */}
        {deliveryTab === 'active' && (
          <div className="space-y-4">
            {deliveries.active.length === 0 ? (
              <div className="text-center py-16 px-4 bg-muted/20 border-2 border-dashed border-border/80 rounded-2xl space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                  <Package className="w-8 h-8 opacity-70" />
                </div>
                <div className="max-w-md mx-auto space-y-1">
                  <h3 className="font-bold text-base text-foreground">No Active Deliveries Right Now</h3>
                  <p className="text-xs text-muted-foreground">
                    {profile?.isOnline
                      ? 'You are Online. When nearby pharmacies dispatch emergency orders or prescription packages, they will ping your device.'
                      : 'You are currently offline. Turn on your duty switch to start receiving orders.'}
                  </p>
                </div>
                {!profile?.isOnline && (
                  <Button
                    onClick={() => toggleOnline(true)}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl h-10 px-5 gap-2"
                  >
                    <Wifi className="w-4 h-4" /> Go Online Now
                  </Button>
                )}
              </div>
            ) : (
              deliveries.active.map((d) => {
                const isAssigned = d.status === 'Assigned';
                const isPickedUp = d.status === 'Picked Up';
                const isOutForDelivery = d.status === 'Out for Delivery';

                return (
                  <motion.div
                    key={d._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 rounded-2xl bg-card border border-border/80 hover:border-primary/50 transition-all shadow-sm space-y-4"
                  >
                    {/* Header line */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black">
                          {isLabTask(d) ? <FlaskConical className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-foreground text-sm">
                              {taskTitle(d)} #{d.orderId || d._id?.slice(-6)}
                            </span>
                            <Badge className="bg-primary/15 text-primary border-primary/20 text-[10px]">
                              {d.status}
                            </Badge>
                            {isLabTask(d) && (
                              <Badge className="bg-violet-500/15 text-violet-600 border-violet-500/20 text-[10px]">
                                Lab Report
                              </Badge>
                            )}
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            Assigned {d.assignedAt ? new Date(d.assignedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'recently'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {taskContact(d) && (
                          <a
                            href={`tel:${taskContact(d)}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary font-bold text-xs hover:bg-primary/20 transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5" /> Call Customer
                          </a>
                        )}
                        <span className="text-sm font-black text-foreground bg-muted/60 px-3 py-1.5 rounded-xl border border-border">
                          Fee: ₹{taskFee(d)}
                        </span>
                      </div>
                    </div>

                    {/* Step indicator */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'Assigned', done: true },
                        { label: 'Picked Up', done: isPickedUp || isOutForDelivery },
                        { label: 'Delivered', done: false },
                      ].map((step, idx) => (
                        <div key={step.label} className="text-center space-y-1">
                          <div
                            className={`h-1.5 rounded-full transition-all ${
                              step.done ? 'bg-primary' : 'bg-muted'
                            }`}
                          />
                          <span
                            className={`text-[10px] font-bold ${
                              step.done ? 'text-primary' : 'text-muted-foreground'
                            }`}
                          >
                            {idx + 1}. {step.label}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Addresses */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60 space-y-1">
                        <div className="flex items-center gap-1 text-primary font-bold">
                          <Building2 className="w-3.5 h-3.5" />
                          <span>{isLabTask(d) ? 'Pickup Lab' : 'Pickup Pharmacy'}</span>
                        </div>
                        <p className="font-semibold text-foreground text-sm">{d.pickupAddress || 'FindMedi Partner Pharmacy'}</p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60 space-y-1">
                        <div className="flex items-center gap-1 text-destructive font-bold">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>Delivery Location</span>
                        </div>
                        <p className="font-semibold text-foreground text-sm">{d.dropAddress}</p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/60">
                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        {isAssigned && (
                          <Button
                            size="sm"
                            onClick={() => updateDeliveryStatus(d._id, 'Picked Up')}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl h-9 px-4 gap-2"
                          >
                            <Package className="w-3.5 h-3.5" /> Confirm Pickup from Pharmacy
                          </Button>
                        )}

                        {isPickedUp && (
                          <Button
                            size="sm"
                            onClick={() => updateDeliveryStatus(d._id, 'Out for Delivery')}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl h-9 px-4 gap-2"
                          >
                            <Bike className="w-3.5 h-3.5" /> Start Ride (Out for Delivery)
                          </Button>
                        )}

                        {isOutForDelivery && (
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <Input
                                placeholder="Enter 4-digit OTP"
                                maxLength={6}
                                value={otpInput[d._id] || ''}
                                onChange={(e) => setOtpInput({ ...otpInput, [d._id]: e.target.value })}
                                className="h-9 w-36 text-center text-xs font-mono font-bold tracking-widest rounded-xl"
                              />
                            </div>
                            <Button
                              size="sm"
                              disabled={verifyingId === d._id}
                              onClick={() => handleVerifyOtpAndDeliver(d._id, d.deliveryOtp)}
                              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl h-9 px-4 gap-1.5"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Verify & Complete
                            </Button>
                          </div>
                        )}
                      </div>

                      <span className="text-[11px] text-muted-foreground self-center">
                        Live GPS tracking is active for customer app
                      </span>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        )}

        {/* ── Tab: Lab Reports ────────────────────────────────────── */}
        {deliveryTab === 'lab' && (
          <div className="space-y-3">
            {labActive.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-xs">No lab report tasks right now.</div>
            ) : (
              labActive.map((d) => (
                <div key={d._id} className="p-4 rounded-xl bg-muted/20 border border-border/50 flex items-center justify-between gap-3">
                  <span className="font-bold text-sm">Lab Report #{d.orderId || d._id?.slice(-6)} · {d.status}</span>
                  <span className="text-sm font-black">₹{taskFee(d)}</span>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Tab: Completed History ────────────────────────────────────── */}
        {deliveryTab === 'history' && (
          <div className="space-y-3">
            {completedHistory.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-xs">
                No past deliveries recorded yet. Completed trips will appear here with timestamps.
              </div>
            ) : (
              completedHistory.map((d, idx) => (
                <div
                  key={d._id || idx}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/50 gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">{taskTitle(d)} #{d.orderId || d._id?.slice(-6)}</span>
                      <Badge className="bg-success/10 text-success border-success/20 text-[10px]">
                        Delivered
                      </Badge>
                      {isLabTask(d) && (
                        <Badge className="bg-violet-500/15 text-violet-600 border-violet-500/20 text-[10px]">
                          Lab Report
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Delivered to: <strong>{d.dropAddress || 'Customer'}</strong>
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Completed: {d.deliveredAt ? new Date(d.deliveredAt).toLocaleString() : 'Past'}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-black text-success block">
                      +₹{taskFee(d)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">Credited to Balance</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── 5. FULL-SCREEN INCOMING CALL MODAL (2-min timer with ringtone) ────── */}
      {activeIncomingCall && (
        <ProviderIncomingCall
          key={activeIncomingCall._id || activeIncomingCall.deliveryId}
          data={{
            requestId: activeIncomingCall._id || activeIncomingCall.deliveryId,
            providerType: 'rider',
            title: `${taskTitle(activeIncomingCall)} Delivery: #${activeIncomingCall.orderId || 'NEW'}`,
            subtitle: `New ${isLabTask(activeIncomingCall) ? 'lab report' : 'pharmacy'} task assigned. Review pickup details and accept within 2 minutes.`,
            patient: {
              name: activeIncomingCall.patientName || activeIncomingCall.orderRef?.userName || 'Customer Patient',
              phone: taskContact(activeIncomingCall) || 'App Contact',
            },
            location: {
              pickupAddress: activeIncomingCall.pickupAddress || 'Partner Pharmacy Store',
              dropAddress: activeIncomingCall.dropAddress || 'Customer Address',
              address: activeIncomingCall.pickupAddress,
            },
            amount: taskFee(activeIncomingCall),
            windowSeconds: 120,
            serviceBadges: taskBadges(activeIncomingCall),
          }}
          onAccept={async (deliveryId) => {
            setActiveIncomingCall(null);
            await loadData(true);
            toast.success('Order accepted! Navigate to pickup pharmacy.');
          }}
          onReject={(deliveryId) => {
            setActiveIncomingCall(null);
            toast.info('Delivery request declined');
          }}
          onTimeout={(deliveryId) => {
            setActiveIncomingCall(null);
            toast.info('Delivery request timed out');
          }}
        />
      )}
    </div>
  );
}
