/**
 * Returns — ported from client/src/pages/pharmacy/PharmacyReturns.jsx (Phase 4).
 * Medicine return requests with approve/reject/refund actions.
 */
'use client';

import { useState } from 'react';
import { Search, BadgeCheck, XCircle, IndianRupee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useReturns, useUpdateReturn } from '@/features/pharmacy-orders/hooks';

const statusColors: Record<string, string> = {
  Pending: 'bg-warning/10 text-warning',
  Approved: 'bg-success/10 text-success',
  Refunded: 'bg-info/10 text-info',
  Rejected: 'bg-destructive/10 text-destructive',
};

interface ReturnItem {
  _id: string;
  returnId?: string;
  medicineName?: string;
  medicine?: { name?: string };
  quantity?: number;
  status?: string;
}

const onError = (e: Error) => toast.error(e.message);

export default function ReturnsPage() {
  const [search, setSearch] = useState('');

  const { data: returnsData, isLoading: loading } = useReturns(search);
  const updateMut = useUpdateReturn();

  const returns = ((Array.isArray(returnsData) ? returnsData : []) as unknown as ReturnItem[]).filter(
    (r) =>
      !search ||
      (r.returnId || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.medicineName || '').toLowerCase().includes(search.toLowerCase()),
  );

  const updateStatus = (id: string, status: string) => {
    updateMut.mutate(
      { id, status },
      { onSuccess: () => toast.success(`Return ${status}`), onError },
    );
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-xl font-bold text-foreground">Returns</h1>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search returns..." className="pl-9" />
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
            {loading ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-muted-foreground">
                  Loading returns…
                </td>
              </tr>
            ) : (
              returns.map((r) => (
                <tr key={r._id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="py-3 px-4 font-medium text-foreground">{r.returnId || r._id.slice(-6)}</td>
                  <td className="py-3 px-4 text-muted-foreground">{r.medicineName || r.medicine?.name || '—'}</td>
                  <td className="py-3 px-4 text-center text-muted-foreground">{r.quantity || 0}</td>
                  <td className="py-3 px-4 text-center">
                    <Badge className={statusColors[r.status ?? ''] ?? ''}>{r.status}</Badge>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {r.status === 'Pending' && (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-success"
                          onClick={() => updateStatus(r._id, 'Approved')}
                        >
                          <BadgeCheck className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-destructive"
                          onClick={() => updateStatus(r._id, 'Rejected')}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                    {r.status === 'Approved' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-info"
                        onClick={() => updateStatus(r._id, 'Refunded')}
                      >
                        <IndianRupee className="w-4 h-4 mr-1" />
                        Refund
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
            {!loading && returns.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-muted-foreground">
                  No returns found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
