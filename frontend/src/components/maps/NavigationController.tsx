import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '@/lib/api';
import { useMap } from '@/components/ui/map';
import { useNavigation } from '@/hooks/useNavigation';
import { useNavigationCamera } from '@/hooks/useNavigationCamera';
import NavigationOverlay from '@/components/maps/NavigationOverlay';
import {
  decodePolyline6,
  type Maneuver,
  type RouteCoordinate,
} from '@/lib/navigation';

export interface NavigationControllerProps {
  /** Where the trip starts (usually the user's live GPS position). */
  origin: RouteCoordinate;
  /** Trip destination, `[lng, lat]`. */
  destination: RouteCoordinate;
  /** Human label for the destination pin (shown in the overlay footer). */
  destinationLabel?: string;
  /**
   * Route already on screen. Shown immediately while the maneuver fetch is in
   * flight so the driver never stares at a blank map after pressing Start.
   */
  fallbackRoute: RouteCoordinate[];
  onExit: () => void;
}

interface NavigationRouteResponse {
  shape: string;
  distanceKm: number;
  durationSeconds: number;
  maneuvers: Maneuver[];
  source: string;
}

/**
 * The guided-navigation session: fetches Valhalla maneuvers, runs the GPS
 * loop, drives the following-camera, and renders the HUD overlay.
 *
 * Render this INSIDE <Map> (it needs `useMap()` for the camera). Re-key it on
 * the destination so a changed destination remounts the session cleanly
 * (documented edge case: "destination changed mid-navigation = fresh start").
 */
export default function NavigationController({
  origin,
  destination,
  destinationLabel,
  fallbackRoute,
  onExit,
}: NavigationControllerProps) {
  const { map } = useMap();

  const [route, setRoute] = useState<RouteCoordinate[]>(fallbackRoute);
  const [maneuvers, setManeuvers] = useState<Maneuver[]>([]);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isRerouting, setIsRerouting] = useState(false);

  const destinationKey = useMemo(() => destination.join(','), [destination]);
  // Guards against a slow response overwriting a newer reroute's result.
  const requestIdRef = useRef(0);

  const fetchNavigationRoute = useCallback(
    async (from: RouteCoordinate) => {
      const requestId = ++requestIdRef.current;
      setIsRerouting(true);
      try {
        const { data } = await apiClient.post<NavigationRouteResponse>('/routing/navigation', {
          origin: from,
          destination,
        });
        if (requestId !== requestIdRef.current) return; // stale response

        // Prefer Valhalla's own polyline — maneuvers are measured against it,
        // so mixing it with the preview route would desync the progress math.
        const decoded = decodePolyline6(data?.shape || '');
        if (decoded.length >= 2) setRoute(decoded);
        setManeuvers(Array.isArray(data?.maneuvers) ? data.maneuvers : []);
        setDurationSeconds(Number(data?.durationSeconds) || 0);
      } catch {
        // Keep the current route: a failed reroute should not blank the HUD.
        // The preview/fallback polyline keeps guiding until the next attempt.
      } finally {
        if (requestId === requestIdRef.current) setIsRerouting(false);
      }
    },
    [destination],
  );

  // Initial maneuver fetch when the session starts (or destination changes).
  useEffect(() => {
    void fetchNavigationRoute(origin);
    // `destinationKey` (not the array identity) decides a "new trip".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchNavigationRoute, destinationKey]);

  const {
    fix,
    activeManeuver,
    distanceToManeuverMeters,
    remainingRouteMeters,
    remainingSeconds,
    isOffRoute,
    offRouteMeters,
    isSupported,
    error,
  } = useNavigation({
    route,
    maneuvers,
    durationSeconds,
    active: true,
    voiceEnabled,
    // useNavigation already debounces with REROUTE_COOLDOWN_MS; this callback
    // just re-requests from the driver's current position.
    onReroute: ({ coordinate }) => {
      void fetchNavigationRoute(coordinate);
    },
  });

  useNavigationCamera({
    map,
    position: fix?.coordinate ?? null,
    route,
    enabled: true,
    heading: fix?.heading ?? null,
    pitch: 55,
    zoom: 17,
    duration: 800,
  });

  const voiceSupported =
    typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined';

  // GPS denied/unavailable → say so instead of freezing on the last frame.
  // (`isSupported` false covers desktop browsers with no geolocation at all.)
  const statusMessage = !isSupported
    ? 'Live location unavailable — showing route only'
    : error
      ? `Locating… (${error})`
      : !fix
        ? 'Locating…'
        : isRerouting && isOffRoute
          ? 'Recalculating route…'
          : undefined;

  return (
    <NavigationOverlay
      maneuver={activeManeuver}
      distanceToManeuverMeters={
        Number.isFinite(distanceToManeuverMeters) ? distanceToManeuverMeters : 0
      }
      remainingRouteMeters={remainingRouteMeters}
      remainingSeconds={remainingSeconds}
      destinationLabel={destinationLabel}
      isOffRoute={isOffRoute}
      offRouteMeters={offRouteMeters}
      muted={!voiceEnabled}
      onToggleMute={() => setVoiceEnabled((v) => !v)}
      onExit={onExit}
      voiceSupported={voiceSupported}
      statusMessage={statusMessage}
    />
  );
}