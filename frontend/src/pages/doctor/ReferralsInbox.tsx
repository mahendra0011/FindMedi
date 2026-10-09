import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

/**
 * Doc 11 §5 P1 — consult/referral inbox (second-opinion requests addressed
 * to me). Fixes D11 (visibility; decisions stay in the second-opinion flow).
 */
export default function ReferralsInbox() {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const r: any = await (api as any).getSecondOpinionInbox();
        setRows(r?.requests || r?.data || []);
      } catch { toast.error('Failed to load referrals'); }
    })();
  }, []);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-heading font-bold">Referrals ({rows.length})</h1>
      <div className="space-y-2">
        {rows.map((q: any) => (
          <Card key={q._id}>
            <CardContent className="p-3 text-sm">
              <p className="font-medium">{q.subject || q.reason || 'Consult request'}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Status: {q.status} · {q.createdAt ? new Date(q.createdAt).toLocaleDateString('en-IN') : ''}
              </p>
            </CardContent>
          </Card>
        ))}
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No pending referrals.</p>}
      </div>
    </div>
  );
}
