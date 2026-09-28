import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ANNOUNCE_DISTANCE_METERS,
  IMMINENT_DISTANCE_METERS,
  OFF_ROUTE_THRESHOLD_METERS,
  REROUTE_COOLDOWN_MS,
  distanceToRouteMeters,
  estimateRemainingSeconds,
  findManeuverProgress,
  formatDistanceMeters,
  remainingMeters,
  routeLengthMeters,
  type Maneuver,
  type RouteCoordinate,
} from '@/lib/navigation';
import { useVoiceGuidance } from '@/hooks/useVoiceGuidance';

/** One GPS fix, normalised into the shape the navigation loop consumes. */
export interface NavigationFix {
  /** `[lng, lat]`. */
  coordinate: RouteCoordinate;
  /** Device-reported heading in degrees, when the platform supplies one. */
  heading: number | null;
  /** Horizontal accuracy in metres, used to avoid false off-route alarms. */
  accuracy: number | null;
}

export interface UseNavigationOptions {
  /** Route polyline the driver should be following. */
  route: RouteCoordinate[];
  /** Valhalla maneuvers for that route. */
  maneuvers: Maneuver[];
  /** Total route duration in seconds, for the ETA estimate. */
  durationSeconds?: number;
  /** Turn the whole loop on/off (e.g. navigation screen mounted). */
  active?: boolean;
  /** Announcements enabled. */
  voiceEnabled?: boolean;
  /**
   * Called when the driver has been off-route for longer than the cooldown.
   * The parent is expected to fetch a fresh route and swap `route`/`maneuvers`.
   */
  onReroute?: (context: { offRouteMeters: number; coordinate: RouteCoordinate }) => void;
}

export interface UseNavigationResult {
  /** Latest normalised GPS fix, or null before the first one arrives. */
  fix: NavigationFix | null;
  /** Maneuver the driver is currently heading toward. */
  activeManeuver: Maneuver | null;
  /** Distance to that maneuver, in metres. */
  distanceToManeuverMeters: number;
  /** Distance left on the whole route, in metres. */
  remainingRouteMeters: number;
  /** Estimated seconds left. */
  remainingSeconds: number;
  /** True when the fix is further from the route than the threshold allows. */
  isOffRoute: boolean;
  /** How far off the route the driver currently is, in metres. */
  offRouteMeters: number;
  /** Index of the closest polyline segment, for camera bearing. */
  segmentIndex: number;
  /** False when geolocation is unavailable (desktop / denied permission). */
  isSupported: boolean;
  /** Last geolocation error message, if any. */
  error: string | null;
}

/**
 * The navigation loop: GPS in, turn-by-turn state out.
 *
 * Deliberately side-effect-light — it reads position, derives progress, and
 * *asks* the parent to reroute via `onReroute` rather than fetching routes
 * itself. That keeps the network layer in the page (which already owns the
 * routing request) and makes this hook straightforward to reason about.
 *
 * Off-route detection is suppressed while the reported GPS accuracy is worse
 * than the off-route threshold: a 200 m accuracy fix would otherwise trigger a
 * permanent reroute loop from a single bad reading.
 */
