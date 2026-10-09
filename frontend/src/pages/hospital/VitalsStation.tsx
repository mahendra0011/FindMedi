import { useState } from 'react';
import { Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';
import PatientBanner from '@/components/clinical/PatientBanner';

/** File 22 P1-13: OPD vitals station — find patient, record vitals for them. */
export default function VitalsStation() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [sel, setSel] = useState<any | null>(null);
  const [v, setV] = useState({ systolic: '', diastolic: '', pulse: '', tempValue: '', spo2: '', sugarValue: '' });

  const search = async () => {
    try {
      const r: any = await (api as any).getPatients({ search: q, limit: 10 });
      setRows(r?.data || r?.patients || []);
    } catch { setRows([]); }
  };

  const save = async (vitalType: string, values: any) => {
    if (!sel) return;
    try {
      // Patient rows carry userId when linked; else fall back to record id.
      const r: any = await (api as any).post('/vitals/station', {
        patientUserId: sel.userId || sel._id, vitalType, values,
      });
      toast.success(`Recorded (${r?.flag || 'normal'})`);
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Save failed'); }
  };

  const num = (s: string) => (s === '' ? undefined : Number(s));

  return (
    <div className="space-y-3 p-4">
      <h1 className="flex items-center gap-2 text-lg font-bold"><Activity size={18} /> Vitals station</h1>
      <Card>
        <CardHeader><CardTitle className="text-sm">Find patient</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-2">
            <Input placeholder="UHID / phone / name" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} />
            <Button onClick={search}>Search</Button>
          </div>
          {rows.map((p: any) => (
            <button key={p._id} onClick={() => setSel(p)}
              className={`w-full rounded border px-2 py-1.5 text-left text-sm ${sel?._id === p._id ? 'border-primary' : ''}`}>
              <b>{p.name}</b> <span className="text-muted-foreground">· {p.uhid || p.phone}</span>
            </button>
          ))}
          {sel ? <PatientBanner patientId={sel._id} /> : null}
        </CardContent>
      </Card>
      {sel ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Card><CardHeader><CardTitle className="text-sm">BP + Pulse</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-2">
                <Input placeholder="Sys" value={v.systolic} onChange={(e) => setV({ ...v, systolic: e.target.value })} />
                <Input placeholder="Dia" value={v.diastolic} onChange={(e) => setV({ ...v, diastolic: e.target.value })} />
                <Input placeholder="Pulse" value={v.pulse} onChange={(e) => setV({ ...v, pulse: e.target.value })} />
              </div>
              <Button size="sm" onClick={() => save('bp', { systolic: num(v.systolic), diastolic: num(v.diastolic) })}>Save BP</Button>
              <Button size="sm" variant="outline" onClick={() => save('pulse', { pulse: num(v.pulse) })}>Save pulse</Button>
            </CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Temp + SpO2 + Sugar</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-2">
                <Input placeholder="Temp F" value={v.tempValue} onChange={(e) => setV({ ...v, tempValue: e.target.value })} />
                <Input placeholder="SpO2 %" value={v.spo2} onChange={(e) => setV({ ...v, spo2: e.target.value })} />
                <Input placeholder="Sugar" value={v.sugarValue} onChange={(e) => setV({ ...v, sugarValue: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => save('temperature', { tempValue: num(v.tempValue), tempUnit: 'F' })}>Save temp</Button>
                <Button size="sm" variant="outline" onClick={() => save('spo2', { spo2: num(v.spo2) })}>Save SpO2</Button>
                <Button size="sm" variant="outline" onClick={() => save('blood_sugar', { sugarValue: num(v.sugarValue), sugarContext: 'random' })}>Save sugar</Button>
              </div>
            </CardContent></Card>
        </div>
      ) : null}
    </div>
  );
}
