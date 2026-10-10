import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Search, BadgeCheck, XCircle, IndianRupee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataGrid } from '@/components/ui/System';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const statusColors = {
  Pending: 'bg-warning/10 text-warning', Approved: 'bg-success/10 text-success',
  Refunded: 'bg-info/10 text-info', Rejected: 'bg-destructive/10 text-destructive',
};

export default function PharmacyReturns() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await api.getPharmacyReturns({ search }); setReturns(res.returns || []); }
    catch (e) { toast.error(e.message); }
    setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id, status) => {
    try { await api.updatePharmacyReturn(id, { status }); toast.success(`Return ${status}`); load(); }
    catch (e) { toast.error(e.message); }
  };

  const columns = [
    { key: 'returnId', label: 'Return ID', render: (v, r) => <span className="font-medium text-foreground">{v || r._id?.slice(-6)}</span> },
    { key: 'medicine', label: 'Medicine', render: (v) => <span className="text-muted-foreground">{v || '—'}</span> },
    { key: 'quantity', label: 'Qty', render: (v) => <span className="text-muted-foreground">{v || 0}</span> },
    { key: 'status', label: 'Status', render: (v) => <Badge className={statusColors[v]}>{v}</Badge> },
    {
      key: '_actions',
      label: 'Actions',
      sortable: false,
      render: (_v, r) => (
        <div className="flex items-center justify-end gap-1">
          {r.status === 'Pending' && (
            <>
              <Button variant="ghost" size="sm" className="h-8 text-xs text-success" onClick={() => updateStatus(r._id, 'Approved')}><BadgeCheck className="w-4 h-4 mr-1" />Approve</Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive" onClick={() => updateStatus(r._id, 'Rejected')}><XCircle className="w-4 h-4 mr-1" />Reject</Button>
            </>
          )}
          {r.status === 'Approved' && (
            <Button variant="ghost" size="sm" className="h-8 text-xs text-info" onClick={() => updateStatus(r._id, 'Refunded')}><IndianRupee className="w-4 h-4 mr-1" />Refund</Button>
          )}
        </div>
      ),
    },
  ];

  // Server-side search already narrowed this list, so the grid must not filter
  // or page it again.
  const rows = returns.map(r => ({ ...r, medicine: r.medicineName || r.medicine?.name || '' }));

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <h1 className="font-heading text-xl font-bold text-foreground">Returns</h1>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search returns..." aria-label="Search returns" className="pl-9" />
        </div>
      </div>

      <DataGrid
        columns={columns}
        rows={rows}
        rowKey="_id"
        empty={loading ? 'Loading…' : 'No returns found'}
        showSearch={false}
        manualPagination
      />
    </div>
  );
}
