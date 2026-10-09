import { useEffect, useState } from 'react';
import { Baby, Plus, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';
import { StatusPill } from '@/components/clinical/StatusAtoms';
import { EmptyState } from '@/components/clinical/SharedStates';

/** File 22 P2-40: Partogram — labour progress monitoring. */
export default function Partogram() {
  const [patientId, setPatientId] = useState('');
  const [data, setData] = useState<any>(null);
  const [form, setForm] = useState({ cervixCm: '', contractionsPer10Min: '', fetalHeartRate: '', maternalPulse: '', maternalBpSystolic: '', maternalBpDiastolic: '' });
  const [delivery, setDelivery] = useState({ deliveryMode: 'vaginal', babyWeightKg: '', babySex: 'unknown' });

  const load = async (pid: string) => {
    if (!pid) return;
    try {
      const r: any = await api.get(`/partograms/patient/${pid}`);
      setData(r.partograms?.[0] || null);
    } catch { setData(null); }
  };
  useEffect(() => { load(patientId); }, [patientId]);

  const start = async () => {
    if (!patientId) return;
    try {
      await api.post(`/partograms/patient/${patientId}`, { labourOnset: new Date() });
      toast.success('Partogram started');
      load(patientId);
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Failed'); }
  };

  const addObs = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/partograms/patient/${patientId}/observation`, {
        cervixCm: Number(form.cervixCm) || 0,
        contractionsPer10Min: Number(form.contractionsPer10Min) || 0,
        fetalHeartRate: Number(form.fetalHeartRate) || 0,
        maternalPulse: Number(form.maternalPulse) || 0,
        maternalBpSystolic: Number(form.maternalBpSystolic) || 0,
        maternalBpDiastolic: Number(form.maternalBpDiastolic) || 0,
      });
      toast.success('Observation added');
      setForm({ cervixCm: '', contractionsPer10Min: '', fetalHeartRate: '', maternalPulse: '', maternalBpSystolic: '', maternalBpDiastolic: '' });
      load(patientId);
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Failed'); }
  };

  const deliver = async () => {
    try {
      await api.post(`/partograms/patient/${patientId}/deliver`, {
        ...delivery,
        babyWeightKg: Number(delivery.babyWeightKg) || 0,
      });
      toast.success('Delivery recorded');
      load(patientId);
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Failed'); }
  };

  const points = data?.points || [];
  const latest = points[points.length - 1];

  return (
    <div className="space-y-3 p-4">
      <h1 className="flex items-center gap-2 text-lg font-bold"><Baby size={18} /> Partogram</h1>
      <div className="flex gap-2">
        <Input placeholder="Patient ID" value={patientId} onChange={(e) => setPatientId(e.target.value)} />
        {!data ? <Button size="sm" onClick={start}><Plus size={14} /> Start labour</Button> : null}
      </div>
      {data ? (
        <>
          <Card>
            <CardHeader><CardTitle className="text-sm">Latest vitals</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 text-xs">
              <span>Cervix: <b>{latest?.cervixCm || '—'}cm</b></span>
              <span>Contractions: <b>{latest?.contractionsPer10Min || '—'}/10min</b></span>
              <span>FHR: <b>{latest?.fetalHeartRate || '—'}</b></span>
              <span>Maternal PR: <b>{latest?.maternalPulse || '—'}</b></span>
              <span>BP: <b>{latest?.maternalBpSystolic || '—'}/{latest?.maternalBpDiastolic || '—'}</b></span>
            </CardContent>
          </Card>
          {!data.deliveryTime ? (
            <>
              <Card>
                <CardHeader><CardTitle className="text-sm">Add observation</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={addObs} className="flex flex-wrap gap-2">
                    <Input type="number" placeholder="Cervix cm" value={form.cervixCm} onChange={(e) => setForm({ ...form, cervixCm: e.target.value })} />
                    <Input type="number" placeholder="Contractions/10min" value={form.contractionsPer10Min} onChange={(e) => setForm({ ...form, contractionsPer10Min: e.target.value })} />
                    <Input type="number" placeholder="FHR" value={form.fetalHeartRate} onChange={(e) => setForm({ ...form, fetalHeartRate: e.target.value })} />
                    <Input type="number" placeholder="Maternal PR" value={form.maternalPulse} onChange={(e) => setForm({ ...form, maternalPulse: e.target.value })} />
                    <Input type="number" placeholder="BP sys" value={form.maternalBpSystolic} onChange={(e) => setForm({ ...form, maternalBpSystolic: e.target.value })} />
                    <Input type="number" placeholder="BP dia" value={form.maternalBpDiastolic} onChange={(e) => setForm({ ...form, maternalBpDiastolic: e.target.value })} />
                    <Button size="sm" type="submit"><Plus size={14} /> Add</Button>
                  </form>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm">Delivery</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Input placeholder="Mode" value={delivery.deliveryMode} onChange={(e) => setDelivery({ ...delivery, deliveryMode: e.target.value })} />
                    <Input type="number" placeholder="Baby weight kg" value={delivery.babyWeightKg} onChange={(e) => setDelivery({ ...delivery, babyWeightKg: e.target.value })} />
                    <Input placeholder="Baby sex" value={delivery.babySex} onChange={(e) => setDelivery({ ...delivery, babySex: e.target.value })} />
                    <Button size="sm" onClick={deliver}><CheckCircle2 size={14} /> Record delivery</Button>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-900">
              <CheckCircle2 size={14} className="mr-1 inline" />
              Delivered {data.deliveryTime?.slice(0, 10)} · {data.deliveryMode} · {data.babyWeightKg}kg · {data.babySex}
            </div>
          )}
          <Card>
            <CardHeader><CardTitle className="text-sm">Timeline ({points.length} obs)</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-xs">
              {points.map((p: any, i: number) => (
                <div key={i} className="flex justify-between border-b py-1">
                  <span>{p.time?.slice(11, 16)}</span>
                  <span>Cx {p.cervixCm}cm · FHR {p.fetalHeartRate} · CT {p.contractionsPer10Min}/10min</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      ) : (
        <EmptyState title="No active labour" hint="Enter patient ID and start a partogram." />
      )}
    </div>
  );
}
