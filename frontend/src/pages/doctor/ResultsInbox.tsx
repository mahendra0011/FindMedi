import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

/**
 * Doc 11 §5 P0 — results inbox: critical first, explicit ack (audited
 * server-side). Fixes D5 (server-filtered to my orders) and D9.
 */
export default function ResultsInbox() {
  const [rows, setRows] = useState<any[]>([]);

  const load = async () => {
    try {
      const r: any = await (api as any).getReviewInbox();
      const list = r?.orders || [];
      const rank = (o: any) => ((o.tests || []).some((t: any) => t.isCritical) ? 0 : 1);
      setRows([...list].sort((a, b) => rank(a) - rank(b)));
    } catch { toast.error('Failed to load results inbox'); }
  };
  useEffect(() => { load(); }, []);

  const ack = async (id: string) => {
    try {
      await (api as any).reviewLabOrder(id);
      toast.success('Marked reviewed');
      load();
    } catch (err: any) { toast.error(err?.message || 'Failed'); }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-heading font-bold">Results Inbox ({rows.length})</h1>
      <div className="space-y-2">
        {rows.map((o: any) => {
          const critical = (o.tests || []).some((t: any) => t.isCritical);
          return (
            <Card key={o._id} className={critical ? 'border-destructive' : ''}>
              <CardContent className="p-3 flex flex-wrap items-center gap-2 text-sm">
                <span className="font-mono text-xs">{o.orderId}</span>
                <span className="font-medium">{o.patientName}</span>
                <span className="text-xs text-muted-foreground">{(o.tests || []).map((t: any) => t.testName).join(', ')}</span>
                {critical && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">CRITICAL — must ack</span>}
                <span className="flex-1" />
                <Button size="sm" onClick={() => ack(o._id)}>Acknowledge</Button>
              </CardContent>
            </Card>
          );
        })}
        {rows.length === 0 && <p className="text-sm text-muted-foreground">Inbox clear 🎉</p>}
      </div>
    </div>
  );
}
