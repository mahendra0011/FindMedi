/**
 * Turn-by-turn navigation helpers.
 *
 * Valhalla returns `trip.legs[0].shape` as a precision-6 encoded polyline
 * (see https://valhalla.github.io/valhalla/api/decoding/ — "Valhalla APIs use
 * six digits of decimal precision"), so the decoder here uses factor 1e6.
 *
 * Convention: every coordinate this module returns is `[lng, lat]` — GeoJSON
 * order — because that is what MapLibre consumes for line geometry and
 * `setCenter`. Valhalla's own samples emit `[lat, lng]`; we swap once here so
 * no consumer has to remember which order applies.
 */

/** `[lng, lat]`, GeoJSON order. */
export type RouteCoordinate = [number, number];

/** Distance from the route beyond which we consider the user off-route. */
export const OFF_ROUTE_THRESHOLD_METERS = 50;
/** Minimum gap between reroute requests, so a shaky GPS fix can't spam Valhalla. */
export const REROUTE_COOLDOWN_MS = 15_000;
/** Announce an upcoming maneuver once inside this distance. */
export const ANNOUNCE_DISTANCE_METERS = 300;
/** Re-announce threshold for the "now" prompt (e.g. "Turn right"). */
export const IMMINENT_DISTANCE_METERS = 60;

const EARTH_RADIUS_METERS = 6_371_008.8;

/**
 * Decode a precision-6 encoded polyline (Valhalla / OSRM shape) into
 * `[lng, lat]` pairs.
 *
 * Algorithm is the standard varint + zigzag scheme; the only Valhalla-specific
 * detail is the precision of 6 rather than Google's default of 5.
 */
export function decodePolyline6(encoded: string, precision = 6): RouteCoordinate[] {
  if (!encoded) return [];
  const factor = Math.pow(10, precision);
  const coordinates: RouteCoordinate[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    // Latitude delta
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    // Longitude delta
    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coordinates.push([lng / factor, lat / factor]);
  }

  return coordinates;
}

