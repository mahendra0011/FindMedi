import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

/**
 * File 09 §06.7 — mortuary: body receipt with chamber tag, ID-verified
 * release, unclaimed flag (no release > configurable days — shown at 7d).
 */
export default function MortuaryPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ patientName: '', timeOfDeath: '', causeText: '' });
  const [rel, setRel] = useState({ id: '', releasedTo: '' });

  const load = async () => {
    try {
      const r: any = await (api as any).getMortuary({});
      setRows(r?.records || []);
    } catch { toast.error('Failed to load mortuary'); }
  };
  useEffect(() => { load(); }, []);

  const receive = async () => {
    try {
      await (api as any).receiveBody(form);
      toast.success('Body received & tagged');
      setForm({ patientName: '', timeOfDeath: '', causeText: '' });
      load();
    } catch (err: any) { toast.error(err?.message || 'Failed'); }
  };

  const release = async () => {
    try {
      await (api as any).releaseBody(rel.id, { releasedTo: rel.releasedTo });
      toast.success('Released with ID verification');
      setRel({ id: '', releasedTo: '' });
      load();
    } catch (err: any) { toast.error(err?.message || 'Failed'); }
  };

  const unclaimed = (r: any) => !r.releasedAt && Date.now() - new Date(r.createdAt).getTime() > 7 * 864e5;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-heading font-bold">Mortuary</h1>
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Body receipt</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Input placeholder="Deceased name" value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} />
            <Input type="datetime-local" aria-label="Time of death" value={form.timeOfDeath} onChange={(e) => setForm({ ...form, timeOfDeath: e.target.value })} />
            <Input placeholder="Cause (text)" value={form.causeText} onChange={(e) => setForm({ ...form, causeText: e.target.value })} />
            <Button onClick={receive} disabled={!form.patientName || !form.timeOfDeath}>Receive & tag</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Release (ID verified)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Input placeholder="Record ID" value={rel.id} onChange={(e) => setRel({ ...rel, id: e.target.value })} />
            <Input placeholder="Released to (name + relation)" value={rel.releasedTo} onChange={(e) => setRel({ ...rel, releasedTo: e.target.value })} />
            <Button onClick={release} disabled={!rel.id || !rel.releasedTo}>Release</Button>
          </CardContent>
        </Card>
      </div>
      <div className="space-y-2">
        {rows.map((r: any) => (
          <Card key={r._id} className={unclaimed(r) ? 'border-warning' : ''}>
            <CardContent className="p-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="font-mono text-xs">{r.mortuaryTagNo}</span>
              <span className="font-medium">{r.patientName}</span>
              {unclaimed(r) && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-warning/10 text-warning">UNCLAIMED 7d+</span>}
              <span className="flex-1" />
              <span className="text-xs text-muted-foreground">{r.releasedAt ? `Released to ${r.releasedTo}` : 'In chamber'}</span>
            </CardContent>
          </Card>
        ))}
        {rows.length === 0 && <p className="text-sm text-muted-foreground">Chambers empty.</p>}
      </div>
    </div>
  );
}
