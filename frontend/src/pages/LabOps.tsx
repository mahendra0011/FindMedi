import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';
import PatientBanner from '@/components/clinical/PatientBanner';

/**
 * File 09 Flow E — lab ops queue: pending orders, verify (pathologist),
 * review-ack (ordering doctor). SoD: verify requires a non-entering role
 * server-side; review is the ordering doctor's ack.
 */
export default function LabOps() {
  const [rows, setRows] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState('');

  const load = async () => {
    try {
      const r: any = await (api as any).getLabOrders({});
      setRows(r?.orders || r?.data || []);
    } catch { toast.error('Failed to load lab queue'); }
  };
  useEffect(() => { load(); }, []);

  const act = async (fn: () => Promise<any>, label: string) => {
    try { await fn(); toast.success(label); load(); }
    catch (err: any) { toast.error(err?.message || 'Failed (role may lack permission)'); }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-heading font-bold">Lab Queue ({rows.length})</h1>
      {/* File 22 P0-2: flag chips for the selected order's patient */}
      {selectedId && <PatientBanner patientId={rows.find((o: any) => o._id === selectedId)?.patientId || ''} />}
      <div className="space-y-2">
        {rows.map((o: any) => (
          <Card key={o._id} className={selectedId === o._id ? 'border-primary' : ''}>
            <CardContent className="p-3 flex flex-wrap items-center gap-2 text-sm" onClick={() => setSelectedId(o._id === selectedId ? '' : o._id)}>
              <span className="font-mono text-xs">{o.orderId}</span>
              <span className="font-medium">{o.patientName}</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-muted">{o.status}</span>
              {o.reviewedAt && <span className="text-[11px] text-success">reviewed ✓</span>}
              <span className="flex-1" />
              <Button size="sm" variant="outline" onClick={() => act(() => (api as any).verifyLabResult(o._id, { approved: true }), 'Verified')}>Verify</Button>
              <Button size="sm" variant="outline" onClick={() => act(() => (api as any).reviewLabOrder(o._id), 'Marked reviewed')}>Review-ack</Button>
            </CardContent>
          </Card>
        ))}
        {rows.length === 0 && <p className="text-sm text-muted-foreground">Queue empty.</p>}
      </div>
    </div>
  );
}
