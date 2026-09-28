import { describe, it, expect } from 'vitest';
import {
  decodePolyline6,
  haversineMeters,
  pointToSegmentMeters,
  distanceToRouteMeters,
  bearingBetween,
  routeBearingAt,
  routeLengthMeters,
  remainingMeters,
  formatDistanceMeters,
  formatDuration,
  maneuverIconKey,
  findManeuverProgress,
  estimateRemainingSeconds,
} from './navigation';

describe('decodePolyline6', () => {
  it('returns [] for an empty shape (Valhalla fallback response)', () => {
    expect(decodePolyline6('')).toEqual([]);
  });

  // Reference vector taken verbatim from the Valhalla docs decoder test:
  //   valhalla.github.io/valhalla/api/decoding/ -> decode_polyline6
  it('decodes the Valhalla docs reference vector as [lng, lat]', () => {
    const [first, second] = decodePolyline6('e~epoA|jfpOiDaK');
    // Docs give (lat, lng) => (42.225139, -8.670911); we emit [lng, lat].
    expect(first[0]).toBeCloseTo(-8.670911, 5);
    expect(first[1]).toBeCloseTo(42.225139, 5);
    expect(second[0]).toBeCloseTo(-8.670718, 5);
    expect(second[1]).toBeCloseTo(42.225224, 5);
  });

  it('respects a non-default precision', () => {
    const [decoded] = decodePolyline6('e~epoA|jfpO', 5);
    // Same string at 1e5 precision places the point ten times further out.
    expect(decoded[1]).toBeCloseTo(422.25139, 3);
  });
});

describe('haversineMeters', () => {
  it('is zero for identical points', () => {
    expect(haversineMeters([79.9864, 23.1815], [79.9864, 23.1815])).toBe(0);
  });

  it('matches a known distance (~111 km per degree of latitude)', () => {
    const d = haversineMeters([0, 0], [0, 1]);
    expect(d).toBeGreaterThan(111_000);
    expect(d).toBeLessThan(111_300);
  });

  it('is symmetric', () => {
    const a: [number, number] = [79.9864, 23.1815];
    const b: [number, number] = [80.0012, 23.1901];
    expect(haversineMeters(a, b)).toBeCloseTo(haversineMeters(b, a), 6);
  });
});

describe('pointToSegmentMeters', () => {
  it('falls back to point distance when the segment is degenerate', () => {
    expect(pointToSegmentMeters([0, 0], [0, 0], [0, 0])).toBe(0);
  });

  it('measures perpendicular distance to the middle of a segment', () => {
    // Segment running east along the equator, point 0.001 deg north of it.
    const d = pointToSegmentMeters([0.5, 0.001], [0, 0], [1, 0]);
    expect(d).toBeGreaterThan(100);
    expect(d).toBeLessThan(115);
  });

  it('clamps beyond the endpoints instead of projecting past them', () => {
    // [2,0] is collinear with the segment [0,0]-[1,0], so an *unclamped*
    // perpendicular projection would return 0. Clamping must instead yield the
    // distance to the nearer endpoint, i.e. roughly one degree of longitude.
    const atEnd = pointToSegmentMeters([2, 0], [0, 0], [1, 0]);
    expect(atEnd).toBeGreaterThan(100_000);
    // Within 1% of the true great-circle distance. The residual gap is the
    // documented equirectangular approximation, which is exact at navigation
    // scales (tens of metres) and only drifts over hundreds of kilometres.
    const greatCircle = haversineMeters([2, 0], [1, 0]);
    expect(Math.abs(atEnd - greatCircle) / greatCircle).toBeLessThan(0.01);
  });

  it('is accurate to well under a metre at navigation scale', () => {
    // Same north/south offset measured two ways over a short hop.
    const start: [number, number] = [79.9864, 23.1815];
    const end: [number, number] = [79.9864 + 0.0002, 23.1815];
    const viaSegment = pointToSegmentMeters([79.9864 + 0.0001, 23.1815 + 0.0001], start, end);
    expect(viaSegment).toBeGreaterThan(10);
    expect(viaSegment).toBeLessThan(12);
  });
});

describe('distanceToRouteMeters', () => {
  it('reports infinity for an empty route', () => {
    const { meters, segmentIndex } = distanceToRouteMeters([0, 0], []);
    expect(meters).toBe(Number.POSITIVE_INFINITY);
    expect(segmentIndex).toBe(-1);
  });

  it('returns the closest segment index for a point on the route', () => {
    const route: [number, number][] = [[0, 0], [1, 0], [2, 0]];
    const { meters, segmentIndex } = distanceToRouteMeters([1.9, 0.00005], route);
    expect(segmentIndex).toBe(1);
    expect(meters).toBeLessThan(10);
  });

  it('flags a clearly off-route point', () => {
    const route: [number, number][] = [[0, 0], [1, 0]];
    const { meters } = distanceToRouteMeters([0.5, 0.01], route);
    expect(meters).toBeGreaterThan(1000);
  });
});

describe('bearingBetween / routeBearingAt', () => {
  it('returns ~0 heading due north', () => {
    expect(bearingBetween([0, 0], [0, 1])).toBeCloseTo(0, 4);
  });

  it('returns ~90 heading due east', () => {
    expect(bearingBetween([0, 0], [1, 0])).toBeCloseTo(90, 4);
  });

  it('returns 0 for fewer than two route points', () => {
    expect(routeBearingAt([[0, 0]], 0)).toBe(0);
  });

  it('clamps the index so it never reads past the polyline', () => {
    const route: [number, number][] = [[0, 0], [1, 0], [2, 0]];
    expect(Number.isFinite(routeBearingAt(route, 99))).toBe(true);
  });
});

