import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Package, CheckCircle2, XCircle, MapPin, Search, IndianRupee, Calendar, Building2, ArrowRight, ShieldCheck, Bike } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const statusColors: Record<string, string> = {
  Delivered: 'bg-success/10 text-success border-success/20',
  Failed: 'bg-destructive/10 text-destructive border-destructive/20',
  Cancelled: 'bg-muted text-muted-foreground border-border',
};

export default function DeliveryHistory() {
  const [deliveries, setDeliveries] = useState<{ active: any[]; history: any[] }>({ active: [], history: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const dels = await api.get('/delivery-partners/my-deliveries').catch(() => ({ active: [], history: [] }));
      setDeliveries(dels);
    } catch {
      toast.error('Failed to load history');
    }
    setLoading(false);
  };

  const filtered = (deliveries.history || []).filter((d) => {
    const ms =
      !search ||
      d.orderId?.toLowerCase().includes(search.toLowerCase()) ||
      d.dropAddress?.toLowerCase().includes(search.toLowerCase()) ||
      d.pickupAddress?.toLowerCase().includes(search.toLowerCase());
    const mf = filter === 'All' || d.status === filter;
    return ms && mf;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-muted-foreground">Loading delivery archive...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full pb-12">
      {/* ── Top Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-border/80 bg-card shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-foreground">
              Delivery Task Archive
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Chronological log of fulfilled medicine orders and credited earnings
            </p>
          </div>
        </div>

        <Badge variant="outline" className="text-success border-success/30 bg-success/10 text-xs px-3 py-1 rounded-full flex items-center gap-1.5 self-start sm:self-auto">
          <ShieldCheck className="w-4 h-4" /> {deliveries.history?.length || 0} Total Completed
        </Badge>
      </div>

      {/* ── Filters & Search ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex gap-1.5 p-1 rounded-xl bg-muted/60 border border-border/60 overflow-x-auto">
          {['All', 'Delivered', 'Failed', 'Cancelled'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                filter === f
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f} ({f === 'All' ? deliveries.history?.length || 0 : (deliveries.history || []).filter((d) => d.status === f).length})
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order ID or address..."
            className="pl-9 h-10 text-xs rounded-xl"
          />
        </div>
      </div>

      {/* ── Delivery Cards ────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border border-dashed border-border/80 bg-card p-8 shadow-sm">
          <Clock className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="font-bold text-base text-foreground">No Deliveries Found</p>
          <p className="text-xs text-muted-foreground mt-1">No past trips match your current search and filter settings.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((d, i) => (
            <motion.div
              key={d._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                      d.status === 'Delivered'
                        ? 'bg-success/10 text-success'
                        : 'bg-destructive/10 text-destructive'
                    }`}
                  >
                    {d.status === 'Delivered' ? (
                      <CheckCircle2 className="w-5 h-5 text-success" />
                    ) : (
                      <XCircle className="w-5 h-5 text-destructive" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-foreground">Order #{d.orderId}</p>
                      <Badge className={`text-[10px] font-bold ${statusColors[d.status] || ''}`}>
                        {d.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Completed: {d.deliveredAt ? new Date(d.deliveredAt).toLocaleString() : 'Past'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-base font-black text-success block">
                    +₹{d.orderRef?.deliveryFee || 50}
                  </span>
                  <span className="text-[10px] text-muted-foreground">Rider Fee Credited</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-3 border-t border-border/60">
                <div className="flex items-center gap-2 text-muted-foreground truncate">
                  <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="truncate">From: {d.pickupAddress}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground truncate">
                  <MapPin className="w-3.5 h-3.5 text-destructive shrink-0" />
                  <span className="truncate">To: {d.dropAddress}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
