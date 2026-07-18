import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Package, Search, Calendar, Eye, Clock, Pill, IndianRupee, MapPin, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

const statusColors = {
  Pending: 'bg-warning/10 text-warning',
  Shipped: 'bg-info/10 text-info',
  Delivered: 'bg-success/10 text-success',
  Cancelled: 'bg-destructive/10 text-destructive',
};
const paymentColors = {
  Unpaid: 'bg-warning/10 text-warning',
  Paid: 'bg-success/10 text-success',
  Refunded: 'bg-info/10 text-info',
};

export default function PatientMedicineOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.getPharmacyOrders({});
        setOrders(res.orders || []);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, []);

  const filtered = orders.filter(o => {
    const ms = !search || (o.orderId || '').toLowerCase().includes(search.toLowerCase());
    const mf = filter === 'All' || o.status === filter;
    return ms && mf;
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">My Medicine Orders</h1>
        <p className="text-muted-foreground">{orders.length} total orders</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['All', 'Pending', 'Shipped', 'Delivered', 'Cancelled'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
            {f} ({f === 'All' ? orders.length : orders.filter(o => o.status === f).length})
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by order ID..." className="pl-10" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-dashed">
          <ShoppingCart className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground text-lg">No orders found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((order, i) => (
            <motion.div key={order._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-card rounded-2xl border border-border/60 p-5 hover:shadow-lg transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Package className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-heading font-semibold text-foreground">Order #{order.orderId}</h3>
                      <Badge className={statusColors[order.status] || statusColors.Pending}>{order.status}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" /> {new Date(order.orderDate).toLocaleDateString()}
                      <Clock className="w-3 h-3 ml-1" /> {new Date(order.orderDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><IndianRupee className="w-3 h-3" /> {order.total?.toFixed(2)}</span>
                      <Badge className={paymentColors[order.paymentStatus] || paymentColors.Unpaid}>{order.paymentStatus}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {order.items?.map((item, j) => (
                        <Badge key={j} variant="secondary" className="text-[10px] flex items-center gap-1">
                          <Pill className="w-2.5 h-2.5" /> {item.medicineName} x{item.qty}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      {order.deliveryAddress && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {order.deliveryAddress}</span>}
                      {order.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {order.phone}</span>}
                    </div>
                    {order.note && <p className="text-xs text-muted-foreground/60 mt-1 italic">Note: {order.note}</p>}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}