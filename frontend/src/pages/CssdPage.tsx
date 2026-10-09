import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

/**
 * File 09 §9.7/06.4 — CSSD: instrument sets, cycles, BI/CI indicators
 * (Fail → automatic recall).
 */
export default function CssdPage() {
  const [cycles, setCycles] = useState<any[]>([]);
  const [cycleNo, setCycleNo] = useState('');

  const load = async () => {
    try {
      const r: any = await (api as any).getCssdCycles({});
      setCycles(r?.cycles || []);
    } catch { toast.error('Failed to load CSSD cycles'); }
  };
  useEffect(() => { load(); }, []);

  const start = async () => {
    try {
      await (api as any).startCssdCycle({ cycleNo, method: 'Autoclave', loadItems: [] });
      toast.success('Cycle started');
      setCycleNo('');
      load();
    } catch (err: any) { toast.error(err?.message || 'Failed'); }
  };

  const mark = async (id: string, pass: boolean) => {
    try {
      const r: any = await (api as any).setCssdIndicators(id, {
        biologicalIndicator: pass ? 'Pass' : 'Fail',
        chemicalIndicator: pass ? 'Pass' : 'Fail',
      });
      toast.success(pass ? 'Released' : `Recalled (BI fail) — result: ${r?.result}`);
      load();
    } catch (err: any) { toast.error(err?.message || 'Failed'); }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-heading font-bold">CSSD</h1>
      <Card>
        <CardHeader><CardTitle className="text-base">New cycle</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          <Input placeholder="Cycle / load no." value={cycleNo} onChange={(e) => setCycleNo(e.target.value)} />
          <Button onClick={start} disabled={!cycleNo}>Start</Button>
        </CardContent>
      </Card>
      <div className="space-y-2">
        {cycles.map((c: any) => (
          <Card key={c._id}>
            <CardContent className="p-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="font-mono text-xs">{c.cycleNo}</span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${c.result === 'Released' ? 'bg-success/10 text-success' : c.result === 'Recalled' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>{c.result}</span>
              <span className="text-xs text-muted-foreground">BI:{c.biologicalIndicator || '—'} CI:{c.chemicalIndicator || '—'}</span>
              <span className="flex-1" />
              {c.result === 'Pending' && (
                <>
                  <Button size="sm" variant="outline" onClick={() => mark(c._id, true)}>Pass → Release</Button>
                  <Button size="sm" variant="outline" onClick={() => mark(c._id, false)}>Fail → Recall</Button>
                </>
              )}
            </CardContent>
          </Card>
        ))}
        {cycles.length === 0 && <p className="text-sm text-muted-foreground">No cycles yet.</p>}
      </div>
    </div>
  );
}
