import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Car,
  Bike,
  Truck,
  Ambulance,
  Clock,
  Calendar,
  IndianRupee,
  Star,
  Download,
  RotateCcw,
  Search,
  Filter,
  Navigation,
  CheckCircle2,
  AlertCircle,
  Eye,
  Loader2,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import RatingModal from '@/components/vehicle/RatingModal';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function PatientRides() {
  const navigate = useNavigate();
  const [activeRide, setActiveRide] = useState<any>(null);
  const [rides, setRides] = useState<any[]>([]);
  const [totalRides, setTotalRides] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Modal Details
  const [selectedRide, setSelectedRide] = useState<any>(null);
  const [rateModalOpen, setRateModalOpen] = useState<boolean>(false);
  const [rideToRate, setRideToRate] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [statusFilter, typeFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [activeRes, historyRes] = await Promise.all([
        api.getActiveRide(),
        api.getMyRides({
          ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
          ...(typeFilter !== 'all' ? { vehicleType: typeFilter } : {}),
        }),
      ]);

      setActiveRide(activeRes.ride || null);
      setRides(historyRes.rides || []);
      setTotalRides(historyRes.total || 0);
    } catch (err) {
      toast.error('Failed to load ride history');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReceipt = async (ride: any) => {
    try {
      await api.downloadRideReceipt(ride._id, `Ride-Receipt-${ride.bookingNumber || ride._id}.pdf`);
      toast.success('Receipt downloaded successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to download receipt');
    }
  };

  const handleRebook = (ride: any) => {
    // Navigate to find-vehicle with pickup and drop in state
    navigate('/find-vehicle', {
      state: {
        pickup: ride.pickup,
        drop: ride.drop,
        vehicleType: ride.vehicleType,
      },
    });
  };

  // Quick stats calculation
  const completedRides = rides.filter((r) => r.status === 'completed');
  const totalSpent = completedRides.reduce((acc, r) => acc + (r.fare?.total || 0), 0);

  // Find favorite vehicle
  const vehicleCounts: Record<string, number> = {};
  rides.forEach((r) => {
    if (r.vehicleType) {
      vehicleCounts[r.vehicleType] = (vehicleCounts[r.vehicleType] || 0) + 1;
    }
  });
  const favoriteVehicle = Object.keys(vehicleCounts).reduce((a, b) =>
    vehicleCounts[a] > vehicleCounts[b] ? a : b,
    'car'
  );

  // Filtered rides by search query
  const filteredRides = rides.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.pickup?.address?.toLowerCase().includes(q) ||
      r.drop?.address?.toLowerCase().includes(q) ||
      r.bookingNumber?.toLowerCase().includes(q) ||
      r.riderId?.name?.toLowerCase().includes(q)
    );
  });

  const getVehicleIcon = (type: string) => {
    switch (type) {
      case 'bike':
        return Bike;
      case 'auto':
      case 'van':
        return Truck;
      case 'ambulance':
        return Ambulance;
      default:
        return Car;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-foreground flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-primary/10 text-primary">🚗</span>
            My Rides & Vehicle Bookings
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Track active transport, view receipts, and review your trip history.
          </p>
        </div>

        <Button
          onClick={() => navigate('/find-vehicle')}
          className="rounded-xl text-xs font-bold gap-2 h-10 shadow-sm"
        >
          <Car className="w-4 h-4" />
          Find a Vehicle Now
        </Button>
      </div>

      {/* ACTIVE RIDE TOP BANNER (if any) */}
      {activeRide && (
        <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-sm">
              <Navigation className="w-6 h-6 animate-pulse" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span className="font-bold text-sm text-foreground uppercase tracking-wide">
                  Active Ride — {activeRide.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activeRide.vehicleType?.toUpperCase()} · Booking #{activeRide.bookingNumber}
                {activeRide.riderDetails?.name ? ` · Driver: ${activeRide.riderDetails.name}` : ''}
              </p>
            </div>
          </div>

          <Button
            onClick={() => navigate(`/find-vehicle?rideId=${activeRide._id}`)}
            className="rounded-xl text-xs font-bold gap-2 h-10 shrink-0"
          >
            <Navigation className="w-4 h-4" />
            Track Live on Map
          </Button>
        </div>
      )}

      {/* QUICK STATS WIDGET */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground font-medium">Total Rides</p>
          <p className="text-2xl font-bold text-foreground mt-1">{totalRides}</p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground font-medium">Total Spent</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            ₹{totalSpent}
          </p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground font-medium">Favorite Transport</p>
          <p className="text-2xl font-bold text-foreground capitalize mt-1">
            {favoriteVehicle.replace('_', ' ')}
          </p>
        </div>
      </div>

      {/* SEARCH & FILTERS BAR */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by pickup, drop, or driver..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 text-xs rounded-xl"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-input bg-background text-xs text-foreground"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="in_progress">In Progress</option>
            <option value="cancelled_by_user">Cancelled</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-input bg-background text-xs text-foreground"
          >
            <option value="all">All Vehicles</option>
            <option value="car">Car</option>
            <option value="ambulance">Ambulance</option>
            <option value="auto">Auto</option>
            <option value="bike">Bike</option>
            <option value="van">Van</option>
            <option value="e_rickshaw">E-Rickshaw</option>
          </select>
        </div>
      </div>

      {/* RIDE HISTORY TABLE */}
      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Loading your rides...</p>
          </div>
        ) : filteredRides.length === 0 ? (
          /* EMPTY STATE */
          <div className="py-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <Car className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-base text-foreground">No rides booked yet</h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Book your first ride for a doctor visit, hospital emergency, or convenient commute.
            </p>
            <Button
              onClick={() => navigate('/find-vehicle')}
              className="rounded-xl text-xs font-bold gap-2"
            >
              Find a Vehicle Now →
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border/80 text-muted-foreground uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Vehicle</th>
                  <th className="py-3 px-4">Route</th>
                  <th className="py-3 px-4">Driver</th>
                  <th className="py-3 px-4">Fare</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Rating</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredRides.map((ride) => {
                  const Icon = getVehicleIcon(ride.vehicleType);
                  const isCompleted = ride.status === 'completed';
                  const isPaid = ride.payment?.status === 'paid';

                  return (
                    <tr key={ride._id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-muted-foreground whitespace-nowrap">
                        {new Date(ride.createdAt).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground capitalize">
                              {ride.vehicleType?.replace('_', ' ')}
                            </p>
                            {ride.isEmergency && (
                              <span className="text-[9px] font-bold text-red-600">EMERGENCY</span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 max-w-[200px]">
                        <p className="truncate text-foreground font-medium">
                          <span className="text-emerald-600 font-bold mr-1">P:</span>
                          {ride.pickup?.address}
                        </p>
                        <p className="truncate text-muted-foreground mt-0.5">
                          <span className="text-rose-600 font-bold mr-1">D:</span>
                          {ride.drop?.address}
                        </p>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {ride.riderId?.name ? (
                          <div>
                            <p className="font-medium text-foreground">{ride.riderId.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {ride.vehicleId?.rcNumber || ''}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-bold text-foreground">₹{ride.fare?.total || 0}</span>
                        <div>
                          <Badge
                            variant={isPaid ? 'default' : 'secondary'}
                            className="text-[9px] px-1 py-0"
                          >
                            {isPaid ? 'Paid' : 'Pending'}
                          </Badge>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Badge
                          variant={
                            isCompleted
                              ? 'default'
                              : ride.status.includes('cancelled')
                              ? 'destructive'
                              : 'secondary'
                          }
                          className="text-[10px]"
                        >
                          {ride.status.replace(/_/g, ' ')}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {ride.ratingByUser?.stars ? (
                          <span className="flex items-center gap-1 font-semibold text-amber-600">
                            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                            {ride.ratingByUser.stars}
                          </span>
                        ) : isCompleted ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setRideToRate(ride);
                              setRateModalOpen(true);
                            }}
                            className="text-xs h-7 text-primary hover:underline p-0"
                          >
                            Rate Now
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedRide(ride)}
                          className="h-8 rounded-lg text-xs gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* RIDE DETAILS MODAL */}
      <Dialog open={!!selectedRide} onOpenChange={(open) => !open && setSelectedRide(null)}>
        {selectedRide && (
          <DialogContent className="sm:max-w-lg rounded-2xl p-6">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="font-mono text-xs">
                  {selectedRide.bookingNumber}
                </Badge>
                <Badge variant="secondary" className="capitalize text-xs">
                  {selectedRide.status?.replace(/_/g, ' ')}
                </Badge>
              </div>
              <DialogTitle className="text-lg font-bold text-foreground mt-2">
                Trip Summary & Breakdown
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {new Date(selectedRide.createdAt).toLocaleString('en-IN')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              {/* Route */}
              <div className="rounded-xl border bg-muted/30 p-3.5 space-y-2">
                <div>
                  <p className="text-[10px] uppercase font-bold text-emerald-600">Pickup</p>
                  <p className="font-medium text-foreground">{selectedRide.pickup?.address}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-[10px] uppercase font-bold text-rose-600">Destination</p>
                  <p className="font-medium text-foreground">{selectedRide.drop?.address}</p>
                </div>
              </div>

              {/* Driver Details */}
              {selectedRide.riderId && (
                <div className="flex items-center justify-between p-3 rounded-xl border">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Driver</p>
                    <p className="font-bold text-foreground text-sm">{selectedRide.riderId.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">Vehicle Reg.</p>
                    <p className="font-mono font-bold text-foreground">
                      {selectedRide.vehicleId?.rcNumber || 'MP-09-AB-1234'}
                    </p>
                  </div>
                </div>
              )}

              {/* Fare Breakdown */}
              <div className="rounded-xl border p-3.5 space-y-1.5">
                <p className="font-bold text-foreground mb-2">Fare Breakdown</p>
                <div className="flex justify-between text-muted-foreground">
                  <span>Base Fare</span>
                  <span className="font-medium text-foreground">
                    ₹{selectedRide.fare?.base || 0}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Distance Charge ({selectedRide.distanceKm || 0} km)</span>
                  <span className="font-medium text-foreground">
                    ₹{selectedRide.fare?.distanceCharge || 0}
                  </span>
                </div>
                {selectedRide.fare?.surge > 0 && (
                  <div className="flex justify-between text-red-600 font-medium">
                    <span>Emergency Priority Surge</span>
                    <span>+₹{selectedRide.fare.surge}</span>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between font-bold text-sm text-foreground">
                  <span>Total Paid</span>
                  <span>₹{selectedRide.fare?.total || 0}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => handleDownloadReceipt(selectedRide)}
                  className="rounded-xl text-xs gap-2 h-10"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </Button>

                <Button
                  onClick={() => handleRebook(selectedRide)}
                  className="rounded-xl text-xs gap-2 h-10 font-bold"
                >
                  <RotateCcw className="w-4 h-4" />
                  Rebook Route
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* RATING MODAL */}
      {rideToRate && (
        <RatingModal
          open={rateModalOpen}
          onOpenChange={setRateModalOpen}
          rideId={String(rideToRate._id)}
          driverName={rideToRate.riderId?.name || 'Driver'}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
