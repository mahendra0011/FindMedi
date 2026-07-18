import { useState, useEffect } from 'react';
import { RefreshCw, Search, BadgeCheck, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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

  const load = async () => {
    setLoading(true);
    try { const res = await api.getPharmacyReturns({ search }); setReturns(res.returns || []); }
    catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [search]);

  const updateStatus = async (id, status) => {
    try { await api.updatePharmacyReturn(id, { status }); toast.success(`Return ${status}`); load(); }
    catch (e) { toast.error(e.message); }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <h1 className="font-heading text-xl font-bold text-foreground">Returns</h1>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search returns..." className="pl-9" />
        </div>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Return ID</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Medicine</th>
              <th className="text-center py-3 px-4 font-medium text-muted-foreground">Qty</th>
              <th className="text-center py-3 px-4 font-medium text-muted-foreground">Status</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {returns.map(r => (
              <tr key={r._id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                <td className="py-3 px-4 font-medium text-foreground">{r.returnId || r._id?.slice(-6)}</td>
                <td className="py-3 px-4 text-muted-foreground">{r.medicineName || r.medicine?.name || '—'}</td>
                <td className="py-3 px-4 text-center text-muted-foreground">{r.quantity || 0}</td>
                <td className="py-3 px-4 text-center"><Badge className={statusColors[r.status]}>{r.status}</Badge></td>
                <td className="py-3 px-4 text-right">
                  {r.status === 'Pending' && (
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" className="h-8 text-xs text-success" onClick={() => updateStatus(r._id, 'Approved')}><BadgeCheck className="w-4 h-4 mr-1" />Approve</Button>
                      <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive" onClick={() => updateStatus(r._id, 'Rejected')}><XCircle className="w-4 h-4 mr-1" />Reject</Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {returns.length === 0 && !loading && <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">No returns found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
