import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';
import {
  Sparkles,
  Flame,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Plus,
  Package,
  Layers,
  Thermometer,
  Gauge,
  Clock,
} from 'lucide-react';

export default function CssdPage() {
  const [activeTab, setActiveTab] = useState<'cycles' | 'sets'>('cycles');
  const [cycles, setCycles] = useState<any[]>([]);
  const [sets, setSets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // New Cycle Dialog
  const [isCycleModalOpen, setIsCycleModalOpen] = useState(false);
  const [cycleForm, setCycleForm] = useState({
    cycleNo: '',
    machineId: 'AUTOCLAVE-01',
    method: 'Steam Autoclave (134°C)',
    sterilizerType: 'STEAM_134C',
  });

  // New Set Dialog
  const [isSetModalOpen, setIsSetModalOpen] = useState(false);
  const [setForm, setSetForm] = useState({
    code: '',
    name: '',
    department: 'OT',
    totalItems: 12,
  });

  const load = async () => {
    try {
      setLoading(true);
      const [cycleRes, setRes]: any = await Promise.all([
        (api as any).getCssdCycles?.({}) || api.get('/cssd/cycles').catch(() => ({ data: { cycles: [] } })),
        api.get('/cssd/sets').catch(() => ({ data: { sets: [] } })),
      ]);
      setCycles(cycleRes?.cycles || cycleRes?.data?.cycles || []);
      setSets(setRes?.data?.sets || setRes?.sets || []);
    } catch {
      toast.error('Failed to load CSSD data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleStartCycle = async () => {
    if (!cycleForm.cycleNo) {
      toast.error('Please enter a cycle load number');
      return;
    }
    try {
      if ((api as any).startCssdCycle) {
        await (api as any).startCssdCycle({
          cycleNo: cycleForm.cycleNo,
          machineId: cycleForm.machineId,
          method: cycleForm.method,
          parameters: { peakTemp: 134, peakPressureBar: 2.1 },
        });
      } else {
        await api.post('/cssd/cycles', {
          cycleNo: cycleForm.cycleNo,
          machineId: cycleForm.machineId,
          method: cycleForm.method,
        });
      }
      toast.success('Sterilisation cycle initiated');
      setIsCycleModalOpen(false);
      setCycleForm({ ...cycleForm, cycleNo: '' });
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to start cycle');
    }
  };

  const handleCreateSet = async () => {
    if (!setForm.code || !setForm.name) {
      toast.error('Code and Name are required');
      return;
    }
    try {
      await api.post('/cssd/sets', {
        code: setForm.code,
        name: setForm.name,
        items: [{ name: 'Surgical Scissor', qty: 2 }, { name: 'Artery Forceps', qty: 4 }],
      });
      toast.success('Instrument set registered');
      setIsSetModalOpen(false);
      setSetForm({ code: '', name: '', department: 'OT', totalItems: 12 });
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to register set');
    }
  };

  const markIndicator = async (id: string, pass: boolean) => {
    try {
      let r: any = null;
      if ((api as any).setCssdIndicators) {
        r = await (api as any).setCssdIndicators(id, {
          biologicalIndicator: pass ? 'Pass' : 'Fail',
          chemicalIndicator: pass ? 'Pass' : 'Fail',
        });
      } else {
        r = await api.put(`/cssd/cycles/${id}/indicators`, {
          biologicalIndicator: pass ? 'Pass' : 'Fail',
          chemicalIndicator: pass ? 'Pass' : 'Fail',
        });
      }
      const msg = r?.data?.message || r?.message;
      if (pass) toast.success(msg || 'Batch passed & released');
      else toast.error(msg || `RECALLED (BI fail) — result: ${r?.result ?? r?.data?.result}`);
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update indicators');
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-teal-600 dark:text-teal-400" />
              Central Sterile Supply Department (CSSD)
            </h1>
            <Badge variant="outline" className="bg-teal-500/10 text-teal-600 border-teal-500/20">
              NABH Infection Control
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            End-to-end autoclave cycles, Biological Indicator (BI) gating, and surgical tray traceability.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsSetModalOpen(true)} className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            New Tray Set
          </Button>
          <Button
            onClick={() => setIsCycleModalOpen(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Start Autoclave Load
          </Button>
        </div>
      </div>

      {/* Process KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Steam Sterilizers</p>
              <p className="text-xl font-bold">2 Online (134°C)</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Released Loads</p>
              <p className="text-xl font-bold">
                {cycles.filter((c) => c.result === 'Released').length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Pending BI Incubation</p>
              <p className="text-xl font-bold">
                {cycles.filter((c) => c.result === 'Pending').length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Sterile Tray Sets</p>
              <p className="text-xl font-bold">{sets.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border rounded-lg p-1 bg-muted/40 w-fit">
        <Button
          size="sm"
          variant={activeTab === 'cycles' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('cycles')}
          className="text-xs h-8"
        >
          Autoclave Sterilisation Batches ({cycles.length})
        </Button>
        <Button
          size="sm"
          variant={activeTab === 'sets' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('sets')}
          className="text-xs h-8"
        >
          Instrument Trays & Sets ({sets.length})
        </Button>
      </div>

      {/* Tab 1: Cycles Table */}
      {activeTab === 'cycles' ? (
        <Card className="border-border/60 shadow-sm overflow-hidden">
          <CardHeader className="p-4 bg-muted/20 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-teal-600" />
              Autoclave Cycles with Biological & Chemical Indicator Verification
            </CardTitle>
            <CardDescription className="text-xs">
              Every cycle requires Class 5/6 Chemical Indicator and Geobacillus stearothermophilus spore incubation.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider border-b">
                <tr>
                  <th className="p-3">Cycle No.</th>
                  <th className="p-3">Machine / Method</th>
                  <th className="p-3">Parameters</th>
                  <th className="p-3">Chemical Indicator</th>
                  <th className="p-3">Biological Indicator</th>
                  <th className="p-3">Disposition Result</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {cycles.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted-foreground">
                      No sterilisation cycles recorded yet.
                    </td>
                  </tr>
                ) : (
                  cycles.map((c) => (
                    <tr key={c._id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-mono font-bold text-teal-600 dark:text-teal-400">
                        {c.cycleNo}
                      </td>
                      <td className="p-3">
                        <p className="font-medium text-foreground">{c.method || 'Steam Autoclave'}</p>
                        <p className="text-[11px] text-muted-foreground">{c.machineId || 'Unit #1'}</p>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="flex items-center gap-0.5 text-muted-foreground">
                            <Thermometer className="h-3 w-3" /> 134°C
                          </span>
                          <span className="flex items-center gap-0.5 text-muted-foreground">
                            <Gauge className="h-3 w-3" /> 2.1 bar
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-[10px]">
                          CI: {c.chemicalIndicator || 'Pending'}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge
                          variant="outline"
                          className={
                            c.biologicalIndicator === 'Pass'
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]'
                              : c.biologicalIndicator === 'Fail'
                              ? 'bg-red-500/10 text-red-600 border-red-500/20 text-[10px]'
                              : 'text-[10px]'
                          }
                        >
                          BI: {c.biologicalIndicator || 'Incubating (4h)'}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge
                          className={
                            c.result === 'Released'
                              ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20 font-semibold'
                              : c.result === 'Recalled'
                              ? 'bg-red-500/15 text-red-600 border-red-500/20 font-bold animate-pulse'
                              : 'bg-muted text-muted-foreground'
                          }
                        >
                          {c.result || 'Pending'}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        {c.result === 'Pending' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => markIndicator(c._id, true)}
                            >
                              Release
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 text-xs"
                              onClick={() => markIndicator(c._id, false)}
                            >
                              Recall Load
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground font-mono">Verified</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : (
        /* Tab 2: Sets Table */
        <Card className="border-border/60 shadow-sm overflow-hidden">
          <CardHeader className="p-4 bg-muted/20 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-teal-600" />
              Surgical Instrument Trays Inventory
            </CardTitle>
            <CardDescription className="text-xs">
              Trays packaged in rigid containers and double SMS wrap for major surgery suites.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider border-b">
                <tr>
                  <th className="p-3">Set Code</th>
                  <th className="p-3">Set Description</th>
                  <th className="p-3">Instruments Count</th>
                  <th className="p-3">Created</th>
                  <th className="p-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {sets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-muted-foreground">
                      No instrument sets registered.
                    </td>
                  </tr>
                ) : (
                  sets.map((s) => (
                    <tr key={s._id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-mono font-semibold text-primary">{s.code}</td>
                      <td className="p-3 font-medium text-foreground">{s.name}</td>
                      <td className="p-3">{s.items?.length || 0} Pieces</td>
                      <td className="p-3 text-muted-foreground">
                        {new Date(s.createdAt || Date.now()).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-right">
                        <Badge
                          variant="outline"
                          className={
                            s.status === 'Quarantined'
                              ? 'bg-red-500/10 text-red-600 border-red-500/30 animate-pulse'
                              : s.status === 'In Use'
                              ? 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                              : s.status === 'Soiled'
                              ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                              : 'text-teal-600 border-teal-500/30'
                          }
                        >
                          {s.status === 'Quarantined'
                            ? `Quarantined (${s.quarantinedByCycle || 'BI fail'})`
                            : s.status || 'Sterile'}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Modal: Start Autoclave Load */}
      <Dialog open={isCycleModalOpen} onOpenChange={setIsCycleModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-teal-600" />
              Initiate Autoclave Sterilisation Load
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Cycle / Batch Number *</label>
              <Input
                placeholder="e.g. CYC-2026-1049"
                value={cycleForm.cycleNo}
                onChange={(e) => setCycleForm({ ...cycleForm, cycleNo: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Autoclave Chamber</label>
              <Select
                value={cycleForm.machineId}
                onValueChange={(val) => setCycleForm({ ...cycleForm, machineId: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AUTOCLAVE-01">Autoclave #1 (Tuttnauer 5075ELV)</SelectItem>
                  <SelectItem value="AUTOCLAVE-02">Autoclave #2 (Steris Amsco 400)</SelectItem>
                  <SelectItem value="PLASMA-01">Plasma Sterilizer (STERRAD 100NX)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Cycle Protocol</label>
              <Input
                value={cycleForm.method}
                onChange={(e) => setCycleForm({ ...cycleForm, method: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCycleModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStartCycle} className="bg-teal-600 hover:bg-teal-700 text-white">
              Start Cycle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: New Set */}
      <Dialog open={isSetModalOpen} onOpenChange={setIsSetModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-teal-600" />
              Register Instrument Set Master
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Set Code *</label>
              <Input
                placeholder="e.g. TRAY-ORTHO-MAJOR-01"
                value={setForm.code}
                onChange={(e) => setSetForm({ ...setForm, code: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Tray Name *</label>
              <Input
                placeholder="e.g. Major Orthopedic Laparotomy Set"
                value={setForm.name}
                onChange={(e) => setSetForm({ ...setForm, name: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSetModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSet} className="bg-teal-600 hover:bg-teal-700 text-white">
              Register Tray
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