const toRadians = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in metres between two `[lng, lat]` pairs. */
export function haversineMeters(a: RouteCoordinate, b: RouteCoordinate): number {
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Perpendicular distance in metres from `p` to the segment `a`–`b`.
 *
 * Uses an equirectangular projection locally around `p`, which is accurate to
 * well under a metre at the scales navigation cares about (tens of metres) and
 * avoids repeated trigonometric work per segment.
 */
export function pointToSegmentMeters(
  p: RouteCoordinate,
  a: RouteCoordinate,
  b: RouteCoordinate,
): number {
  const metersPerDegLat = 111_132.92;
  const metersPerDegLng = 111_412.84 * Math.cos(toRadians(p[1]));

  const toXY = (c: RouteCoordinate) => ({
    x: (c[0] - p[0]) * metersPerDegLng,
    y: (c[1] - p[1]) * metersPerDegLat,
  });

  const pa = toXY(a);
  const pb = toXY(b);
  const dx = pb.x - pa.x;
  const dy = pb.y - pa.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) return Math.hypot(pa.x, pa.y);

  // Clamp the projection to the segment so we never measure past an endpoint.
  let t = -(pa.x * dx + pa.y * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(pa.x + t * dx, pa.y + t * dy);
}

/**
 * Nearest distance from `point` to a route polyline, plus the index of the
 * segment that was closest. `segmentIndex` lets callers slice the route for
 * "remaining distance" without recomputing the search.
 */
export function distanceToRouteMeters(
  point: RouteCoordinate,
  route: RouteCoordinate[],
): { meters: number; segmentIndex: number } {
  if (route.length === 0) return { meters: Number.POSITIVE_INFINITY, segmentIndex: -1 };
  if (route.length === 1) return { meters: haversineMeters(point, route[0]), segmentIndex: 0 };

  let best = Number.POSITIVE_INFINITY;
  let bestIndex = 0;

  for (let i = 0; i < route.length - 1; i += 1) {
    const d = pointToSegmentMeters(point, route[i], route[i + 1]);
    if (d < best) {
      best = d;
      bestIndex = i;
    }
  }

  return { meters: best, segmentIndex: bestIndex };
}

/** Initial bearing in degrees (0–360, 0 = north) from `a` to `b`. */
export function bearingBetween(a: RouteCoordinate, b: RouteCoordinate): number {
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const deltaLng = toRadians(lng2 - lng1);

  const y = Math.sin(deltaLng) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLng);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

/**
 * Heading the route travels *at* `index`, averaged over a short span so a
 * single noisy vertex doesn't spin the camera. Falls back to the last
 * available segment near the end of the polyline.
 */
export function routeBearingAt(route: RouteCoordinate[], index: number, span = 4): number {
  if (route.length < 2) return 0;
  const from = Math.max(0, Math.min(index, route.length - 2));
  const to = Math.min(route.length - 1, from + Math.max(1, span));
  return bearingBetween(route[from], route[to]);
}

/** Total length of a polyline in metres. */
export function routeLengthMeters(route: RouteCoordinate[]): number {
  let total = 0;
  for (let i = 0; i < route.length - 1; i += 1) total += haversineMeters(route[i], route[i + 1]);
  return total;
}

/**
 * Length of the portion of `route` from `segmentIndex` onward — i.e. distance
 * still to travel if the user is on segment `segmentIndex`.
 */
export function remainingMeters(route: RouteCoordinate[], segmentIndex: number): number {
  if (segmentIndex < 0 || route.length < 2) return routeLengthMeters(route);
  let total = 0;
  for (let i = Math.max(0, segmentIndex); i < route.length - 1; i += 1) {
    total += haversineMeters(route[i], route[i + 1]);
  }
  return total;
}

/** Human-readable distance: "45 m" / "1.2 km". */
export function formatDistanceMeters(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return '—';
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}

/** Human-readable duration: "45 s" / "12 min" / "1 h 5 min". */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '—';
  const s = Math.round(seconds);
  if (s < 60) return `${s} s`;
  const mins = Math.round(s / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

export type ManeuverIconKey =
  | 'depart'
  | 'destination'
  | 'turn-left'
  | 'turn-right'
  | 'turn-slight-left'
  | 'turn-slight-right'
  | 'turn-sharp-left'
  | 'turn-sharp-right'
  | 'uturn'
  | 'roundabout'
  | 'merge'
  | 'fork'
  | 'ramp'
  | 'continue';

/**
 * Map Valhalla's free-text instruction onto a stable icon key so the UI can
 * pick a lucide icon without parsing prose at render time.
 */
export function maneuverIconKey(instruction?: string): ManeuverIconKey {
  const text = (instruction || '').toLowerCase();
  if (!text) return 'continue';
  if (/roundabout|rotary/.test(text)) return 'roundabout';
  if (/u[- ]?turn/.test(text)) return 'uturn';
  if (/arrive|destination|you have arrived/.test(text)) return 'destination';
  if (/depart|start/.test(text)) return 'depart';
  if (/merge/.test(text)) return 'merge';
  if (/fork|keep (left|right)/.test(text)) return 'fork';
  if (/ramp|exit/.test(text)) return 'ramp';

  const sharp = /sharp/.test(text);
  const slight = /slight/.test(text);
  if (/left/.test(text)) {
    return sharp ? 'turn-sharp-left' : slight ? 'turn-slight-left' : 'turn-left';
  }
  if (/right/.test(text)) {
    return sharp ? 'turn-sharp-right' : slight ? 'turn-slight-right' : 'turn-right';
  }
  return 'continue';
}

/** A single Valhalla maneuver, as returned by the backend router. */
export interface Maneuver {
  instruction?: string;
  /** Length of the maneuver itself, in kilometres. */
  lengthKm?: number;
  timeSeconds?: number;
  streetNames?: string[];
}

/**
 * Index of the maneuver the user is currently heading toward, given how far
 * they have travelled (in metres) along the route.
 *
 * Valhalla's `maneuvers[].lengthKm` is the length of the maneuver *itself* (the
 * stretch driven while following it), so the cumulative sum of those lengths
 * locates each maneuver along the route. A maneuver with no length (typically
 * the final "arrive" step) is treated as zero-length and stays selected at the
 * end of the route rather than being skipped.
 */
export function findManeuverProgress(
  maneuvers: Maneuver[],
  travelledMeters: number,
): { index: number; distanceToManeuverMeters: number } {
  if (!maneuvers || maneuvers.length === 0) {
    return { index: -1, distanceToManeuverMeters: Number.POSITIVE_INFINITY };
  }

  let cumulative = 0;
  for (let i = 0; i < maneuvers.length; i += 1) {
    const lengthMeters = Math.max(0, Number(maneuvers[i]?.lengthKm) || 0) * 1000;
    if (travelledMeters <= cumulative + lengthMeters) {
      return { index: i, distanceToManeuverMeters: Math.max(0, cumulative - travelledMeters) };
    }
    cumulative += lengthMeters;
  }

  return { index: maneuvers.length - 1, distanceToManeuverMeters: 0 };
}

/**
 * Remaining route duration, assuming constant speed over the whole route.
 * Used only as a client-side estimate between backend refreshes.
 */
export function estimateRemainingSeconds(
  totalSeconds: number,
  totalMeters: number,
  remainingMetersAhead: number,
): number {
  if (!totalMeters || totalMeters <= 0) return Math.max(0, totalSeconds);
  const fraction = Math.max(0, Math.min(1, remainingMetersAhead / totalMeters));
  return Math.max(0, totalSeconds * fraction);
}

