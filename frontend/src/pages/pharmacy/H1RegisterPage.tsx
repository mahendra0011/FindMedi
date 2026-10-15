import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { api, apiClient } from '@/lib/api';
import {
  FileText,
  AlertTriangle,
  Download,
  Search,
  RefreshCw,
  ShieldCheck,
  CheckCircle,
  FileCheck,
  PlusCircle,
  Scale,
  ClipboardList,
} from 'lucide-react';

interface H1Entry {
  _id: string;
  prescriptionNo: string;
  patientName: string;
  prescriberName: string;
  medicineName: string;
  rxSchedule: string;
  quantity: number;
  dispensedByName: string;
  dispensedAt: string;
}

interface H1Gap {
  prescriptionId: string;
  prescriptionNo: string;
  medicineId: string;
  medicineName: string;
}

interface ReconcileRow {
  medicineId: string;
  medicineName: string;
  rxSchedule: string;
  openingQty: number;
  purchasesQty: number;
  dispensedQty: number;
  adjustedQty: number;
  expectedClosing: number;
  physicalQty: number;
  variance: number;
  lastCountedAt: string | null;
  lastCountedByName: string;
  witnessByName: string;
}

interface AdjustmentRow {
  _id: string;
  medicineName: string;
  batch: string;
  qty: number;
  type: string;
  reason: string;
  witnessByName: string;
  recordedByName: string;
  at: string;
}

