import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Truck, Package, Search, Calendar, Clock, MapPin, Phone, User, Loader2, CheckCircle, XCircle, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

const statusColors = {
  'Pending Pickup': 'bg-warning/10 text-warning',
  'In Transit': 'bg-info/10 text-info',
  'Delivered': 'bg-success/10 text-success',
  'Failed': 'bg-destructive/10 text-destructive',
};

export default function PharmacyDelivery() {
  const [deliveries, setDeliveries] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ orderId: '', deliveryPerson: '', phone: '' });

  const load = async () => {
    try {
      const [delRes, ordRes] = await Promise.all([
        api.getPharmacyDeliveries({}),
        api.getPharmacyOrders({}),
      ]);
      setDeliveries(delRes.deliveries || []);
      setOrders(ordRes.orders || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = deliveries.filter(d => {
    const ms = !search || (d.deliveryPerson || '').toLowerCase().includes(search.toLowerCase())
      || (d.orderId || '').toLowerCase().includes(search.toLowerCase());
    const mf = filter === 'All' || d.status === filter;
    return ms && mf;
  });

  const handleCreate = async () => {
    try {
      await api.createPharmacyDelivery(form);
      setShowCreate(false);
      setForm({ orderId: '', deliveryPerson: '', phone: '' });
      load();
    } catch (e) { console.error(e); }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await api.updatePharmacyDelivery(id, { status });
      load();
    } catch (e) { console.error(e); }
  };

  const undelivered = orders.filter(o => o.status === 'Pending' || o.status === 'Shipped');
  const activeDeliveries = deliveries.filter(d => d.status !== 'Delivered' && d.status !== 'Failed');

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Delivery Management</h1>
          <p className="text-muted-foreground">{activeDeliveries.length} active, {deliveries.length} total</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)} className="gap-2">
          <Truck className="w-4 h-4" /> New Delivery
        </Button>
      </div>

      {showCreate && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border/60 p-5">
          <h3 className="font-heading font-semibold text-foreground mb-4">Assign Delivery</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Order</label>
              <select value={form.orderId} onChange={e => setForm({ ...form, orderId: e.target.value })}
                className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm">
                <option value="">Select order...</option>
                {undelivered.map(o => (
                  <option key={o._id} value={o.orderId}>{o.orderId} - {o.patientName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Delivery Person</label>
              <Input value={form.deliveryPerson} onChange={e => setForm({ ...form, deliveryPerson: e.target.value })}
                placeholder="Name" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Phone</label>
              <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                placeholder="Phone number" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreate} className="gap-1"><Truck className="w-4 h-4" /> Assign</Button>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </motion.div>
      )}

      <div className="flex gap-2 flex-wrap">
        {['All', 'Pending Pickup', 'In Transit', 'Delivered', 'Failed'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
            {f} ({f === 'All' ? deliveries.length : deliveries.filter(d => d.status === f).length})
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by delivery person or order ID..." className="pl-10" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-dashed">
          <Truck className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground text-lg">No deliveries found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((del, i) => (
            <motion.div key={del._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-card rounded-2xl border border-border/60 p-5 hover:shadow-lg transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    del.status === 'Delivered' ? 'bg-success/10' : del.status === 'Failed' ? 'bg-destructive/10' : 'bg-warning/10'
                  }`}>
                    {del.status === 'Delivered' ? <CheckCircle className="w-6 h-6 text-success" /> :
                     del.status === 'Failed' ? <XCircle className="w-6 h-6 text-destructive" /> :
                     <Truck className="w-6 h-6 text-warning" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-heading font-semibold text-foreground">{del.deliveryPerson}</h3>
                      <span className="text-xs text-muted-foreground font-mono">Order #{del.orderId}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" /> {new Date(del.assignedAt).toLocaleDateString()}
                      {del.estimatedTime && <><Clock className="w-3 h-3 ml-1" /> ETA: {del.estimatedTime}</>}
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      {del.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {del.phone}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge className={statusColors[del.status] || statusColors['Pending Pickup']}>{del.status}</Badge>
                  {del.status === 'Pending Pickup' && (
                    <Button size="sm" className="gap-1" onClick={() => handleStatusUpdate(del._id, 'In Transit')}>
                      <Navigation className="w-3.5 h-3.5" /> Start
                    </Button>
                  )}
                  {del.status === 'In Transit' && (
                    <Button size="sm" className="gap-1 bg-success" onClick={() => handleStatusUpdate(del._id, 'Delivered')}>
                      <CheckCircle className="w-3.5 h-3.5" /> Delivered
                    </Button>
                  )}
                </div>
              </div>
              {del.tracking?.length > 0 && (
                <div className="mt-4 pt-3 border-t border-border/40">
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1"><Navigation className="w-3 h-3" /> Tracking</p>
                  <div className="space-y-1">
                    {del.tracking.map((t, j) => (
                      <div key={j} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span>{t.location}</span>
                        <span className="text-muted-foreground/60">{t.time ? new Date(t.time).toLocaleString() : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}