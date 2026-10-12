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
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  Truck,
  Scale,
  ShieldAlert,
  FileSpreadsheet,
} from 'lucide-react';

interface BmwBag {
  _id: string;
  bagBarcode: string;
  colorCategory: 'YELLOW' | 'RED' | 'WHITE_SHARPS' | 'BLUE_GLASS';
  weightKg: number;
  generatingDepartment: string;
  status: 'SEALED' | 'IN_STORAGE' | 'DISPATCHED_TO_CBWTF';
  sealedAt: string;
  cbwtfManifestNumber?: string;
  notes?: string;
}

export default function BiomedicalWastePage() {
  const [bags, setBags] = useState<BmwBag[]>([]);
  const [metrics, setMetrics] = useState<any>({ aggregates: [], activeInShed: 0 });
  const [loading, setLoading] = useState(false);
  const [isNewBagOpen, setIsNewBagOpen] = useState(false);
  const [isDispatchOpen, setIsDispatchOpen] = useState(false);
  const [selectedBagId, setSelectedBagId] = useState<string | null>(null);

  const [form, setForm] = useState({
    colorCategory: 'YELLOW',
    weightKg: '3.5',
    generatingDepartment: 'Operation Theatre 1',
    notes: '',
  });

  const [dispatchForm, setDispatchForm] = useState({
    cbwtfVendorName: 'Synergy Waste Management Pvt Ltd',
    cbwtfVehicleNumber: 'DL-01-AB-4920',
    cbwtfDriverName: 'Rajesh Kumar',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [bagRes, metricRes]: any = await Promise.all([
        api.get('/bmw/bags'),
        api.get('/bmw/metrics'),
      ]);
      setBags(bagRes.data?.bags || []);
      setMetrics(metricRes.data || { aggregates: [], activeInShed: 0 });
    } catch {
      toast.error('Failed to load Biomedical Waste records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSealBag = async () => {
    if (!form.weightKg || !form.generatingDepartment) {
      toast.error('Weight and department are required');
      return;
    }
    try {
      await api.post('/bmw/bags', form);
      toast.success('CPCB barcoded waste bag sealed');
      setIsNewBagOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to seal bag');
    }
  };

  const handleDispatchBag = async () => {
    if (!selectedBagId) return;
    try {
      await api.patch(`/bmw/bags/${selectedBagId}/dispatch`, dispatchForm);
      toast.success('Waste handed over to CBWTF truck & manifest minted');
      setIsDispatchOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to dispatch bag');
    }
  };

  const getColorBadge = (color: string) => {
    switch (color) {
      case 'YELLOW':
        return 'bg-amber-400/20 text-amber-700 dark:text-amber-300 border-amber-400/30';
      case 'RED':
        return 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30';
      case 'WHITE_SHARPS':
        return 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 border-slate-300';
      case 'BLUE_GLASS':
        return 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Trash2 className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              Biomedical Waste (BMW) Management
            </h1>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
              Module #91 • CPCB Compliant
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Color bag segregation (Yellow/Red/White/Blue), digital weight scaling, and CBWTF transfer manifests.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsNewBagOpen(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Seal Barcoded Bag
          </Button>
        </div>
      </div>

      {/* Color Stream Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/60 shadow-sm border-l-4 border-l-amber-400">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs text-muted-foreground font-semibold">YELLOW (Anatomical/Soiled)</p>
            <p className="text-xl font-bold">
              {metrics.aggregates?.find((a: any) => a._id === 'YELLOW')?.totalWeightKg?.toFixed(2) || '0.00'} kg
            </p>
            <p className="text-[11px] text-muted-foreground">Incineration stream</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm border-l-4 border-l-red-500">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs text-muted-foreground font-semibold">RED (Recyclable Plastic)</p>
            <p className="text-xl font-bold">
              {metrics.aggregates?.find((a: any) => a._id === 'RED')?.totalWeightKg?.toFixed(2) || '0.00'} kg
            </p>
            <p className="text-[11px] text-muted-foreground">Autoclave & shred stream</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm border-l-4 border-l-slate-400">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs text-muted-foreground font-semibold">WHITE (Needles & Sharps)</p>
            <p className="text-xl font-bold">
              {metrics.aggregates?.find((a: any) => a._id === 'WHITE_SHARPS')?.totalWeightKg?.toFixed(2) || '0.00'} kg
            </p>
            <p className="text-[11px] text-muted-foreground">Encapsulation / Sharp pit</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm border-l-4 border-l-blue-500">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs text-muted-foreground font-semibold">BLUE (Glass / Implants)</p>
            <p className="text-xl font-bold">
              {metrics.aggregates?.find((a: any) => a._id === 'BLUE_GLASS')?.totalWeightKg?.toFixed(2) || '0.00'} kg
            </p>
            <p className="text-[11px] text-muted-foreground">Disinfection & recycling</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card className="border-border/60 shadow-sm overflow-hidden">
        <CardHeader className="p-4 bg-muted/20 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <Scale className="h-4 w-4 text-amber-600" />
            Biomedical Waste Bags & Disposal Log
          </CardTitle>
          <CardDescription className="text-xs">
            Bags must not be stored in central shed for &gt; 48 hours per Pollution Control Board statutory norms.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider border-b">
              <tr>
                <th className="p-3">Barcode Tag</th>
                <th className="p-3">Color Stream</th>
                <th className="p-3">Weight (kg)</th>
                <th className="p-3">Source Dept</th>
                <th className="p-3">Sealed Time</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {bags.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-muted-foreground">
                    No biomedical waste bags logged today.
                  </td>
                </tr>
              ) : (
                bags.map((b) => (
                  <tr key={b._id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-mono font-bold text-amber-600 dark:text-amber-400">{b.bagBarcode}</td>
                    <td className="p-3">
                      <Badge variant="outline" className={`text-[10px] ${getColorBadge(b.colorCategory)}`}>
                        {b.colorCategory}
                      </Badge>
                    </td>
                    <td className="p-3 font-mono font-semibold">{b.weightKg.toFixed(2)} kg</td>
                    <td className="p-3 font-medium text-foreground">{b.generatingDepartment}</td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(b.sealedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="p-3">
                      <Badge
                        className={
                          b.status === 'DISPATCHED_TO_CBWTF'
                            ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20'
                            : 'bg-amber-500/15 text-amber-600 border-amber-500/20'
                        }
                      >
                        {b.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      {b.status === 'SEALED' && (
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                          onClick={() => {
                            setSelectedBagId(b._id);
                            setIsDispatchOpen(true);
                          }}
                        >
                          Handover to Truck
                        </Button>
                      )}
                      {b.status === 'DISPATCHED_TO_CBWTF' && (
                        <span className="text-[11px] text-emerald-600 font-mono">
                          {b.cbwtfManifestNumber || 'Manifested'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Modal: Seal Bag */}
      <Dialog open={isNewBagOpen} onOpenChange={setIsNewBagOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-amber-600" />
              Seal CPCB Barcoded Waste Bag
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Color Stream Category *</label>
              <Select
                value={form.colorCategory}
                onValueChange={(val) => setForm({ ...form, colorCategory: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="YELLOW">YELLOW (Human anatomical / soiled / chemical)</SelectItem>
                  <SelectItem value="RED">RED (Recyclable plastic tubes / catheters)</SelectItem>
                  <SelectItem value="WHITE_SHARPS">WHITE (Sharps / scalpels / needles)</SelectItem>
                  <SelectItem value="BLUE_GLASS">BLUE (Glassware / medicine vials)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Digital Scale Weight (kg) *</label>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g. 4.25"
                value={form.weightKg}
                onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Source Department *</label>
              <Input
                placeholder="e.g. ICU Bay 2 / OT Suite 3"
                value={form.generatingDepartment}
                onChange={(e) => setForm({ ...form, generatingDepartment: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewBagOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSealBag} className="bg-amber-600 hover:bg-amber-700 text-white">
              Seal & Register Barcode
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Dispatch Handover */}
      <Dialog open={isDispatchOpen} onOpenChange={setIsDispatchOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-emerald-600" />
              Handover to CBWTF Collection Vehicle
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">CBWTF Vendor Name</label>
              <Input
                value={dispatchForm.cbwtfVendorName}
                onChange={(e) => setDispatchForm({ ...dispatchForm, cbwtfVendorName: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Vehicle Number</label>
              <Input
                value={dispatchForm.cbwtfVehicleNumber}
                onChange={(e) => setDispatchForm({ ...dispatchForm, cbwtfVehicleNumber: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Driver Name</label>
              <Input
                value={dispatchForm.cbwtfDriverName}
                onChange={(e) => setDispatchForm({ ...dispatchForm, cbwtfDriverName: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDispatchOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleDispatchBag} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Mint Manifest & Dispatch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
