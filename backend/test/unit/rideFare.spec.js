/**
 * Fare / distance / ETA math for the ride + ambulance engines.
 *
 * Money and distance maths are where an off-by-one silently becomes a billing
 * dispute, so every branch (including the fallbacks for missing coordinates and
 * unknown vehicle types) is pinned here.
 */
import {
  VEHICLE_RATES,
  calculateDistanceKm,
  calculateFare,
  estimateDurationMin,
  estimateETA,
  getEstimatesForRoute,
} from '../../src/services/rideService.js';

describe('VEHICLE_RATES catalogue', () => {
  it('exposes every vehicle type the booking API accepts', () => {
    expect(Object.keys(VEHICLE_RATES).sort()).toEqual(
      ['ambulance', 'auto', 'bike', 'car', 'e_rickshaw', 'van'].sort(),
    );
  });

  it('has a positive base fare and per-km rate for each type', () => {
    for (const [code, rate] of Object.entries(VEHICLE_RATES)) {
      expect(rate.code).toBe(code);
      expect(rate.baseFare).toBeGreaterThan(0);
      expect(rate.perKm).toBeGreaterThan(0);
      expect(rate.capacity).toBeGreaterThan(0);
    }
  });
});

describe('calculateDistanceKm', () => {
  it('returns the haversine distance with a 1.32 road factor', () => {
    // ~1.11 km great-circle for 0.01 deg latitude; x1.32 ≈ 1.5 km
    const km = calculateDistanceKm(23.1815, 79.9864, 23.1915, 79.9864);
    expect(km).toBeGreaterThan(1.4);
    expect(km).toBeLessThan(1.6);
  });

  it('is symmetric and zero-safe for identical points', () => {
    const a = calculateDistanceKm(23.1, 79.9, 23.2, 80.0);
    const b = calculateDistanceKm(23.2, 80.0, 23.1, 79.9);
    expect(a).toBe(b);
    expect(calculateDistanceKm(23.1, 79.9, 23.1, 79.9)).toBe(0.5); // clamped floor
  });

  it('falls back to 5 km when a coordinate is missing (never NaN)', () => {
    expect(calculateDistanceKm(null, 79.9, 23.2, 80)).toBe(5);
    expect(calculateDistanceKm(23.1, undefined, 23.2, 80)).toBe(5);
  });
});

describe('calculateFare', () => {
  it('sums base + per-km charge + toll + parking', () => {
    expect(calculateFare('bike', 10)).toEqual({ base: 20, distanceCharge: 80, toll: 10, parking: 5, surge: 0, total: 115 });
    expect(calculateFare('car', 5)).toEqual({ base: 60, distanceCharge: 80, toll: 20, parking: 15, surge: 0, total: 175 });
  });

  it('applies the emergency surge only to ambulances', () => {
    expect(calculateFare('ambulance', 10, true)).toEqual({
      base: 150, distanceCharge: 300, toll: 50, parking: 40, surge: 100, total: 640,
    });
    expect(calculateFare('ambulance', 10, false).surge).toBe(0);
    expect(calculateFare('car', 10, true).surge).toBe(0);
    expect(calculateFare('bike', 10, true).surge).toBe(0);
  });

  it('falls back to car pricing for an unknown vehicle type', () => {
    expect(calculateFare('spaceship', 10).base).toBe(VEHICLE_RATES.car.baseFare);
  });

  it('never returns a negative or non-integer total', () => {
    const fare = calculateFare('van', 0.3, true);
    expect(Number.isInteger(fare.total)).toBe(true);
    expect(fare.total).toBeGreaterThan(0);
  });
});

describe('estimateDurationMin / estimateETA', () => {
  it('adds the 3 minute buffer and floors at 4 minutes', () => {
    expect(estimateDurationMin(0, 'car')).toBe(4);
    // 30 km at 30 km/h = 60 min + 3 buffer
    expect(estimateDurationMin(30, 'car')).toBe(63);
    // 35 km at 35 km/h = 60 min + 3 buffer
    expect(estimateDurationMin(35, 'bike')).toBe(63);
  });

  it('supports the legacy (lat, lng, vehicleType) call signature', () => {
    const eta = estimateETA(23.1, 79.9, 'bike');
    expect(eta).toBeGreaterThan(0);
  });

  it('supports the (distanceKm, vehicleType) signature', () => {
    expect(estimateETA(10, 'car')).toBeGreaterThan(0);
  });
});

describe('getEstimatesForRoute', () => {
  const pickup = { lat: 23.1815, lng: 79.9864, address: 'A' };
  const drop = { lat: 23.2815, lng: 79.9864, address: 'B' };

  it('returns a breakdown for every vehicle type', () => {
    const { distanceKm, estimates } = getEstimatesForRoute(pickup, drop, false);
    expect(distanceKm).toBeGreaterThan(0);
    expect(Object.keys(estimates).sort()).toEqual(Object.keys(VEHICLE_RATES).sort());
    for (const est of Object.values(estimates)) {
      expect(est.fare.total).toBeGreaterThan(0);
      expect(est.durationMin).toBeGreaterThanOrEqual(4);
      expect(est.etaMin).toBeGreaterThanOrEqual(2);
    }
  });

  it('costs more in emergency mode when an ambulance is involved', () => {
    const normal = getEstimatesForRoute(pickup, drop, false).estimates.ambulance.fare.total;
    const emergency = getEstimatesForRoute(pickup, drop, true).estimates.ambulance.fare.total;
    expect(emergency).toBeGreaterThan(normal);
  });
});
