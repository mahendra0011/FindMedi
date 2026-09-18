import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Search, Calendar, Clock, IndianRupee, AlertCircle, Loader2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const statusFilters = ['All', 'Pending', 'Processing', 'Refunded', 'Failed'];

const statusConfig = {
  Pending: { label: 'Pending', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', icon: Clock },
  Processing: { label: 'Processing', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: Loader2 },
  Refunded: { label: 'Refunded', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', icon: RotateCcw },
  Failed: { label: 'Failed', color: 'bg-red-500/10 text-red-600 border-red-500/20', icon: AlertCircle },
};

export default function PatientRefunds() {
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    // Placeholder - content will be added later
    setLoading(false);
  }, []);

  const filtered = refunds.filter(r => {
    const ms = !search || (r.refundId || '').toLowerCase().includes(search.toLowerCase());
    const mf = filter === 'All' || r.status === filter;
    return ms && mf;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">My Refunds</h1>
        <p className="text-muted-foreground text-sm">{refunds.length} total refund requests</p>
      </div>

      {/* Stats Cards */}
      {refunds.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {statusFilters.map((s) => {
            const count = s === 'All' ? refunds.length : refunds.filter(r => r.status === s).length;
            const cfg = statusConfig[s] || { icon: FileText, color: 'text-muted-foreground bg-muted/30' };
            const StatusIcon = cfg.icon;
            const colorParts = cfg.color.split(' ');
            if (s === 'All') {
              return (
                <div key={s} className="bg-card rounded-2xl border border-border/50 p-4 shadow-sm">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                      <RotateCcw className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-xs font-medium text-muted-foreground">Total</p>
                  </div>
                  <p className="font-heading text-2xl font-bold text-foreground">{count}</p>
                </div>
              );
            }
            return (
              <div key={s} className="bg-card rounded-2xl border border-border/50 p-4 shadow-sm">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className={`w-8 h-8 rounded-xl ${colorParts[0]} flex items-center justify-center`}>
                    <StatusIcon className={`w-4 h-4 ${colorParts[1]}`} />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">{s}</p>
                </div>
                <p className={`font-heading text-2xl font-bold ${colorParts[1]}`}>{count}</p>
              </div>
            );
          })}
        </motion.div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1.5 flex-wrap flex-1">
          {statusFilters.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                filter === f
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80 border border-border/40'
              }`}>
              {f} ({f === 'All' ? refunds.length : refunds.filter(r => r.status === f).length})
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by refund ID..."
            className="pl-10 h-10 rounded-xl bg-background border-border/50 text-sm" />
        </div>
      </div>

      {/* Refunds List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-3xl border border-border/50 p-12 text-center">
          <div className="w-16 h-16 rounded-3xl bg-muted/30 flex items-center justify-center mx-auto mb-4">
            <RotateCcw className="w-8 h-8 text-muted-foreground/30" />
          </div>
          <p className="text-lg font-semibold text-foreground">No refunds yet</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">Your refund requests will appear here once submitted.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((r) => (
            <motion.div key={r._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="group bg-card rounded-3xl border border-border/50 overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all duration-300">
              <div className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-sm">
                      <RotateCcw className="w-6 h-6 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-heading font-semibold text-foreground text-sm">#{r.refundId}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${statusConfig[r.status]?.color || 'bg-muted text-muted-foreground'}`}>
                    {statusConfig[r.status]?.label || r.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <IndianRupee className="w-3.5 h-3.5" />
                  <span>Refund Amount: ₹{r.amount?.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}