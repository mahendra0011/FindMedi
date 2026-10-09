import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

/**
 * File 09 §9.2/04.6 — OT board: today's surgeries, PAC, WHO checklist,
 * op-note with implants/consumables (auto-charged server-side).
 */
export default function OtBoard() {
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState<any>(null);

  const load = async () => {
    try {
      const r: any = await (api as any).getSurgeries({});
      setRows(r?.surgeries || r?.data || []);
    } catch { toast.error('Failed to load OT list'); }
  };
  useEffect(() => { load(); }, []);

  const save = async (fn: () => Promise<any>, label: string) => {
    try {
      await fn();
      toast.success(label);
      load();
    } catch (err: any) { toast.error(err?.message || 'Failed'); }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-heading font-bold">OT Board</h1>
      <div className="grid md:grid-cols-2 gap-3">
        {rows.map((s: any) => (
          <Card key={s._id}>
            <CardHeader><CardTitle className="text-base">{s.surgeryName} <span className="text-xs font-normal text-muted-foreground">· {s.status} · {s.patientName}</span></CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="text-xs text-muted-foreground">
                PAC: {s.pac?.fitness || 'pending'} · WHO: {[s.whoChecklist?.signIn && 'in', s.whoChecklist?.timeOut && 'out', s.whoChecklist?.signOut && 'done'].filter(Boolean).join('/') || 'pending'}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => save(() => (api as any).setSurgeryPac(s._id, { asaGrade: 'II', npoConfirmed: true, fitness: 'Fit' }), 'PAC recorded')}>PAC Fit/II</Button>
                <Button size="sm" variant="outline" onClick={() => save(() => (api as any).setSurgeryWho(s._id, { signIn: true, timeOut: true, signOut: false }), 'WHO sign-in + time-out')}>WHO 2/3</Button>
                <Button size="sm" variant="outline" onClick={() => setOpen(open?._id === s._id ? null : s)}>Op note</Button>
              </div>
              {open?._id === s._id && <OpNoteForm surgery={s} onSaved={() => { setOpen(null); load(); }} />}
            </CardContent>
          </Card>
        ))}
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No surgeries scheduled.</p>}
      </div>
    </div>
  );
}

function OpNoteForm({ surgery, onSaved }: { surgery: any; onSaved: () => void }) {
  const [findings, setFindings] = useState(surgery.findings || '');
  const [procedure, setProcedure] = useState(surgery.procedure || '');
  const save = async () => {
    try {
      await (api as any).saveOpNote(surgery._id, { findings, procedure });
      toast.success('Op note saved (implants/consumables auto-charged if added)');
      onSaved();
    } catch (err: any) { toast.error(err?.message || 'Failed'); }
  };
  return (
    <div className="space-y-2 pt-1">
      <Input placeholder="Findings" value={findings} onChange={(e) => setFindings(e.target.value)} />
      <Input placeholder="Procedure" value={procedure} onChange={(e) => setProcedure(e.target.value)} />
      <Button size="sm" onClick={save}>Save op note</Button>
    </div>
  );
}
