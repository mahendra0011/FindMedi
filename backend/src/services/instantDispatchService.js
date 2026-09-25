import { getIO } from './socketService.js';
import { findCandidatesByHex } from '../lib/h3Cache.js';
import { calculateDistanceKm } from '../lib/geoUtils.js';
import logger from '../config/logger.js';

const WAVE_WINDOW_SECONDS = Number(process.env.INSTANT_WAVE_WINDOW_SECONDS || 15);

const DEFAULT_COORDS = [79.9864, 23.1815]; // [lng, lat] Jabalpur fallback

/** Resolve [lng, lat] across request shapes (GeoJSON location / pickupLocation / ride pickup {lat,lng}). */
function resolveRequestCoords(request) {
  return (
    request.location?.coordinates ||
    request.pickupLocation?.coordinates ||
    (request.pickup?.lng != null && request.pickup?.lat != null
      ? [request.pickup.lng, request.pickup.lat]
      : DEFAULT_COORDS)
  );
}

/** Per-type terminal statuses — RideBooking has its own enum (accepted / no_riders_found). */
const ASSIGNED_STATUS = {
  ride: 'accepted',
  lawyer: 'confirmed',
  assistant: 'confirmed',
  emergency_doctor: 'assigned',
};
const NO_RESPONDERS_STATUS = {
  ride: 'no_riders_found',
  lawyer: 'no_responders_found',
  assistant: 'no_responders_found',
  emergency_doctor: 'no_responders_found',
};

/**
 * Registry to find provider model and location field dynamically
 */
const PROVIDER_REGISTRY = {
  rider: {
    getModel: async () => (await import('../models/RiderProfile.js')).default,
    locPath: 'currentLocation',
  },
  lawyer: {
    getModel: async () => (await import('../models/LawyerProfile.js')).default,
    locPath: 'currentLocation',
  },
  assistant: {
    getModel: async () => (await import('../models/AssistantProfile.js')).default,
    locPath: 'currentLocation',
  },
  doctor: {
    getModel: async () => (await import('../models/Doctor.js')).default,
    locPath: 'emergencyDoctorLocation',
  },
};

import { rankCandidatesByRoadETA } from '../lib/valhallaRouting.js';
import { acquireLock, releaseLock } from '../lib/redlock.js';

/**
 * Hydrates candidate IDs from Redis into models with coordinates, evaluates Valhalla road ETA, and sorts closest first.
 */
async function hydrateAndFilterCandidates(providerIds, providerType, lat, lng, radiusKm) {
  try {
    const reg = PROVIDER_REGISTRY[providerType];
    if (!reg) return [];
    const Model = await reg.getModel();
    const locField = reg.locPath;

    // Doctor model references user_id or _id, profiles reference userId
    const query = providerType === 'doctor'
      ? { $or: [{ user_id: { $in: providerIds } }, { _id: { $in: providerIds } }] }
      : { userId: { $in: providerIds } };

    const profiles = await Model.find(query).select(`userId user_id ${locField}`).lean();

    const candidateList = profiles
      .map((p) => {
        const loc = p[locField];
        if (!loc?.coordinates || loc.coordinates.length < 2) return null;
        const [cLng, cLat] = loc.coordinates;
        const distanceKm = calculateDistanceKm(lat, lng, cLat, cLng);
        const resolvedUserId = String(p.userId || p.user_id || p._id);
        return {
          providerId: resolvedUserId,
          userId: resolvedUserId,
          coordinates: [cLng, cLat],
          distanceKm: Math.round(distanceKm * 10) / 10,
        };
      })
      .filter(Boolean)
      .filter((c) => c.distanceKm <= radiusKm);

    // Rank candidates by real Valhalla road arrival duration
    const pickupCoords = [lng, lat];
    return await rankCandidatesByRoadETA(pickupCoords, candidateList, 'auto');
  } catch (err) {
    logger.error(`hydrateAndFilterCandidates error for ${providerType}: ${err.message}`);
    return [];
  }
}

/**
 * Generalized wave execution:
 * Broadcasts alert to candidate providers, waits wave window, and assigns atomically with Redlock.
 */
