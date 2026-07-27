import { useState, useEffect } from 'react';
import { Package, Bike, MapPin, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import DeliveryTrackingMap from '@/components/DeliveryTrackingMap';

const statusColors = {
  'Pending Assignment': 'bg-warning/10 text-warning',
  Assigned: 'bg-info/10 text-info',
  'Picked Up': 'bg-primary/10 text-primary',
  'Out for Delivery': 'bg-amber-500/10 text-amber-600',
  Delivered: 'bg-success/10 text-success',
  Failed: 'bg-destructive/10 text-destructive',
  Cancelled: 'bg-muted text-muted-foreground',
};

export default function MyDeliveries() {
  const [active, setActive] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [deliveries, profile] = await Promise.all([
        api.get('/delivery-partners/my-deliveries'),
        api.get('/delivery-partners/profile/me'),
      ]);
      setActive(deliveries.active || []);
      setHistory(deliveries.history || []);
      setPartner(profile);
    } catch {
      toast.error('Failed to load deliveries');
    }
    setLoading(false);
  };

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/delivery-partners/deliveries/${id}/status`, { status });
      toast.success(`Status updated to ${status}`);
      loadData();
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
        <h1 className="page-title">My Deliveries</h1>
        <p className="page-subtitle">Manage your active and past deliveries</p>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="font-heading text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" /> Active ({active.length})
          </h2>
          {active.length === 0 ? (
            <p className="text-muted-foreground">No active deliveries</p>
          ) : (
            active.map((d) => (
              <div key={d._id} className="bg-card rounded-xl border p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColors[d.status] || 'bg-muted text-muted-foreground'}`}>
                    {d.status}
                  </span>
                  <span className="text-xs text-muted-foreground">#{d.orderId}</span>
                </div>

                {d.pickupLocation && d.dropLocation && (
                  <DeliveryTrackingMap
                    orderId={d._id}
                    pickup={d.pickupLocation}
                    drop={d.dropLocation}
                    partner={partner}
                  />
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-sm">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Pickup</p>
                    <p className="text-foreground">{d.pickupAddress}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Drop</p>
                    <p className="text-foreground">{d.dropAddress}</p>
                  </div>
                </div>

                {d.status !== 'Delivered' && d.status !== 'Failed' && d.status !== 'Cancelled' && (
                  <div className="flex gap-2 mt-4">
                    {d.status === 'Assigned' && (
                      <button onClick={() => updateStatus(d._id, 'Picked Up')}
                        className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
                        Mark as Picked Up
                      </button>
                    )}
                    {d.status === 'Picked Up' && (
                      <button onClick={() => updateStatus(d._id, 'Out for Delivery')}
                        className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-sm font-medium">
                        Start Delivery
                      </button>
                    )}
                    {d.status === 'Out for Delivery' && (
                      <button onClick={() => updateStatus(d._id, 'Delivered')}
                        className="px-3 py-1.5 bg-success text-success-foreground rounded-lg text-sm font-medium">
                        Mark Delivered
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div>
          <h2 className="font-heading text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" /> History ({history.length})
          </h2>
          {history.length === 0 ? (
            <p className="text-muted-foreground">No delivery history</p>
          ) : (
            <div className="space-y-2">
              {history.map((d) => (
                <div key={d._id} className="bg-card rounded-xl border p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-success" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">#{d.orderId}</p>
                      <p className="text-xs text-muted-foreground">{d.dropAddress?.slice(0, 40)}...</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-success">₹{(d.orderRef?.totalAmount || 0).toLocaleString()}</p>
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
    </div>
  );
}
