import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Car, Ambulance, ShieldAlert, Sparkles, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import LocationInput, { LocationPoint } from '@/components/vehicle/LocationInput';
import VehicleTypeSelector from '@/components/vehicle/VehicleTypeSelector';
import FareEstimateCard from '@/components/vehicle/FareEstimateCard';
import RideMap from '@/components/vehicle/RideMap';
import RideStatusPanel from '@/components/vehicle/RideStatusPanel';
import { InstantSearchingScreen, InstantNoRespondersScreen, InstantAssignedScreen } from '@/components/instant';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { getSocket, joinRideRoom } from '@/lib/socket';
import { toast } from 'sonner';

export default function FindVehicle() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const rideIdParam = searchParams.get('rideId');

  // Booking Form State
  const [pickup, setPickup] = useState<LocationPoint | null>(null);
  const [drop, setDrop] = useState<LocationPoint | null>(null);
  const [vehicleType, setVehicleType] = useState<string>('car');
  const [isEmergency, setIsEmergency] = useState<boolean>(false);

  // Estimates State
  const [estimates, setEstimates] = useState<Record<string, any>>({});
  const [distanceKm, setDistanceKm] = useState<number>(0);
  const [loadingEstimate, setLoadingEstimate] = useState<boolean>(false);
  const [bookingLoading, setBookingLoading] = useState<boolean>(false);

  // Active Ride State
  const [activeRide, setActiveRide] = useState<any>(null);
  const [riderLocation, setRiderLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [fetchingActive, setFetchingActive] = useState<boolean>(true);
  // File 04 — full-screen Assigned overlay dismissal (reset per ride)
  const [assignedDismissed, setAssignedDismissed] = useState<boolean>(false);

  useEffect(() => {
    setAssignedDismissed(false);
  }, [activeRide?._id]);

  // Global City Synchronization (from Navbar)
  const [selectedCity, setSelectedCity] = useState<string>(
    () => localStorage.getItem('findmedi_city') || localStorage.getItem('mediCore_city') || 'Jabalpur'
  );

  useEffect(() => {
    const onCityChange = (e: any) => {
      const newCity = e.detail || localStorage.getItem('findmedi_city') || localStorage.getItem('mediCore_city');
      if (newCity && newCity !== selectedCity) {
        setSelectedCity(newCity);
      }
    };
    window.addEventListener('cityChange', onCityChange);
    window.addEventListener('storage', onCityChange);
    return () => {
      window.removeEventListener('cityChange', onCityChange);
      window.removeEventListener('storage', onCityChange);
    };
  }, [selectedCity]);

  // 1. Initial Load: Check for active ride or deep-linked rideId
  useEffect(() => {
    if (!user) {
      // Guest visitors can browse freely — skip active ride fetch
      setFetchingActive(false);
      return;
    }

    const loadInitialRide = async () => {
      try {
        if (rideIdParam) {
          const res = await api.getRide(rideIdParam);
          if (res.ride && !['completed', 'cancelled_by_user', 'cancelled_by_rider'].includes(res.ride.status)) {
            setActiveRide(res.ride);
            setPickup(res.ride.pickup);
            setDrop(res.ride.drop);
            setVehicleType(res.ride.vehicleType);
            setIsEmergency(res.ride.isEmergency);
            setFetchingActive(false);
            return;
          }
        }

        // Fetch user's active ride if any
        const res = await api.getActiveRide();
        if (res.ride) {
          setActiveRide(res.ride);
          setPickup(res.ride.pickup);
          setDrop(res.ride.drop);
          setVehicleType(res.ride.vehicleType);
          setIsEmergency(res.ride.isEmergency);
        }
      } catch (err) {
        // No active ride
      } finally {
        setFetchingActive(false);
      }
    };

    loadInitialRide();
  }, [user, rideIdParam]);

  // 2. Real-time Socket Listener for active ride updates & live tracking
  useEffect(() => {
    if (!activeRide?._id) return;

    const socket = getSocket();
    const cleanupRoom = joinRideRoom(String(activeRide._id));

    const handleRideStatusUpdate = (payload: any) => {
      if (String(payload.rideId) === String(activeRide._id)) {
        setActiveRide((prev: any) => ({
          ...prev,
          status: payload.status,
          riderDetails: payload.rider || prev?.riderDetails,
          payment: payload.payment || prev?.payment,
        }));
        if (payload.rider?.currentLocation) {
          setRiderLocation({
            lat: payload.rider.currentLocation.lat,
            lng: payload.rider.currentLocation.lng,
          });
        }
      }
    };

    const handleLocationUpdate = (payload: any) => {
      if (String(payload.rideId) === String(activeRide._id)) {
        setRiderLocation({ lat: payload.lat, lng: payload.lng });
      }
    };

    const handlePaymentReceived = (payload: any) => {
      if (String(payload.rideId) === String(activeRide._id)) {
        setActiveRide((prev: any) => ({
          ...prev,
          payment: payload.payment || { status: 'paid' },
        }));
      }
    };

    const handleRideSearchUpdate = (payload: any) => {
      if (String(payload.rideId || payload.requestId) === String(activeRide._id)) {
        setActiveRide((prev: any) => ({
          ...prev,
          currentDispatchRadius: payload.radiusKm,
        }));
      }
    };

    const handleNoResponders = (payload: any) => {
      if (String(payload.rideId || payload.requestId) === String(activeRide._id)) {
        setActiveRide((prev: any) => ({
          ...prev,
          status: 'no_riders_found',
        }));
      }
    };

    // File 03/04 — generic instant wave engine resolves via ride:assigned
    // (legacy sequential path resolves via ride_status_update accepted).
    const handleInstantAssigned = (payload: any) => {
      if (String(payload.rideId || payload.requestId) === String(activeRide._id)) {
        setActiveRide((prev: any) => ({
          ...prev,
          status: 'accepted',
          riderId: payload.providerId || payload.riderId || prev?.riderId,
          riderDetails: payload.providerDetails || prev?.riderDetails,
        }));
      }
    };

    socket.on('ride_status_update', handleRideStatusUpdate);
    socket.on('ride:search_update', handleRideSearchUpdate);
    socket.on('ride:assigned', handleInstantAssigned);
    socket.on('ride:no_responders_found', handleNoResponders);
    socket.on('ride_location_update', handleLocationUpdate);
    socket.on('payment_received', handlePaymentReceived);

    return () => {
      socket.off('ride_status_update', handleRideStatusUpdate);
      socket.off('ride:search_update', handleRideSearchUpdate);
      socket.off('ride:assigned', handleInstantAssigned);
      socket.off('ride:no_responders_found', handleNoResponders);
      socket.off('ride_location_update', handleLocationUpdate);
      socket.off('payment_received', handlePaymentReceived);
      cleanupRoom();
    };
  }, [activeRide?._id]);

  // 3. Fetch Fare Estimates whenever pickup, drop, or emergency toggle changes
  useEffect(() => {
    if (!pickup || !drop) {
      setEstimates({});
      return;
    }

    const fetchEstimate = async () => {
      setLoadingEstimate(true);
      try {
        const res = await api.estimateRide({
          pickup,
          drop,
          isEmergency: vehicleType === 'ambulance' && isEmergency,
        });
        setEstimates(res.estimates || {});
        setDistanceKm(res.distanceKm || 0);
      } catch (err: any) {
        console.warn('Failed to fetch estimate:', err.message);
      } finally {
        setLoadingEstimate(false);
      }
    };

    fetchEstimate();
  }, [pickup?.lat, pickup?.lng, drop?.lat, drop?.lng, isEmergency, vehicleType]);

  // Handle Book Now
  const handleBookNow = async () => {
    if (!user) {
      toast.error('Please sign in to book a ride');
      navigate('/login?redirect=/find-vehicle');
      return;
    }

    if (!pickup || !drop) {
      toast.error('Please specify both pickup and destination locations');
      return;
    }

    setBookingLoading(true);
    try {
      const res = await api.bookRide({
        pickup,
        drop,
        vehicleType,
        isEmergency: vehicleType === 'ambulance' && isEmergency,
        distanceKm,
      });

      if (res.ride) {
        setActiveRide(res.ride);
        toast.success(res.message || 'Ride booked! Matching with nearby drivers...');
      }
    } catch (err: any) {
      toast.error(err.message || 'Unable to book ride. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  // Handle Cancel Ride
  const handleCancelRide = async (reason = 'Cancelled by user') => {
    if (!activeRide?._id) return;
    try {
      await api.cancelRide(String(activeRide._id), reason);
      toast.info('Ride request cancelled');
      setActiveRide(null);
      setRiderLocation(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel ride');
    }
  };

  const selectedEstimate = estimates[vehicleType];

  if (fetchingActive) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Loading vehicle transport...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-foreground flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-primary/10 text-primary">🚗</span>
            Find & Book a Vehicle
            {selectedCity && selectedCity !== 'All' && (
              <Badge variant="outline" className="text-xs font-semibold text-primary border-primary/30 bg-primary/5 ml-1">
                📍 {selectedCity}
              </Badge>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Instant on-demand patient pickup, hospital visits, ambulances, and personal rides in {selectedCity && selectedCity !== 'All' ? selectedCity : 'your area'}.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/patient/rides')}
          className="rounded-xl text-xs gap-1.5 h-9"
        >
          My Rides
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PANEL (~40%): Booking / Active Ride controller */}
        <div className="lg:col-span-5 space-y-4">
          {activeRide ? (
            /* ACTIVE RIDE CONTROLLER */
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <Badge variant="outline" className="text-xs font-mono font-bold">
                  {activeRide.bookingNumber}
                </Badge>
                {activeRide.status === 'completed' && activeRide.payment?.status === 'paid' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setActiveRide(null);
                      setPickup(null);
                      setDrop(null);
                    }}
                    className="text-xs h-7 text-primary"
                  >
                    Book Another Ride
                  </Button>
                )}
              </div>

              <RideStatusPanel
                ride={activeRide}
                onCancelRide={handleCancelRide}
                onRetrySearch={handleBookNow}
                onRideCompletedPayment={(payment) => {
                  setActiveRide((prev: any) => ({ ...prev, payment }));
                }}
                onRefreshRide={async () => {
                  const res = await api.getRide(activeRide._id);
                  if (res.ride) setActiveRide(res.ride);
                }}
              />
            </div>
          ) : (
            /* NEW BOOKING FORM */
            <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-sm space-y-4">
              {/* Pickup & Drop Inputs */}
              <div className="space-y-3">
                <LocationInput
                  label="Pickup Location"
                  placeholder="Enter hospital, clinic, or street"
                  value={pickup}
                  onChange={setPickup}
                  showCurrentLocationButton={true}
                  pinColor="text-emerald-600"
                />

                <LocationInput
                  label="Dropoff Destination"
                  placeholder="Enter destination address or landmark"
                  value={drop}
                  onChange={setDrop}
                  pinColor="text-rose-600"
                />
              </div>

              {/* Vehicle Type Selector */}
              <div className="space-y-2 pt-1">
                <label className="text-xs font-semibold text-foreground block">
                  Select Vehicle Type
                </label>
                <VehicleTypeSelector
                  selected={vehicleType}
                  onSelect={setVehicleType}
                  estimates={estimates}
                  isEmergency={isEmergency}
                />
              </div>

              {/* Emergency Ambulance Toggle */}
              {vehicleType === 'ambulance' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 flex items-start gap-2.5"
                >
                  <Checkbox
                    id="emergency-toggle"
                    checked={isEmergency}
                    onCheckedChange={(checked) => setIsEmergency(Boolean(checked))}
                    className="mt-0.5 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                  />
                  <div className="grid gap-0.5 leading-none">
                    <label
                      htmlFor="emergency-toggle"
                      className="text-xs font-bold text-red-700 dark:text-red-400 cursor-pointer"
                    >
                      🚨 This is an Emergency (Priority Dispatch)
                    </label>
                    <p className="text-[11px] text-muted-foreground">
                      Simultaneously notifies all nearby ambulance drivers with urgent audio alert and priority dispatch.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Fare & ETA Breakdown */}
              {selectedEstimate && (
                <FareEstimateCard
                  vehicleType={vehicleType}
                  distanceKm={distanceKm}
                  durationMin={selectedEstimate.durationMin || 15}
                  etaMin={selectedEstimate.etaMin || 4}
                  fare={selectedEstimate.fare || { base: 0, distanceCharge: 0, surge: 0, total: 0 }}
                  isEmergency={isEmergency}
                />
              )}

              {/* Book Now Action */}
              <Button
                type="button"
                onClick={handleBookNow}
                disabled={!pickup || !drop || bookingLoading || loadingEstimate}
                className="w-full h-12 rounded-xl text-sm font-bold shadow-md gap-2"
              >
                {bookingLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting to Drivers...
                  </>
                ) : (
                  <>
                    <Car className="w-4 h-4" />
                    Book {vehicleType.replace('_', ' ').toUpperCase()} Now
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* RIGHT PANEL (~60%): Interactive Map */}
        <div className="lg:col-span-7 sticky top-20">
          <div className="h-[460px] sm:h-[560px] lg:h-[620px] w-full">
            <RideMap
              pickup={pickup ? { lat: pickup.lat, lng: pickup.lng } : null}
              drop={drop ? { lat: drop.lat, lng: drop.lng } : null}
              riderLocation={riderLocation}
              vehicleType={vehicleType}
              isEmergency={vehicleType === 'ambulance' && isEmergency}
            />
          </div>
        </div>
      </div>

      {/* FULL-SCREEN Instant Searching Overlay for searching rides */}
      {activeRide?.status === 'searching' && (
        <InstantSearchingScreen
          type={activeRide.vehicleType === 'ambulance' ? 'ambulance' : 'ride'}
          radiusKm={activeRide.currentDispatchRadius || 5}
          onCancel={() => handleCancelRide('Cancelled by user during search')}
          requestDetails={activeRide}
        />
      )}

      {/* FULL-SCREEN No Responders Found Overlay */}
      {activeRide?.status === 'no_riders_found' && (
        <InstantNoRespondersScreen
          type={activeRide.vehicleType === 'ambulance' ? 'ambulance' : 'ride'}
          onRetry={handleBookNow}
          onDismiss={() => {
            setActiveRide(null);
            setPickup(null);
            setDrop(null);
          }}
          message="All nearby drivers and emergency ambulances are currently committed. You can retry with a wider search or request 108 emergency services."
        />
      )}

      {/* FULL-SCREEN Assigned Overlay (File 04) — trip panel stays underneath */}
      {activeRide?.status === 'accepted' && !assignedDismissed && (
        <InstantAssignedScreen
          type={activeRide.vehicleType === 'ambulance' ? 'ambulance' : 'ride'}
          assignedDetails={{
            providerDetails: activeRide.riderDetails,
            distanceKm: activeRide.riderDetails?.distanceKm,
          }}
          requestDetails={activeRide}
          onViewDetails={() => setAssignedDismissed(true)}
          onDismiss={() => setAssignedDismissed(true)}
        />
      )}
    </div>
  );
}