async function runGenericWave({ requestId, type, Model, radiusKm, candidates, io, buildAlertPayload, request }) {
  const windowEndsAt = new Date(Date.now() + WAVE_WINDOW_SECONDS * 1000);
  const notified = candidates.map((c) => ({
    providerId: c.providerId,
    userId: c.userId,
    roadEtaSeconds: c.roadEtaSeconds,
  }));

  await Model.updateOne(
    { _id: requestId, status: 'searching' },
    {
      $set: { notified, windowEndsAt, currentSearchRadiusKm: radiusKm },
      $addToSet: { everNotified: { $each: candidates.map((c) => ({ providerId: c.providerId })) } },
      $push: { dispatchLog: { radiusKm, candidateCount: candidates.length, outcome: 'escalated' } },
    }
  );

  candidates.forEach((c) => {
    io?.to(`user_${c.userId}`).emit(`${type}:alert`, buildAlertPayload(request, c));
    io?.to(`user:${c.userId}`).emit(`${type}:alert`, buildAlertPayload(request, c));
  });

  // Wait for the wave acceptance window
  await new Promise((res) => setTimeout(res, WAVE_WINDOW_SECONDS * 1000));

  const current = await Model.findById(requestId);
  if (!current || current.status !== 'searching') return { done: true };

  if (!current.acceptances || current.acceptances.length === 0) return { done: false };

  // Sort by roadEtaSeconds ASC, fallback to distanceKm ASC
  const sortedAcceptances = [...current.acceptances].sort((a, b) => {
    if (a.roadEtaSeconds && b.roadEtaSeconds) return a.roadEtaSeconds - b.roadEtaSeconds;
    return a.distanceKm - b.distanceKm;
  });

  // Attempt Redlock on winner to eliminate double booking
  let winner = null;
  let lockSecret = null;

  for (const candidate of sortedAcceptances) {
    const lockKey = `lock:provider:${candidate.providerId}`;
    lockSecret = await acquireLock(lockKey, 15000);
    if (lockSecret) {
      winner = candidate;
      break;
    }
    logger.warn(`Provider [${candidate.providerId}] is already locked in another dispatch. Trying next candidate.`);
  }

  if (!winner) {
    logger.warn(`All accepting providers for request [${requestId}] were busy with concurrent locks.`);
    return { done: false };
  }

  const updateFields = {
    status: ASSIGNED_STATUS[type] || 'assigned',
    assignedAt: new Date(),
  };

  if (type === 'emergency_doctor') {
    updateFields.assignedDoctorId = winner.providerId;
  } else if (type === 'lawyer') {
    updateFields.lawyerId = winner.providerId;
  } else if (type === 'assistant') {
    updateFields.assistantId = winner.providerId;
  } else if (type === 'ride') {
    updateFields.riderId = winner.providerId;
    updateFields.acceptedAt = new Date();
  }

  const assignResult = await Model.updateOne(
    { _id: requestId, status: 'searching' },
    {
      $set: updateFields,
      ...(type === 'ride'
        ? { $push: { statusHistory: { status: updateFields.status, at: new Date(), note: 'Instant wave assigned' } } }
        : {}),
    }
  );

  // Release lock after assignment completes
  await releaseLock(`lock:provider:${winner.providerId}`, lockSecret);

  if (!assignResult.modifiedCount) return { done: true };

  const finalPayload = {
    requestId: String(requestId),
    providerId: winner.providerId,
    distanceKm: winner.distanceKm,
    roadEtaSeconds: winner.roadEtaSeconds,
    status: updateFields.status,
  };

  io?.to(`${type}:${requestId}`).emit(`${type}:assigned`, finalPayload);
  io?.to(`request_${requestId}`).emit(`${type}:assigned`, finalPayload);

  if (type === 'ride') {
    // Legacy compat: FindVehicle listens to ride_status_update / ride:search_update.
    io?.to(`ride:${requestId}`).emit('ride_status_update', {
      rideId: String(requestId),
      requestId: String(requestId),
      status: updateFields.status,
      riderId: winner.providerId,
    });
  }

  return { done: true };
}

/**
 * Main Instant Dispatch Engine:
 * Cascades across radii with H3 fast-path lookup and Mongo $geoNear fallback.
 */
