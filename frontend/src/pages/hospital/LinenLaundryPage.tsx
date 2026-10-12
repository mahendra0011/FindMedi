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
  Shirt,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  Truck,
  Layers,
  Thermometer,
} from 'lucide-react';

interface LinenRequest {
  _id: string;
  requestId: string;
  ward?: string;
  bedNumber?: string;
  items: Array<{ name: string; qty: number }>;
  isolationCase: boolean;
  status: 'requested' | 'collected' | 'washed' | 'processed' | 'delivered' | 'cancelled';
  notes?: string;
  createdAt: string;
}

export default function LinenLaundryPage() {
  const [requests, setRequests] = useState<LinenRequest[]>([]);
  const [stats, setStats] = useState<any>({ byStatus: {}, isolationPending: 0 });
  const [loading, setLoading] = useState(false);
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);

  const [form, setForm] = useState({
    ward: 'ICU Ward A',
    bedNumber: 'Bed 04',
    isolationCase: false,
    notes: '',
    items: [
      { name: 'Bed Sheet (White)', qty: 10 },
      { name: 'Pillow Cover', qty: 10 },
      { name: 'Patient Gown', qty: 5 },
    ],
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [reqRes, statsRes]: any = await Promise.all([
        api.get('/linen/requests'),
        api.get('/linen/stats'),
      ]);
      setRequests(reqRes.data?.requests || []);
      setStats(statsRes.data || { byStatus: {}, isolationPending: 0 });
    } catch {
      toast.error('Failed to load linen circulation data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateRequest = async () => {
    if (!form.ward || form.items.length === 0) {
      toast.error('Ward and items are required');
      return;
    }
    try {
      await api.post('/linen/requests', form);
      toast.success('Linen requisition dispatched');
      setIsNewRequestOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to request linen');
    }
  };

  const handleAdvanceStatus = async (id: string, nextStatus: string) => {
    try {
      await api.put(`/linen/requests/${id}/status`, { status: nextStatus });
      toast.success(`Load progressed to ${nextStatus.toUpperCase()}`);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Shirt className="h-6 w-6 text-sky-600 dark:text-sky-400" />
              Laundry & Linen Circulation Management
            </h1>
            <Badge variant="outline" className="bg-sky-500/10 text-sky-600 border-sky-500/20">
              Module #37
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Ward par-levels (1:3 ratio), thermal disinfection (71°C), isolation double-bagging, and wash cycle tracking.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsNewRequestOpen(true)}
            className="bg-sky-600 hover:bg-sky-700 text-white flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Ward Linen Requisition
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-600">
              <Shirt className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Requested</p>
              <p className="text-xl font-bold">{stats.byStatus?.requested || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Collected</p>
              <p className="text-xl font-bold">{stats.byStatus?.collected || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">In Wash (71°C)</p>
              <p className="text-xl font-bold">{stats.byStatus?.washed || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Processed / Ironed</p>
              <p className="text-xl font-bold">{stats.byStatus?.processed || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-500/10 text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Isolation Loads</p>
              <p className="text-xl font-bold text-red-600">{stats.isolationPending || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card className="border-border/60 shadow-sm overflow-hidden">
        <CardHeader className="p-4 bg-muted/20 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4 text-sky-600" />
            Active Ward Requests & Laundry Load Tracker
          </CardTitle>
          <CardDescription className="text-xs">
            Standard status progression: Requested → Collected → Washed (Thermal Disinfection) → Processed → Delivered.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider border-b">
              <tr>
                <th className="p-3">Req ID</th>
                <th className="p-3">Ward / Bed</th>
                <th className="p-3">Linen Breakdown</th>
                <th className="p-3">Infection Status</th>
                <th className="p-3">Current Stage</th>
                <th className="p-3">Created</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-muted-foreground">
                    No active linen requests found.
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r._id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-mono font-bold text-sky-600 dark:text-sky-400">{r.requestId}</td>
                    <td className="p-3">
                      <p className="font-semibold text-foreground">{r.ward || 'General'}</p>
                      <p className="text-[11px] text-muted-foreground">{r.bedNumber || 'All beds'}</p>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {r.items?.map((it, idx) => (
                          <Badge key={idx} variant="outline" className="text-[10px]">
                            {it.name}: {it.qty}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="p-3">
                      {r.isolationCase ? (
                        <Badge className="bg-red-500/15 text-red-600 border-red-500/20 text-[10px] animate-pulse">
                          Isolation Double-Bag
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground text-[10px]">
                          Standard White
                        </Badge>
                      )}
                    </td>
                    <td className="p-3">
                      <Badge
                        className={
                          r.status === 'delivered'
                            ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20'
                            : r.status === 'washed'
                            ? 'bg-purple-500/15 text-purple-600 border-purple-500/20'
                            : r.status === 'collected'
                            ? 'bg-amber-500/15 text-amber-600 border-amber-500/20'
                            : 'bg-muted text-muted-foreground'
                        }
                      >
                        {r.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-3 text-right">
                      {r.status === 'requested' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleAdvanceStatus(r._id, 'collected')}
                        >
                          Mark Collected
                        </Button>
                      )}
                      {r.status === 'collected' && (
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                          onClick={() => handleAdvanceStatus(r._id, 'washed')}
                        >
                          Wash (71°C)
                        </Button>
                      )}
                      {r.status === 'washed' && (
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-sky-600 hover:bg-sky-700 text-white"
                          onClick={() => handleAdvanceStatus(r._id, 'processed')}
                        >
                          Iron & Pack
                        </Button>
                      )}
                      {r.status === 'processed' && (
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => handleAdvanceStatus(r._id, 'delivered')}
                        >
                          Deliver to Ward
                        </Button>
                      )}
                      {r.status === 'delivered' && (
                        <span className="text-[11px] text-emerald-600 font-medium">Delivered</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Modal: New Requisition */}
      <Dialog open={isNewRequestOpen} onOpenChange={setIsNewRequestOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shirt className="h-5 w-5 text-sky-600" />
              Ward Linen Requisition
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Ward / Department *</label>
              <Input
                placeholder="e.g. ICU Ward A / Emergency"
                value={form.ward}
                onChange={(e) => setForm({ ...form, ward: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Bed Number (Optional)</label>
              <Input
                placeholder="e.g. Bed 04"
                value={form.bedNumber}
                onChange={(e) => setForm({ ...form, bedNumber: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="iso"
                checked={form.isolationCase}
                onChange={(e) => setForm({ ...form, isolationCase: e.target.checked })}
                className="rounded text-sky-600"
              />
              <label htmlFor="iso" className="font-semibold text-red-600">
                Infected / Isolation Case (Requires Double-Bagging & High Chlorine)
              </label>
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Notes / Special Instructions</label>
              <Input
                placeholder="e.g. Emergency restock for night shift"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewRequestOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRequest} className="bg-sky-600 hover:bg-sky-700 text-white">
              Dispatch Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
