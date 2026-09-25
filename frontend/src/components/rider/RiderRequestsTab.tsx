import React from 'react';
import { motion } from 'framer-motion';
import { Clock, MapPin, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface RiderRequestsTabProps {
  isOnline: boolean;
  incomingRequests: any[];
  handleAcceptRide: (rideId: string) => Promise<void>;
  handleDeclineRide: (rideId: string) => void;
  navigate: (path: string) => void;
}

export const RiderRequestsTab: React.FC<RiderRequestsTabProps> = ({
  isOnline,
  incomingRequests,
  handleAcceptRide,
  handleDeclineRide,
  navigate,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/rider/dashboard')}
            className="rounded-xl h-8 px-2.5 text-xs gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Button>
          <h3 className="font-bold text-base text-foreground">Live Incoming Requests</h3>
        </div>
        <span className="text-xs text-muted-foreground font-mono">
          Status: {isOnline ? '🟢 Listening for requests' : '🔴 You are Offline'}
        </span>
      </div>

      {incomingRequests.length === 0 ? (
        <div className="rounded-2xl border border-border/80 bg-card p-12 text-center space-y-3">
          <Clock className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="font-semibold text-sm text-foreground">No pending ride requests right now</p>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            {isOnline
              ? 'Keep this dashboard open. You will be notified as soon as someone books in your area.'
              : 'Turn on the switch at the top to start receiving ride requests.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {incomingRequests.map((req) => (
            <motion.div
              key={req.rideId}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`rounded-2xl p-5 border shadow-md space-y-4 ${
                req.isEmergency
                  ? 'border-red-500 bg-red-500/10 ring-2 ring-red-500/30'
                  : 'border-border/80 bg-card'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {req.isEmergency && (
                      <Badge variant="destructive" className="animate-pulse text-[10px]">
                        EMERGENCY PRIORITY
                      </Badge>
                    )}
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {req.bookingNumber}
                    </Badge>
                    {req.priorityRank != null && (
                      <Badge
                        className={`text-[10px] font-semibold ${
                          req.priorityRank === 1
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-primary/15 text-primary border border-primary/20'
                        }`}
                      >
                        {req.priorityRank === 1 ? '⭐ Nearest Driver' : `#${req.priorityRank} in Queue`}
                      </Badge>
                    )}
                  </div>
                  <h4 className="font-bold text-base text-foreground mt-1 capitalize">
                    {req.vehicleType?.replace('_', ' ')} Booking
                  </h4>
                </div>

                <div className="text-right">
                  <span className="text-xl font-extrabold text-foreground">
                    ₹{req.estimatedFare}
                  </span>
                  <div className="text-[11px] font-mono font-bold text-destructive flex items-center justify-end gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    <span>00:{String(req.countdown).padStart(2, '0')}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                {req.riderDistanceKm != null && (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-lg w-fit border border-primary/20">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    <span>Pickup is {req.riderDistanceKm} km away from you</span>
                  </div>
                )}
                <p className="text-muted-foreground truncate">
                  <span className="text-primary font-bold mr-1">Pickup:</span>
                  {req.pickup?.address}
                </p>
                <p className="text-muted-foreground truncate">
                  <span className="text-destructive font-bold mr-1">Drop:</span>
                  {req.drop?.address}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Trip Distance: {req.distanceKm || 0} km
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeclineRide(req.rideId)}
                  className="rounded-xl text-xs h-9 text-muted-foreground"
                >
                  Decline
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleAcceptRide(req.rideId)}
                  className="rounded-xl text-xs h-9 font-bold bg-primary text-primary-foreground"
                >
                  Accept Ride
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
