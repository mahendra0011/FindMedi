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
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Activity,
  Plus,
  Search,
  Filter,
  Calendar,
  Sparkles,
} from 'lucide-react';

interface BiomedicalAsset {
  _id: string;
  assetTag: string;
  equipmentName: string;
  manufacturer: string;
  modelNumber?: string;
  serialNumber: string;
  criticalityCategory: 'A' | 'B' | 'C';
  department: string;
  locationRoom?: string;
  status: 'OPERATIONAL' | 'BREAKDOWN' | 'UNDER_MAINTENANCE' | 'CONDEMNED';
  nextPpmDueDate: string;
  lastPpmDate?: string;
  contractType: string;
}

interface WorkOrder {
  _id: string;
  ticketNumber: string;
  assetId: BiomedicalAsset;
  ticketType: 'BREAKDOWN' | 'PPM' | 'CALIBRATION' | 'SAFETY_TEST';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  symptomDescription: string;
  status: 'REPORTED' | 'IN_PROGRESS' | 'AWAITING_SPARES' | 'RESOLVED' | 'CLOSED';
  createdAt: string;
  downtimeMinutes?: number;
  rootCauseAnalysis?: string;
}

export default function BiomedicalDashboard() {
  const [activeTab, setActiveTab] = useState<'assets' | 'orders'>('assets');
  const [assets, setAssets] = useState<BiomedicalAsset[]>([]);
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [stats, setStats] = useState<any>({
    total: 0,
    operational: 0,
    breakdown: 0,
    underMaintenance: 0,
    criticalCatA: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog states
  const [isNewAssetOpen, setIsNewAssetOpen] = useState(false);
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<BiomedicalAsset | null>(null);

  // Form states
  const [newAsset, setNewAsset] = useState({
    assetTag: '',
    equipmentName: '',
    manufacturer: '',
    modelNumber: '',
    serialNumber: '',
    criticalityCategory: 'B',
    department: 'ICU',
    locationRoom: 'Bay 1',
    purchaseCost: '150000',
    contractType: 'WARRANTY',
  });

  const [newOrder, setNewOrder] = useState({
    assetId: '',
    ticketType: 'BREAKDOWN',
    priority: 'HIGH',
    symptomDescription: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [assetRes, orderRes]: any = await Promise.all([
        api.get('/biomedical/assets'),
        api.get('/biomedical/work-orders'),
      ]);
      setAssets(assetRes.data?.assets || []);
      setStats(assetRes.data?.stats || {});
      setOrders(orderRes.data?.orders || []);
    } catch (err: any) {
      toast.error('Failed to load Biomedical engineering data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateAsset = async () => {
    if (!newAsset.assetTag || !newAsset.equipmentName || !newAsset.serialNumber) {
      toast.error('Please fill in required asset details');
      return;
    }
    try {
      await api.post('/biomedical/assets', newAsset);
      toast.success('Equipment asset registered successfully');
      setIsNewAssetOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to register asset');
    }
  };

  const handleCreateWorkOrder = async () => {
    if (!newOrder.assetId || !newOrder.symptomDescription) {
      toast.error('Select an asset and describe the issue');
      return;
    }
    try {
      await api.post('/biomedical/work-orders', newOrder);
      toast.success('Work order created successfully');
      setIsNewOrderOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create work order');
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      await api.patch(`/biomedical/work-orders/${orderId}/status`, {
        status,
        electricalSafetyTestPassed: true,
      });
      toast.success(`Work order marked as ${status}`);
      fetchData();
    } catch (err: any) {
      toast.error('Failed to update work order');
    }
  };

  const filteredAssets = assets.filter(
    (a) =>
      a.equipmentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.assetTag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Wrench className="h-6 w-6 text-primary" />
              Biomedical Engineering & Equipment Health
            </h1>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              NABH / JCI Standard
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time critical asset uptime, Preventive Maintenance (PPM), and Breakdown work orders.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setSelectedAsset(null);
              setIsNewOrderOpen(true);
            }}
            className="flex items-center gap-2"
          >
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Report Breakdown
          </Button>
          <Button onClick={() => setIsNewAssetOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Register Asset
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Assets</p>
              <p className="text-xl font-bold">{stats.total || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Operational</p>
              <p className="text-xl font-bold">{stats.operational || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Breakdowns</p>
              <p className="text-xl font-bold text-red-600">{stats.breakdown || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Maintenance</p>
              <p className="text-xl font-bold">{stats.underMaintenance || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Category A (Life)</p>
              <p className="text-xl font-bold">{stats.criticalCatA || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 border rounded-lg p-1 bg-muted/40 w-fit">
          <Button
            size="sm"
            variant={activeTab === 'assets' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('assets')}
            className="text-xs h-8"
          >
            Equipment Inventory ({assets.length})
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'orders' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('orders')}
            className="text-xs h-8"
          >
            Work Orders & Tickets ({orders.length})
          </Button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search equipment, tag, ward..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* Main Content Areas */}
      {activeTab === 'assets' ? (
        <Card className="border-border/60 shadow-sm overflow-hidden">
          <CardHeader className="p-4 bg-muted/20 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Medical Assets Registry
            </CardTitle>
            <CardDescription className="text-xs">
              Includes critical Category A life-support ventilators, defibrillators, and Category B imaging apparatus.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider border-b">
                <tr>
                  <th className="p-3">Asset Tag</th>
                  <th className="p-3">Equipment Name</th>
                  <th className="p-3">Criticality</th>
                  <th className="p-3">Location / Dept</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Next PPM Due</th>
                  <th className="p-3">Contract</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-muted-foreground">
                      No biomedical assets found matching search.
                    </td>
                  </tr>
                ) : (
                  filteredAssets.map((asset) => {
                    const isDueSoon =
                      new Date(asset.nextPpmDueDate).getTime() - Date.now() < 15 * 24 * 60 * 60 * 1000;
                    return (
                      <tr key={asset._id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-mono font-semibold text-primary">{asset.assetTag}</td>
                        <td className="p-3">
                          <p className="font-medium text-foreground">{asset.equipmentName}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {asset.manufacturer} {asset.modelNumber ? `• ${asset.modelNumber}` : ''}
                          </p>
                        </td>
                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className={
                              asset.criticalityCategory === 'A'
                                ? 'bg-red-500/10 text-red-600 border-red-500/30 font-bold'
                                : asset.criticalityCategory === 'B'
                                ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                                : 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                            }
                          >
                            Cat {asset.criticalityCategory}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <p className="font-medium">{asset.department}</p>
                          <p className="text-[11px] text-muted-foreground">{asset.locationRoom || 'Main'}</p>
                        </td>
                        <td className="p-3">
                          <Badge
                            className={
                              asset.status === 'OPERATIONAL'
                                ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20'
                                : asset.status === 'BREAKDOWN'
                                ? 'bg-red-500/15 text-red-600 border-red-500/20 animate-pulse'
                                : 'bg-amber-500/15 text-amber-600 border-amber-500/20'
                            }
                          >
                            {asset.status}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span className={isDueSoon ? 'text-amber-600 font-bold' : ''}>
                              {new Date(asset.nextPpmDueDate).toLocaleDateString()}
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {asset.contractType}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-primary"
                            onClick={() => {
                              setSelectedAsset(asset);
                              setNewOrder({
                                assetId: asset._id,
                                ticketType: 'BREAKDOWN',
                                priority: asset.criticalityCategory === 'A' ? 'CRITICAL' : 'HIGH',
                                symptomDescription: '',
                              });
                              setIsNewOrderOpen(true);
                            }}
                          >
                            Create Ticket
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/60 shadow-sm overflow-hidden">
          <CardHeader className="p-4 bg-muted/20 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="h-4 w-4 text-primary" />
              Active Maintenance & Breakdown Work Orders
            </CardTitle>
            <CardDescription className="text-xs">
              Resolution lifecycle with response time SLAs, root-cause analyses, and electrical safety certification.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider border-b">
                <tr>
                  <th className="p-3">Ticket ID</th>
                  <th className="p-3">Asset</th>
                  <th className="p-3">Type & Priority</th>
                  <th className="p-3">Symptom Description</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Reported At</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted-foreground">
                      No open biomedical work orders found.
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order._id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-mono font-semibold text-primary">{order.ticketNumber}</td>
                      <td className="p-3">
                        <p className="font-medium text-foreground">{order.assetId?.equipmentName || 'Asset'}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">{order.assetId?.assetTag}</p>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col gap-1">
                          <Badge variant="outline" className="w-fit text-[10px]">
                            {order.ticketType}
                          </Badge>
                          <span
                            className={`text-[10px] font-bold ${
                              order.priority === 'CRITICAL'
                                ? 'text-red-600'
                                : order.priority === 'HIGH'
                                ? 'text-amber-600'
                                : 'text-blue-600'
                            }`}
                          >
                            {order.priority}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 max-w-xs truncate" title={order.symptomDescription}>
                        {order.symptomDescription}
                      </td>
                      <td className="p-3">
                        <Badge
                          className={
                            order.status === 'REPORTED'
                              ? 'bg-red-500/10 text-red-600 border-red-500/20'
                              : order.status === 'IN_PROGRESS'
                              ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          }
                        >
                          {order.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {new Date(order.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="p-3 text-right">
                        {order.status === 'REPORTED' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => handleUpdateOrderStatus(order._id, 'IN_PROGRESS')}
                          >
                            Accept & Start
                          </Button>
                        )}
                        {order.status === 'IN_PROGRESS' && (
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => handleUpdateOrderStatus(order._id, 'RESOLVED')}
                          >
                            Verify & Resolve
                          </Button>
                        )}
                        {order.status === 'RESOLVED' && (
                          <span className="text-[11px] text-emerald-600 font-medium">Ready</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Modal: Register New Asset */}
      <Dialog open={isNewAssetOpen} onOpenChange={setIsNewAssetOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Register Medical Asset
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Asset Tag ID *</label>
              <Input
                placeholder="e.g. BIO-VENT-ICU-08"
                value={newAsset.assetTag}
                onChange={(e) => setNewAsset({ ...newAsset, assetTag: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Equipment Name *</label>
              <Input
                placeholder="e.g. Hamilton C6 Ventilator"
                value={newAsset.equipmentName}
                onChange={(e) => setNewAsset({ ...newAsset, equipmentName: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Manufacturer *</label>
              <Input
                placeholder="e.g. Hamilton Medical / GE"
                value={newAsset.manufacturer}
                onChange={(e) => setNewAsset({ ...newAsset, manufacturer: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Serial Number *</label>
              <Input
                placeholder="e.g. SN-8839201"
                value={newAsset.serialNumber}
                onChange={(e) => setNewAsset({ ...newAsset, serialNumber: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Criticality Class</label>
              <Select
                value={newAsset.criticalityCategory}
                onValueChange={(val) => setNewAsset({ ...newAsset, criticalityCategory: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">Class A (Life Support / 15m SLA)</SelectItem>
                  <SelectItem value="B">Class B (Diagnostic / 2h SLA)</SelectItem>
                  <SelectItem value="C">Class C (Monitoring / 6h SLA)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Department Location</label>
              <Input
                placeholder="ICU / OT / Emergency"
                value={newAsset.department}
                onChange={(e) => setNewAsset({ ...newAsset, department: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewAssetOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAsset}>Save Asset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: New Work Order */}
      <Dialog open={isNewOrderOpen} onOpenChange={setIsNewOrderOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Create Biomedical Work Order
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Select Equipment</label>
              <Select
                value={newOrder.assetId}
                onValueChange={(val) => setNewOrder({ ...newOrder, assetId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose asset..." />
                </SelectTrigger>
                <SelectContent>
                  {assets.map((a) => (
                    <SelectItem key={a._id} value={a._id}>
                      {a.assetTag} - {a.equipmentName} ({a.department})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Order Type</label>
                <Select
                  value={newOrder.ticketType}
                  onValueChange={(val) => setNewOrder({ ...newOrder, ticketType: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BREAKDOWN">Breakdown Repair</SelectItem>
                    <SelectItem value="PPM">Quarterly PPM</SelectItem>
                    <SelectItem value="CALIBRATION">Calibration Renewal</SelectItem>
                    <SelectItem value="SAFETY_TEST">Electrical Safety Test</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-muted-foreground">Priority</label>
                <Select
                  value={newOrder.priority}
                  onValueChange={(val) => setNewOrder({ ...newOrder, priority: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CRITICAL">Critical (Immediate)</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Symptom Description *</label>
              <textarea
                className="w-full h-24 p-2 rounded-md border text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Describe fault or observed alarm (e.g. O2 pressure sensor failure, battery backup dying)..."
                value={newOrder.symptomDescription}
                onChange={(e) => setNewOrder({ ...newOrder, symptomDescription: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewOrderOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateWorkOrder}>Dispatch Work Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
