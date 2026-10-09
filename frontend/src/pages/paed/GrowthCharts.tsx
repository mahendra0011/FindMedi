import { useEffect, useState } from 'react';
import { Activity, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';
import { EmptyState } from '@/components/clinical/SharedStates';

/** File 22 P2-40: Growth charts — weight/height/BMI tracking with WHO percentiles. */
export default function GrowthCharts() {
  const [patientId, setPatientId] = useState('');
  const [chart, setChart] = useState<any>(null);
  const [form, setForm] = useState({ date: '', weightKg: '', heightCm: '', headCircCm: '' });

  const load = async (pid: string) => {
    if (!pid) return;
    try {
      const r: any = await api.get(`/growth-charts/patient/${pid}`);
      setChart(r.chart);
    } catch { setChart(null); }
  };
  useEffect(() => { load(patientId); }, [patientId]);

  const addPoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) return toast.error('Enter patient ID first');
    try {
      await api.post(`/growth-charts/patient/${patientId}`, {
        sex: chart?.sex || 'male',
        birthDate: chart?.birthDate || new Date(),
        points: [{ ...form, weightKg: Number(form.weightKg) || 0, heightCm: Number(form.heightCm) || 0, headCircCm: Number(form.headCircCm) || 0 }],
      });
      toast.success('Measurement added');
      setForm({ date: '', weightKg: '', heightCm: '', headCircCm: '' });
      load(patientId);
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Save failed'); }
  };

  const points = chart?.points || [];

  return (
    <div className="space-y-3 p-4">
      <h1 className="flex items-center gap-2 text-lg font-bold"><Activity size={18} /> Growth charts</h1>
      <Input placeholder="Patient ID" value={patientId} onChange={(e) => setPatientId(e.target.value)} />
      <Card>
        <CardHeader><CardTitle className="text-sm">Add measurement</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={addPoint} className="flex flex-wrap gap-2">
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <Input type="number" placeholder="Weight (kg)" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} />
            <Input type="number" placeholder="Height (cm)" value={form.heightCm} onChange={(e) => setForm({ ...form, heightCm: e.target.value })} />
            <Input type="number" placeholder="Head circ (cm)" value={form.headCircCm} onChange={(e) => setForm({ ...form, headCircCm: e.target.value })} />
            <Button size="sm" type="submit"><Plus size={14} /> Add</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm">Measurements ({points.length})</CardTitle></CardHeader>
        <CardContent className="space-y-1.5">
          {points.map((p: any, i: number) => (
            <div key={i} className="flex items-center justify-between rounded border p-2 text-xs">
              <span>{p.date?.slice(0, 10)}</span>
              <span>Wt: {p.weightKg || '—'}kg · Ht: {p.heightCm || '—'}cm · HC: {p.headCircCm || '—'}cm</span>
            </div>
          ))}
          {points.length === 0 ? <EmptyState title="No measurements" hint="Add the first measurement for this patient." /> : null}
        </CardContent>
      </Card>
    </div>
  );
}
