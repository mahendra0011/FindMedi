import React, { useState, useEffect } from 'react';
import {
  Car,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Eye,
  TrendingUp,
  IndianRupee,
  AlertTriangle,
  FileText,
  Users,
  Loader2,
  Ambulance,
  Bike,
  Truck,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function AdminVehicleRides() {
  const [activeTab, setActiveTab] = useState<'pending' | 'riders' | 'vehicles' | 'rides' | 'analytics'>('pending');

  const [pendingRiders, setPendingRiders] = useState<any[]>([]);
  const [allRiders, setAllRiders] = useState<any[]>([]);
  const [allVehicles, setAllVehicles] = useState<any[]>([]);
  const [allRides, setAllRides] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Review modal state
  const [selectedRider, setSelectedRider] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [rejectModalOpen, setRejectModalOpen] = useState<boolean>(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'pending') {
        const res = await api.getPendingRiders();
        setPendingRiders(res.riders || []);
      } else if (activeTab === 'riders') {
        const res = await api.getAdminRiders();
        setAllRiders(res.riders || []);
      } else if (activeTab === 'vehicles') {
        const res = await api.getAdminVehicles();
        setAllVehicles(res.vehicles || []);
      } else if (activeTab === 'rides') {
        const res = await api.getAdminRides();
        setAllRides(res.rides || []);
      } else if (activeTab === 'analytics') {
        const res = await api.getRideAnalytics();
        setAnalytics(res || null);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load vehicle admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (riderId: string) => {
    setProcessingId(riderId);
    try {
      await api.approveRider(riderId);
      toast.success('Rider approved! Driver account activated.');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve rider');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!selectedRider?._id) return;
    setProcessingId(selectedRider._id);
    try {
      await api.rejectRider(selectedRider._id, rejectReason || 'Documents insufficient or invalid');
      toast.info('Rider application rejected');
      setRejectModalOpen(false);
      setSelectedRider(null);
      setRejectReason('');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject rider');
    } finally {
      setProcessingId(null);
    }
  };

  const handleSuspendToggle = async (riderId: string, currentlyActive: boolean) => {
    try {
      await api.suspendRider(riderId, currentlyActive);
      toast.success(`Rider ${currentlyActive ? 'suspended' : 'reactivated'}`);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update rider status');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      <div>
        <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-foreground flex items-center gap-2">
          <span className="p-1.5 rounded-xl bg-primary/10 text-primary">🚗</span>
          Vehicle & Ride Management
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Driver onboarding verification, registered vehicle tracking, live ride oversight, and fleet analytics.
        </p>
      </div>

      <div className="rounded-2xl border p-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">Live GPS map: textual lat/long + ETA shown per ride. Open in Maps for turn-by-turn.</p>
        <a href="https://www.google.com/maps" target="_blank" rel="noreferrer" className="text-xs font-semibold rounded-lg border px-3 py-1.5">Open Live Map</a>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 border-b border-border/80 pb-1 overflow-x-auto">
        {[
          { id: 'pending', label: 'Rider Approvals', icon: ShieldCheck, badge: pendingRiders.length },
          { id: 'riders', label: 'All Drivers', icon: Users },
          { id: 'vehicles', label: 'Registered Vehicles', icon: Car },
          { id: 'rides', label: 'Rides Oversight', icon: Clock },
          { id: 'analytics', label: 'Fleet Analytics', icon: TrendingUp },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge ? (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-destructive text-destructive-foreground">
                  {tab.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* TAB 1: PENDING RIDER APPROVALS */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {loading ? (
            <div className="py-16 text-center text-xs text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
              Loading pending driver applications...
            </div>
          ) : pendingRiders.length === 0 ? (
            <div className="rounded-2xl border border-border/80 bg-card p-12 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <p className="font-bold text-sm text-foreground">All driver applications reviewed</p>
              <p className="text-xs text-muted-foreground">No drivers waiting in approval queue.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingRiders.map((rider) => {
                const user = rider.userId || {};
                const vehicle = rider.vehicleId || {};

                return (
                  <div
                    key={rider._id}
                    className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-base text-foreground">{user.name || 'Applicant'}</h4>
                        <p className="text-xs text-muted-foreground font-mono">{user.email} · {user.phone}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] uppercase font-bold text-amber-600 bg-amber-500/10 border-amber-500/30">
                        Pending Approval
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-muted/30 p-3 rounded-xl border">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Vehicle</p>
                        <p className="font-semibold text-foreground capitalize">
                          {vehicle.type?.replace('_', ' ')} · {vehicle.brand} {vehicle.model}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">RC Number</p>
                        <p className="font-mono font-bold text-primary">{vehicle.rcNumber || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Driving License</p>
                        <p className="font-mono font-semibold text-foreground">
                          {rider.drivingLicenseNumber || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Govt ID ({rider.govtIdType})</p>
                        <p className="font-mono font-semibold text-foreground">
                          {rider.govtIdNumber || 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedRider(rider);
                          setRejectModalOpen(true);
                        }}
                        className="rounded-xl text-xs h-9 text-destructive border-destructive/30 hover:bg-destructive/10"
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(rider._id)}
                        disabled={processingId === rider._id}
                        className="rounded-xl text-xs h-9 font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                      >
                        {processingId === rider._id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        Approve & Verify
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ALL DRIVERS */}
      {activeTab === 'riders' && (
        <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border/80 text-muted-foreground uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Driver</th>
                  <th className="py-3 px-4">Vehicle</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Online</th>
                  <th className="py-3 px-4">Rating</th>
                  <th className="py-3 px-4">Total Earned</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {allRiders.map((r) => {
                  const isActive = r.riderStatus === 'active';
                  return (
                    <tr key={r._id} className="hover:bg-muted/30">
                      <td className="py-3.5 px-4 font-medium text-foreground">
                        {r.userId?.name || 'Driver'}
                        <div className="text-[10px] text-muted-foreground">{r.userId?.phone}</div>
                      </td>
                      <td className="py-3.5 px-4 capitalize">
                        {r.vehicleId?.type?.replace('_', ' ')} · {r.vehicleId?.rcNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant={isActive ? 'default' : 'secondary'} className="text-[10px]">
                          {r.riderStatus}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold">
                        {r.isOnline ? (
                          <span className="text-emerald-600">Online</span>
                        ) : (
                          <span className="text-muted-foreground">Offline</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">⭐ {r.rating?.avg || '5.0'}</td>
                      <td className="py-3.5 px-4 font-bold text-emerald-600">
                        ₹{r.totalEarnings || 0}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSuspendToggle(r._id, isActive)}
                          className="text-[11px] h-7 rounded-lg"
                        >
                          {isActive ? 'Suspend' : 'Activate'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: REGISTERED VEHICLES */}
      {activeTab === 'vehicles' && (
        <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border/80 text-muted-foreground uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">RC Number</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Brand & Model</th>
                  <th className="py-3 px-4">Fuel</th>
                  <th className="py-3 px-4">Capacity</th>
                  <th className="py-3 px-4">Doc Verified</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {allVehicles.map((v) => (
                  <tr key={v._id} className="hover:bg-muted/30">
                    <td className="py-3.5 px-4 font-mono font-bold text-primary">
                      {v.rcNumber}
                    </td>
                    <td className="py-3.5 px-4 capitalize">{v.type?.replace('_', ' ')}</td>
                    <td className="py-3.5 px-4 font-medium text-foreground">
                      {v.brand} {v.model}
                    </td>
                    <td className="py-3.5 px-4">{v.fuelType || 'Petrol'}</td>
                    <td className="py-3.5 px-4">{v.capacity || 4} seats</td>
                    <td className="py-3.5 px-4">
                      <Badge variant={v.isDocumentVerified ? 'default' : 'secondary'}>
                        {v.isDocumentVerified ? 'Verified' : 'Pending'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: RIDES OVERSIGHT */}
      {activeTab === 'rides' && (
        <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border/80 text-muted-foreground uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Booking #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Vehicle</th>
                  <th className="py-3 px-4">Passenger</th>
                  <th className="py-3 px-4">Driver</th>
                  <th className="py-3 px-4">Total Fare</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {allRides.map((r) => (
                  <tr key={r._id} className="hover:bg-muted/30">
                    <td className="py-3.5 px-4 font-mono font-bold">{r.bookingNumber}</td>
                    <td className="py-3.5 px-4 font-mono text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 capitalize">
                      {r.vehicleType?.replace('_', ' ')}
                      {r.isEmergency && <span className="text-[9px] font-bold text-red-600 ml-1">EMERGENCY</span>}
                    </td>
                    <td className="py-3.5 px-4">{r.userId?.name || 'Customer'}</td>
                    <td className="py-3.5 px-4">{r.riderId?.name || '—'}</td>
                    <td className="py-3.5 px-4 font-bold">₹{r.fare?.total || 0}</td>
                    <td className="py-3.5 px-4">
                      <Badge variant={r.status === 'completed' ? 'default' : 'secondary'}>
                        {r.status?.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: FLEET ANALYTICS */}
      {activeTab === 'analytics' && analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl border bg-card shadow-sm">
              <p className="text-xs text-muted-foreground">Total Rides</p>
              <p className="text-2xl font-bold text-foreground mt-1">{analytics.totalRides || 0}</p>
            </div>
            <div className="p-4 rounded-2xl border bg-card shadow-sm">
              <p className="text-xs text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">₹{analytics.totalRevenue || 0}</p>
            </div>
            <div className="p-4 rounded-2xl border bg-card shadow-sm">
              <p className="text-xs text-muted-foreground">Platform Commission (10%)</p>
              <p className="text-2xl font-bold text-primary mt-1">₹{analytics.platformRevenue || 0}</p>
            </div>
            <div className="p-4 rounded-2xl border bg-card shadow-sm">
              <p className="text-xs text-muted-foreground">Cancellation Rate</p>
              <p className="text-2xl font-bold text-destructive mt-1">{analytics.cancellationRate || 0}%</p>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">Reject Driver Application</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Provide a clear reason for the rejection so the driver can fix and re-upload documents.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Expired driving license or blurry RC image..."
              rows={3}
              className="text-xs rounded-xl resize-none"
            />

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setRejectModalOpen(false)} className="rounded-xl text-xs">
                Cancel
              </Button>
              <Button onClick={handleReject} className="rounded-xl text-xs font-bold bg-destructive text-destructive-foreground">
                Confirm Rejection
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
