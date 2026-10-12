import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { ScanLine, Plus, Users, UserCheck, Wifi, WifiOff, Clock, Fingerprint, Camera } from 'lucide-react';

interface Device {
  _id: string;
  deviceName: string;
  deviceType: string;
  ipAddress?: string;
  location?: string;
  status: string;
  lastSyncAt?: string;
}

interface TodayStats {
  present: number;
  absent: number;
  totalStaff: number;
  onlineDevices: number;
}

export default function BiometricAttendancePage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [stats, setStats] = useState<TodayStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [deviceModalOpen, setDeviceModalOpen] = useState(false);
  const [deviceForm, setDeviceForm] = useState({ deviceName: '', deviceType: 'ZKTeco', ipAddress: '', location: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [devRes, statsRes] = await Promise.all([
        api.get('/biometric/devices'),
        api.get('/biometric/today'),
      ]);
      setDevices(devRes.data.devices || []);
      setStats(statsRes.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load biometric data');
    } finally {
      setLoading(false);
    }
  };

  const addDevice = async () => {
    try {
      await api.post('/biometric/devices', deviceForm);
      toast.success('Device registered');
      setDeviceModalOpen(false);
      setDeviceForm({ deviceName: '', deviceType: 'ZKTeco', ipAddress: '', location: '' });
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to add device');
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ScanLine className="w-6 h-6 text-blue-600" />
            Biometric Attendance
          </h1>
          <p className="text-muted-foreground mt-1">Fingerprint/Face device integration & punch logs</p>
        </div>
        <Button onClick={() => setDeviceModalOpen(true)} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Register Device
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Present Today', value: stats.present, icon: UserCheck, color: 'text-green-600' },
            { label: 'Absent', value: stats.absent, icon: Users, color: 'text-red-600' },
            { label: 'Total Staff', value: stats.totalStaff, icon: Users, color: 'text-blue-600' },
            { label: 'Online Devices', value: stats.onlineDevices, icon: Wifi, color: 'text-green-600' },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{s.label}</p>
                    <p className="text-2xl font-bold">{s.value}</p>
                  </div>
                  <s.icon className={`w-8 h-8 ${s.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {devices.map((dev) => (
          <Card key={dev._id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{dev.deviceName}</p>
                  <p className="text-sm text-muted-foreground">{dev.deviceType}</p>
                  {dev.ipAddress && <p className="text-xs text-muted-foreground">{dev.ipAddress}</p>}
                  {dev.location && <p className="text-xs text-muted-foreground">{dev.location}</p>}
                </div>
                <Badge variant={dev.status === 'Online' ? 'default' : 'secondary'}>
                  {dev.status === 'Online' ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
                  {dev.status}
                </Badge>
              </div>
              {dev.lastSyncAt && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Last sync: {new Date(dev.lastSyncAt).toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Supported Devices</CardTitle>
          <CardDescription>Integration framework supports these biometric device types</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {['ZKTeco', 'eSSL', 'Mantra', 'Suprema', 'Realtime', 'Generic TCP', 'Web API'].map((type) => (
              <div key={type} className="p-3 border rounded-lg flex items-center gap-2">
                <Fingerprint className="w-4 h-4 text-blue-600" />
                <span className="text-sm">{type}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={deviceModalOpen} onOpenChange={setDeviceModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Register Biometric Device</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Device Name" value={deviceForm.deviceName} onChange={(e) => setDeviceForm({ ...deviceForm, deviceName: e.target.value })} />
            <Select value={deviceForm.deviceType} onValueChange={(v) => setDeviceForm({ ...deviceForm, deviceType: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['ZKTeco', 'eSSL', 'Mantra', 'Suprema', 'Realtime', 'Generic TCP', 'Web API'].map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="IP Address (optional)" value={deviceForm.ipAddress} onChange={(e) => setDeviceForm({ ...deviceForm, ipAddress: e.target.value })} />
            <Input placeholder="Location (e.g., Main Gate)" value={deviceForm.location} onChange={(e) => setDeviceForm({ ...deviceForm, location: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeviceModalOpen(false)}>Cancel</Button>
            <Button onClick={addDevice} disabled={!deviceForm.deviceName}>Register</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
