import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, AlertCircle, RefreshCw, X, CheckCircle2, Clock, Navigation, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import RiderInfoCard from './RiderInfoCard';
import DemoPaymentSheet from './DemoPaymentSheet';
import RatingModal from './RatingModal';

interface RideStatusPanelProps {
  ride: any;
  onCancelRide: (reason?: string) => void;
  onRetrySearch?: () => void;
  onRideCompletedPayment?: (payment: any) => void;
  onRefreshRide?: () => void;
}

export default function RideStatusPanel({
  ride,
  onCancelRide,
  onRetrySearch,
  onRideCompletedPayment,
  onRefreshRide,
}: RideStatusPanelProps) {
  const [ratingOpen, setRatingOpen] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Trip duration timer for in_progress state
  useEffect(() => {
    let interval: any;
    if (ride?.status === 'in_progress') {
      const startTime = ride.startedAt ? new Date(ride.startedAt).getTime() : Date.now();
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
      interval = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [ride?.status, ride?.startedAt]);

  if (!ride) return null;

  const status = ride.status;
  const rider = ride.riderDetails || (ride.riderId?.name ? ride.riderId : null);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {/* State 1: SEARCHING FOR DRIVER */}
        {status === 'searching' && (
          <motion.div
            key="searching"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-2xl border border-border/80 bg-card p-5 text-center space-y-4 shadow-sm"
          >
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/20" />
              <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center text-primary shadow-md">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            </div>

            <div>
              <h3 className="font-bold text-base text-foreground">
                Searching for nearby {ride.vehicleType?.toUpperCase()}...
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                Notifying online verified drivers within pickup radius. Please wait a moment.
              </p>
            </div>

            <div className="flex justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCancelRide('Cancelled during driver search')}
                className="text-xs rounded-xl h-9 text-destructive border-destructive/30 hover:bg-destructive/10"
              >
                Cancel Search
              </Button>
            </div>
          </motion.div>
        )}

        {/* State 2: DRIVER ACCEPTED & ARRIVING */}
        {(status === 'accepted' || status === 'rider_arriving') && (
          <motion.div
            key="arriving"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                </span>
                <span className="font-bold text-sm text-foreground">Driver En Route</span>
              </div>
              <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                Arriving in ~{ride.durationMin || 4} mins
              </Badge>
            </div>

            {rider && (
              <RiderInfoCard
                rider={rider}
                statusText="Arriving at Pickup"
                onCancel={() => onCancelRide('Cancelled by passenger before arrival')}
                canCancel={true}
              />
            )}
          </motion.div>
        )}

        {/* State 3: DRIVER ARRIVED */}
        {status === 'arrived' && (
          <motion.div
            key="arrived"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-emerald-950 dark:text-emerald-300">
                  Driver Has Arrived!
                </h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  Your vehicle is waiting at the pickup location.
                </p>
              </div>
            </div>

            {rider && (
              <RiderInfoCard
                rider={rider}
                statusText="Waiting at Pickup"
                canCancel={false}
              />
            )}
          </motion.div>
        )}

        {/* State 4: TRIP IN PROGRESS */}
        {status === 'in_progress' && (
          <motion.div
            key="in_progress"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="default" className="gap-1.5 text-xs font-semibold px-2.5 py-0.5">
                  <Navigation className="w-3.5 h-3.5" />
                  Trip In Progress
                </Badge>
                <div className="flex items-center gap-1.5 font-mono font-bold text-sm text-primary">
                  <Clock className="w-4 h-4" />
                  <span>{formatTimer(elapsedSeconds)}</span>
                </div>
              </div>

              <div className="text-xs space-y-1">
                <p className="text-muted-foreground">Heading to Destination:</p>
                <p className="font-semibold text-foreground truncate">{ride.drop?.address}</p>
              </div>
            </div>

            {rider && (
              <RiderInfoCard
                rider={rider}
                statusText="Trip Active"
                canCancel={false}
              />
            )}
          </motion.div>
        )}

        {/* State 5: COMPLETED -> DEMO PAYMENT SHEET */}
        {status === 'completed' && (
          <motion.div
            key="completed"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {ride.payment?.status === 'paid' ? (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h3 className="font-bold text-lg text-foreground">Ride Completed & Paid</h3>
                <p className="text-xs text-muted-foreground">
                  Simulated payment completed. Txn Ref: {ride.payment?.transactionRef || 'DEMO-TXN'}
                </p>

                <Button
                  onClick={() => setRatingOpen(true)}
                  className="w-full rounded-xl text-xs font-semibold h-10 gap-2"
                >
                  Rate Your Driver
                </Button>
              </div>
            ) : (
              <DemoPaymentSheet
                rideId={String(ride._id)}
                amount={ride.fare?.total || 0}
                onPaymentComplete={(pay) => {
                  if (onRideCompletedPayment) onRideCompletedPayment(pay);
                  setRatingOpen(true);
                }}
              />
            )}
          </motion.div>
        )}

        {/* State 6: NO RIDERS FOUND */}
        {status === 'no_riders_found' && (
          <motion.div
            key="no_riders"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border/80 bg-card p-5 text-center space-y-4 shadow-sm"
          >
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 mx-auto flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-bold text-base text-foreground">No Drivers Available Nearby</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                All drivers for this vehicle type are currently busy. You can retry with an expanded search or choose another vehicle.
              </p>
            </div>

            <div className="flex gap-2 justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCancelRide('No drivers available')}
                className="text-xs rounded-xl"
              >
                Cancel
              </Button>
              {onRetrySearch && (
                <Button
                  size="sm"
                  onClick={onRetrySearch}
                  className="text-xs rounded-xl gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry Search
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rating Dialog */}
      <RatingModal
        open={ratingOpen}
        onOpenChange={setRatingOpen}
        rideId={String(ride._id)}
        driverName={rider?.name || 'Driver'}
        onSuccess={() => {
          if (onRefreshRide) onRefreshRide();
        }}
      />
    </div>
  );
}
