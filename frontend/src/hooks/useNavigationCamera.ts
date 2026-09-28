import { useEffect, useRef } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { routeBearingAt, type RouteCoordinate } from '@/lib/navigation';

export interface UseNavigationCameraOptions {
  /** The live MapLibre instance, or null until the map has loaded. */
  map: MapLibreMap | null;
  /** Current user position as `[lng, lat]`, or null while awaiting a GPS fix. */
  position: RouteCoordinate | null;
  /** Full route polyline; used to derive the bearing to face. */
  route: RouteCoordinate[];
  /** Turn following off (e.g. user panned the map manually) while staying active. */
  enabled?: boolean;
  /** Camera pitch while navigating. 45deg reads as a 3D "driving" view. */
  pitch?: number;
  /** Zoom to settle on while navigating. */
  zoom?: number;
  /**
   * Watch heading in degrees. When present (device compass / GPS course) it is
   * preferred over the route-derived bearing, which lags on winding roads.
   */
  heading?: number | null;
  /** Animation length per camera update, in milliseconds. */
  duration?: number;
}

/**
 * Keeps the MapLibre camera locked to the driver.
 *
 * Follows the user's position, and faces the direction the *route* travels at
 * that point (not the raw GPS course, which jitters when stationary). Pass
 * `heading` when a real compass reading is available — it wins over the
 * route-derived bearing.
 *
 * The camera uses `easeTo` rather than `jumpTo` so consecutive GPS fixes glide
 * instead of snapping, which is what makes the map feel like a car dashboard.
 */
export function useNavigationCamera({
  map,
  position,
  route,
  enabled = true,
  pitch = 45,
  zoom = 17,
  heading = null,
  duration = 900,
}: UseNavigationCameraOptions) {
  // Retained so the bearing can be recomputed without re-running the effect on
  // every route identity change.
  const routeRef = useRef(route);
  routeRef.current = route;

  // Pulled into primitives so the dependency array stays statically analysable
  // (and so a fresh `[lng, lat]` array with equal values does not re-run).
  const lng = position?.[0] ?? null;
  const lat = position?.[1] ?? null;

  useEffect(() => {
    if (!map || lng == null || lat == null || !enabled) return;

    const center: RouteCoordinate = [lng, lat];
    const bearing = heading != null && Number.isFinite(heading)
      ? heading
      : routeBearingAt(routeRef.current, nearestSegmentIndex(routeRef.current, center));

    map.easeTo({
      center,
      bearing,
      pitch,
      zoom,
      duration,
      // Without this, an easeTo started by a new fix fights the previous one.
      essential: true,
    });
  }, [map, lng, lat, enabled, heading, pitch, zoom, duration]);
}

/**
 * Index of the polyline segment closest to `point`, used to look up the
 * route's local bearing.
 *
 * Kept local rather than importing `distanceToRouteMeters` so the hook can
 * short-circuit to the first segment for a short/absent route without pulling
 * the full segment-distance machinery into every render.
 */
function nearestSegmentIndex(route: RouteCoordinate[], point: RouteCoordinate): number {
  if (route.length < 2) return 0;

  let best = Number.POSITIVE_INFINITY;
  let bestIndex = 0;

  for (let i = 0; i < route.length; i += 1) {
    const dx = route[i][0] - point[0];
    const dy = route[i][1] - point[1];
    const d = dx * dx + dy * dy;
    if (d < best) {
      best = d;
      bestIndex = i;
    }
  }

  return bestIndex;
}

export default useNavigationCamera;