export default function H1RegisterPage() {
  const [entries, setEntries] = useState<H1Entry[]>([]);
  const [gaps, setGaps] = useState<H1Gap[]>([]);
  const [reconcileRows, setReconcileRows] = useState<ReconcileRow[]>([]);
  const [adjustments, setAdjustments] = useState<AdjustmentRow[]>([]);
  const [varianceCount, setVarianceCount] = useState(0);
  const [staffUsers, setStaffUsers] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [scheduleFilter, setScheduleFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('register');

  // Modals state
  const [showAdjModal, setShowAdjModal] = useState(false);
  const [showCountModal, setShowCountModal] = useState(false);
  const [submittingModal, setSubmittingModal] = useState(false);

  const [adjForm, setAdjForm] = useState({
    medicineId: '',
    medicineName: '',
    batch: '',
    qty: 1,
    type: 'wastage',
    reason: '',
    witnessBy: '',
  });

  const [countForm, setCountForm] = useState({
    medicineId: '',
    medicineName: '',
    batch: '',
    countedQty: 0,
    witnessBy: '',
    notes: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [entriesRes, gapsRes, reconRes, adjRes, staffRes]: any = await Promise.all([
        // NOTE: api.get(path) takes no options — params must be in the URL,
        // otherwise the schedule filter is silently ignored.
        api.get(`/pharmacy/h1-register${scheduleFilter !== 'ALL' ? `?rxSchedule=${encodeURIComponent(scheduleFilter)}` : ''}`),
        api.get('/pharmacy/h1-register/gaps'),
        api.get('/pharmacy/narcotic-register/reconcile'),
        api.get('/pharmacy/narcotic-register/adjustments'),
        api.get('/staff').catch(() => ({ data: [] })),
      ]);

      setEntries(entriesRes.data?.rows || entriesRes.rows || []);
      setGaps(gapsRes.data?.gaps || gapsRes.gaps || []);
      setReconcileRows(reconRes.data?.rows || reconRes.rows || []);
      setVarianceCount(reconRes.data?.varianceCount ?? reconRes.varianceCount ?? 0);
      setAdjustments(adjRes.data?.adjustments || adjRes.adjustments || []);
      const usersList = staffRes.data?.staff || staffRes.data || staffRes || [];
      setStaffUsers(Array.isArray(usersList) ? usersList : []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load H1 register ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [scheduleFilter]);

  // Authenticated blob download: window.open() sends no auth headers, so the
  // export endpoints would 401. apiClient carries the session; the blob URL
  // triggers a real file download instead of a dead tab.
  const downloadExport = async (path: string, filename: string, doneMsg: string) => {
    try {
      const response = await apiClient.get(path, { responseType: 'blob' });
      const contentType = response.headers?.['content-type'];
      const blob = new Blob([response.data], {
        type: typeof contentType === 'string' ? contentType : 'application/octet-stream',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      toast.success(doneMsg);
    } catch {
      toast.error('Export download failed');
    }
  };

  const scheduleQuery = scheduleFilter !== 'ALL' ? `?rxSchedule=${encodeURIComponent(scheduleFilter)}` : '';

  const handleExportCsv = async () => {
    await downloadExport(
      `/pharmacy/h1-register/export${scheduleQuery}`,
      `h1-register-${scheduleFilter}.csv`,
      'Inspector-ready CSV export generated',
    );
  };

  const handleExportPdf = async () => {
    await downloadExport(
      `/pharmacy/h1-register/pdf${scheduleQuery}`,
      `h1-register-${scheduleFilter}.pdf`,
      'Statutory Inspector PDF generated',
    );
  };

  const submitAdjustment = async () => {
    if (!adjForm.medicineId || !adjForm.witnessBy || !adjForm.reason) {
      toast.error('Please fill all required fields and select an authorized witness');
      return;
    }
    setSubmittingModal(true);
    try {
      await api.post('/pharmacy/narcotic-register/adjustments', adjForm);
      toast.success('Narcotic stock adjustment recorded with dual witness signature');
      setShowAdjModal(false);
      setAdjForm({ medicineId: '', medicineName: '', batch: '', qty: 1, type: 'wastage', reason: '', witnessBy: '' });
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to record adjustment');
    } finally {
      setSubmittingModal(false);
    }
  };

  const submitPhysicalCount = async () => {
    if (!countForm.medicineId || !countForm.witnessBy) {
      toast.error('Please select medicine and an authorized witness');
      return;
    }
    setSubmittingModal(true);
    try {
      await api.post('/pharmacy/narcotic-register/counts', countForm);
      toast.success('Physical audit count logged with dual verification');
      setShowCountModal(false);
      setCountForm({ medicineId: '', medicineName: '', batch: '', countedQty: 0, witnessBy: '', notes: '' });
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to record count');
    } finally {
      setSubmittingModal(false);
    }
  };

  const filteredEntries = entries.filter((e) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.patientName?.toLowerCase().includes(q) ||
      e.medicineName?.toLowerCase().includes(q) ||
      e.prescriptionNo?.toLowerCase().includes(q) ||
      e.prescriberName?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="w-8 h-8 text-primary" />
            Pharmacy H1 / Narcotic Statutory Register
          </h1>
          <p className="text-muted-foreground">
            Statutory compliance and stock reconciliation ledger for Schedule H, H1, X and NDPS substances.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPdf}>
            <Download className="w-4 h-4 mr-2" />
            Export Inspector PDF
          </Button>
          <Button size="sm" onClick={handleExportCsv}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              Total Recorded Dispenses
              <ShieldCheck className="w-4 h-4 text-primary" />
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold">{entries.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Immutable statutory ledger rows</p>
          </CardContent>
        </Card>

        <Card className={varianceCount > 0 ? 'border-destructive/40 bg-destructive/5' : ''}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              Physical Stock Variance
              <Scale className={`w-4 h-4 ${varianceCount > 0 ? 'text-destructive' : 'text-emerald-500'}`} />
            </CardDescription>
            <CardTitle className={`text-3xl font-extrabold ${varianceCount > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
              {varianceCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {varianceCount === 0 ? 'Zero variance across controlled drugs' : 'Controlled stock discrepancy flagged'}
            </p>
          </CardContent>
        </Card>

        <Card className={gaps.length > 0 ? 'border-destructive/40 bg-destructive/5' : ''}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              Compliance Gaps
              <AlertTriangle className={`w-4 h-4 ${gaps.length > 0 ? 'text-destructive' : 'text-emerald-500'}`} />
            </CardDescription>
            <CardTitle className={`text-3xl font-extrabold ${gaps.length > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
              {gaps.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {gaps.length === 0 ? 'Zero unlinked dispenses' : 'Immediate reconciliation required'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              Statutory Inspection Status
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold text-emerald-600">
              {gaps.length === 0 && varianceCount === 0 ? 'CLEAN' : 'FLAGGED'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Drugs & Cosmetics Rules audit ready</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="register">Statutory Register ({entries.length})</TabsTrigger>
          <TabsTrigger value="reconcile" className="relative">
            Stock Reconciliation ({reconcileRows.length})
            {varianceCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full">
                {varianceCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="adjustments">Adjustments ({adjustments.length})</TabsTrigger>
          <TabsTrigger value="gaps">Compliance Gaps ({gaps.length})</TabsTrigger>
        </TabsList>

        {/* Tab 1: Register */}
        <TabsContent value="register" className="space-y-4">
          <Card>
            <CardContent className="pt-6 flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[240px]">
                <Input
                  placeholder="Search by Patient, Medicine, Rx #, or Doctor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <Select value={scheduleFilter} onValueChange={setScheduleFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Rx Schedule" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Schedules</SelectItem>
                  <SelectItem value="h1">Schedule H1</SelectItem>
                  <SelectItem value="schedule_h">Schedule H</SelectItem>
                  <SelectItem value="x">Schedule X</SelectItem>
                  <SelectItem value="narcotic_ndps">Narcotic / NDPS</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dispense Entries</CardTitle>
              <CardDescription>Government prescribed format showing patient, RMP prescriber and quantity</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredEntries.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  No controlled drug dispenses found matching criteria.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredEntries.map((e) => (
                    <div
                      key={e._id}
                      className="p-4 rounded-lg border flex flex-col md:flex-row justify-between gap-4 items-start md:items-center bg-card"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="uppercase font-semibold">
                            {e.rxSchedule}
                          </Badge>
                          <span className="font-semibold text-sm">{e.medicineName}</span>
                          <span className="text-xs text-muted-foreground">Qty: {e.quantity}</span>
                          <span className="text-xs text-muted-foreground">
                            • {new Date(e.dispensedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground flex flex-wrap gap-4 pt-1">
                          <span>Patient: <strong>{e.patientName}</strong></span>
                          <span>Prescriber: <strong>{e.prescriberName}</strong></span>
                          <span>Rx No: <strong>{e.prescriptionNo}</strong></span>
                          <span>Dispensed by: <strong>{e.dispensedByName}</strong></span>
                        </p>
                      </div>

                      <div>
                        <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                          <FileCheck className="w-3.5 h-3.5 mr-1" />
                          Logged
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Reconciliation */}
        <TabsContent value="reconcile" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Scale className="w-5 h-5 text-primary" /> Controlled Stock Reconciliation
              </h2>
              <p className="text-xs text-muted-foreground">
                Formula: Closing = Opening + In(GRN) − Dispensed(H1) − Adjustments vs Physical Verification
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowCountModal(true)}>
                <ClipboardList className="w-4 h-4 mr-1.5" /> Log Physical Count
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                  <tr>
                    <th className="p-3">Medicine</th>
                    <th className="p-3">Schedule</th>
                    <th className="p-3 text-right">Opening</th>
                    <th className="p-3 text-right">In (+)</th>
                    <th className="p-3 text-right">Dispensed (−)</th>
                    <th className="p-3 text-right">Adjusted (−)</th>
                    <th className="p-3 text-right">Expected</th>
                    <th className="p-3 text-right">Physical</th>
                    <th className="p-3 text-center">Variance</th>
                    <th className="p-3">Last Counted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {reconcileRows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-muted-foreground">
                        No controlled drug inventory records found.
                      </td>
                    </tr>
                  ) : (
                    reconcileRows.map((r) => (
                      <tr key={r.medicineId} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-medium">{r.medicineName}</td>
                        <td className="p-3 uppercase">
                          <Badge variant="outline">{r.rxSchedule}</Badge>
                        </td>
                        <td className="p-3 text-right tabular-nums">{r.openingQty}</td>
                        <td className="p-3 text-right tabular-nums text-emerald-600 font-medium">+{r.purchasesQty}</td>
                        <td className="p-3 text-right tabular-nums text-amber-600">−{r.dispensedQty}</td>
                        <td className="p-3 text-right tabular-nums text-destructive">−{r.adjustedQty}</td>
                        <td className="p-3 text-right tabular-nums font-semibold">{r.expectedClosing}</td>
                        <td className="p-3 text-right tabular-nums font-bold">{r.physicalQty}</td>
                        <td className="p-3 text-center">
                          {r.variance === 0 ? (
                            <Badge variant="outline" className="text-emerald-600 border-emerald-300">0 (Match)</Badge>
                          ) : (
                            <Badge variant="destructive" className="font-bold">
                              {r.variance > 0 ? `+${r.variance}` : r.variance}
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {r.lastCountedAt ? (
                            <div>
                              <span>{new Date(r.lastCountedAt).toLocaleDateString()}</span>
                              {r.witnessByName && (
                                <p className="text-[10px] text-muted-foreground/80">Witness: {r.witnessByName}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground/60">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Adjustments */}
        <TabsContent value="adjustments" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" /> Stock Adjustments & Wastage
              </h2>
              <p className="text-xs text-muted-foreground">
                Dual witness authorized adjustments for broken ampoules, expiry, and supplier returns
              </p>
            </div>
            <Button size="sm" onClick={() => setShowAdjModal(true)}>
              <PlusCircle className="w-4 h-4 mr-1.5" /> Record Adjustment
            </Button>
          </div>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Medicine</th>
                    <th className="p-3">Batch</th>
                    <th className="p-3 text-right">Qty</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Reason</th>
                    <th className="p-3">Recorded By</th>
                    <th className="p-3">Witness</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {adjustments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-muted-foreground">
                        No adjustments recorded in statutory ledger.
                      </td>
                    </tr>
                  ) : (
                    adjustments.map((a) => (
                      <tr key={a._id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 text-muted-foreground">{new Date(a.at).toLocaleDateString()}</td>
                        <td className="p-3 font-medium">{a.medicineName}</td>
                        <td className="p-3 font-mono">{a.batch || '—'}</td>
                        <td className="p-3 text-right font-bold text-destructive">−{a.qty}</td>
                        <td className="p-3 capitalize">
                          <Badge variant="outline">{a.type}</Badge>
                        </td>
                        <td className="p-3 max-w-xs truncate">{a.reason}</td>
                        <td className="p-3">{a.recordedByName}</td>
                        <td className="p-3 font-medium text-emerald-600">{a.witnessByName}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Gaps */}
        <TabsContent value="gaps" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reconciliation Gaps</CardTitle>
              <CardDescription>Dispensed controlled medicines missing an explicit statutory ledger entry</CardDescription>
            </CardHeader>
            <CardContent>
              {gaps.length === 0 ? (
                <div className="py-12 text-center text-emerald-600 font-medium">
                  ✓ Excellent: No unlinked controlled substance dispenses detected.
                </div>
              ) : (
                <div className="space-y-3">
                  {gaps.map((g, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-lg border border-destructive/40 bg-destructive/5 flex justify-between items-center"
                    >
                      <div>
                        <p className="font-semibold text-sm text-destructive">{g.medicineName}</p>
                        <p className="text-xs text-muted-foreground">
                          Prescription #{g.prescriptionNo} (ID: {g.prescriptionId})
                        </p>
                      </div>
                      <Badge variant="destructive">Needs Reconciliation</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Record Adjustment Modal */}
      <Dialog open={showAdjModal} onOpenChange={setShowAdjModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Stock Adjustment (Dual Sign-Off)</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-medium text-muted-foreground mb-1 block">Controlled Medicine</label>
              <Select
                value={adjForm.medicineId}
                onValueChange={(val) => {
                  const m = reconcileRows.find((r) => r.medicineId === val);
                  setAdjForm({ ...adjForm, medicineId: val, medicineName: m?.medicineName || '' });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select medicine" />
                </SelectTrigger>
                <SelectContent>
                  {reconcileRows.map((r) => (
                    <SelectItem key={r.medicineId} value={r.medicineId}>
                      {r.medicineName} ({r.rxSchedule.toUpperCase()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-medium text-muted-foreground mb-1 block">Quantity</label>
                <Input
                  type="number"
                  min="1"
                  value={adjForm.qty}
                  onChange={(e) => setAdjForm({ ...adjForm, qty: Math.max(1, parseInt(e.target.value) || 1) })}
                />
              </div>
              <div>
                <label className="font-medium text-muted-foreground mb-1 block">Adjustment Type</label>
                <Select
                  value={adjForm.type}
                  onValueChange={(val) => setAdjForm({ ...adjForm, type: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wastage">Wastage</SelectItem>
                    <SelectItem value="breakage">Breakage</SelectItem>
                    <SelectItem value="expiry">Expiry</SelectItem>
                    <SelectItem value="return-to-supplier">Return to Supplier</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="font-medium text-muted-foreground mb-1 block">Batch Number (Optional)</label>
              <Input
                placeholder="Batch #"
                value={adjForm.batch}
                onChange={(e) => setAdjForm({ ...adjForm, batch: e.target.value })}
              />
            </div>

            <div>
              <label className="font-medium text-muted-foreground mb-1 block">Clinical / Operational Reason</label>
              <Textarea
                placeholder="Reason for wastage, breakage or return..."
                value={adjForm.reason}
                onChange={(e) => setAdjForm({ ...adjForm, reason: e.target.value })}
                className="resize-none h-16"
              />
            </div>

            <div>
              <label className="font-medium text-muted-foreground mb-1 block">Dual Witness (Doctor / Pharmacist)</label>
              <Select
                value={adjForm.witnessBy}
                onValueChange={(val) => setAdjForm({ ...adjForm, witnessBy: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select authorized witness" />
                </SelectTrigger>
                <SelectContent>
                  {staffUsers.map((s: any) => (
                    <SelectItem key={s._id} value={s._id}>
                      {s.name} ({s.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowAdjModal(false)} disabled={submittingModal}>
              Cancel
            </Button>
            <Button size="sm" onClick={submitAdjustment} disabled={submittingModal}>
              {submittingModal ? 'Recording...' : 'Record Adjustment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Physical Count Modal */}
      <Dialog open={showCountModal} onOpenChange={setShowCountModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log Physical Stock Verification</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-medium text-muted-foreground mb-1 block">Controlled Medicine</label>
              <Select
                value={countForm.medicineId}
                onValueChange={(val) => {
                  const m = reconcileRows.find((r) => r.medicineId === val);
                  setCountForm({ ...countForm, medicineId: val, medicineName: m?.medicineName || '' });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select medicine" />
                </SelectTrigger>
                <SelectContent>
                  {reconcileRows.map((r) => (
                    <SelectItem key={r.medicineId} value={r.medicineId}>
                      {r.medicineName} ({r.rxSchedule.toUpperCase()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="font-medium text-muted-foreground mb-1 block">Counted Physical Quantity</label>
              <Input
                type="number"
                min="0"
                value={countForm.countedQty}
                onChange={(e) => setCountForm({ ...countForm, countedQty: Math.max(0, parseInt(e.target.value) || 0) })}
              />
            </div>

            <div>
              <label className="font-medium text-muted-foreground mb-1 block">Authorized Witness</label>
              <Select
                value={countForm.witnessBy}
                onValueChange={(val) => setCountForm({ ...countForm, witnessBy: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select authorized witness" />
                </SelectTrigger>
                <SelectContent>
                  {staffUsers.map((s: any) => (
                    <SelectItem key={s._id} value={s._id}>
                      {s.name} ({s.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="font-medium text-muted-foreground mb-1 block">Audit Notes (Optional)</label>
              <Input
                placeholder="Physical count observations..."
                value={countForm.notes}
                onChange={(e) => setCountForm({ ...countForm, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowCountModal(false)} disabled={submittingModal}>
              Cancel
            </Button>
            <Button size="sm" onClick={submitPhysicalCount} disabled={submittingModal}>
              {submittingModal ? 'Logging...' : 'Save Physical Count'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
