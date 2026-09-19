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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
  const [historyRides, setHistoryRides] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [togglingOnline, setTogglingOnline] = useState<boolean>(false);

  // Demo Withdrawal State
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  // GPS Watch Position Ref
  const watchIdRef = useRef<number | null>(null);

  // 1. Initial Data Fetch
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [profRes, earnRes, activeRes, histRes] = await Promise.all([
        api.getRiderProfile(),
        api.getRiderEarnings(),
        api.getActiveRide(),
        api.getRiderHistory(),
      ]);

      setProfile(profRes.rider || null);
      setEarnings(earnRes || null);
      setActiveRide(activeRes.ride || null);
      setHistoryRides(histRes.rides || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load driver dashboard');
    } finally {
      setLoading(false);
    }
  };

  // 2. Real-time Incoming Ride Broadcast & Active Ride Updates
  useEffect(() => {
    const socket = getSocket();

    const handleNewRequest = (payload: any) => {
      // Add incoming request card with audio alert
      setIncomingRequests((prev) => {
        if (prev.some((r) => r.rideId === payload.rideId)) return prev;
        return [...prev, { ...payload, countdown: 20 }];
      });
      toast.info(
        payload.isEmergency
          ? '🚨 URGENT: Incoming Emergency Ambulance Request!'
          : '🔔 New Ride Request Received!',
        { duration: 6000 }
      );
    };

    const handleRideTaken = ({ rideId }: { rideId: string }) => {
      setIncomingRequests((prev) => prev.filter((r) => r.rideId !== rideId));
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

    socket.on('new_ride_request', handleNewRequest);
    socket.on('ride_taken', handleRideTaken);
    socket.on('ride_cancelled', handleRideCancelled);
    socket.on('payment_received', handlePaymentReceived);

    return () => {
      socket.off('new_ride_request', handleNewRequest);
      socket.off('ride_taken', handleRideTaken);
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
      const socket = getSocket();
      if (checked) {
        navigator.geolocation.getCurrentPosition((pos) => {
          socket.emit('rider_go_online', {
            riderId: user?._id,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        });
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
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Top Header with Online Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-border/80 bg-card shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-foreground">
                {user?.name || 'Driver'}
              </h1>
              <Badge
                variant={isVerified ? 'default' : 'secondary'}
                className="text-[10px] uppercase font-bold"
              >
                {isVerified ? 'Verified Driver' : profile?.riderStatus?.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">
              Vehicle: {vehicle.brand} {vehicle.model} · {vehicle.rcNumber || 'Pending RC'}
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
              {isOnline ? 'Receiving ride requests' : 'Switch ON to accept rides'}
            </p>
          </div>
          <Switch
            checked={isOnline}
            onCheckedChange={handleToggleOnline}
            disabled={!isVerified || togglingOnline}
            className="data-[state=checked]:bg-emerald-600"
          />
        </div>
      </div>

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

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border/80">
        {[
          { id: 'overview', label: 'Overview', icon: TrendingUp },
          { id: 'requests', label: 'Ride Requests', icon: Clock, badge: incomingRequests.length },
          { id: 'active', label: 'Active Ride', icon: Navigation, badge: activeRide ? 1 : 0 },
          { id: 'history', label: 'Ride History', icon: History },
          { id: 'earnings', label: 'Earnings & Payout', icon: IndianRupee },
          { id: 'vehicle', label: 'Vehicle Details', icon: Car },
          { id: 'documents', label: 'Documents & KYC', icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge ? (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-primary-foreground text-primary' : 'bg-primary/20 text-primary'
                }`}>
                  {tab.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: 1. OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
              <p className="text-xs text-muted-foreground font-medium">Today's Earnings</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                ₹{earnings?.todayNet || 0}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {earnings?.todayRides || 0} completed rides
              </p>
            </div>

            <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
              <p className="text-xs text-muted-foreground font-medium">This Month</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                ₹{earnings?.monthNet || 0}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {earnings?.monthRides || 0} rides this month
              </p>
            </div>

            <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
              <p className="text-xs text-muted-foreground font-medium">Wallet Balance</p>
              <p className="text-2xl font-bold text-primary mt-1">
                ₹{earnings?.walletBalance || 0}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Available for demo payout</p>
            </div>

            <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
              <p className="text-xs text-muted-foreground font-medium">Driver Rating</p>
              <div className="flex items-center gap-1 mt-1 text-2xl font-bold text-amber-600">
                <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
                <span>{earnings?.rating?.avg ? Number(earnings.rating.avg).toFixed(1) : '5.0'}</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {earnings?.rating?.count || 0} passenger reviews
              </p>
            </div>
          </div>

          {/* Quick Active Ride or Live Request CTA */}
          {activeRide && (
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 flex items-center justify-between">
              <div>
                <p className="font-bold text-sm text-foreground">You have an active ride in progress</p>
                <p className="text-xs text-muted-foreground">Booking #{activeRide.bookingNumber} · {activeRide.status}</p>
              </div>
              <Button size="sm" onClick={() => setActiveTab('active')} className="rounded-xl text-xs gap-1.5">
                <Navigation className="w-3.5 h-3.5" /> Open Active Ride
              </Button>
            </div>
          )}

          {/* Live requests alert */}
          {incomingRequests.length > 0 && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center justify-between">
              <div>
                <p className="font-bold text-sm text-emerald-950 dark:text-emerald-200">
                  {incomingRequests.length} Live Ride Request(s) Waiting!
                </p>
                <p className="text-xs text-emerald-800 dark:text-emerald-300">
                  Respond before the countdown timer expires.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setActiveTab('requests')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs gap-1.5"
              >
                View Requests ({incomingRequests.length})
              </Button>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: 2. RIDE REQUESTS (LIVE) */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-foreground">Live Incoming Requests</h3>
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
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
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
                      <div className="text-[11px] font-mono font-bold text-red-600 flex items-center justify-end gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>00:{String(req.countdown).padStart(2, '0')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    {req.riderDistanceKm != null && (
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg w-fit border border-emerald-500/20">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Pickup is {req.riderDistanceKm} km away from you</span>
                      </div>
                    )}
                    <p className="text-muted-foreground truncate">
                      <span className="text-emerald-600 font-bold mr-1">Pickup:</span>
                      {req.pickup?.address}
                    </p>
                    <p className="text-muted-foreground truncate">
                      <span className="text-rose-600 font-bold mr-1">Drop:</span>
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
          {!activeRide ? (
            <div className="rounded-2xl border border-border/80 bg-card p-12 text-center space-y-3">
              <Navigation className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="font-semibold text-sm text-foreground">No active ride right now</p>
              <p className="text-xs text-muted-foreground">
                Accepted rides will appear here with live route navigation and passenger details.
              </p>
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
                        <Phone className="w-3.5 h-3.5 text-emerald-600" /> Call
                      </a>
                    </Button>
                  )}
                </div>

                {/* Route */}
                <div className="space-y-2 text-xs">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-emerald-600">Pickup</p>
                    <p className="text-foreground font-medium">{activeRide.pickup?.address}</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-[10px] font-bold uppercase text-rose-600">Destination</p>
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
                      className="w-full h-11 rounded-xl text-xs font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
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
                      className="w-full h-11 rounded-xl text-xs font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Complete Ride & Finalize Fare
                    </Button>
                  )}

                  {activeRide.status === 'completed' && (
                    <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-center space-y-1">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
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
                    <th className="py-3 px-4">Your Earning (90%)</th>
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
                      <td className="py-3.5 px-4 font-bold text-emerald-600">
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
      )}

      {/* TAB CONTENT: 5. EARNINGS & DEMO PAYOUT */}
      {activeTab === 'earnings' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Total Lifetime Earnings</p>
              <p className="text-3xl font-extrabold text-foreground">
                ₹{earnings?.totalEarnings || 0}
              </p>
            </div>

            <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-1">
              <p className="text-xs text-muted-foreground font-medium">This Month Net Payable</p>
              <p className="text-3xl font-extrabold text-emerald-600">
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
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-base text-foreground">Registered Vehicle</h3>
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
      )}

      {/* TAB CONTENT: 7. DOCUMENTS & KYC */}
      {activeTab === 'documents' && (
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-base text-foreground">Documents & KYC Verification</h3>
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
    </div>
  );
}
