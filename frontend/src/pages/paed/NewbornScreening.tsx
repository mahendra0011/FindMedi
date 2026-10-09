import { useEffect, useState } from 'react';
import { Stethoscope, Plus, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';
import { StatusPill } from '@/components/clinical/StatusAtoms';
import { EmptyState } from '@/components/clinical/SharedStates';

/** File 22 P2-40: Newborn screening — metabolic panel tracker. */
export default function NewbornScreening() {
  const [patientId, setPatientId] = useState('');
  const [data, setData] = useState<any>(null);
  const [result, setResult] = useState({ testName: '', result: '', flagged: false });

  const load = async (pid: string) => {
    if (!pid) return;
    try {
      const r: any = await api.get(`/newborn-screening/patient/${pid}`);
      setData(r.screenings?.[0] || null);
    } catch { setData(null); }
  };
  useEffect(() => { load(patientId); }, [patientId]);

  const start = async () => {
    if (!patientId) return;
    try {
      await api.post(`/newborn-screening/patient/${patientId}`, {});
      toast.success('Screening panel created');
      load(patientId);
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Failed'); }
  };

  const saveResult = async () => {
    try {
      await api.post(`/newborn-screening/patient/${patientId}/result`, result);
      toast.success('Result saved');
      setResult({ testName: '', result: '', flagged: false });
      load(patientId);
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Failed'); }
  };

  const tests = data?.tests || [];

  return (
    <div className="space-y-3 p-4">
      <h1 className="flex items-center gap-2 text-lg font-bold"><Stethoscope size={18} /> Newborn screening</h1>
      <div className="flex gap-2">
        <Input placeholder="Patient ID" value={patientId} onChange={(e) => setPatientId(e.target.value)} />
        {!data ? <Button size="sm" onClick={start}><Plus size={14} /> Start screening</Button> : null}
      </div>
      {data ? (
        <>
          <Card>
            <CardHeader><CardTitle className="text-sm">Panel ({tests.length} tests)</CardTitle></CardHeader>
            <CardContent className="space-y-1.5">
              {tests.map((t: any) => (
                <div key={t.name} className="flex items-center justify-between rounded border p-2 text-xs">
                  <span><b>{t.name}</b></span>
                  <span className="flex items-center gap-2">
                    {t.result ? <span>{t.result}</span> : <span className="text-muted-foreground">pending</span>}
                    <StatusPill status={t.flagged ? 'critical' : t.result ? 'done' : 'pending'} />
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Add result</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Input placeholder="Test name" value={result.testName} onChange={(e) => setResult({ ...result, testName: e.target.value })} />
                <Input placeholder="Result" value={result.result} onChange={(e) => setResult({ ...result, result: e.target.value })} />
                <label className="flex items-center gap-1 text-xs">
                  <input type="checkbox" checked={result.flagged} onChange={(e) => setResult({ ...result, flagged: e.target.checked })} />
                  Flagged
                </label>
                <Button size="sm" onClick={saveResult}><Plus size={14} /> Save</Button>
              </div>
            </CardContent>
          </Card>
          {data.status === 'flagged' ? (
            <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">
              <AlertTriangle size={14} className="mr-1 inline" />
              Screening flagged — refer to specialist
            </div>
          ) : null}
        </>
      ) : (
        <EmptyState title="No screening" hint="Start a newborn screening panel." />
      )}
    </div>
  );
}