export function useNavigation({
  route,
  maneuvers,
  durationSeconds = 0,
  active = true,
  voiceEnabled = true,
  onReroute,
}: UseNavigationOptions): UseNavigationResult {
  const isSupported = typeof navigator !== 'undefined' && 'geolocation' in navigator;

  const [fix, setFix] = useState<NavigationFix | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isOffRouteRef = useRef(false);
  const [isOffRoute, setIsOffRoute] = useState(false);
  const [offRouteMeters, setOffRouteMeters] = useState(0);
  const [segmentIndex, setSegmentIndex] = useState(0);

  const { speak, reset: resetVoice } = useVoiceGuidance({ enabled: voiceEnabled });

  // Latest values read from inside the GPS callback without re-subscribing.
  const routeRef = useRef(route);
  routeRef.current = route;
  const onRerouteRef = useRef(onReroute);
  onRerouteRef.current = onReroute;
  const lastRerouteAt = useRef(0);
  const lastFixAt = useRef(0);

  // A new route means new maneuvers, so previously-spoken prompts must be
  // allowed to fire again (notably the first "Head north" after a reroute).
  useEffect(() => {
    resetVoice();
  }, [route, resetVoice]);

  useEffect(() => {
    if (!active || !isSupported) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        // Throttle: browsers can push fixes faster than the UI needs them.
        const now = Date.now();
        if (now - lastFixAt.current < 1_000) return;
        lastFixAt.current = now;

        setError(null);
        setFix({
          coordinate: [pos.coords.longitude, pos.coords.latitude],
          heading: Number.isFinite(pos.coords.heading) ? (pos.coords.heading as number) : null,
          accuracy: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null,
        });
      },
      (err) => setError(err.message),
      { enableHighAccuracy: true, maximumAge: 2_000, timeout: 15_000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [active, isSupported]);

  const routeMeters = useMemo(() => routeLengthMeters(route), [route]);

  // ── Progress + off-route, recomputed per fix ──
  const { travelledMeters, distanceFromRoute, currentSegment } = useMemo(() => {
    if (!fix || route.length < 2) {
      return { travelledMeters: 0, distanceFromRoute: 0, currentSegment: 0 };
    }
    const { meters, segmentIndex: idx } = distanceToRouteMeters(fix.coordinate, route);
    let travelled = 0;
    for (let i = 0; i < Math.max(0, idx); i += 1) {
      travelled += routeLengthMeters([route[i], route[i + 1]]);
    }
    return {
      travelledMeters: travelled,
      distanceFromRoute: meters,
      currentSegment: Math.max(0, idx),
    };
  }, [fix, route]);

  useEffect(() => {
    if (!fix || route.length < 2) return;

    // Ignore the off-route signal when the fix itself is vaguer than the
    // threshold — the driver may well be on the route, we just can't tell.
    const accuracy = fix.accuracy ?? 0;
    const offRoute =
      distanceFromRoute > OFF_ROUTE_THRESHOLD_METERS && accuracy < OFF_ROUTE_THRESHOLD_METERS;

    setSegmentIndex(currentSegment);
    setIsOffRoute(offRoute);
    setOffRouteMeters(offRoute ? distanceFromRoute : 0);

    if (offRoute && !isOffRouteRef.current) {
      const now = Date.now();
      if (now - lastRerouteAt.current > REROUTE_COOLDOWN_MS) {
        lastRerouteAt.current = now;
        onRerouteRef.current?.({ offRouteMeters: distanceFromRoute, coordinate: fix.coordinate });
      }
    }
    isOffRouteRef.current = offRoute;
  }, [fix, route.length, currentSegment, distanceFromRoute]);

  const progress = useMemo(
    () => findManeuverProgress(maneuvers, travelledMeters),
    [maneuvers, travelledMeters],
  );

  const activeManeuver = progress.index >= 0 ? maneuvers[progress.index] ?? null : null;

  // Distance left on the route, measured from the segment the driver is on.
  const remainingRouteMeters = useMemo(() => {
    if (route.length < 2) return 0;
    return remainingMeters(route, segmentIndex);
  }, [route, segmentIndex]);

  const remainingSeconds = useMemo(
    () => estimateRemainingSeconds(durationSeconds, routeMeters, remainingRouteMeters),
    [durationSeconds, routeMeters, remainingRouteMeters],
  );


  // ── Voice prompts, keyed on the maneuver and the distance bands ──
  // `stage` distinguishes the long-range heads-up from the imminent cue, so a
  // driver gets both "in 300 m, turn right" and then "turn right".
  const announced = useRef<{ maneuverIndex: number; stage: 'far' | 'near' }>({
    maneuverIndex: -1,
    stage: 'far',
  });

  const announce = useCallback(
    (index: number, stage: 'far' | 'near') => {
      const maneuver = maneuvers[index];
      if (!maneuver) return;
      const instruction = maneuver.instruction || 'Continue on route';
      const text = stage === 'far'
        ? `In ${formatDistanceMeters(progress.distanceToManeuverMeters)}, ${instruction.toLowerCase()}`
        : instruction;
      speak(text);
    },
    [maneuvers, progress.distanceToManeuverMeters, speak],
  );

  useEffect(() => {
    if (!active || progress.index < 0) return;
    const state = announced.current;
    const distance = progress.distanceToManeuverMeters;

    if (
      distance <= IMMINENT_DISTANCE_METERS &&
      (state.maneuverIndex !== progress.index || state.stage !== 'near')
    ) {
      announced.current = { maneuverIndex: progress.index, stage: 'near' };
      announce(progress.index, 'near');
      return;
    }

    if (distance <= ANNOUNCE_DISTANCE_METERS && state.maneuverIndex !== progress.index) {
      announced.current = { maneuverIndex: progress.index, stage: 'far' };
      announce(progress.index, 'far');
    }
  }, [active, progress.index, progress.distanceToManeuverMeters, announce]);

  return {
    fix,
    activeManeuver,
    distanceToManeuverMeters: progress.distanceToManeuverMeters,
    remainingRouteMeters,
    remainingSeconds,
    isOffRoute,
    offRouteMeters,
    segmentIndex,
    isSupported,
    error,
  };
}

export default useNavigation;

