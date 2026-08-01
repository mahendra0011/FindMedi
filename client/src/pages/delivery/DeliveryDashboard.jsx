import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, IndianRupee, Star, TrendingUp, Bike, Wifi, WifiOff, MapPin, Clock, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { getSocket, joinRoom } from '@/lib/socket';

export default function DeliveryDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [deliveries, setDeliveries] = useState({ active: [], history: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    loadData();
    // Shared socket — join har (re)connect par dobara fire hota hai.
    // Pehle module-level socket + user?._id (hamesha undefined) se join
    // kabhi na hota tha.
    return joinRoom('join', user.id);
  }, [user?.id]);

  const loadData = async () => {
    try {
      const [prof, dels] = await Promise.all([
        api.get('/delivery-partners/profile/me'),
        api.get('/delivery-partners/my-deliveries'),
      ]);
      setProfile(prof);
      setDeliveries(dels);
    } catch {
      toast.error('Failed to load dashboard');
    }
    setLoading(false);
  };

  const toggleOnline = async (online) => {
    try {
      await api.put(`/delivery-partners/profile/${profile._id}`, { isOnline: online, isAvailable: online });
      setProfile((p) => ({ ...p, isOnline: online, isAvailable: online }));
      getSocket().emit('deliveryboy:online', { deliveryPartnerId: profile._id, online });
      toast.success(online ? 'You are now online' : 'You are now offline');
    } catch {
      toast.error('Failed to update status');
    }
  };

  const updateStatus = async (deliveryId, status) => {
    try {
      await api.put(`/delivery-partners/deliveries/${deliveryId}/status`, { status });
      loadData();
      toast.success(`Status updated to ${status}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const stats = [
    { icon: Package, label: 'Today\'s Deliveries', value: deliveries.active.length, color: 'text-blue-600', bg: 'bg-blue-500/10' },
    { icon: IndianRupee, label: 'Today\'s Earnings', value: `₹${(deliveries.history || []).reduce((s, d) => s + (d.orderRef?.total || 0), 0)}`, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
    { icon: Star, label: 'Rating', value: profile?.rating || '0.0', color: 'text-amber-600', bg: 'bg-amber-500/10' },
    { icon: TrendingUp, label: 'Total Deliveries', value: profile?.totalDeliveries || 0, color: 'text-purple-600', bg: 'bg-purple-500/10' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Delivery Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {profile?.name || user?.name}</p>
        </div>
        <Button
          onClick={() => toggleOnline(!profile?.isOnline)}
          className={`gap-2 ${profile?.isOnline ? 'bg-success hover:bg-success/90' : ''}`}
        >
          {profile?.isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          {profile?.isOnline ? 'Online' : 'Offline'}
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="bg-card rounded-xl border p-4"
          >
            <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="bg-card rounded-xl border p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Bike className="w-7 h-7 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">{profile?.name}</p>
            <p className="text-sm text-muted-foreground capitalize">{profile?.vehicleType} • {profile?.vehicleNumber || 'N/A'}</p>
            <Badge variant={profile?.status === 'approved' ? 'default' : 'secondary'} className="mt-1 text-xs">
              {profile?.status}
            </Badge>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4" /> {profile?.city || 'N/A'}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" /> {profile?.availability}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="w-4 h-4" /> {profile?.phone}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Star className="w-4 h-4 text-amber-500" /> {profile?.rating || 0} ({profile?.totalDeliveries || 0} deliveries)
          </div>
        </div>
      </div>

      {deliveries.active.length > 0 && (
        <div>
          <h2 className="font-heading font-semibold text-lg text-foreground mb-4">Active Delivery</h2>
          {deliveries.active.map((d) => (
            <motion.div key={d._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-xl border p-5 mb-3"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-foreground">Order #{d.orderId}</p>
                  <Badge className="mt-1">{d.status}</Badge>
                </div>
                <a href={`tel:${d.orderRef?.phone || ''}`} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                  <Phone className="w-4 h-4" />
                </a>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground mb-4">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                  <span><strong>Pickup:</strong> {d.pickupAddress}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-destructive" />
                  <span><strong>Drop:</strong> {d.dropAddress}</span>
                </div>
                {d.deliveryOtp && (
                  <div className="flex items-center gap-2 text-foreground font-semibold">
                    <Package className="w-4 h-4" /> OTP: {d.deliveryOtp}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {d.status === 'Assigned' && (
                  <Button size="sm" onClick={() => updateStatus(d._id, 'Picked Up')} className="gap-1">
                    <Package className="w-4 h-4" /> Picked Up
                  </Button>
                )}
                {d.status === 'Picked Up' && (
                  <Button size="sm" onClick={() => updateStatus(d._id, 'Out for Delivery')} className="gap-1">
                    <Bike className="w-4 h-4" /> Out for Delivery
                  </Button>
                )}
                {d.status === 'Out for Delivery' && (
                  <Button size="sm" onClick={() => updateStatus(d._id, 'Delivered')} className="gap-1 bg-success hover:bg-success/90">
                    <Package className="w-4 h-4" /> Delivered
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {!profile?.isOnline && (
        <div className="bg-muted/20 border border-dashed rounded-xl p-6 text-center">
          <WifiOff className="w-12 h-12 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-muted-foreground font-medium">You are currently offline</p>
          <p className="text-xs text-muted-foreground mt-1">Go online to start receiving delivery requests</p>
          <Button onClick={() => toggleOnline(true)} className="mt-4 gap-2">
            <Wifi className="w-4 h-4" /> Go Online
          </Button>
        </div>
      )}
    </div>
  );
}
