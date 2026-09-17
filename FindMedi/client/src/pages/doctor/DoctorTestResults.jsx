import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FlaskConical, User, Search, Calendar, Eye, Clock, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const statusColors = {
  pending: 'bg-warning/10 text-warning',
  collected: 'bg-info/10 text-info',
  processing: 'bg-muted-foreground/10 text-muted-foreground',
  completed: 'bg-success/10 text-success',
  verified: 'bg-success/10 text-success',
  cancelled: 'bg-destructive/10 text-destructive',
};

export default function DoctorTestResults() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.getLabOrders({});
        setOrders(res.orders || []);
      } catch (e) { toast.error(e.message); }
      setLoading(false);
    };
    load();
  }, []);

  const filtered = orders.filter(o => {
    const ms = !search || (o.patientName || '').toLowerCase().includes(search.toLowerCase());
    const mf = filter === 'All' || o.status === filter;
    return ms && mf;
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Test Results</h1>
        <p className="text-muted-foreground">{orders.length} total lab orders</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['All', 'pending', 'collected', 'processing', 'completed', 'verified', 'cancelled'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)} ({f === 'All' ? orders.length : orders.filter(o => o.status === f).length})
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by patient name..." className="pl-10" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-dashed">
          <FlaskConical className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground text-lg">No test results found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((order, i) => (
            <motion.div key={order._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-card rounded-2xl border border-border/60 p-5 hover:shadow-lg transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center">
                    <FlaskConical className="w-6 h-6 text-info" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-foreground">{order.patientName}</h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" /> {new Date(order.createdAt).toLocaleDateString()}
                      <Clock className="w-3 h-3 ml-1" /> {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {order.tests?.map((t, j) => (
                        <Badge key={j} variant="secondary" className="text-[10px]">
                          {t.testName || t.name || t}
                          {t.resultValue && `: ${t.resultValue}`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {order.priority === 'emergency' || order.priority === 'high' || order.priority === 'STAT' ? (
                    <Badge className="bg-destructive/10 text-destructive">STAT</Badge>
                  ) : null}
                  <Badge className={statusColors[order.status] || statusColors.pending}>
                    {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
                  </Badge>
                  <Button variant="ghost" size="sm" className="gap-1" onClick={() => setSelectedOrder(order)}>
                    <Eye className="w-3.5 h-3.5" /> View Results
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedOrder(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading text-lg font-bold text-foreground">Test Results</h3>
                <Badge className={statusColors[selectedOrder.status] || statusColors.pending}>
                  {selectedOrder.status?.charAt(0).toUpperCase() + selectedOrder.status?.slice(1)}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl">
                  <User className="w-10 h-10 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">{selectedOrder.patientName}</p>
                    <p className="text-xs text-muted-foreground">Patient</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl">
                  <Calendar className="w-10 h-10 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">{new Date(selectedOrder.createdAt).toLocaleDateString()}</p>
                    <p className="text-xs text-muted-foreground">Order Date</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground mb-1">Tests & Results</p>
                {selectedOrder.tests?.map((t, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-border/40 bg-muted/10">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-foreground text-sm">{t.testName || t.name || `Test #${idx + 1}`}</h4>
                      {t.status === 'completed' || t.status === 'verified' ? (
                        <Badge className="bg-success/10 text-success flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Done</Badge>
                      ) : (
                        <Badge className="bg-warning/10 text-warning flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</Badge>
                      )}
                    </div>
                    {t.resultValue && (
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-foreground font-semibold">{t.resultValue}</span>
                        {t.unit && <span className="text-muted-foreground">{t.unit}</span>}
                        {t.normalRange && <span className="text-muted-foreground/60">(Normal: {t.normalRange})</span>}
                      </div>
                    )}
                    {t.notes && <p className="text-xs text-muted-foreground/70 mt-1 italic">{t.notes}</p>}
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="outline" className="flex-1" onClick={() => setSelectedOrder(null)}>Close</Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}