export async function startInstantDispatch(requestId, config) {
  const { type, Model, providerType, radiiKm, findEligibleProvidersFallback, buildAlertPayload } = config;
  try {
    const request = await Model.findById(requestId);
    if (!request || request.status !== 'searching') return;

    const [lng, lat] = resolveRequestCoords(request);
    const io = getIO();

    for (const radiusKm of radiiKm) {
      const current = await Model.findById(requestId);
      if (!current || current.status !== 'searching') return;

      io?.to(`${type}:${requestId}`).emit(`${type}:search_update`, { requestId: String(requestId), radiusKm });
      io?.to(`request_${requestId}`).emit(`${type}:search_update`, { requestId: String(requestId), radiusKm });

      const excludedIds = (current.everNotified || []).map((n) => n.providerId);

      // 1) H3 fast-path lookup from Redis
      const { candidates: hexIds } = await findCandidatesByHex({
        lat,
        lng,
        providerType,
        excludeIds: excludedIds,
      });

      let candidates = [];
      if (hexIds.length > 0) {
        candidates = await hydrateAndFilterCandidates(hexIds, providerType, lat, lng, radiusKm);
      }

      // 2) Fallback to MongoDB geo query if H3 cache is cold or empty
      if (candidates.length === 0 && typeof findEligibleProvidersFallback === 'function') {
        const found = await findEligibleProvidersFallback(lng, lat, radiusKm, excludedIds, current);
        candidates = (found || []).map((f) => ({
          providerId: String(f._id || f.userId || f.user_id),
          userId: String(f.userId || f.user_id || f._id),
          distanceKm: f.distanceKm || calculateDistanceKm(lat, lng, f.lat || lat, f.lng || lng),
        }));
      }

      if (candidates.length === 0) continue;

      const { done } = await runGenericWave({
        requestId,
        type,
        Model,
        radiusKm,
        candidates,
        io,
        buildAlertPayload,
        request: current,
      });

      if (done) return;
    }

    // All radii exhausted without acceptance
    const finalCheck = await Model.findById(requestId);
    if (finalCheck && finalCheck.status === 'searching') {
      finalCheck.status = NO_RESPONDERS_STATUS[type] || 'no_responders_found';
      if (Array.isArray(finalCheck.statusHistory)) {
        finalCheck.statusHistory.push({
          status: finalCheck.status,
          at: new Date(),
          note: 'No providers accepted within maximum dispatch radius',
        });
      }
      await finalCheck.save();

      const noRespondersPayload = {
        requestId: String(requestId),
        message: 'No responders available nearby right now. Please try again or schedule in advance.',
      };

      io?.to(`${type}:${requestId}`).emit(`${type}:no_responders_found`, noRespondersPayload);
      io?.to(`request_${requestId}`).emit(`${type}:no_responders_found`, noRespondersPayload);
    }
  } catch (err) {
    logger.error(`startInstantDispatch[${config.type}] error: ${err.message}`);
  }
}

/**
 * Accept is a vote — prevents race conditions atomically
 */
export async function handleInstantAccept(requestId, providerId, user, config) {
  const { Model } = config;
  const request = await Model.findById(requestId).select('status notified windowEndsAt location pickupLocation');
  if (!request) return { success: false, status: 'not_found' };
  if (request.status !== 'searching') {
    return { success: false, status: 'too_late', message: 'This request has already been assigned or closed.' };
  }

  const pIdStr = String(providerId);
  const uIdStr = String(user._id || user.id);
  const n = (request.notified || []).find((x) => x.providerId === pIdStr || x.userId === uIdStr);
  if (!n) {
    return { success: false, status: 'not_eligible', message: 'Provider not notified in current wave.' };
  }

  const coords = resolveRequestCoords(request);
  const userCoords = user.currentLocation?.coordinates || [79.9864, 23.1815];
  const distanceKm = Math.round(calculateDistanceKm(coords[1], coords[0], userCoords[1], userCoords[0]) * 10) / 10;

  const r = await Model.updateOne(
    { _id: requestId, status: 'searching', 'acceptances.providerId': { $ne: pIdStr } },
    {
      $push: {
        acceptances: {
          providerId: pIdStr,
          distanceKm: distanceKm || 1,
          acceptedAt: new Date(),
        },
      },
    }
  );

  if (!r.modifiedCount) return { success: false, status: 'already_voted' };
  return { success: true, status: 'accepted_pending', windowEndsAt: request.windowEndsAt };
}

/**
 * Decline / Reject instant alert
 */
export async function handleInstantReject(requestId, providerId, config) {
  const { Model } = config;
  await Model.updateOne({ _id: requestId }, { $push: { rejections: String(providerId) } });
  return { success: true, status: 'rejected' };
}
