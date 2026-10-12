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
  Car,
  ShieldCheck,
  Clock,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Search,
  DollarSign,
  ArrowRight,
  Siren,
} from 'lucide-react';

interface ParkingTransaction {
  _id: string;
  ticketNumber: string;
  vehicleNumber: string;
  vehicleType: string;
  entryGate: string;
  entryTime: string;
  slotCode: string;
  isAmbulanceExempt: boolean;
  calculatedFee: number;
  paymentStatus: 'ACTIVE_PARKED' | 'PAID_EXITED' | 'EXEMPT_EXITED';
  durationMinutes?: number;
}

export default function ParkingManagementPage() {
  const [transactions, setTransactions] = useState<ParkingTransaction[]>([]);
  const [stats, setStats] = useState<any>({ total: 0, activeParked: 0, totalCollected: 0 });
  const [loading, setLoading] = useState(false);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [entryForm, setEntryForm] = useState({
    vehicleNumber: '',
    vehicleType: 'FOUR_WHEELER',
    entryGate: 'GATE-1-MAIN',
    slotCode: 'B1-BAY-12',
    driverPhone: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const res: any = await api.get('/parking/vehicles');
      setTransactions(res.data?.transactions || []);
      setStats({
        total: res.data?.total || 0,
        activeParked: res.data?.activeParked || 0,
        totalCollected: res.data?.totalCollected || 0,
      });
    } catch {
      toast.error('Failed to load parking transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEntryCheckIn = async () => {
    if (!entryForm.vehicleNumber) {
      toast.error('Vehicle license number required');
      return;
    }
    try {
      await api.post('/parking/entry', entryForm);
      toast.success('Vehicle checked in & boom barrier opened');
      setIsEntryModalOpen(false);
      setEntryForm({
        vehicleNumber: '',
        vehicleType: 'FOUR_WHEELER',
        entryGate: 'GATE-1-MAIN',
        slotCode: 'B1-BAY-12',
        driverPhone: '',
      });
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Check-in failed');
    }
  };

  const handleExitCheckOut = async (id: string) => {
    try {
      const res: any = await api.post(`/parking/exit/${id}`, {
        exitGate: 'GATE-2-NORTH',
        paymentMode: 'UPI_QR',
      });
      const fee = res.data?.calculatedFee || 0;
      toast.success(
        fee === 0 ? 'Vehicle exited (Exempt / Free Grace)' : `Fee ₹${fee} collected. Exit barrier open.`
      );
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Exit calculation failed');
    }
  };

  const filtered = transactions.filter((t) =>
    t.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Car className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              Automated Hospital Parking & RFID Barrier
            </h1>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
              Module #93
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            ANPR camera recognition, ambulance priority exemption, doctor RFID permits, and dynamic UPI QR billing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsEntryModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Entry Gate Check-In
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
              <Car className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold">Currently Parked</p>
              <p className="text-xl font-bold font-mono">{stats.activeParked}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold">Today's Collections</p>
              <p className="text-xl font-bold font-mono">₹{stats.totalCollected}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-500/10 text-red-600">
              <Siren className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold">Ambulance Fast-Track</p>
              <p className="text-xl font-bold font-mono">Zero Fee</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold">Grace Period</p>
              <p className="text-xl font-bold font-mono">First 30 Mins Free</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card className="border-border/60 shadow-sm overflow-hidden">
        <CardHeader className="p-4 bg-muted/20 border-b flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Car className="h-4 w-4 text-emerald-600" />
              Live Vehicle Parking Registry
            </CardTitle>
            <CardDescription className="text-xs">
              Automatic time-duration stamping and rate calculation upon exit trigger.
            </CardDescription>
          </div>
          <div className="w-full md:w-64">
            <Input
              placeholder="Search plate or ticket #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider border-b">
              <tr>
                <th className="p-3">Ticket #</th>
                <th className="p-3">Vehicle Plate</th>
                <th className="p-3">Category</th>
                <th className="p-3">Entry Time</th>
                <th className="p-3">Bay Slot</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-muted-foreground">
                    No active parking tickets found.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t._id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-mono font-bold text-emerald-600">{t.ticketNumber}</td>
                    <td className="p-3 font-mono font-bold text-base text-foreground">{t.vehicleNumber}</td>
                    <td className="p-3">
                      <Badge
                        variant="outline"
                        className={
                          t.isAmbulanceExempt
                            ? 'bg-red-500/10 text-red-600 border-red-500/30'
                            : 'text-[10px]'
                        }
                      >
                        {t.vehicleType}
                      </Badge>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(t.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-3 font-mono">{t.slotCode}</td>
                    <td className="p-3">
                      <Badge
                        className={
                          t.paymentStatus === 'ACTIVE_PARKED'
                            ? 'bg-amber-500/15 text-amber-600 border-amber-500/20'
                            : 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20'
                        }
                      >
                        {t.paymentStatus === 'ACTIVE_PARKED' ? 'PARKED' : 'EXITED'}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      {t.paymentStatus === 'ACTIVE_PARKED' ? (
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => handleExitCheckOut(t._id)}
                        >
                          Checkout & Exit
                        </Button>
                      ) : (
                        <span className="font-mono text-emerald-600 font-semibold">
                          ₹{t.calculatedFee} Paid
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

      {/* Modal: Check In Vehicle */}
      <Dialog open={isEntryModalOpen} onOpenChange={setIsEntryModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="h-5 w-5 text-emerald-600" />
              Vehicle Gate Entry Check-In
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Vehicle Registration Plate *</label>
              <Input
                placeholder="e.g. MH-02-CD-8921"
                value={entryForm.vehicleNumber}
                onChange={(e) => setEntryForm({ ...entryForm, vehicleNumber: e.target.value })}
                className="font-mono font-bold uppercase"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Vehicle Type</label>
              <Select
                value={entryForm.vehicleType}
                onValueChange={(val) => setEntryForm({ ...entryForm, vehicleType: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FOUR_WHEELER">Four Wheeler (Car / SUV)</SelectItem>
                  <SelectItem value="TWO_WHEELER">Two Wheeler (Bike / Scooter)</SelectItem>
                  <SelectItem value="AMBULANCE">Ambulance (Exempt Fast-Track)</SelectItem>
                  <SelectItem value="STAFF_DOCTOR">Doctor / Staff Reserved</SelectItem>
                  <SelectItem value="COMMERCIAL_SUPPLY">Commercial Supply Truck</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Assigned Bay Slot</label>
              <Input
                placeholder="e.g. B1-BAY-04"
                value={entryForm.slotCode}
                onChange={(e) => setEntryForm({ ...entryForm, slotCode: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEntryModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEntryCheckIn} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Open Boom Barrier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
