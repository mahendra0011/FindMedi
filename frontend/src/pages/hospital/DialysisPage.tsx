import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';
import {
  Droplets,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  ShieldAlert,
  Search,
  Scale,
  HeartPulse,
} from 'lucide-react';

interface DialysisSession {
  _id: string;
  patientId: any;
  date: string;
  machineId: string;
  preWeightKg: number;
  postWeightKg: number;
  preSystolic?: number;
  preDiastolic?: number;
  postSystolic?: number;
  postDiastolic?: number;
  ufLitres?: number;
  durationMin?: number;
  isolation?: 'none' | 'hbv' | 'hcv' | 'hbv_hcv' | 'other';
  dialyserReuseCount?: number;
  complications?: string;
}

export default function DialysisPage() {
  const [sessions, setSessions] = useState<DialysisSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [isNewSessionOpen, setIsNewSessionOpen] = useState(false);

  // Quick UF Calculator state
  const [calcPreWeight, setCalcPreWeight] = useState<string>('68.5');
  const [calcDryWeight, setCalcDryWeight] = useState<string>('65.0');
  const [calcRinseback, setCalcRinseback] = useState<string>('0.3');

  // Kt/V (Daugirdas) calculator state
  const [ktvPreBun, setKtvPreBun] = useState('40');
  const [ktvPostBun, setKtvPostBun] = useState('16');
  const [ktvHours, setKtvHours] = useState('4');
  const [ktvUf, setKtvUf] = useState('2.5');
  const [ktvWeight, setKtvWeight] = useState('65');
  const [ktvResult, setKtvResult] = useState<any>(null);
  const [ktvLoading, setKtvLoading] = useState(false);

  const calcKtV = async () => {
    try {
      setKtvLoading(true);
      const r: any = await api.post('/dialysis/ktv-calculate', {
        preBUN: ktvPreBun, postBUN: ktvPostBun, sessionHours: ktvHours,
        ultrafiltrationVolumeL: ktvUf, postWeightKg: ktvWeight,
      });
      setKtvResult(r.data || r);
      toast.success(`spKt/V: ${r.data?.spKtV ?? r.spKtV} — ${r.data?.clinicalInterpretation ?? r.clinicalInterpretation}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Kt/V calculation failed');
    } finally { setKtvLoading(false); }
  };

  // Form state
  const [form, setForm] = useState({
    patientId: '',
    machineId: 'BAY-01 (Fresenius 4008S)',
    date: new Date().toISOString().split('T')[0],
    preWeightKg: '68.5',
    postWeightKg: '65.2',
    preSystolic: '140',
    preDiastolic: '90',
    postSystolic: '120',
    postDiastolic: '80',
    ufLitres: '3.3',
    durationMin: '240',
    isolation: 'none',
    dialyserReuseCount: '2',
    complications: '',
  });

  const ufGoalCalculated = Math.max(
    0,
    Number(calcPreWeight || 0) - Number(calcDryWeight || 0) + Number(calcRinseback || 0)
  ).toFixed(2);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      // Fetch recent sessions or water quality logs
      const res: any = await api.get('/dialysis/sessions?limit=50').catch(() => ({ data: { sessions: [] } }));
      setSessions(res.data?.sessions || []);
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleSaveSession = async () => {
    if (!form.patientId || !form.preWeightKg || !form.postWeightKg) {
      toast.error('Patient ID, Pre and Post weights are required');
      return;
    }
    try {
      await api.post('/dialysis/sessions', {
        ...form,
        preWeightKg: Number(form.preWeightKg),
        postWeightKg: Number(form.postWeightKg),
        preSystolic: Number(form.preSystolic),
        preDiastolic: Number(form.preDiastolic),
        postSystolic: Number(form.postSystolic),
        postDiastolic: Number(form.postDiastolic),
        ufLitres: Number(form.ufLitres),
        durationMin: Number(form.durationMin),
        dialyserReuseCount: Number(form.dialyserReuseCount),
      });
      toast.success('Hemodialysis session recorded successfully');
      setIsNewSessionOpen(false);
      fetchSessions();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to record session');
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Droplets className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
              Dialysis Unit & Machine Operations
            </h1>
            <Badge variant="outline" className="bg-cyan-500/10 text-cyan-600 border-cyan-500/20">
              Module #19
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Ultrafiltration calculation, dry-weight monitoring, dialyzer reuse audits, and infection isolation bays.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsNewSessionOpen(true)}
            className="bg-cyan-600 hover:bg-cyan-700 text-white flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Record Dialysis Session
          </Button>
        </div>
      </div>

      {/* Real-Time Machine Station Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { bay: 'BAY 1', model: 'Fresenius 4008S', patient: 'Rahul S.', bfr: '300 mL/min', uf: '2.4 / 3.0 L', status: 'IN_SESSION' },
          { bay: 'BAY 2 (HBV Isolation)', model: 'Nipro Surdial-X', patient: 'Anand V.', bfr: '250 mL/min', uf: '1.8 / 2.5 L', status: 'ISOLATION' },
          { bay: 'BAY 3', model: 'B. Braun Dialog+', patient: 'Pooja M.', bfr: '280 mL/min', uf: '3.1 / 3.2 L', status: 'IN_SESSION' },
          { bay: 'BAY 4', model: 'Fresenius 5008S', patient: '—', bfr: '—', uf: '—', status: 'DISINFECTION' },
        ].map((m, i) => (
          <Card key={i} className="border-border/60 shadow-sm relative overflow-hidden">
            <div
              className={`absolute top-0 left-0 right-0 h-1.5 ${
                m.status === 'ISOLATION'
                  ? 'bg-amber-500'
                  : m.status === 'DISINFECTION'
                  ? 'bg-purple-500'
                  : 'bg-cyan-500 animate-pulse'
              }`}
            />
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs">{m.bay}</span>
                <Badge
                  variant="outline"
                  className={
                    m.status === 'ISOLATION'
                      ? 'bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]'
                      : m.status === 'DISINFECTION'
                      ? 'bg-purple-500/10 text-purple-600 border-purple-500/30 text-[10px]'
                      : 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30 text-[10px]'
                  }
                >
                  {m.status}
                </Badge>
              </div>
              <p className="font-semibold text-sm">{m.patient !== '—' ? m.patient : 'Available for Disinfection'}</p>
              <div className="text-[11px] text-muted-foreground flex justify-between">
                <span>Blood Flow Rate:</span>
                <span className="font-mono font-medium text-foreground">{m.bfr}</span>
              </div>
              <div className="text-[11px] text-muted-foreground flex justify-between">
                <span>UF Progress:</span>
                <span className="font-mono font-medium text-cyan-600 dark:text-cyan-400">{m.uf}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Clinical Formula & UF Calculator Panel */}
      <Card className="border-cyan-500/20 bg-cyan-500/5 shadow-sm">
        <CardHeader className="p-4 border-b border-cyan-500/10">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-cyan-700 dark:text-cyan-400">
            <Scale className="h-4 w-4" />
            Clinical Ultrafiltration (UF) Goal Calculator
          </CardTitle>
          <CardDescription className="text-xs">
            UF Goal = (Pre-dialysis Weight - Dry Weight) + Prime & Flush Fluid Allowance.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Pre-Weight (kg)</label>
            <Input
              type="number"
              step="0.1"
              value={calcPreWeight}
              onChange={(e) => setCalcPreWeight(e.target.value)}
              className="bg-background text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Target Dry Weight (kg)</label>
            <Input
              type="number"
              step="0.1"
              value={calcDryWeight}
              onChange={(e) => setCalcDryWeight(e.target.value)}
              className="bg-background text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Saline Rinseback (L)</label>
            <Input
              type="number"
              step="0.1"
              value={calcRinseback}
              onChange={(e) => setCalcRinseback(e.target.value)}
              className="bg-background text-xs"
            />
          </div>
          <div className="p-2.5 rounded-lg bg-cyan-600 text-white flex flex-col justify-center items-center">
            <span className="text-[10px] uppercase tracking-wider font-semibold opacity-90">Calculated UF Target</span>
            <span className="text-xl font-bold font-mono">{ufGoalCalculated} Liters</span>
          </div>
        </CardContent>
      </Card>

      {/* Kt/V Adequacy Calculator + Session History Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-emerald-500/20 shadow-sm">
          <CardHeader className="p-4 border-b border-emerald-500/10">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <Activity className="h-4 w-4" />
              Dialysis Adequacy — spKt/V (Daugirdas II) & URR
            </CardTitle>
            <CardDescription className="text-xs">
              KDOQI target spKt/V ≥ 1.4, minimum ≥ 1.2; URR ≥ 65%.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Pre BUN (mg/dL)</label>
              <Input type="number" value={ktvPreBun} onChange={(e) => setKtvPreBun(e.target.value)} className="bg-background text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Post BUN (mg/dL)</label>
              <Input type="number" value={ktvPostBun} onChange={(e) => setKtvPostBun(e.target.value)} className="bg-background text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Hours</label>
              <Input type="number" value={ktvHours} onChange={(e) => setKtvHours(e.target.value)} className="bg-background text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">UF (L)</label>
              <Input type="number" value={ktvUf} onChange={(e) => setKtvUf(e.target.value)} className="bg-background text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Post Wt (kg)</label>
              <Input type="number" value={ktvWeight} onChange={(e) => setKtvWeight(e.target.value)} className="bg-background text-xs" />
            </div>
            <div className="col-span-2 md:col-span-5 flex items-center justify-between gap-3">
              <div className={`p-2.5 rounded-lg flex-1 border ${ktvResult ? (ktvResult.isAdequate ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900' : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900') : 'bg-muted/50 border-border'}`}>
                <div className="text-sm font-semibold">
                  {ktvResult ? `spKt/V: ${ktvResult.spKtV} — URR: ${ktvResult.urrPct}%` : 'Enter pre/post BUN to calculate'}
                </div>
                {ktvResult && (
                  <div className={`text-xs ${ktvResult.isAdequate ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                    {ktvResult.clinicalInterpretation}
                  </div>
                )}
              </div>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={ktvLoading} onClick={calcKtV}>
                {ktvLoading ? '…' : 'Calculate'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="p-4 border-b">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <HeartPulse className="h-4 w-4 text-cyan-600" />
              Recent Session History ({sessions.length})
            </CardTitle>
            <CardDescription className="text-xs">Pre/post weights, UF achieved and isolation flags from recorded sessions.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 max-h-72 overflow-y-auto">
            {sessions.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">No sessions recorded yet.</div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-1.5 pr-2">Date</th>
                    <th className="py-1.5 pr-2">Machine</th>
                    <th className="py-1.5 pr-2">Pre→Post (kg)</th>
                    <th className="py-1.5 pr-2">UF (L)</th>
                    <th className="py-1.5 pr-2">Isolation</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s._id} className="border-b last:border-0">
                      <td className="py-1.5 pr-2 font-mono">{String(s.date).slice(0, 10)}</td>
                      <td className="py-1.5 pr-2">{s.machineId || '—'}</td>
                      <td className="py-1.5 pr-2 font-mono">{s.preWeightKg} → {s.postWeightKg}</td>
                      <td className="py-1.5 pr-2 font-mono">{s.ufLitres ?? '—'}</td>
                      <td className="py-1.5 pr-2">
                        {s.isolation && s.isolation !== 'none' ? (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]">{s.isolation.toUpperCase()}</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">NONE</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal: Record Session */}
      <Dialog open={isNewSessionOpen} onOpenChange={setIsNewSessionOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-cyan-600" />
              Record Hemodialysis Session
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2 text-xs">
            <div className="col-span-2 space-y-1">
              <label className="font-semibold text-muted-foreground">Patient User ID / UHID *</label>
              <Input
                placeholder="Patient ObjectId or UHID"
                value={form.patientId}
                onChange={(e) => setForm({ ...form, patientId: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Machine Bay</label>
              <Input
                value={form.machineId}
                onChange={(e) => setForm({ ...form, machineId: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Session Date</label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Pre-Weight (kg) *</label>
              <Input
                type="number"
                step="0.1"
                value={form.preWeightKg}
                onChange={(e) => setForm({ ...form, preWeightKg: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Post-Weight (kg) *</label>
              <Input
                type="number"
                step="0.1"
                value={form.postWeightKg}
                onChange={(e) => setForm({ ...form, postWeightKg: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Pre BP (Systolic/Diastolic)</label>
              <div className="flex gap-1">
                <Input
                  placeholder="140"
                  value={form.preSystolic}
                  onChange={(e) => setForm({ ...form, preSystolic: e.target.value })}
                />
                <Input
                  placeholder="90"
                  value={form.preDiastolic}
                  onChange={(e) => setForm({ ...form, preDiastolic: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Post BP (Systolic/Diastolic)</label>
              <div className="flex gap-1">
                <Input
                  placeholder="120"
                  value={form.postSystolic}
                  onChange={(e) => setForm({ ...form, postSystolic: e.target.value })}
                />
                <Input
                  placeholder="80"
                  value={form.postDiastolic}
                  onChange={(e) => setForm({ ...form, postDiastolic: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">UF Removed (L)</label>
              <Input
                type="number"
                step="0.1"
                value={form.ufLitres}
                onChange={(e) => setForm({ ...form, ufLitres: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Dialyzer Reuse Count</label>
              <Input
                type="number"
                value={form.dialyserReuseCount}
                onChange={(e) => setForm({ ...form, dialyserReuseCount: e.target.value })}
              />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="font-semibold text-muted-foreground">Serology / Infection Isolation</label>
              <Select
                value={form.isolation}
                onValueChange={(val: any) => setForm({ ...form, isolation: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Standard Non-Infectious Bay</SelectItem>
                  <SelectItem value="hbv">Hepatitis B (HBV) Isolation</SelectItem>
                  <SelectItem value="hcv">Hepatitis C (HCV) Isolation</SelectItem>
                  <SelectItem value="hbv_hcv">Combined HBV + HCV</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewSessionOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSession} className="bg-cyan-600 hover:bg-cyan-700 text-white">
              Save Clinical Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
