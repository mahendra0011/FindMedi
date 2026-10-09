import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

/**
 * Doc 11 P1 — earnings statement: completed visits, facility commission
 * terms, payout batches + TDS note. Per-service breakup needs per-visit
 * fee attribution (not yet stored — shown as pending).
 */
export default function EarningsStatement() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const r: any = await (api as any).getEarningsStatement({});
        setData(r);
      } catch { toast.error('Failed to load statement'); }
    })();
  }, []);

  if (!data) return <p className="text-sm text-muted-foreground p-4">Loading statement…</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-heading font-bold">Earnings Statement</h1>
      <div className="grid sm:grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Completed visits</p><p className="text-xl font-bold">{data.completedVisits}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Commission</p><p className="text-xl font-bold">{data.commission ? `${data.commission.percent}%${data.commission.cap ? ` (cap ₹${data.commission.cap})` : ''}` : '—'}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Schedule</p><p className="text-xl font-bold capitalize">{data.commission?.schedule || '—'}</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Payout batches</CardTitle></CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          {(data.payouts || []).map((p: any, i: number) => (
            <p key={i} className="flex justify-between">
              <span>{p.period?.[0] ? new Date(p.period[0]).toLocaleDateString('en-IN') : ''} → {p.period?.[1] ? new Date(p.period[1]).toLocaleDateString('en-IN') : ''} · {p.status}</span>
              <b>₹{Number(p.net || 0).toLocaleString('en-IN')}</b>
            </p>
          ))}
          {!(data.payouts || []).length && <p className="text-muted-foreground">No payouts yet.</p>}
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">{data.note}</p>
    </div>
  );
}
