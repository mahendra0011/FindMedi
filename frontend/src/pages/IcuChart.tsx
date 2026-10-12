import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

/**
 * File 09 §04.5 — ICU flowsheet: hourly rows (vitals, ventilator, GCS)
 * per admission. One row per admission+hour (server upserts).
 * SOFA/APACHE II with historical trend tracking.
 */
export default function IcuChart() {
  const [admissionId, setAdmissionId] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ hourSlot: '', bp: '', hr: '', spO2: '', gcsE: '', gcsV: '', gcsM: '' });

  // SOFA state
  const [sofaInputs, setSofaInputs] = useState({ pao2Fio2Ratio: '300', platelets: '140', bilirubin: '0.8', meanArterialPressure: '75', gcsTotal: '15', creatinine: '1.0' });
  const [sofaResult, setSofaResult] = useState<any>(null);
  // APACHE II state
  const [apacheInputs, setApacheInputs] = useState({ ageYears: '55', temperature: '37.2', heartRate: '88', respiratoryRate: '18', arterialPh: '7.40', wbcCount: '11.2' });
  const [apacheResult, setApacheResult] = useState<any>(null);
  // Score history
  const [scoreHistory, setScoreHistory] = useState<any[]>([]);

  const load = async () => {
    if (!admissionId) return;
    try {
      const r: any = await (api as any).getIcuFlowsheet({ admissionId });
      setRows(r?.rows || []);
      loadScoreHistory();
    } catch { toast.error('Failed to load flowsheet'); }
  };

  const loadScoreHistory = async () => {
    if (!admissionId) return;
    try {
      const r: any = await api.get(`/clinical/icu/scores/${admissionId}`);
      setScoreHistory(r?.scores || []);
    } catch { /* non-critical */ }
  };

  const calcSofa = async (save = false) => {
    try {
      const payload = {
        pao2Fio2Ratio: Number(sofaInputs.pao2Fio2Ratio) || 300,
        platelets: Number(sofaInputs.platelets) || 140,
        bilirubin: Number(sofaInputs.bilirubin) || 0.8,
        meanArterialPressure: Number(sofaInputs.meanArterialPressure) || 75,
        gcsTotal: Number(sofaInputs.gcsTotal) || 15,
        creatinine: Number(sofaInputs.creatinine) || 1.0,
      };
      const r: any = await api.post('/clinical/icu/sofa', payload);
      setSofaResult(r.data || r);
      if (save && admissionId) {
        await api.post('/clinical/icu/scores', { admissionId, scoreType: 'SOFA', inputs: payload });
        toast.success('SOFA score saved to history');
        loadScoreHistory();
      } else {
        toast.success(`SOFA: ${r.data?.total ?? r.total ?? 'calculated'}`);
      }
    } catch (err: any) { toast.error(err?.response?.data?.message || 'SOFA calc failed'); }
  };

  const calcApache = async (save = false) => {
    try {
      const payload = {
        ageYears: Number(apacheInputs.ageYears) || 55,
        temperature: Number(apacheInputs.temperature) || 37.2,
        heartRate: Number(apacheInputs.heartRate) || 88,
        respiratoryRate: Number(apacheInputs.respiratoryRate) || 18,
        arterialPh: Number(apacheInputs.arterialPh) || 7.40,
        wbcCount: Number(apacheInputs.wbcCount) || 11.2,
      };
      const r: any = await api.post('/clinical/icu/apache2', payload);
      setApacheResult(r.data || r);
      if (save && admissionId) {
        await api.post('/clinical/icu/scores', { admissionId, scoreType: 'APACHE-II', inputs: payload });
        toast.success('APACHE II score saved to history');
        loadScoreHistory();
      } else {
        toast.success(`APACHE II: ${r.data?.total ?? r.total ?? 'calculated'}`);
      }
    } catch (err: any) { toast.error(err?.response?.data?.message || 'APACHE II calc failed'); }
  };

  // Prepare trend chart data
  const trendData = scoreHistory
    .filter((s) => s.scoreType === 'SOFA')
    .slice(0, 20)
    .reverse()
    .map((s) => ({
      time: new Date(s.recordedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      sofa: s.score,
      date: new Date(s.recordedAt).toLocaleDateString('en-IN'),
    }));

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

      {/* Clinical Critical Care Scoring Engines */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-indigo-200 dark:border-indigo-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center justify-between">
              <span>SOFA Organ Failure Score</span>
              <span className="text-xs font-normal text-muted-foreground">Vincent Criteria</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-muted-foreground">PaO2/FiO2 ratio</label>
                <Input placeholder="e.g. 250" value={sofaInputs.pao2Fio2Ratio} onChange={(e) => setSofaInputs({ ...sofaInputs, pao2Fio2Ratio: e.target.value })} />
              </div>
              <div>
                <label className="text-muted-foreground">Platelets (x10³/µL)</label>
                <Input placeholder="e.g. 120" value={sofaInputs.platelets} onChange={(e) => setSofaInputs({ ...sofaInputs, platelets: e.target.value })} />
              </div>
              <div>
                <label className="text-muted-foreground">Bilirubin (mg/dL)</label>
                <Input placeholder="e.g. 1.5" value={sofaInputs.bilirubin} onChange={(e) => setSofaInputs({ ...sofaInputs, bilirubin: e.target.value })} />
              </div>
              <div>
                <label className="text-muted-foreground">MAP (mmHg)</label>
                <Input placeholder="e.g. 68" value={sofaInputs.meanArterialPressure} onChange={(e) => setSofaInputs({ ...sofaInputs, meanArterialPressure: e.target.value })} />
              </div>
              <div>
                <label className="text-muted-foreground">GCS Total (3-15)</label>
                <Input placeholder="e.g. 14" value={sofaInputs.gcsTotal} onChange={(e) => setSofaInputs({ ...sofaInputs, gcsTotal: e.target.value })} />
              </div>
              <div>
                <label className="text-muted-foreground">Creatinine (mg/dL)</label>
                <Input placeholder="e.g. 1.4" value={sofaInputs.creatinine} onChange={(e) => setSofaInputs({ ...sofaInputs, creatinine: e.target.value })} />
              </div>
            </div>
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg flex items-center justify-between border border-indigo-100 dark:border-indigo-900">
              <div>
                <div className="font-semibold text-indigo-900 dark:text-indigo-200">
                  {sofaResult ? `Score: ${sofaResult.total ?? sofaResult.score ?? '—'} / 24` : 'Score: —'}
                </div>
                <div className="text-xs text-indigo-700 dark:text-indigo-400">
                  {sofaResult?.mortalityEstimate ? `Est. Mortality: ~${sofaResult.mortalityEstimate}%` : 'Enter values & calculate'}
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="text-xs" onClick={() => calcSofa(false)}>Calc</Button>
                {admissionId && (
                  <Button size="sm" className="text-xs" onClick={() => calcSofa(true)}>Save</Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center justify-between">
              <span>APACHE II Severity Engine</span>
              <span className="text-xs font-normal text-muted-foreground">Knaus et al.</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-muted-foreground">Age (years)</label>
                <Input placeholder="e.g. 58" value={apacheInputs.ageYears} onChange={(e) => setApacheInputs({ ...apacheInputs, ageYears: e.target.value })} />
              </div>
              <div>
                <label className="text-muted-foreground">Core Temp (°C)</label>
                <Input placeholder="e.g. 38.6" value={apacheInputs.temperature} onChange={(e) => setApacheInputs({ ...apacheInputs, temperature: e.target.value })} />
              </div>
              <div>
                <label className="text-muted-foreground">Heart Rate (bpm)</label>
                <Input placeholder="e.g. 115" value={apacheInputs.heartRate} onChange={(e) => setApacheInputs({ ...apacheInputs, heartRate: e.target.value })} />
              </div>
              <div>
                <label className="text-muted-foreground">Respiratory Rate</label>
                <Input placeholder="e.g. 24" value={apacheInputs.respiratoryRate} onChange={(e) => setApacheInputs({ ...apacheInputs, respiratoryRate: e.target.value })} />
              </div>
              <div>
                <label className="text-muted-foreground">Arterial pH</label>
                <Input placeholder="e.g. 7.32" value={apacheInputs.arterialPh} onChange={(e) => setApacheInputs({ ...apacheInputs, arterialPh: e.target.value })} />
              </div>
              <div>
                <label className="text-muted-foreground">WBC Count (k/µL)</label>
                <Input placeholder="e.g. 16.5" value={apacheInputs.wbcCount} onChange={(e) => setApacheInputs({ ...apacheInputs, wbcCount: e.target.value })} />
              </div>
            </div>
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-lg flex items-center justify-between border border-amber-100 dark:border-amber-900">
              <div>
                <div className="font-semibold text-amber-900 dark:text-amber-200">
                  {apacheResult ? `APACHE II: ${apacheResult.total ?? apacheResult.score ?? '—'} Points` : 'APACHE II: —'}
                </div>
                <div className="text-xs text-amber-700 dark:text-amber-400">
                  {apacheResult?.mortalityEstimate ? `Predicted Mortality: ~${apacheResult.mortalityEstimate}%` : 'Enter values & evaluate'}
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="text-xs" onClick={() => calcApache(false)}>Eval</Button>
                {admissionId && (
                  <Button size="sm" className="text-xs" onClick={() => calcApache(true)}>Save</Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SOFA Trend Chart */}
      {trendData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">SOFA Score Trend ({trendData.length} readings)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" fontSize={11} />
                <YAxis domain={[0, 24]} fontSize={11} />
                <Tooltip />
                <ReferenceLine y={8} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: 'Mortality risk ↑', position: 'insideTopRight', fontSize: 10 }} />
                <ReferenceLine y={15} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Severe', position: 'insideTopRight', fontSize: 10 }} />
                <Line type="monotone" dataKey="sofa" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
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
