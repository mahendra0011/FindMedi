import { useEffect, useState } from 'react';
import type { Unmodelled } from '@/lib/apiTypes';
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
  Ambulance,
  Gauge,
  Fuel,
  Wrench,
  CheckCircle,
  Play,
  Square,
  AlertTriangle,
  RefreshCw,
  Plus,
  Navigation,
} from 'lucide-react';

interface AmbulanceTripItem {
  _id: string;
  ambulanceId: string;
  fromLocation: string;
  toLocation: string;
  odometerStartKm?: number;
  odometerEndKm?: number;
  startedAt: string;
  endedAt?: string;
  status: 'ongoing' | 'completed' | 'cancelled';
  notes?: string;
}

interface VehicleLogItem {
  _id: string;
  ambulanceId: string;
  type: 'fuel' | 'maintenance' | 'inspection' | 'other';
  at: string;
  odometerKm?: number;
  litres?: number;
  costInr?: number;
  vendor?: string;
  description?: string;
}

interface FleetStats {
  ambulanceId: string;
  fuel: { litres: number; costInr: number; fills: number };
  trips: { completed: number; kmCovered: number };
  kmPerLitre: number | null;
}

export default function AmbulanceTripsPage() {
  const [trips, setTrips] = useState<AmbulanceTripItem[]>([]);
  const [logs, setLogs] = useState<VehicleLogItem[]>([]);
  const [ambulances, setAmbulances] = useState<Array<{ _id: string; vehicleNumber: string; model?: string }>>([]);
  const [selectedAmbulanceId, setSelectedAmbulanceId] = useState<string>('');
  const [stats, setStats] = useState<FleetStats | null>(null);
  const [loading, setLoading] = useState(false);

  // Dialogs
  const [isStartTripOpen, setIsStartTripOpen] = useState(false);
  const [isEndTripOpen, setIsEndTripOpen] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [activeTrip, setActiveTrip] = useState<AmbulanceTripItem | null>(null);

  // Forms
  const [tripForm, setTripForm] = useState({
    fromLocation: 'Hospital Emergency Gate 1',
    toLocation: '',
    odometerStartKm: 12000,
    notes: '',
  });

  const [endForm, setEndForm] = useState({
    odometerEndKm: 12025,
    notes: '',
  });

  const [logForm, setLogForm] = useState({
    type: 'fuel' as 'fuel' | 'maintenance' | 'inspection' | 'other',
    odometerKm: 12000,
    litres: 25,
    costInr: 2500,
    vendor: 'HP Fuel Station',
    description: 'Routine diesel refill',
  });

  const loadFleet = async () => {
    try {
      const res: any = await api.get('/ambulances');
      const list = res.data?.ambulances || res.data || [];
      setAmbulances(list);
      if (list.length > 0 && !selectedAmbulanceId) {
        setSelectedAmbulanceId(list[0]._id);
      }
    } catch {
      // Fallback
      setAmbulances([{ _id: '507f191e810c19729de860c1', vehicleNumber: 'MH-12-AM-1001', model: 'Force Traveller ALS' }]);
      setSelectedAmbulanceId('507f191e810c19729de860c1');
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [tripsRes, logsRes]: any = await Promise.all([
        (api as Unmodelled).get('/ambulance-trips/trips', { params: { ambulanceId: selectedAmbulanceId || undefined } }),
        (api as Unmodelled).get('/ambulance-trips/logs', { params: { ambulanceId: selectedAmbulanceId || undefined } }),
      ]);
      setTrips(tripsRes.data?.trips || []);
      setLogs(logsRes.data?.logs || []);

      if (selectedAmbulanceId) {
        try {
          const statsRes: any = await (api as Unmodelled).get('/ambulance-trips/stats', { params: { ambulanceId: selectedAmbulanceId } });
          setStats(statsRes.data);
        } catch {
          setStats(null);
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load fleet data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFleet();
  }, []);

  useEffect(() => {
    if (selectedAmbulanceId) {
      loadData();
    }
  }, [selectedAmbulanceId]);

  const handleStartTrip = async () => {
    if (!tripForm.toLocation) {
      toast.error('Destination location is required');
      return;
    }
    try {
      await api.post('/ambulance-trips/trips', {
        ambulanceId: selectedAmbulanceId,
        fromLocation: tripForm.fromLocation,
        toLocation: tripForm.toLocation,
        odometerStartKm: Number(tripForm.odometerStartKm),
        notes: tripForm.notes,
      });
      toast.success('Ambulance trip started');
      setIsStartTripOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to start trip');
    }
  };

  const handleEndTrip = async () => {
    if (!activeTrip) return;
    if (activeTrip.odometerStartKm && Number(endForm.odometerEndKm) < activeTrip.odometerStartKm) {
      toast.error('End odometer cannot be less than start odometer');
      return;
    }
    try {
      await api.put(`/ambulance-trips/trips/${activeTrip._id}/end`, {
        odometerEndKm: Number(endForm.odometerEndKm),
        notes: endForm.notes,
      });
      toast.success('Ambulance trip completed successfully');
      setIsEndTripOpen(false);
      setActiveTrip(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to close trip');
    }
  };

  const handleAddLog = async () => {
    try {
      await api.post('/ambulance-trips/logs', {
        ambulanceId: selectedAmbulanceId,
        type: logForm.type,
        odometerKm: Number(logForm.odometerKm),
        litres: logForm.type === 'fuel' ? Number(logForm.litres) : undefined,
        costInr: Number(logForm.costInr),
        vendor: logForm.vendor,
        description: logForm.description,
      });
      toast.success('Vehicle log entry created');
      setIsLogOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create log entry');
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Ambulance className="w-8 h-8 text-primary" />
            Ambulance Trips & Fleet Running Log
          </h1>
          <p className="text-muted-foreground">
            Odometer tracking, fuel consumption, and emergency response trip sheets.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setIsStartTripOpen(true)}>
            <Play className="w-4 h-4 mr-2" />
            Start New Trip
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setIsLogOpen(true)}>
            <Fuel className="w-4 h-4 mr-2" />
            Add Fuel / Maintenance
          </Button>
        </div>
      </div>

      {/* Ambulance Selector & Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="col-span-1 md:col-span-1">
          <CardHeader className="pb-2">
            <CardDescription>Select Fleet Vehicle</CardDescription>
            <Select value={selectedAmbulanceId} onValueChange={setSelectedAmbulanceId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose vehicle" />
              </SelectTrigger>
              <SelectContent>
                {ambulances.map((a) => (
                  <SelectItem key={a._id} value={a._id}>
                    {a.vehicleNumber} {a.model ? `(${a.model})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              Completed Trips
              <Navigation className="w-4 h-4 text-primary" />
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold">
              {stats?.trips.completed ?? trips.filter((t) => t.status === 'completed').length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Total Km: {stats?.trips.kmCovered ?? 0} km covered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              Fuel Consumption
              <Fuel className="w-4 h-4 text-amber-500" />
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold">
              {stats?.fuel.litres ? `${stats.fuel.litres} L` : '0 L'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Total Spend: ₹{stats?.fuel.costInr ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              Fleet Fuel Efficiency
              <Gauge className="w-4 h-4 text-emerald-500" />
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold">
              {stats?.kmPerLitre ? `${stats.kmPerLitre} km/L` : 'N/A'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Running average km per litre</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="trips" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trips">Trip Sheets ({trips.length})</TabsTrigger>
          <TabsTrigger value="logs">Fuel & Maintenance Logs ({logs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="trips" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active and Historical Trips</CardTitle>
              <CardDescription>Odometer readings and transit milestones</CardDescription>
            </CardHeader>
            <CardContent>
              {trips.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  No trips recorded for this vehicle.
                </div>
              ) : (
                <div className="space-y-3">
                  {trips.map((t) => {
                    const kmDiff = t.odometerEndKm && t.odometerStartKm ? t.odometerEndKm - t.odometerStartKm : null;
                    return (
                      <div
                        key={t._id}
                        className="p-4 rounded-lg border flex flex-col md:flex-row justify-between gap-4 items-start md:items-center bg-card"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={t.status === 'ongoing' ? 'default' : 'secondary'}>
                              {t.status.toUpperCase()}
                            </Badge>
                            <span className="font-semibold text-sm">
                              {t.fromLocation} → {t.toLocation}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              • {new Date(t.startedAt).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground flex gap-4 pt-1">
                            <span>Odo Start: {t.odometerStartKm ?? 'N/A'} km</span>
                            <span>Odo End: {t.odometerEndKm ?? 'In Transit'}</span>
                            {kmDiff !== null && <span className="font-medium text-foreground">Distance: {kmDiff} km</span>}
                          </div>
                          {t.notes && <p className="text-xs italic text-muted-foreground pt-1">"{t.notes}"</p>}
                        </div>

                        <div>
                          {t.status === 'ongoing' && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setActiveTrip(t);
                                setEndForm({
                                  odometerEndKm: (t.odometerStartKm || 0) + 15,
                                  notes: '',
                                });
                                setIsEndTripOpen(true);
                              }}
                            >
                              <Square className="w-3.5 h-3.5 mr-1" />
                              End Trip
                            </Button>
                          )}
                          {t.status === 'completed' && (
                            <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                              <CheckCircle className="w-3.5 h-3.5 mr-1" />
                              Completed
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vehicle Fuel & Maintenance Running Log</CardTitle>
              <CardDescription>Receipts, odometer checks, and service entries</CardDescription>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  No log entries recorded yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {logs.map((l) => (
                    <div
                      key={l._id}
                      className="p-4 rounded-lg border flex flex-col md:flex-row justify-between gap-4 items-start md:items-center bg-card"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={l.type === 'fuel' ? 'default' : 'outline'}>
                            {l.type.toUpperCase()}
                          </Badge>
                          <span className="font-semibold text-sm">
                            {l.vendor || 'Authorized Service'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            • {new Date(l.at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground flex gap-4 pt-1">
                          {l.litres && <span>Volume: {l.litres} Litres</span>}
                          {l.costInr && <span className="font-medium text-foreground">Cost: ₹{l.costInr}</span>}
                          {l.odometerKm && <span>Odometer: {l.odometerKm} km</span>}
                        </div>
                        {l.description && <p className="text-xs text-muted-foreground pt-1">{l.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Start Trip Dialog */}
      <Dialog open={isStartTripOpen} onOpenChange={setIsStartTripOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Emergency / Patient Trip</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Pickup / Origin</label>
              <Input
                value={tripForm.fromLocation}
                onChange={(e) => setTripForm({ ...tripForm, fromLocation: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Destination</label>
              <Input
                placeholder="e.g. Sector 14 Clinic or Patient Residence"
                value={tripForm.toLocation}
                onChange={(e) => setTripForm({ ...tripForm, toLocation: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Starting Odometer (Km)</label>
              <Input
                type="number"
                value={tripForm.odometerStartKm}
                onChange={(e) => setTripForm({ ...tripForm, odometerStartKm: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Input
                placeholder="Driver, priority, oxygen cylinder status..."
                value={tripForm.notes}
                onChange={(e) => setTripForm({ ...tripForm, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStartTripOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStartTrip}>Start Trip</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* End Trip Dialog */}
      <Dialog open={isEndTripOpen} onOpenChange={setIsEndTripOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Ambulance Trip</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 bg-muted rounded-md text-sm">
              <p>Trip: {activeTrip?.fromLocation} → {activeTrip?.toLocation}</p>
              <p className="text-xs text-muted-foreground mt-1">Starting Odometer: {activeTrip?.odometerStartKm} km</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Final Odometer Reading (Km)</label>
              <Input
                type="number"
                value={endForm.odometerEndKm}
                onChange={(e) => setEndForm({ ...endForm, odometerEndKm: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Trip Notes</label>
              <Input
                placeholder="Patient handover done, stretcher sanitized..."
                value={endForm.notes}
                onChange={(e) => setEndForm({ ...endForm, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEndTripOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEndTrip}>Confirm & Close Trip</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Log Dialog */}
      <Dialog open={isLogOpen} onOpenChange={setIsLogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Fuel or Maintenance Log</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Log Type</label>
              <Select
                value={logForm.type}
                onValueChange={(val: 'fuel' | 'maintenance' | 'inspection' | 'other') =>
                  setLogForm({ ...logForm, type: val })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fuel">Fuel Refill</SelectItem>
                  <SelectItem value="maintenance">Maintenance / Repair</SelectItem>
                  <SelectItem value="inspection">Pre-shift Inspection</SelectItem>
                  <SelectItem value="other">Other Service</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {logForm.type === 'fuel' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Litres of Fuel</label>
                <Input
                  type="number"
                  value={logForm.litres}
                  onChange={(e) => setLogForm({ ...logForm, litres: Number(e.target.value) })}
                />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Total Cost (₹)</label>
              <Input
                type="number"
                value={logForm.costInr}
                onChange={(e) => setLogForm({ ...logForm, costInr: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Odometer at Refill/Service (Km)</label>
              <Input
                type="number"
                value={logForm.odometerKm}
                onChange={(e) => setLogForm({ ...logForm, odometerKm: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Vendor / Gas Station</label>
              <Input
                value={logForm.vendor}
                onChange={(e) => setLogForm({ ...logForm, vendor: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input
                value={logForm.description}
                onChange={(e) => setLogForm({ ...logForm, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddLog}>Save Log Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
