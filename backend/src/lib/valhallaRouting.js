import { VALHALLA_API_URL, VALHALLA_TIMEOUT_MS, COSTING_PROFILES } from '../config/valhalla.js';
import { calculateDistanceKm } from './geoUtils.js';
import { redisClient, isRedisReady } from '../config/redis.js';
import logger from '../config/logger.js';

/**
 * Calculates 1-to-N Road Matrix using Valhalla's /sources_to_targets endpoint.
 * Returns estimated duration (seconds) and distance (km) for each target.
 */
export async function getValhallaMatrix(sourceCoords, targetCoordsList, costing = 'auto') {
  if (!targetCoordsList || targetCoordsList.length === 0) {
    return [];
  }

  const payload = {
    sources: [{ lat: sourceCoords[1], lon: sourceCoords[0] }], // [lng, lat] to {lat, lon}
    targets: targetCoordsList.map((c) => ({ lat: c[1], lon: c[0] })),
    costing: costing,
    costing_options: {
      auto: {
        maneuver_penalty: 5,
      },
    },
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), VALHALLA_TIMEOUT_MS);

    const res = await fetch(`${VALHALLA_API_URL}/sources_to_targets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Valhalla matrix responded with HTTP ${res.status}`);
    }

    const data = await res.json();
    const matrix = data?.sources_to_targets?.[0] || [];
    return matrix.map((item, idx) => ({
      index: idx,
      durationSeconds: item?.time ?? null,
      distanceKm: item?.distance ?? null,
      fromValhalla: true,
    }));
  } catch (err) {
    logger.warn(`Valhalla matrix failed: ${err.message}. Falling back to Haversine speed estimation.`);
    // Fallback: Haversine distance with estimated 30 km/h urban speed
    return targetCoordsList.map((target, idx) => {
      const distanceKm = calculateDistanceKm(sourceCoords[1], sourceCoords[0], target[1], target[0]);
      const estimatedSeconds = Math.round((distanceKm / 30) * 3600); // 30 km/h average
      return {
        index: idx,
        durationSeconds: estimatedSeconds,
        distanceKm: distanceKm,
        fromValhalla: false,
      };
    });
  }
}

/**
 * Calculates detailed Turn-by-Turn Route using Valhalla /route.
 * Checks Redis cache first before requesting Valhalla.
 */
export async function getValhallaRoute(originCoords, destCoords, costing = 'auto') {
  const cacheKey = `cache:valhalla:route:${originCoords.join(',')}:${destCoords.join(',')}:${costing}`;

  if (isRedisReady() && redisClient.isOpen) {
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {
      // ignore redis read failure
    }
  }

  const payload = {
    locations: [
      { lat: originCoords[1], lon: originCoords[0] },
      { lat: destCoords[1], lon: destCoords[0] },
    ],
    costing: costing,
    directions_options: { units: 'kilometers' },
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), VALHALLA_TIMEOUT_MS);

    const res = await fetch(`${VALHALLA_API_URL}/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Valhalla route responded with HTTP ${res.status}`);
    }

    const data = await res.json();
    const trip = data?.trip;
    const leg = trip?.legs?.[0];

    const result = {
      shape: leg?.shape || '', // Precision-6 encoded polyline
      distanceKm: trip?.summary?.length || 0,
      durationSeconds: trip?.summary?.time || 0,
      maneuvers: (leg?.maneuvers || []).map((m) => ({
        instruction: m.instruction,
        lengthKm: m.length,
        timeSeconds: m.time,
        streetNames: m.street_names,
      })),
      source: 'valhalla',
    };

    if (isRedisReady() && redisClient.isOpen) {
      await redisClient.set(cacheKey, JSON.stringify(result), { EX: 3600 * 6 }); // 6 hour TTL
    }

    return result;
  } catch (err) {
    logger.warn(`Valhalla route failed: ${err.message}. Returning straight-line fallback.`);
    const dist = calculateDistanceKm(originCoords[1], originCoords[0], destCoords[1], destCoords[0]);
    return {
      shape: '',
      distanceKm: dist,
      durationSeconds: Math.round((dist / 30) * 3600),
      maneuvers: [],
      source: 'haversine_fallback',
    };
  }
}

