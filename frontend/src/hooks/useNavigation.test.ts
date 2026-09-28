import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNavigation, type UseNavigationOptions } from './useNavigation';
import { OFF_ROUTE_THRESHOLD_METERS, type RouteCoordinate } from '@/lib/navigation';

/** ~1 km straight line heading east. */
const ROUTE: RouteCoordinate[] = [
  [79.9864, 23.1815],
  [79.9974, 23.1815],
];

const MANEUVERS = [
  { instruction: 'Head east on MG Road', lengthKm: 1 },
  { instruction: 'You have arrived at your destination', lengthKm: 0 },
];

type PositionCallback = (pos: GeolocationPosition) => void;

/**
 * Installs a fake `navigator.geolocation` whose `watchPosition` captures the
 * success callback so tests can push fixes on demand.
 */
function installFakeGeolocation() {
  let onPosition: PositionCallback | null = null;
  const clearWatch = vi.fn();
  const geolocation = {
    watchPosition: vi.fn((success: PositionCallback) => {
      onPosition = success;
      return 42;
    }),
    clearWatch,
    getCurrentPosition: vi.fn(),
  };
  Object.defineProperty(navigator, 'geolocation', {
    value: geolocation,
    configurable: true,
    writable: true,
  });
  return {
    geolocation,
    clearWatch,
    push(lng: number, lat: number, accuracy = 5, heading: number | null = null) {
      act(() => {
        onPosition?.({
          coords: { longitude: lng, latitude: lat, accuracy, heading },
          timestamp: Date.now(),
        } as GeolocationPosition);
      });
    },
  };
}

function setup(options: Partial<UseNavigationOptions> = {}) {
  const onReroute = vi.fn();
  const args: UseNavigationOptions = {
    route: ROUTE,
    maneuvers: MANEUVERS,
    durationSeconds: 120,
    ...options,
    onReroute: options.onReroute ?? onReroute,
  };
  const utils = renderHook(() => useNavigation(args));
  return { ...utils, onReroute: args.onReroute as ReturnType<typeof vi.fn> };
}

describe('useNavigation (geolocation loop)', () => {
  beforeEach(() => {
    // Monotonic clock so the hook's 1s fix-throttle never swallows a push.
    let t = 1_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => (t += 2_000));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('subscribes on mount and clears the watch on unmount', () => {
    const fake = installFakeGeolocation();
    const { unmount } = setup();
    expect(fake.geolocation.watchPosition).toHaveBeenCalledTimes(1);
    unmount();
    expect(fake.clearWatch).toHaveBeenCalledWith(42);
  });

  it('does not start watching when inactive', () => {
    const fake = installFakeGeolocation();
    setup({ active: false });
    expect(fake.geolocation.watchPosition).not.toHaveBeenCalled();
  });

  it('normalises a GPS fix and advances maneuver progress', () => {
    const fake = installFakeGeolocation();
    const { result } = setup();

    expect(result.current.fix).toBeNull();

    // Start of the route → first maneuver, remaining ≈ full route.
    fake.push(79.9864, 23.1815);
    expect(result.current.fix?.coordinate).toEqual([79.9864, 23.1815]);
    expect(result.current.activeManeuver?.instruction).toContain('Head east');
    expect(result.current.remainingRouteMeters).toBeGreaterThan(900);

    // Far along the route → last (arrival) maneuver.
    fake.push(79.9972, 23.1815);
    expect(result.current.activeManeuver?.instruction).toContain('arrived');
    expect(result.current.remainingRouteMeters).toBeLessThan(50);
    expect(result.current.isOffRoute).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('passes heading through from the device', () => {
    const fake = installFakeGeolocation();
    const { result } = setup();
    fake.push(79.9864, 23.1815, 5, 90);
    expect(result.current.fix?.heading).toBe(90);
  });

  it('requests a reroute when the fix leaves the corridor with good accuracy', () => {
    const fake = installFakeGeolocation();
    const { result, onReroute } = setup();

    // On-route first, so the off-route transition is observable.
    fake.push(79.9864, 23.1815);
    expect(result.current.isOffRoute).toBe(false);

    // ~5 km north of the route with a trustworthy 5 m fix.
    fake.push(79.9864, 23.2315);
    expect(result.current.isOffRoute).toBe(true);
    expect(result.current.offRouteMeters).toBeGreaterThan(OFF_ROUTE_THRESHOLD_METERS);
    expect(onReroute).toHaveBeenCalledTimes(1);
    expect(onReroute.mock.calls[0][0].coordinate).toEqual([79.9864, 23.2315]);
  });

  it('suppresses reroute when GPS accuracy is worse than the threshold', () => {
    const fake = installFakeGeolocation();
    const { result, onReroute } = setup();

    // Same bad position, but a 200 m-accuracy fix: a single noisy reading
    // must not put the driver in a permanent reroute loop.
    fake.push(79.9864, 23.2315, 200);
    expect(result.current.isOffRoute).toBe(false);
    expect(onReroute).not.toHaveBeenCalled();
  });

  it('respects the reroute cooldown across repeated off-route fixes', () => {
    const fake = installFakeGeolocation();
    const { onReroute } = setup();

    // All pushes occur inside one cooldown window (mocked clock jumps 2 s).
    fake.push(79.9864, 23.2315);
    fake.push(79.9865, 23.2316);
    fake.push(79.9866, 23.2317);
    expect(onReroute).toHaveBeenCalledTimes(1);
  });

  it('reports unsupported geolocation instead of throwing', () => {
    Object.defineProperty(navigator, 'geolocation', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    // The property key still exists here — only its value is undefined —
    // which is exactly the webview case `!!navigator.geolocation` guards.
    const { result } = setup();
    expect(result.current.isSupported).toBe(false);
    expect(result.current.fix).toBeNull();
  });
});