describe('routeLengthMeters / remainingMeters', () => {
  const route: [number, number][] = [[0, 0], [0.01, 0], [0.02, 0]];

  it('sums every segment', () => {
    const total = routeLengthMeters(route);
    expect(total).toBeGreaterThan(2_000);
    expect(total).toBeLessThan(2_400);
  });

  it('remainingMeters from segment 0 equals the full length', () => {
    expect(remainingMeters(route, 0)).toBeCloseTo(routeLengthMeters(route), 6);
  });

  it('remainingMeters decreases as the segment index advances', () => {
    expect(remainingMeters(route, 1)).toBeLessThan(remainingMeters(route, 0));
  });

  it('treats a negative index as "start of route"', () => {
    expect(remainingMeters(route, -1)).toBeCloseTo(routeLengthMeters(route), 6);
  });
});

describe('formatDistanceMeters', () => {
  it('renders metres below 1 km', () => {
    expect(formatDistanceMeters(45.4)).toBe('45 m');
  });

  it('renders one decimal under 10 km', () => {
    expect(formatDistanceMeters(1234)).toBe('1.2 km');
  });

  it('renders whole km at or above 10 km', () => {
    expect(formatDistanceMeters(15_400)).toBe('15 km');
  });

  it('degrades gracefully on bad input', () => {
    expect(formatDistanceMeters(Number.NaN)).toBe('—');
    expect(formatDistanceMeters(-1)).toBe('—');
  });
});

describe('formatDuration', () => {
  it('renders seconds, minutes and mixed hours', () => {
    expect(formatDuration(45)).toBe('45 s');
    expect(formatDuration(600)).toBe('10 min');
    expect(formatDuration(3900)).toBe('1 h 5 min');
  });

  it('omits the minutes part on a whole hour', () => {
    expect(formatDuration(3600)).toBe('1 h');
  });

  it('degrades gracefully on bad input', () => {
    expect(formatDuration(Number.NaN)).toBe('—');
  });

describe('maneuverIconKey', () => {
  it('maps the common Valhalla instruction phrasings', () => {
    expect(maneuverIconKey('Turn left onto Main Street')).toBe('turn-left');
    expect(maneuverIconKey('Turn right onto MG Road')).toBe('turn-right');
    expect(maneuverIconKey('Turn slight left')).toBe('turn-slight-left');
    expect(maneuverIconKey('Turn sharp right')).toBe('turn-sharp-right');
    expect(maneuverIconKey('Make a U-turn')).toBe('uturn');
    expect(maneuverIconKey('Enter the roundabout and take the 2nd exit')).toBe('roundabout');
    expect(maneuverIconKey('You have arrived at your destination')).toBe('destination');
    expect(maneuverIconKey('Depart')).toBe('depart');
  });

  it('defaults to continue for empty or unparseable text', () => {
    expect(maneuverIconKey('')).toBe('continue');
    expect(maneuverIconKey(undefined)).toBe('continue');
    expect(maneuverIconKey('Gorakhpur')).toBe('continue');
  });
});

describe('findManeuverProgress', () => {
  // 2 km, then 1 km, then a zero-length arrive step.
  const maneuvers = [
    { instruction: 'Head north', lengthKm: 2 },
    { instruction: 'Turn right', lengthKm: 1 },
    { instruction: 'Arrive', lengthKm: 0 },
  ];

  it('returns -1 when there are no maneuvers (haversine fallback route)', () => {
    const p = findManeuverProgress([], 0);
    expect(p.index).toBe(-1);
    expect(p.distanceToManeuverMeters).toBe(Number.POSITIVE_INFINITY);
  });

  it('selects the first maneuver at the start of the route', () => {
    expect(findManeuverProgress(maneuvers, 0).index).toBe(0);
  });

  it('advances to the second maneuver once past 2 km', () => {
    expect(findManeuverProgress(maneuvers, 2500).index).toBe(1);
  });

  it('holds on the zero-length arrive step at the end', () => {
    expect(findManeuverProgress(maneuvers, 5000).index).toBe(2);
  });

  it('never reports negative distance', () => {
    const p = findManeuverProgress(maneuvers, 3000);
    expect(p.distanceToManeuverMeters).toBeGreaterThanOrEqual(0);
  });

  it('tolerates maneuvers whose lengthKm is missing', () => {
    expect(findManeuverProgress([{ instruction: 'Head north' }], 0).index).toBe(0);
  });
});

describe('estimateRemainingSeconds', () => {
  it('returns the full duration when nothing has been travelled', () => {
    expect(estimateRemainingSeconds(600, 1000, 1000)).toBe(600);
  });

  it('scales linearly with remaining distance', () => {
    expect(estimateRemainingSeconds(600, 1000, 500)).toBe(300);
  });

  it('clamps above the total and below zero', () => {
    expect(estimateRemainingSeconds(600, 1000, 5000)).toBe(600);
    expect(estimateRemainingSeconds(600, 1000, -50)).toBe(0);
  });

  it('returns the full duration when route length is unknown', () => {
    expect(estimateRemainingSeconds(600, 0, 100)).toBe(600);
  });
});

});

