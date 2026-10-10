import { useState, useEffect } from 'react';
import { Search, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataGrid } from '@/components/ui/System';
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

  const columns = [
    { key: 'orderId', label: 'Order ID', render: (v, r) => <span className="font-medium text-foreground">{v || r._id?.slice(-6)}</span> },
    { key: 'customer', label: 'Customer', render: (v, r) => <span className="text-muted-foreground">{r.patientName || v || '—'}</span> },
    { key: 'items', label: 'Items', render: (v) => <span className="text-muted-foreground">{v ?? '—'}</span> },
    { key: 'total', label: 'Total', render: (v) => <span className="font-medium text-foreground">₹{(v || 0).toLocaleString()}</span> },
    { key: 'status', label: 'Status', render: (v) => <Badge className={statusColors[v]}>{v}</Badge> },
  ];

  // The API already applies the status + search filters, so the rows handed in
  // ARE the result set — the grid must not re-filter or re-page them.
  const rows = orders.map(o => ({
    ...o,
    orderId: o.orderId || o._id?.slice(-6),
    customer: o.patientName || o.customer || '',
    items: o.items?.length || o.totalItems || null,
    total: o.total || o.amount || 0,
  }));

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <h1 className="font-heading text-xl font-bold text-foreground">Orders</h1>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={() => {
            const csvRows = [["OrderID", "Customer", "Items", "Total", "Status"], ...rows.map(o => [o.orderId, o.customer, o.items ?? "", o.total, o.status || ""])];
            const csv = csvRows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "pharmacy-orders.csv";
            a.click();
          }}>Export CSV</Button>
          <select value={status} onChange={e => setStatus(e.target.value)} aria-label="Filter by status" className="h-10 rounded-lg border border-border bg-background text-sm px-3">
            <option value="All">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Processing">Processing</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search orders..." aria-label="Search orders" className="pl-9" />
          </div>
        </div>
      </div>

      <DataGrid
        columns={columns}
        rows={rows}
        rowKey="_id"
        onRowClick={setSelected}
        empty={loading ? 'Loading…' : 'No orders found'}
        showSearch={false}
        manualPagination
      />

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSelected(null)}>
          <div className="bg-card rounded-2xl shadow-xl border p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-lg font-bold text-foreground">{selected.orderId || 'Order Details'}</h2>
              <Button variant="ghost" size="icon" aria-label="Close" onClick={() => setSelected(null)}><ShoppingCart className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2"><span className="text-muted-foreground">Customer:</span><span className="text-foreground font-medium">{selected.patientName || selected.customer || '—'}</span></div>
              <div className="grid grid-cols-2 gap-2"><span className="text-muted-foreground">Status:</span><Badge className={statusColors[selected.status]}>{selected.status}</Badge></div>
              <div className="grid grid-cols-2 gap-2"><span className="text-muted-foreground">Total:</span><span className="text-foreground font-medium">₹{(selected.total || selected.amount || 0).toLocaleString()}</span></div>
              <div className="grid grid-cols-2 gap-2"><span className="text-muted-foreground">Items:</span><span className="text-foreground">{selected.items?.length || selected.totalItems || '—'}</span></div>
              {selected.notes && <div className="grid grid-cols-2 gap-2"><span className="text-muted-foreground">Notes:</span><span className="text-foreground">{selected.notes}</span></div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
