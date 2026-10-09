import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

/**
 * File 09 §04.9 — oncology: protocol master, BSA-based cycle scheduling,
 * administration with cytotoxic log.
 */
export default function OncologyPage() {
  const [protocols, setProtocols] = useState<any[]>([]);
  const [cycles, setCycles] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [sched, setSched] = useState({ protocolId: '', patientId: '', cycleNo: '1', bsa: '' });

  const load = async () => {
    try {
      const [p, c] = await Promise.all([
        (api as any).getChemoProtocols(), (api as any).getChemoCycles({}),
      ]);
      setProtocols(p?.protocols || []);
      setCycles(c?.cycles || []);
    } catch { toast.error('Failed to load oncology'); }
  };
  useEffect(() => { load(); }, []);

  const createProtocol = async () => {
    try {
      await (api as any).createChemoProtocol({ name, totalCycles: 6, cycleDays: 21, drugs: [] });
      toast.success('Protocol created');
      setName('');
      load();
    } catch (err: any) { toast.error(err?.message || 'Failed'); }
  };

  const schedule = async () => {
    try {
      await (api as any).scheduleChemo({ ...sched, cycleNo: Number(sched.cycleNo), bsa: Number(sched.bsa) || 0 });
      toast.success('Cycle scheduled (BSA doses computed)');
      setSched({ protocolId: '', patientId: '', cycleNo: '1', bsa: '' });
      load();
    } catch (err: any) { toast.error(err?.message || 'Failed'); }
  };

  const administer = async (id: string) => {
    try {
      await (api as any).administerChemo(id, { cytotoxicLog: '' });
      toast.success('Cycle administered');
      load();
    } catch (err: any) { toast.error(err?.message || 'Failed'); }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-heading font-bold">Oncology</h1>
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Protocols ({protocols.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2">
              <Input placeholder="Regimen name" value={name} onChange={(e) => setName(e.target.value)} />
              <Button onClick={createProtocol} disabled={!name}>Add</Button>
            </div>
            {protocols.map((p: any) => (
              <p key={p._id} className="text-sm">{p.name} <span className="text-muted-foreground">· {p.totalCycles} cycles × {p.cycleDays}d</span></p>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Schedule cycle (BSA dosing)</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <select aria-label="Protocol" className="h-10 rounded-md border border-input bg-background px-3 text-sm col-span-2" value={sched.protocolId} onChange={(e) => setSched({ ...sched, protocolId: e.target.value })}>
              <option value="">Select protocol</option>
              {protocols.map((p: any) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
            <Input placeholder="Patient ID" value={sched.patientId} onChange={(e) => setSched({ ...sched, patientId: e.target.value })} />
            <Input placeholder="Cycle no." type="number" value={sched.cycleNo} onChange={(e) => setSched({ ...sched, cycleNo: e.target.value })} />
            <Input placeholder="BSA m²" value={sched.bsa} onChange={(e) => setSched({ ...sched, bsa: e.target.value })} />
            <Button onClick={schedule} disabled={!sched.protocolId || !sched.patientId}>Schedule</Button>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Cycles ({cycles.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {cycles.map((c: any) => (
            <div key={c._id} className="flex items-center gap-2 text-sm rounded-lg border border-border/50 p-2.5">
              <span className="font-mono text-xs">C{c.cycleNo}</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted">{c.status}</span>
              <span className="text-xs text-muted-foreground">BSA {c.bsa} · {(c.doses || []).length} drugs</span>
              <span className="flex-1" />
              {c.status === 'Scheduled' && <Button size="sm" variant="outline" onClick={() => administer(c._id)}>Administer</Button>}
            </div>
          ))}
          {cycles.length === 0 && <p className="text-sm text-muted-foreground">No cycles scheduled.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
