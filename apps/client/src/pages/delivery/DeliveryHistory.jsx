import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Package, CheckCircle, XCircle, MapPin, Search, IndianRupee, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const statusColors = {
  Delivered: 'bg-success/10 text-success',
  Failed: 'bg-destructive/10 text-destructive',
  Cancelled: 'bg-muted text-muted-foreground',
};

export default function DeliveryHistory() {
  const [deliveries, setDeliveries] = useState({ active: [], history: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const dels = await api.get('/delivery-partners/my-deliveries');
      setDeliveries(dels);
    } catch {
      toast.error('Failed to load history');
    }
    setLoading(false);
  };

  const filtered = (deliveries.history || []).filter((d) => {
    const ms = !search || d.orderId?.toLowerCase().includes(search.toLowerCase()) || d.dropAddress?.toLowerCase().includes(search.toLowerCase());
    const mf = filter === 'All' || d.status === filter;
    return ms && mf;
  });

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
        <h1 className="font-heading text-2xl font-bold text-foreground">Delivery History</h1>
        <p className="text-muted-foreground">{deliveries.history?.length || 0} past deliveries</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['All', 'Delivered', 'Failed', 'Cancelled'].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {f} ({f === 'All' ? deliveries.history?.length || 0 : (deliveries.history || []).filter(d => d.status === f).length})
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by order ID or address..." className="pl-10" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-xl border border-dashed">
          <Clock className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground text-lg">No deliveries found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((d, i) => (
            <motion.div key={d._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
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
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">Order #{d.orderId}</p>
                      <Badge className={`text-xs ${statusColors[d.status] || ''}`}>{d.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{d.dropAddress}</p>
                  </div>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <div className="flex items-center gap-1 justify-end">
                    <Calendar className="w-3 h-3" />
                    {d.deliveredAt ? new Date(d.deliveredAt).toLocaleDateString() : '-'}
                  </div>
                  {d.orderRef?.total && (
                    <div className="flex items-center gap-1 justify-end mt-1">
                      <IndianRupee className="w-3 h-3" /> {d.orderRef.total}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                <span>{d.pickupAddress} → {d.dropAddress}</span>
              </div>

              <div className="mt-2 flex gap-1">
                {d.trackingHistory?.slice(-3).map((t, j) => (
                  <span key={j} className="text-[10px] text-muted-foreground bg-muted/20 px-2 py-0.5 rounded-full">
                    {new Date(t.timestamp).toLocaleTimeString()}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
