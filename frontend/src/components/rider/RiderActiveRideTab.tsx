import React from 'react';
import { Navigation, Phone, MapPin, CheckCircle2, ExternalLink, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import RideMap from '@/components/vehicle/RideMap';

export interface RiderActiveRideTabProps {
  activeRide: any;
  profile: any;
  handleMarkArrived: () => Promise<void>;
  handleStartTrip: () => Promise<void>;
  handleCompleteTrip: () => Promise<void>;
  navigate: (path: string) => void;
}

export const RiderActiveRideTab: React.FC<RiderActiveRideTabProps> = ({
  activeRide,
  profile,
  handleMarkArrived,
  handleStartTrip,
  handleCompleteTrip,
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
          <h3 className="font-bold text-base text-foreground">Active Ride Navigation</h3>
        </div>
        {activeRide && (
          <Badge variant="default" className="text-xs uppercase font-bold">
            {activeRide.status?.replace(/_/g, ' ')}
          </Badge>
        )}
      </div>

      {!activeRide ? (
        <div className="rounded-2xl border border-border/80 bg-card p-12 text-center space-y-3">
          <Navigation className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="font-semibold text-sm text-foreground">No active ride right now</p>
          <p className="text-xs text-muted-foreground">
            Accepted rides will appear here with live route navigation and passenger details.
          </p>

          {/* Location status indicator */}
          <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-4 py-2 text-xs">
            {profile?.currentLocation?.coordinates?.length ? (
              <>
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-foreground font-medium">
                  Location active: {profile.currentLocation.lat?.toFixed(4)}, {profile.currentLocation.lng?.toFixed(4)}
                </span>
                {profile.currentLocation.updatedAt && (
                  <span className="text-muted-foreground">
                    (updated {Math.max(0, Math.round((Date.now() - new Date(profile.currentLocation.updatedAt).getTime()) / 1000))}s ago)
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-destructive" />
                <span className="text-destructive font-medium">
                  Location not available — enable GPS to receive ride/emergency requests
                </span>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Trip Controls Panel */}
          <div className="lg:col-span-5 rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="font-mono text-xs">
                {activeRide.bookingNumber}
              </Badge>
              <Badge variant="default" className="text-xs capitalize font-bold">
                {activeRide.status?.replace(/_/g, ' ')}
              </Badge>
            </div>

            {/* Passenger details */}
            <div className="p-3.5 rounded-xl border bg-muted/30 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Passenger</p>
                <p className="font-bold text-foreground text-sm">
                  {activeRide.userId?.name || 'Customer'}
                </p>
              </div>

              {activeRide.userId?.phone && (
                <Button asChild size="sm" variant="outline" className="rounded-xl text-xs gap-1.5">
                  <a href={`tel:${activeRide.userId.phone}`}>
                    <Phone className="w-3.5 h-3.5 text-primary" /> Call
                  </a>
                </Button>
              )}
            </div>

            {/* Route */}
            <div className="space-y-2 text-xs">
              <div>
                <p className="text-[10px] font-bold uppercase text-primary">Pickup</p>
                <p className="text-foreground font-medium">{activeRide.pickup?.address}</p>
              </div>
              <Separator />
              <div>
                <p className="text-[10px] font-bold uppercase text-destructive">Destination</p>
                <p className="text-foreground font-medium">{activeRide.drop?.address}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t text-sm font-bold">
              <span>Fare Total</span>
              <span className="text-lg text-primary">₹{activeRide.fare?.total || 0}</span>
            </div>

            {/* State Machine Transition Buttons */}
            <div className="space-y-2 pt-2">
              {activeRide.status === 'accepted' && (
                <Button
                  onClick={handleMarkArrived}
                  className="w-full h-11 rounded-xl text-xs font-bold gap-2 bg-primary text-primary-foreground"
                >
                  <MapPin className="w-4 h-4" />
                  Mark Arrived at Pickup
                </Button>
              )}

              {activeRide.status === 'arrived' && (
                <Button
                  onClick={handleStartTrip}
                  className="w-full h-11 rounded-xl text-xs font-bold gap-2 bg-primary text-primary-foreground"
                >
                  <Navigation className="w-4 h-4" />
                  Start Trip (Heading to Dropoff)
                </Button>
              )}

              {activeRide.status === 'in_progress' && (
                <Button
                  onClick={handleCompleteTrip}
                  className="w-full h-11 rounded-xl text-xs font-bold gap-2 bg-primary text-primary-foreground"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Complete Ride & Finalize Fare
                </Button>
              )}

              {activeRide.status === 'completed' && (
                <div className="rounded-xl bg-primary/10 border border-primary/30 p-3 text-center space-y-1">
                  <CheckCircle2 className="w-6 h-6 text-primary mx-auto" />
                  <p className="font-bold text-xs text-foreground">Ride Completed!</p>
                  <p className="text-[11px] text-muted-foreground">
                    {activeRide.payment?.status === 'paid'
                      ? `Payment of ₹${activeRide.fare?.total} settled via ${activeRide.payment.method}`
                      : 'Awaiting passenger payment completion...'}
                  </p>
                </div>
              )}

              {/* External Google Maps navigation shortcut */}
              {activeRide.drop?.lat && (
                <Button
                  asChild
                  variant="outline"
                  className="w-full rounded-xl text-xs h-9 gap-1.5 border-border/80"
                >
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${activeRide.drop.lat},${activeRide.drop.lng}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open Google Maps Directions
                  </a>
                </Button>
              )}
            </div>
          </div>

          {/* Map */}
          <div className="lg:col-span-7 h-[450px] sm:h-[550px]">
            <RideMap
              pickup={activeRide.pickup}
              drop={activeRide.drop}
              riderLocation={profile?.currentLocation}
              vehicleType={activeRide.vehicleType}
              isEmergency={activeRide.isEmergency}
            />
          </div>
        </div>
      )}
    </div>
  );
};
