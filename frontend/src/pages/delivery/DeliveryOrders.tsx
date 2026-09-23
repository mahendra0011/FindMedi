import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, MapPin, Phone, Clock, Bike, CheckCircle2, QrCode, 
  AlertCircle, Building2, Search, Filter, ArrowRight, ShieldCheck, 
  ChevronRight, Sparkles, Navigation, UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { getSocket, joinRoom } from '@/lib/socket';

export default function DeliveryOrders() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [deliveries, setDeliveries] = useState<{ active: any[]; history: any[] }>({ active: [], history: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [search, setSearch] = useState('');
  const [otpMap, setOtpMap] = useState<{ [id: string]: string }>({});

  useEffect(() => {
    if (!user?.id) return;
    loadData();
    const socket = getSocket();
    const cleanupJoin = joinRoom('join', user.id);
    const onNew = () => loadData();
    const onStatus = () => loadData();
    socket.on('delivery:new_assignment', onNew);
    socket.on('delivery:status', onStatus);
    return () => {
      socket.off('delivery:new_assignment', onNew);
      socket.off('delivery:status', onStatus);
      cleanupJoin?.();
    };
  }, [user?.id]);

  useEffect(() => {
    if (!profile?._id || !deliveries.active[0]) return;
    const socket = getSocket();
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        socket.emit('deliveryboy:location', {
          deliveryPartnerId: profile._id,
          orderId: deliveries.active[0]._id,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [profile?._id, deliveries.active[0]?._id]);

  const loadData = async () => {
    try {
      const [prof, dels] = await Promise.all([
        api.get('/delivery-partners/profile/me').catch(() => null),
        api.get('/delivery-partners/my-deliveries').catch(() => ({ active: [], history: [] })),
      ]);
      setProfile(prof);
      setDeliveries({ active: dels?.active || [], history: dels?.history || [] });
    } catch {
      toast.error('Failed to load deliveries');
    }
    setLoading(false);
  };

  const updateStatus = async (deliveryId: string, status: string) => {
    try {
      await api.put(`/delivery-partners/deliveries/${deliveryId}/status`, { status });
      await loadData();
      toast.success(`Package status updated: ${status}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const verifyOtp = async (deliveryId: string, correctOtp?: string) => {
    const val = otpMap[deliveryId]?.trim();
    if (correctOtp && val !== correctOtp) {
      toast.error('Invalid OTP. Please ask the patient/customer for the code.');
      return;
    }
    try {
      await api.put(`/delivery-partners/deliveries/${deliveryId}/status`, { status: 'Delivered' });
      toast.success('🎉 Delivery completed successfully! Payout credited to your wallet.');
      loadData();
    } catch {
      toast.error('Failed to confirm delivery');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-muted-foreground">Loading delivery dispatches...</p>
      </div>
    );
  }

  const filteredHistory = (deliveries.history || []).filter((d) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return d.orderId?.toLowerCase().includes(q) || d.dropAddress?.toLowerCase().includes(q) || d.pickupAddress?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 w-full pb-12">
      {/* ── Top Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-border/80 bg-card shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Bike className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-foreground">
              Assigned Deliveries
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {deliveries.active.length} active assignments in progress · {deliveries.history.length} completed
            </p>
          </div>
        </div>

        {/* Tab Switch */}
        <div className="flex p-1 rounded-xl bg-muted/60 border border-border/60 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('active')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'active'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Active Orders ({deliveries.active.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Completed ({deliveries.history.length})</span>
          </button>
        </div>
      </div>

      {/* ── Active Orders Tab ────────────────────────────────────────── */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          {deliveries.active.length === 0 ? (
            <div className="text-center py-20 rounded-2xl border border-dashed border-border/80 bg-card p-8 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">No Active Orders In-Flight</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                You currently have no pending pickups. When customer orders or urgent medicine prescriptions are assigned in your zone, you'll receive a full-screen alert.
              </p>
            </div>
          ) : (
            deliveries.active.map((d) => (
              <motion.div
                key={d._id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm hover:shadow-md transition-all space-y-5"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black">
                      <Bike className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-foreground">Order #{d.orderId}</h3>
                        <Badge className="bg-primary/15 text-primary border-primary/20 text-[10px] font-bold rounded-full">
                          {d.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">Express Prescription Medicine Run</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    {d.orderRef?.phone && (
                      <a
                        href={`tel:${d.orderRef.phone}`}
                        className="h-9 px-3.5 rounded-xl bg-primary/10 text-primary text-xs font-bold flex items-center gap-1.5 hover:bg-primary/20 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" /> Call Customer
                      </a>
                    )}
                    <span className="text-sm font-black text-foreground bg-muted/60 px-3.5 py-1.5 rounded-xl border border-border">
                      ₹{d.orderRef?.deliveryFee || 50} Payout
                    </span>
                  </div>
                </div>

                {/* Progress Timeline Indicator */}
                <div className="grid grid-cols-3 gap-2 py-1">
                  {[
                    { label: 'Assigned', done: true },
                    { label: 'Picked Up', done: ['Picked Up', 'Out for Delivery', 'Delivered'].includes(d.status) },
                    { label: 'Delivered', done: d.status === 'Delivered' },
                  ].map((step, idx) => (
                    <div key={step.label} className="text-center space-y-1">
                      <div className={`h-1.5 rounded-full transition-all ${
                        step.done ? 'bg-primary' : 'bg-muted'
                      }`} />
                      <span className={`text-[11px] font-bold ${
                        step.done ? 'text-primary' : 'text-muted-foreground'
                      }`}>
                        {idx + 1}. {step.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Pickup and Drop Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-primary font-bold">
                      <Building2 className="w-4 h-4" />
                      <span>Pharmacy Pickup Hub</span>
                    </div>
                    <p className="font-semibold text-foreground text-sm">{d.pickupAddress || 'FindMedi Central Pharmacy'}</p>
                    <p className="text-[11px] text-muted-foreground">Collect sealed parcel from prescription desk</p>
                  </div>

                  <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-destructive font-bold">
                      <MapPin className="w-4 h-4" />
                      <span>Patient Delivery Destination</span>
                    </div>
                    <p className="font-semibold text-foreground text-sm">{d.dropAddress}</p>
                    <p className="text-[11px] text-muted-foreground">Require patient confirmation & 4-digit OTP</p>
                    {d.dropAddress && (
                      <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.dropAddress)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline">
                        <Navigation className="w-3.5 h-3.5" /> Navigate
                      </a>
                    )}
                  </div>
                </div>

                {/* Actions & OTP */}
                <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/60">
                  {d.status === 'Out for Delivery' ? (
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                      <div className="flex items-center gap-2">
                        <QrCode className="w-4 h-4 text-muted-foreground" />
                        <Input
                          type="text"
                          maxLength={6}
                          placeholder="Enter 4-digit OTP"
                          value={otpMap[d._id] || ''}
                          onChange={(e) => setOtpMap({ ...otpMap, [d._id]: e.target.value })}
                          className="h-10 text-xs rounded-xl w-44 font-mono font-bold tracking-widest text-center"
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={() => verifyOtp(d._id, d.deliveryOtp)}
                        disabled={!otpMap[d._id]}
                        className="h-10 px-5 rounded-xl font-bold text-xs bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1.5" />
                        Verify OTP & Complete Delivery
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5">
                      {d.status === 'Assigned' && (
                        <Button
                          size="sm"
                          onClick={() => updateStatus(d._id, 'Picked Up')}
                          className="h-10 px-5 rounded-xl font-bold text-xs bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                        >
                          <Package className="w-4 h-4 mr-1.5" /> Confirm Pharmacy Pickup
                        </Button>
                      )}
                      {d.status === 'Picked Up' && (
                        <Button
                          size="sm"
                          onClick={() => updateStatus(d._id, 'Out for Delivery')}
                          className="h-10 px-5 rounded-xl font-bold text-xs bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                        >
                          <Bike className="w-4 h-4 mr-1.5" /> Start Ride (Out for Delivery)
                        </Button>
                      )}
                    </div>
                  )}

                  <span className="text-[11px] text-muted-foreground">
                    Live GPS beacon active · Safe handling required
                  </span>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* ── Completed History Tab ────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search past deliveries by order ID, pharmacy or address..."
              className="pl-10 h-11 rounded-xl bg-card border-border/80 text-sm shadow-sm"
            />
          </div>

          {filteredHistory.length === 0 ? (
            <div className="text-center py-20 rounded-2xl border border-dashed border-border/80 bg-card p-8 shadow-sm">
              <Clock className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="font-bold text-base text-foreground">No Past Deliveries Found</p>
              <p className="text-xs text-muted-foreground mt-1">Completed medicine orders will be permanently archived here.</p>
            </div>
          ) : (
            filteredHistory.map((d) => (
              <div 
                key={d._id}
                className="p-5 rounded-2xl border border-border/80 bg-card shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground text-sm">Order #{d.orderId}</span>
                    <Badge className="bg-success/10 text-success border-success/20 text-[10px] font-semibold">
                      Delivered
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    To: {d.dropAddress}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {d.deliveredAt ? new Date(d.deliveredAt).toLocaleString() : 'Completed recently'}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-base font-black text-success block">
                    +₹{d.orderRef?.deliveryFee || 50}
                  </span>
                  <span className="text-[11px] text-muted-foreground">Rider Fee Credited</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