/**
 * Sorts hydrated candidate providers by actual road arrival time instead of straight-line distance.
 */
export async function rankCandidatesByRoadETA(pickupCoords, candidates, costing = 'auto') {
  if (!candidates || candidates.length <= 1) return candidates;

  // Resolve [lng, lat] across candidate shapes (profiles, aggregates, test doubles).
  const withCoords = candidates.map((c) => {
    const coords =
      (Array.isArray(c.coordinates) && c.coordinates.length >= 2 && c.coordinates) ||
      (c.lat != null && c.lng != null && [Number(c.lng), Number(c.lat)]) ||
      (Array.isArray(c.currentLocation?.coordinates) && c.currentLocation.coordinates) ||
      (Array.isArray(c.location?.coordinates) && c.location.coordinates) ||
      null;
    const valid =
      coords &&
      Number.isFinite(Number(coords[0])) &&
      Number.isFinite(Number(coords[1]));
    return { candidate: c, coords: valid ? [Number(coords[0]), Number(coords[1])] : null };
  });

  const routableIdx = [];
  const targetCoords = [];
  withCoords.forEach((w, i) => {
    if (w.coords) {
      routableIdx.push(i);
      targetCoords.push(w.coords);
    }
  });
  if (!targetCoords.length) return candidates;

  const matrix = await getValhallaMatrix(pickupCoords, targetCoords, costing);
  const byIdx = new Map(matrix.map((m) => [m.index, m]));

  const ranked = withCoords.map((w, i) => {
    const m = routableIdx.includes(i) ? byIdx.get(routableIdx.indexOf(i)) : null;
    return {
      ...w.candidate,
      roadEtaSeconds: m?.durationSeconds ?? 9999,
      roadDistanceKm: m?.distanceKm ?? w.candidate.distanceKm,
      isRoadCalculated: m?.fromValhalla ?? false,
    };
  });

  return ranked.sort((a, b) => a.roadEtaSeconds - b.roadEtaSeconds);
}

/**
 * Calculates optimized multi-stop route (TSP) for pharmacy/sample collections using Valhalla /optimized_route.
 */
export async function getOptimizedRoute(locations, costing = 'auto') {
  const payload = {
    locations: locations.map((loc) => ({ lat: loc.lat, lon: loc.lon })),
    costing,
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), VALHALLA_TIMEOUT_MS);

    const res = await fetch(`${VALHALLA_API_URL}/optimized_route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Valhalla optimized_route HTTP ${res.status}`);
    }

    const data = await res.json();
    const summary = data?.trip?.summary;
    const polyline = data?.trip?.legs?.[0]?.shape || '';
    return {
      durationSeconds: summary?.time || 1200,
      distanceMeters: (summary?.length || 5) * 1000,
      polyline,
      maneuvers: data?.trip?.legs?.[0]?.maneuvers || [],
    };
  } catch (err) {
    logger.warn(`Valhalla optimized_route fallback: ${err.message}`);
    // Linear fallback approximation
    const estimatedDistanceKm = locations.length * 3.5;
    return {
      durationSeconds: Math.round((estimatedDistanceKm / 25) * 3600),
      distanceMeters: Math.round(estimatedDistanceKm * 1000),
      polyline: '',
      maneuvers: [],
    };
  }
}

/**
 * Generates travel time isochrone polygon rings radiating outward from a hospital or clinic.
 */
export async function getIsochrone(centerLat, centerLon, contoursMinutes = [5, 10, 15], costing = 'auto') {
  const payload = {
    locations: [{ lat: centerLat, lon: centerLon }],
    costing,
    contours: contoursMinutes.map((time) => ({ time, color: 'ff0000' })),
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), VALHALLA_TIMEOUT_MS);

    const res = await fetch(`${VALHALLA_API_URL}/isochrone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`Valhalla isochrone HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    logger.warn(`Valhalla isochrone fallback: ${err.message}`);
    return {
      type: 'FeatureCollection',
      features: [],
      error: err.message,
    };
  }
}
