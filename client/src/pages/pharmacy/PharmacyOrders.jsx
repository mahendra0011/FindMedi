import { useState, useEffect } from 'react';
import { Search, ShoppingCart, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

const statusColors = {
  Pending: 'bg-warning/10 text-warning', Processing: 'bg-info/10 text-info',
  Completed: 'bg-success/10 text-success', Cancelled: 'bg-destructive/10 text-destructive',
};

export default function PharmacyOrders() {
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try { const res = await api.getPharmacyOrders({ status: status === 'All' ? '' : status, search }); setOrders(res.orders || []); }
      catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [status, search]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <h1 className="font-heading text-xl font-bold text-foreground">Orders</h1>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select value={status} onChange={e => setStatus(e.target.value)} className="h-10 rounded-lg border border-border bg-background text-sm px-3">
            <option value="All">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Processing">Processing</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search orders..." className="pl-9" />
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Order ID</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Customer</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground hidden sm:table-cell">Items</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground">Total</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o._id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => setSelected(o)}>
                <td className="py-3 px-4 font-medium text-foreground">{o.orderId || o._id?.slice(-6)}</td>
                <td className="py-3 px-4 text-muted-foreground">{o.patientName || o.customer || '—'}</td>
                <td className="py-3 px-4 text-right hidden sm:table-cell text-muted-foreground">{o.items?.length || o.totalItems || '—'}</td>
                <td className="py-3 px-4 text-right font-medium text-foreground">Rs {(o.total || o.amount || 0).toLocaleString()}</td>
                <td className="py-3 px-4 text-right"><Badge className={statusColors[o.status]}>{o.status}</Badge></td>
              </tr>
            ))}
            {orders.length === 0 && !loading && <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">No orders found</td></tr>}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSelected(null)}>
          <div className="bg-card rounded-2xl shadow-xl border p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-lg font-bold text-foreground">{selected.orderId || 'Order Details'}</h2>
              <Button variant="ghost" size="icon" onClick={() => setSelected(null)}><ShoppingCart className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2"><span className="text-muted-foreground">Customer:</span><span className="text-foreground font-medium">{selected.patientName || selected.customer || '—'}</span></div>
              <div className="grid grid-cols-2 gap-2"><span className="text-muted-foreground">Status:</span><Badge className={statusColors[selected.status]}>{selected.status}</Badge></div>
              <div className="grid grid-cols-2 gap-2"><span className="text-muted-foreground">Total:</span><span className="text-foreground font-medium">Rs {(selected.total || selected.amount || 0).toLocaleString()}</span></div>
              <div className="grid grid-cols-2 gap-2"><span className="text-muted-foreground">Items:</span><span className="text-foreground">{selected.items?.length || selected.totalItems || '—'}</span></div>
              {selected.notes && <div className="grid grid-cols-2 gap-2"><span className="text-muted-foreground">Notes:</span><span className="text-foreground">{selected.notes}</span></div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
