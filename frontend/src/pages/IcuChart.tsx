import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

/**
 * File 09 §04.5 — ICU flowsheet: hourly rows (vitals, ventilator, GCS)
 * per admission. One row per admission+hour (server upserts).
 */
export default function IcuChart() {
  const [admissionId, setAdmissionId] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ hourSlot: '', bp: '', hr: '', spO2: '', gcsE: '', gcsV: '', gcsM: '' });

  const load = async () => {
    if (!admissionId) return;
    try {
      const r: any = await (api as any).getIcuFlowsheet({ admissionId });
      setRows(r?.rows || []);
    } catch { toast.error('Failed to load flowsheet'); }
  };

  const save = async () => {
    try {
      await (api as any).saveIcuRow({
        admissionId,
        hourSlot: form.hourSlot || new Date().toISOString(),
        vitals: { bp: form.bp, hr: form.hr, spO2: form.spO2 },
        gcs: { e: Number(form.gcsE) || null, v: Number(form.gcsV) || null, m: Number(form.gcsM) || null },
      });
      toast.success('Row saved');
      load();
    } catch (err: any) { toast.error(err?.message || 'Failed'); }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-heading font-bold">ICU Flowsheet</h1>
      <Card>
        <CardContent className="p-3 flex gap-2">
          <Input placeholder="Admission ID" value={admissionId} onChange={(e) => setAdmissionId(e.target.value)} />
          <Button variant="outline" onClick={load}>Load</Button>
        </CardContent>
      </Card>
      {admissionId && (
        <Card>
          <CardHeader><CardTitle className="text-base">New hourly row</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Input type="datetime-local" aria-label="Hour" value={form.hourSlot} onChange={(e) => setForm({ ...form, hourSlot: e.target.value })} />
            <Input placeholder="BP" value={form.bp} onChange={(e) => setForm({ ...form, bp: e.target.value })} />
            <Input placeholder="HR" value={form.hr} onChange={(e) => setForm({ ...form, hr: e.target.value })} />
            <Input placeholder="SpO2" value={form.spO2} onChange={(e) => setForm({ ...form, spO2: e.target.value })} />
            <Input placeholder="GCS-E" value={form.gcsE} onChange={(e) => setForm({ ...form, gcsE: e.target.value })} />
            <Input placeholder="GCS-V" value={form.gcsV} onChange={(e) => setForm({ ...form, gcsV: e.target.value })} />
            <Input placeholder="GCS-M" value={form.gcsM} onChange={(e) => setForm({ ...form, gcsM: e.target.value })} />
            <Button onClick={save}>Save row</Button>
          </CardContent>
        </Card>
      )}
      <div className="space-y-1.5">
        {rows.map((r: any) => (
          <Card key={r._id}>
            <CardContent className="p-2.5 text-xs flex flex-wrap gap-x-4 gap-y-0.5">
              <b>{new Date(r.hourSlot).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}</b>
              <span>BP {r.vitals?.bp || '—'}</span><span>HR {r.vitals?.hr || '—'}</span><span>SpO2 {r.vitals?.spO2 || '—'}</span>
              <span>GCS {r.gcs?.e ?? '—'}/{r.gcs?.v ?? '—'}/{r.gcs?.m ?? '—'}</span>
              {r.ventilator?.mode && <span>Vent {r.ventilator.mode}</span>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
