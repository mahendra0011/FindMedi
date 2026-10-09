import { useEffect, useState } from 'react';
import { Syringe, Plus, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';
import { StatusPill } from '@/components/clinical/StatusAtoms';
import { EmptyState } from '@/components/clinical/SharedStates';

/** File 22 P2-40: Vaccination alerts — IAP schedule tracker. */
export default function VaccinationAlerts() {
  const [patientId, setPatientId] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [birthDate, setBirthDate] = useState('');

  const load = async (pid: string) => {
    if (!pid) return;
    try {
      const r: any = await api.get(`/vaccinations/patient/${pid}`);
      setRows(r.vaccinations || []);
    } catch { setRows([]); }
  };
  useEffect(() => { load(patientId); }, [patientId]);

  const generate = async () => {
    if (!patientId || !birthDate) return toast.error('Patient ID + birth date required');
    try {
      const r: any = await api.post(`/vaccinations/schedule/${patientId}`, { birthDate });
      toast.success(`${r.created} vaccines scheduled`);
      load(patientId);
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Failed'); }
  };

  const administer = async (id: string) => {
    try {
      await api.post(`/vaccinations/administer/${id}`);
      toast.success('Marked administered');
      load(patientId);
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Failed'); }
  };

  const pending = rows.filter((r) => r.status === 'pending');
  const overdue = rows.filter((r) => r.status === 'pending' && new Date(r.dueDate) < new Date());

  return (
    <div className="space-y-3 p-4">
      <h1 className="flex items-center gap-2 text-lg font-bold"><Syringe size={18} /> Vaccination alerts</h1>
      <div className="flex flex-wrap gap-2">
        <Input placeholder="Patient ID" value={patientId} onChange={(e) => setPatientId(e.target.value)} />
        <Input type="date" placeholder="Birth date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
        <Button size="sm" onClick={generate}><Plus size={14} /> Generate schedule</Button>
      </div>
      {overdue.length > 0 ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">
          <AlertCircle size={14} className="mr-1 inline" />
          {overdue.length} vaccine(s) overdue
        </div>
      ) : null}
      <Card>
        <CardHeader><CardTitle className="text-sm">Schedule ({rows.length})</CardTitle></CardHeader>
        <CardContent className="space-y-1.5">
          {rows.map((r) => (
            <div key={r._id} className="flex items-center justify-between rounded border p-2 text-xs">
              <span><b>{r.vaccineName}</b> · Dose {r.doseNumber} · Due {r.dueDate?.slice(0, 10)}</span>
              <span className="flex items-center gap-1">
                <StatusPill status={r.status === 'administered' ? 'done' : r.status === 'pending' ? 'pending' : r.status} />
                {r.status === 'pending' ? (
                  <Button size="sm" variant="ghost" onClick={() => administer(r._id)}><CheckCircle2 size={12} /></Button>
                ) : null}
              </span>
            </div>
          ))}
          {rows.length === 0 ? <EmptyState title="No vaccinations" hint="Generate a schedule for this patient." /> : null}
        </CardContent>
      </Card>
    </div>
  );
}
