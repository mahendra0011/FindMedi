import { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, Truck, MapPin, Clock, DollarSign, FileImage,
  Wifi, WifiOff, Bike, Package, CheckCircle, AlertCircle, History,
  Star, Settings, Bell, IndianRupee, TrendingUp
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { io } from 'socket.io-client';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import StatCard from '@/components/StatCard';
import DeliveryTrackingMap from '@/components/DeliveryTrackingMap';

const socket = io(import.meta.env.VITE_API_URL);

const statusColors = {
  'Pending Assignment': 'bg-warning/10 text-warning',
  Assigned: 'bg-info/10 text-info',
  'Picked Up': 'bg-primary/10 text-primary',
  'Out for Delivery': 'bg-amber-500/10 text-amber-600',
  Delivered: 'bg-success/10 text-success',
  Failed: 'bg-destructive/10 text-destructive',
  Cancelled: 'bg-muted text-muted-foreground',
};

export default function DeliveryPartnerDashboard() {
  const { user } = useAuth();
  const [partner, setPartner] = useState(null);
  const [activeDeliveries, setActiveDeliveries] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const watchIdRef = useRef(null);

  useEffect(() => {
    loadProfile();
    loadDeliveries();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await api.get(`/delivery-partners/profile/${user.id}`);
      setPartner(data);
      setIsOnline(data.isOnline || false);
    } catch {
      toast.error('Failed to load profile');
    }
  };

  const loadDeliveries = async () => {
    try {
      const data = await api.get('/delivery-partners/my-deliveries');
      setActiveDeliveries(data.active || []);
      setHistory(data.history || []);
    } catch {
      toast.error('Failed to load deliveries');
    }
    setLoading(false);
  };

  const toggleOnline = async () => {
    const newStatus = !isOnline;
    setIsOnline(newStatus);
    try {
      await api.put(`/delivery-partners/profile/${user.id}`, { isOnline: newStatus });
      socket.emit('deliveryboy:online', { deliveryPartnerId: partner._id, online: newStatus });
      if (newStatus) {
        startLocationWatch();
      } else {
        stopLocationWatch();
      }
      toast.success(newStatus ? 'You are now online' : 'You are now offline');
    } catch {
      toast.error('Failed to update status');
    }
  };

  const startLocationWatch = () => {
    if (!navigator.geolocation) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        socket.emit('deliveryboy:location', {
          deliveryPartnerId: partner._id,
          orderId: activeDeliveries[0]?._id,
          lat: latitude,
          lng: longitude,
        });
      },
      (err) => console.error(err),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  };

  const stopLocationWatch = () => {
    if (watchIdRef.current && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
  };

  const updateDeliveryStatus = async (deliveryId, status) => {
    try {
      await api.put(`/delivery-partners/deliveries/${deliveryId}/status`, { status });
      toast.success(`Status updated to ${status}`);
      loadDeliveries();
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

  const todayEarnings = history
    .filter((d) => new Date(d.deliveredAt).toDateString() === new Date().toDateString())
    .reduce((s, d) => s + (d.orderRef?.totalAmount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Delivery Partner Dashboard</h1>
          <p className="page-subtitle">
            Welcome back, <span className="font-semibold text-foreground">{partner?.name || user?.name}</span>!
            {partner?.status === 'approved' ? ' You are approved and ready to deliver.' : ' Your account is pending approval.'}
          </p>
        </div>
        <button
          onClick={toggleOnline}
          disabled={partner?.status !== 'approved'}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
            isOnline
              ? 'bg-success text-success-foreground hover:bg-success/90'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          {isOnline ? 'Online' : 'Offline'}
        </button>
      </div>

      {/* Status badge */}
      {partner?.status === 'pending' && (
        <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-warning" />
          <div>
            <p className="font-medium text-warning">Account Pending Verification</p>
            <p className="text-sm text-muted-foreground">Your documents are being reviewed. You'll be notified once approved.</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Today's Earnings"
          value={`₹${todayEarnings.toLocaleString()}`}
          change="+12% from yesterday"
          changeType="positive"
          icon={IndianRupee}
          iconColor="text-success"
          iconBg="bg-success/10"
        />
        <StatCard
          title="Active Deliveries"
          value={activeDeliveries.length}
          change="In progress"
          changeType="neutral"
          icon={Package}
          iconColor="text-primary"
          iconBg="bg-primary/10"
        />
        <StatCard
          title="Total Deliveries"
          value={partner?.totalDeliveries || 0}
          change="+5 this week"
          changeType="positive"
          icon={Bike}
          iconColor="text-info"
          iconBg="bg-info/10"
        />
        <StatCard
          title="Rating"
          value={partner?.rating || '—'}
          change="4.8 average"
          changeType="positive"
          icon={Star}
          iconColor="text-warning"
          iconBg="bg-warning/10"
        />
      </div>

      {/* Active Deliveries */}
      <div className="bg-card rounded-xl border p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-heading font-semibold text-lg text-card-foreground flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" /> Active Deliveries
          </h3>
          <Link to="/delivery/deliveries" className="text-xs text-primary hover:underline">View All</Link>
        </div>

        {activeDeliveries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>No active deliveries</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeDeliveries.map((delivery) => (
              <div key={delivery._id} className="border border-border/60 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColors[delivery.status] || 'bg-muted text-muted-foreground'}`}>
                    {delivery.status}
                  </span>
                  <span className="text-xs text-muted-foreground">#{delivery.orderId}</span>
                </div>

                {delivery.pickup && delivery.drop && (
                  <DeliveryTrackingMap
                    orderId={delivery._id}
                    pickup={delivery.pickupLocation || { lat: 0, lng: 0 }}
                    drop={delivery.dropLocation || { lat: 0, lng: 0 }}
                    partner={partner}
                  />
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Pickup</p>
                    <p className="text-sm text-foreground">{delivery.pickupAddress}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Drop</p>
                    <p className="text-sm text-foreground">{delivery.dropAddress}</p>
                  </div>
                </div>

                {delivery.status !== 'Delivered' && delivery.status !== 'Failed' && delivery.status !== 'Cancelled' && (
                  <div className="flex gap-2 mt-4">
                    {delivery.status === 'Assigned' && (
                      <button
                        onClick={() => updateDeliveryStatus(delivery._id, 'Picked Up')}
                        className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                      >
                        Mark as Picked Up
                      </button>
                    )}
                    {delivery.status === 'Picked Up' && (
                      <button
                        onClick={() => updateDeliveryStatus(delivery._id, 'Out for Delivery')}
                        className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
                      >
                        Start Delivery
                      </button>
                    )}
                    {delivery.status === 'Out for Delivery' && (
                      <button
                        onClick={() => updateDeliveryStatus(delivery._id, 'Delivered')}
                        className="px-3 py-1.5 bg-success text-success-foreground rounded-lg text-sm font-medium hover:bg-success/90 transition-colors"
                      >
                        Mark Delivered
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent History */}
      <div className="bg-card rounded-xl border p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-heading font-semibold text-lg text-card-foreground flex items-center gap-2">
            <History className="w-5 h-5 text-primary" /> Recent Deliveries
          </h3>
          <Link to="/delivery/history" className="text-xs text-primary hover:underline">View All</Link>
        </div>

        {history.length === 0 ? (
          <p className="text-muted-foreground text-sm">No delivery history yet</p>
        ) : (
          <div className="space-y-2">
            {history.slice(0, 5).map((d) => (
              <div key={d._id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Package className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-card-foreground">#{d.orderId}</p>
                    <p className="text-xs text-muted-foreground">{d.dropAddress?.slice(0, 40)}...</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-sm text-success">₹{(d.orderRef?.totalAmount || 0).toLocaleString()}</p>
                  <span className="text-xs text-muted-foreground">
                    {d.deliveredAt ? new Date(d.deliveredAt).toLocaleDateString() : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
