import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Map, MapControls, MapMarker, MapRoute, MarkerContent, MarkerTooltip } from '@/components/ui/map';
import { Navigation, MapPin, Car, Ambulance, Bike, Zap, Crosshair } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { MarkerSmoother } from '@/utils/markerInterpolation';

export interface LatLng {
  lat: number;
  lng: number;
}

interface RideMapProps {
  pickup?: LatLng | null;
  drop?: LatLng | null;
  riderLocation?: LatLng | null;
  vehicleType?: string;
  isEmergency?: boolean;
  className?: string;
  zoom?: number;
}

export default function RideMap({
  pickup,
  drop,
  riderLocation,
  vehicleType = 'car',
  isEmergency = false,
  className = 'h-full min-h-[400px]',
  zoom = 13,
}: RideMapProps) {
  // Spec 05 §4: 60fps LERP smoothing for the live driver marker.
  // Raw socket GPS (1-3s cadence) feeds MarkerSmoother; the marker renders
  // the interpolated position so it glides instead of jumping.
  const smootherRef = useRef<MarkerSmoother | null>(null);
  const [smoothRider, setSmoothRider] = useState<LatLng | null>(null);

  useEffect(() => {
    if (!riderLocation?.lat || !riderLocation?.lng) return;
    if (!smootherRef.current) {
      smootherRef.current = new MarkerSmoother(
        { lat: riderLocation.lat, lng: riderLocation.lng },
        ([lat, lng]) => setSmoothRider({ lat, lng })
      );
      setSmoothRider({ lat: riderLocation.lat, lng: riderLocation.lng });
    } else {
      smootherRef.current.setNextTarget({ lat: riderLocation.lat, lng: riderLocation.lng }, 1500);
    }
  }, [riderLocation?.lat, riderLocation?.lng]);

  useEffect(() => () => smootherRef.current?.destroy(), []);

  const liveRider = smoothRider || riderLocation;

  // Determine center of map: rider position > pickup > drop > default Jabalpur coordinates
  const center: [number, number] = useMemo(() => {
    if (liveRider?.lng && liveRider?.lat) {
      return [liveRider.lng, liveRider.lat];
    }
    if (pickup?.lng && pickup?.lat) {
      return [pickup.lng, pickup.lat];
    }
    if (drop?.lng && drop?.lat) {
      return [drop.lng, drop.lat];
    }
    return [79.9864, 23.1815]; // Default center
  }, [pickup, drop, liveRider]);

  // Build a route line between pickup and drop, or rider and pickup
  const routeCoordinates = useMemo(() => {
    const coords: [number, number][] = [];
    if (liveRider?.lng && liveRider?.lat) {
      coords.push([liveRider.lng, liveRider.lat]);
    }
    if (pickup?.lng && pickup?.lat) {
      coords.push([pickup.lng, pickup.lat]);
    }
    if (drop?.lng && drop?.lat) {
      coords.push([drop.lng, drop.lat]);
    }
    return coords.length >= 2 ? coords : [];
  }, [pickup, drop, riderLocation]);

  const VehicleIcon = isEmergency || vehicleType === 'ambulance' ? Ambulance : vehicleType === 'bike' ? Bike : Car;

  return (
    <div className={cn('relative w-full h-full rounded-2xl overflow-hidden border border-border/80 shadow-inner bg-muted/20', className)}>
      <Map center={center} zoom={zoom} className="w-full h-full">
        <MapControls position="bottom-right" />

        {/* Route Polyline */}
        {routeCoordinates.length >= 2 && (
          <MapRoute
            id="ride-route"
            coordinates={routeCoordinates}
            color={isEmergency ? '#ef4444' : '#0f766e'}
            width={4}
            opacity={0.85}
          />
        )}

        {/* Pickup Marker */}
        {pickup?.lat && pickup?.lng && (
          <MapMarker longitude={pickup.lng} latitude={pickup.lat}>
            <MarkerContent>
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white shadow-lg border-2 border-white flex items-center justify-center font-bold text-xs ring-4 ring-emerald-500/20">
                  P
                </div>
                <div className="w-1.5 h-2 bg-emerald-600 rounded-b-sm" />
              </div>
            </MarkerContent>
            <MarkerTooltip>
              <span className="text-xs font-semibold text-emerald-600">Pickup Location</span>
            </MarkerTooltip>
          </MapMarker>
        )}

        {/* Drop Marker */}
        {drop?.lat && drop?.lng && (
          <MapMarker longitude={drop.lng} latitude={drop.lat}>
            <MarkerContent>
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-rose-600 text-white shadow-lg border-2 border-white flex items-center justify-center font-bold text-xs ring-4 ring-rose-500/20">
                  D
                </div>
                <div className="w-1.5 h-2 bg-rose-600 rounded-b-sm" />
              </div>
            </MarkerContent>
            <MarkerTooltip>
              <span className="text-xs font-semibold text-rose-600">Dropoff Destination</span>
            </MarkerTooltip>
          </MapMarker>
        )}

        {/* Live Rider Marker (LERP-smoothed) */}
        {liveRider?.lat && liveRider?.lng && (
          <MapMarker longitude={liveRider.lng} latitude={liveRider.lat}>
            <MarkerContent>
              <div className="relative flex items-center justify-center">
                {/* Pulsing ring animation */}
                <span className="animate-ping absolute inline-flex h-9 w-9 rounded-full bg-primary/40 opacity-75" />
                <div className="relative w-9 h-9 rounded-full bg-primary text-primary-foreground shadow-xl border-2 border-background flex items-center justify-center">
                  <VehicleIcon className="w-5 h-5" />
                </div>
              </div>
            </MarkerContent>
            <MarkerTooltip>
              <div className="text-xs">
                <p className="font-semibold text-foreground">Driver Live Location</p>
                <p className="text-[10px] text-muted-foreground">Moving toward destination</p>
              </div>
            </MarkerTooltip>
          </MapMarker>
        )}
      </Map>

      {/* Floating Status Badges overlay on map */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-2 pointer-events-none">
        {isEmergency && (
          <Badge variant="destructive" className="shadow-md text-xs font-semibold animate-pulse">
            🚨 Emergency Priority Dispatch
          </Badge>
        )}
        {pickup && (
          <Badge variant="secondary" className="shadow-sm backdrop-blur-md bg-background/90 text-[11px]">
            📍 Route Loaded
          </Badge>
        )}
      </div>
    </div>
  );
}
