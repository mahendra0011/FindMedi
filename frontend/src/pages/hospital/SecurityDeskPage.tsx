import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';
import {
  ShieldCheck,
  FileCheck2,
  QrCode,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Plus,
  Compass,
} from 'lucide-react';

interface GatePassItem {
  _id: string;
  passNo: string;
  type: string;
  description: string;
  itemCount: number;
  vehicleNo?: string;
  carrierName?: string;
  destination?: string;
  status: 'requested' | 'approved' | 'rejected' | 'used' | 'expired';
  validUntil?: string;
  createdAt: string;
}

interface SecurityRoundItem {
  _id: string;
  roundNo: string;
  status: 'open' | 'closed';
  startedAt: string;
  endedAt?: string;
  incident?: string;
  checkpoints: Array<{ name: string; ok: boolean; note?: string; at?: string }>;
}

export default function SecurityDeskPage() {
  const [passes, setPasses] = useState<GatePassItem[]>([]);
  const [rounds, setRounds] = useState<SecurityRoundItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Dialogs
  const [isNewPassOpen, setIsNewPassOpen] = useState(false);
  const [isNewRoundOpen, setIsNewRoundOpen] = useState(false);
  const [decidePass, setDecidePass] = useState<{ pass: GatePassItem; action: 'approve' | 'reject' } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Pass Form
  const [passForm, setPassForm] = useState({
    type: 'returnable',
    description: 'Medical monitor sent for calibration',
    itemCount: 1,
    vehicleNo: 'MH-12-AB-1234',
    carrierName: 'Ramesh Logistics',
    destination: 'MedTech Labs, Pune',
  });

  // Round Checkpoints
  const [newCheckpoints, setNewCheckpoints] = useState<string>('Main Gate, Emergency Triage, Pharmacy Store, Oxygen Plant, Server Room');

  const loadData = async () => {
    try {
      setLoading(true);
      const [passRes, roundRes]: any = await Promise.all([
        api.get('/security/gate-passes'),
        api.get('/security/rounds'),
      ]);
      setPasses(passRes.data?.passes || []);
      setRounds(roundRes.data?.rounds || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load security ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreatePass = async () => {
    try {
      await api.post('/security/gate-passes', {
        type: passForm.type,
        description: passForm.description,
        itemCount: Number(passForm.itemCount),
        vehicleNo: passForm.vehicleNo,
        carrierName: passForm.carrierName,
        destination: passForm.destination,
      });
      toast.success('Gate pass requested successfully');
      setIsNewPassOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to request gate pass');
    }
  };

  const handleDecidePass = async () => {
    if (!decidePass) return;
    try {
      await api.put(`/security/gate-passes/${decidePass.pass._id}/decide`, {
        action: decidePass.action,
        reason: rejectionReason,
      });
      toast.success(`Gate pass ${decidePass.action}d`);
      setDecidePass(null);
      setRejectionReason('');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update pass');
    }
  };

  const handleMarkUsed = async (id: string) => {
    try {
      await api.put(`/security/gate-passes/${id}/use`);
      toast.success('Pass verified and marked USED at gate');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to mark pass as used');
    }
  };

  const handleStartRound = async () => {
    const names = newCheckpoints
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (names.length === 0) {
      toast.error('Add at least one checkpoint');
      return;
    }
    try {
      await api.post('/security/rounds', {
        checkpoints: names.map((name) => ({ name })),
      });
      toast.success('Guard security round started');
      setIsNewRoundOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to start round');
    }
  };

  const handleToggleCheckpoint = async (roundId: string, index: number, currentOk: boolean) => {
    try {
      await api.put(`/security/rounds/${roundId}/checkpoints/${index}`, {
        ok: !currentOk,
        note: !currentOk ? 'Verified secure & operational' : 'Requires re-inspection',
      });
      toast.success('Checkpoint recorded');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update checkpoint');
    }
  };

  const handleCloseRound = async (roundId: string) => {
    try {
      await api.put(`/security/rounds/${roundId}/close`, {
        incident: 'Round completed normally with all perimeter checkpoints logged.',
      });
      toast.success('Security patrol round closed');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to close round');
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-primary" />
            Security Desk & Gate Control
          </h1>
          <p className="text-muted-foreground">
            Material gate passes, perimeter patrol rounds, and guard checkpoint auditing.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setIsNewPassOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Gate Pass
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setIsNewRoundOpen(true)}>
            <Compass className="w-4 h-4 mr-2" />
            Start Guard Patrol
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              Pending Pass Approvals
              <Clock className="w-4 h-4 text-amber-500" />
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold text-amber-600">
              {passes.filter((p) => p.status === 'requested').length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Goods awaiting security approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              Approved Passes (Ready at Gate)
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold text-emerald-600">
              {passes.filter((p) => p.status === 'approved').length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Scannable and ready to dispatch</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              Active Guard Patrols
              <Compass className="w-4 h-4 text-primary" />
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold">
              {rounds.filter((r) => r.status === 'open').length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">In-progress security checkpoint sweeps</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              Completed Passes Today
              <FileCheck2 className="w-4 h-4 text-muted-foreground" />
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold">
              {passes.filter((p) => p.status === 'used').length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Goods successfully checked out</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="passes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="passes">Gate Passes ({passes.length})</TabsTrigger>
          <TabsTrigger value="rounds">Guard Rounds ({rounds.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="passes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Material Gate Pass Ledger</CardTitle>
              <CardDescription>Track returnable and non-returnable equipment movements</CardDescription>
            </CardHeader>
            <CardContent>
              {passes.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  No gate passes created yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {passes.map((p) => (
                    <div
                      key={p._id}
                      className="p-4 rounded-lg border flex flex-col md:flex-row justify-between gap-4 items-start md:items-center bg-card"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              p.status === 'approved'
                                ? 'default'
                                : p.status === 'requested'
                                ? 'secondary'
                                : p.status === 'used'
                                ? 'outline'
                                : 'destructive'
                            }
                          >
                            {p.status.toUpperCase()}
                          </Badge>
                          <span className="font-semibold text-sm">Pass #{p.passNo}</span>
                          <Badge variant="outline" className="capitalize">
                            {p.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            • {new Date(p.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-foreground">{p.description}</p>
                        <div className="text-xs text-muted-foreground flex flex-wrap gap-4 pt-1">
                          <span>Items: {p.itemCount}</span>
                          {p.vehicleNo && <span>Vehicle: {p.vehicleNo}</span>}
                          {p.carrierName && <span>Carrier: {p.carrierName}</span>}
                          {p.destination && <span>Destination: {p.destination}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-center">
                        {p.status === 'requested' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-emerald-600 hover:text-emerald-700"
                              onClick={() => setDecidePass({ pass: p, action: 'approve' })}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDecidePass({ pass: p, action: 'reject' })}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {p.status === 'approved' && (
                          <Button size="sm" onClick={() => handleMarkUsed(p._id)}>
                            <QrCode className="w-3.5 h-3.5 mr-1" />
                            Mark Used (At Gate)
                          </Button>
                        )}
                        {p.status === 'used' && (
                          <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                            Dispatched / Used
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rounds" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Guard Patrol Checkpoints</CardTitle>
              <CardDescription>Real-time security sweeps and perimeter checks</CardDescription>
            </CardHeader>
            <CardContent>
              {rounds.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  No guard patrol rounds recorded.
                </div>
              ) : (
                <div className="space-y-6">
                  {rounds.map((r) => {
                    const completedCount = r.checkpoints.filter((c) => c.ok).length;
                    const totalCount = r.checkpoints.length;
                    return (
                      <div key={r._id} className="p-4 rounded-lg border bg-card space-y-4">
                        <div className="flex flex-col md:flex-row justify-between gap-2 items-start md:items-center">
                          <div className="flex items-center gap-2">
                            <Badge variant={r.status === 'open' ? 'default' : 'secondary'}>
                              {r.status.toUpperCase()}
                            </Badge>
                            <span className="font-semibold text-base">Round #{r.roundNo}</span>
                            <span className="text-xs text-muted-foreground">
                              Started: {new Date(r.startedAt).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold">
                              Progress: {completedCount}/{totalCount} checkpoints
                            </span>
                            {r.status === 'open' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCloseRound(r._id)}
                              >
                                Close Round
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Checkpoint Chips */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {r.checkpoints.map((cp, idx) => (
                            <div
                              key={idx}
                              onClick={() => r.status === 'open' && handleToggleCheckpoint(r._id, idx, cp.ok)}
                              className={`p-3 rounded-md border flex items-center justify-between cursor-pointer transition-colors ${
                                cp.ok
                                  ? 'bg-emerald-50/50 border-emerald-300 dark:bg-emerald-950/20'
                                  : 'bg-muted/40 hover:bg-muted'
                              }`}
                            >
                              <div className="space-y-0.5">
                                <p className="text-sm font-medium">{cp.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {cp.ok ? 'Verified Secure' : 'Pending Check'}
                                </p>
                              </div>
                              {cp.ok ? (
                                <CheckCircle className="w-5 h-5 text-emerald-600" />
                              ) : (
                                <Clock className="w-5 h-5 text-muted-foreground" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Gate Pass Dialog */}
      <Dialog open={isNewPassOpen} onOpenChange={setIsNewPassOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Material Gate Pass</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Pass Type</label>
              <Select
                value={passForm.type}
                onValueChange={(val) => setPassForm({ ...passForm, type: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="returnable">Returnable (Asset / Calibration)</SelectItem>
                  <SelectItem value="non_returnable">Non-Returnable (Scrap / Sample)</SelectItem>
                  <SelectItem value="visitor_vehicle">Visitor / Commercial Vehicle</SelectItem>
                  <SelectItem value="emergency">Emergency Dispatch</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Goods Description</label>
              <Input
                value={passForm.description}
                onChange={(e) => setPassForm({ ...passForm, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Item Quantity</label>
                <Input
                  type="number"
                  value={passForm.itemCount}
                  onChange={(e) => setPassForm({ ...passForm, itemCount: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Vehicle Number</label>
                <Input
                  value={passForm.vehicleNo}
                  onChange={(e) => setPassForm({ ...passForm, vehicleNo: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Carrier / Driver Name</label>
              <Input
                value={passForm.carrierName}
                onChange={(e) => setPassForm({ ...passForm, carrierName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Destination</label>
              <Input
                value={passForm.destination}
                onChange={(e) => setPassForm({ ...passForm, destination: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewPassOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePass}>Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Start Round Dialog */}
      <Dialog open={isNewRoundOpen} onOpenChange={setIsNewRoundOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Security Patrol Round</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Checkpoints (Comma separated)</label>
              <Input
                value={newCheckpoints}
                onChange={(e) => setNewCheckpoints(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewRoundOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStartRound}>Initialize Patrol</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decide Pass Dialog */}
      <Dialog open={!!decidePass} onOpenChange={(open) => !open && setDecidePass(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decidePass?.action === 'approve' ? 'Approve' : 'Reject'} Gate Pass #{decidePass?.pass.passNo}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Description: {decidePass?.pass.description} ({decidePass?.pass.itemCount} items)
            </p>
            {decidePass?.action === 'reject' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Rejection Reason</label>
                <Input
                  placeholder="Explain why this pass is rejected..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecidePass(null)}>
              Cancel
            </Button>
            <Button
              variant={decidePass?.action === 'approve' ? 'default' : 'destructive'}
              onClick={handleDecidePass}
            >
              Confirm {decidePass?.action}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
