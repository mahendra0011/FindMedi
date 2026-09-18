import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, MapPin, Phone, Clock, Bike, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { getSocket, joinRoom } from '@/lib/socket';

export default function DeliveryOrders() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [deliveries, setDeliveries] = useState({ active: [], history: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');

  useEffect(() => {
    if (!user?.id) return;
    loadData();
    const socket = getSocket();
    // Shared socket — join har (re)connect par dobara fire hota hai
    const cleanupJoin = joinRoom('join', user.id);
    const onNew = () => loadData();
    const onStatus = () => loadData();
    socket.on('delivery:new_assignment', onNew);
    socket.on('delivery:status', onStatus);
    return () => {
      socket.off('delivery:new_assignment', onNew);
      socket.off('delivery:status', onStatus);
      cleanupJoin();
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
        api.get('/delivery-partners/profile/me'),
        api.get('/delivery-partners/my-deliveries'),
      ]);
      setProfile(prof);
      setDeliveries(dels);
    } catch {
      toast.error('Failed to load deliveries');
    }
    setLoading(false);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">My Deliveries</h1>
        <p className="text-muted-foreground">{deliveries.active.length} active, {deliveries.history.length} completed</p>
      </div>

      <div className="flex gap-1 bg-muted/20 rounded-xl p-1">
        <button
          onClick={() => setActiveTab('active')}
          className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'active' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Active ({deliveries.active.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'history' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          History ({deliveries.history.length})
        </button>
      </div>

      {activeTab === 'active' && (
        <div className="space-y-4">
          {deliveries.active.length === 0 ? (
            <div className="text-center py-20 bg-card rounded-xl border border-dashed">
              <Package className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground text-lg">No active deliveries</p>
              <p className="text-xs text-muted-foreground mt-1">New deliveries will appear here when assigned</p>
            </div>
          ) : (
            deliveries.active.map((d) => (
              <motion.div key={d._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-xl border p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Bike className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Order #{d.orderId}</h3>
                      <Badge className="mt-1">{d.status}</Badge>
                    </div>
                  </div>
                  <a href={`tel:${d.orderRef?.phone || ''}`} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                    <Phone className="w-4 h-4" />
                  </a>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground mb-4">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">Pickup</p>
                      <p>{d.pickupAddress}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-destructive" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">Drop</p>
                      <p>{d.dropAddress}</p>
                    </div>
                  </div>
                  {d.deliveryOtp && (
                    <div className="flex items-center gap-2 p-2 bg-muted/20 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                      <span className="text-foreground font-semibold">OTP: {d.deliveryOtp}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 flex-wrap">
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
                      <CheckCircle className="w-4 h-4" /> Mark Delivered
                    </Button>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-3">
          {deliveries.history.length === 0 ? (
            <div className="text-center py-20 bg-card rounded-xl border border-dashed">
              <Clock className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground text-lg">No delivery history yet</p>
            </div>
          ) : (
            deliveries.history.map((d) => (
              <motion.div key={d._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-xl border p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      d.status === 'Delivered' ? 'bg-success/10' : 'bg-destructive/10'
                    }`}>
                      {d.status === 'Delivered' ? (
                        <CheckCircle className="w-5 h-5 text-success" />
                      ) : (
                        <XCircle className="w-5 h-5 text-destructive" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Order #{d.orderId}</p>
                      <p className="text-xs text-muted-foreground">{d.dropAddress}</p>
                    </div>
                  </div>
                  <Badge variant={d.status === 'Delivered' ? 'default' : 'secondary'}>{d.status}</Badge>
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {d.deliveredAt ? new Date(d.deliveredAt).toLocaleDateString() : '-'}</span>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
