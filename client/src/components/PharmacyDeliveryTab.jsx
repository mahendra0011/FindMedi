import { useState, useEffect } from 'react';
import { Truck, MapPin, Users, Package, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const statusColors = {
  pending: 'bg-warning/10 text-warning',
  approved: 'bg-success/10 text-success',
  rejected: 'bg-destructive/10 text-destructive',
  suspended: 'bg-muted text-muted-foreground',
};

export default function PharmacyDeliveryTab() {
  const [nearby, setNearby] = useState([]);
  const [allPartners, setAllPartners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNearby();
    fetchAll();
  }, []);

  const fetchNearby = async () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      try {
        const data = await api.get(`/delivery-partners/nearby?lat=${latitude}&lng=${longitude}&radiusKm=10`);
        setNearby(data);
      } catch {
        toast.error('Failed to load nearby partners');
      }
      setLoading(false);
    });
  };

  const fetchAll = async () => {
    try {
      const data = await api.get('/delivery-partners/all');
      setAllPartners(data);
    } catch {
      toast.error('Failed to load partners');
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Delivery Partners</h1>
          <p className="page-subtitle">Manage delivery partners for your pharmacy</p>
        </div>
        <button onClick={() => { fetchNearby(); fetchAll(); }} className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg text-sm hover:bg-muted/80">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Nearby Partners */}
      <div className="bg-card rounded-xl border p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <MapPin className="w-5 h-5 text-primary" />
          <h3 className="font-heading font-semibold text-lg text-card-foreground">Nearby Available Partners</h3>
        </div>

        {nearby.length === 0 ? (
          <p className="text-muted-foreground text-sm">No delivery partners currently available nearby.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {nearby.map((partner) => (
              <div key={partner._id} className="border border-border/60 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Truck className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{partner.name}</p>
                    <p className="text-xs text-muted-foreground">{partner.vehicleType} • {partner.vehicleNumber || '—'}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Rating:</span>
                    <span className="font-medium">{partner.rating || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Deliveries:</span>
                    <span className="font-medium">{partner.totalDeliveries || 0}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${partner.isOnline ? 'bg-success' : 'bg-muted'}`} />
                    <span className={partner.isOnline ? 'text-success' : 'text-muted-foreground'}>
                      {partner.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All Partners */}
      <div className="bg-card rounded-xl border p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="font-heading font-semibold text-lg text-card-foreground">All Delivery Partners</h3>
        </div>

        {allPartners.length === 0 ? (
          <p className="text-muted-foreground text-sm">No delivery partners registered.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">Name</th>
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">Vehicle</th>
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">Status</th>
                  <th className="text-right py-3 px-2 text-muted-foreground font-medium">Deliveries</th>
                  <th className="text-right py-3 px-2 text-muted-foreground font-medium">Rating</th>
                </tr>
              </thead>
              <tbody>
                {allPartners.map((p) => (
                  <tr key={p._id} className="border-b border-border last:border-0">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">
                          {p.name?.charAt(0)}
                        </div>
                        <span className="font-medium text-foreground">{p.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-muted-foreground">{p.vehicleType} {p.vehicleNumber}</td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[p.status] || 'bg-muted text-muted-foreground'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right text-card-foreground">{p.totalDeliveries || 0}</td>
                    <td className="py-3 px-2 text-right text-card-foreground">{p.rating || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
