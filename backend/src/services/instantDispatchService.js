import { getIO } from './socketService.js';
import { findCandidatesByHex } from '../lib/h3Cache.js';
import { calculateDistanceKm } from '../lib/geoUtils.js';
import logger from '../config/logger.js';

const WAVE_WINDOW_SECONDS = Number(process.env.INSTANT_WAVE_WINDOW_SECONDS || 15);

// Spec 03 §4: per-vertical accept windows (env-tunable, seconds).
const TYPE_WINDOW_SECONDS = {
  ride: Number(process.env.INSTANT_WINDOW_RIDE || 15),
  lawyer: Number(process.env.INSTANT_WINDOW_LAWYER || 60),
  assistant: Number(process.env.INSTANT_WINDOW_ASSISTANT || 45),
  emergency_doctor: Number(process.env.INSTANT_WINDOW_DOCTOR || 25),
};
function waveWindowFor(type) {
  return TYPE_WINDOW_SECONDS[type] || WAVE_WINDOW_SECONDS;
}

const DEFAULT_COORDS = [79.9864, 23.1815]; // [lng, lat] Jabalpur fallback

// RIDE-B-03/04: durable wave-outcome store. `io.emit` is fire-and-forget — a
// provider that reconnects after the assignment broadcast never learns whether
// it won or lost. Every assignment therefore (a) writes a recoverable record
// (dispatchLog `assigned` entry + outbox event, both durable in Mongo) and
// (b) caches the outcome in-process for fast reconnect replay. Losers are
// derived from the persisted acceptances list, so a restarted process replays
// the same outcome from Mongo alone.
export const WAVE_OUTCOME_CACHE = new Map(); // requestId -> { winnerId, loserIds, status, at }
const WAVE_OUTCOME_TTL_MS = Number(process.env.WAVE_OUTCOME_TTL_MS || 30 * 60 * 1000);

export function rememberWaveOutcome(requestId, outcome) {
  WAVE_OUTCOME_CACHE.set(String(requestId), { ...outcome, at: new Date() });
  if (WAVE_OUTCOME_CACHE.size > 2000) {
    const oldest = WAVE_OUTCOME_CACHE.keys().next().value;
    WAVE_OUTCOME_CACHE.delete(oldest);
  }
}

export function getCachedWaveOutcome(requestId) {
  const row = WAVE_OUTCOME_CACHE.get(String(requestId));
  if (!row) return null;
  if (Date.now() - new Date(row.at).getTime() > WAVE_OUTCOME_TTL_MS) {
    WAVE_OUTCOME_CACHE.delete(String(requestId));
    return null;
  }
  return row;
}

// RIDE-B-06/ED-B-01: stale/missing road-ETA fallback. Valhalla can return null
// (timeout, breaker open, unroutable cell); sorting on null would park a real
// acceptor behind `9999` sentinels or crash ETA display. Haversine at 30 km/h
// urban speed is the documented fallback everywhere else in this file.
export function fallbackEtaSeconds(distanceKm) {
  const d = Number(distanceKm);
  if (!Number.isFinite(d) || d < 0) return 9999;
  return Math.max(60, Math.round((d / 30) * 3600));
}

export function etaOrFallback(roadEtaSeconds, distanceKm) {
  const eta = Number(roadEtaSeconds);
  if (Number.isFinite(eta) && eta > 0) return Math.round(eta);
  return fallbackEtaSeconds(distanceKm);
}

// Reconnect recovery: fast path = memory cache, durable path = the request
// row (status already terminal + dispatchLog `assigned` entry). Returns null
// when the wave has not produced an outcome yet.
export async function getWaveOutcome(Model, requestId) {
  const cached = getCachedWaveOutcome(requestId);
  if (cached) return cached;
  const row = await Model.findById(requestId)
    .select('status acceptances dispatchLog riderId lawyerId assistantId assignedDoctorUserId')
    .lean();
  if (!row) return null;
  const assignedEntry = (row.dispatchLog || []).find((d) => d.outcome === 'assigned');
  const terminal = !['searching'].includes(row.status);
  if (!assignedEntry && !terminal) return null;
  const winnerId = String(
    row.riderId || row.lawyerId || row.assistantId || row.assignedDoctorUserId || ''
  ) || null;
  const loserIds = (row.acceptances || [])
    .map((a) => String(a.providerId))
    .filter((id) => winnerId && id !== winnerId);
  const outcome = { winnerId, loserIds, status: row.status, durable: true };
  if (winnerId) rememberWaveOutcome(requestId, outcome);
  return winnerId ? outcome : null;
}

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
const PROVIDER_MODEL = {
  rider: async () => (await import('../models/RiderProfile.js')).default,
  lawyer: async () => (await import('../models/LawyerProfile.js')).default,
  assistant: async () => (await import('../models/AssistantProfile.js')).default,
  emergency_doctor: async () => (await import('../models/Doctor.js')).default,
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
import { writeOutboxEvent } from '../lib/transactionalOutbox.js';

/**
 * Hydrates candidate IDs from Redis into models with coordinates, evaluates Valhalla road ETA, and sorts closest first.
 */
export async function hydrateAndFilterCandidates(providerIds, providerType, lat, lng, radiusKm) {
  try {
    const reg = PROVIDER_REGISTRY[providerType];
    if (!reg) return [];
    const Model = await reg.getModel();
    const locField = reg.locPath;

    // Doctor model references user_id or _id, profiles reference userId
    const cutoff = new Date(Date.now() - 60_000);
    const query = providerType === 'doctor'
      ? { $and: [{ $or: [{ user_id: { $in: providerIds } }, { _id: { $in: providerIds } }] }, { emergencySupport: true, isEmergencyDutyActive: true, activeDispatchRequestId: null, 'emergencyDoctorLocation.lastUpdatedAt': { $gte: cutoff } }] }
      : providerType === 'rider'
        ? { userId: { $in: providerIds }, riderStatus: 'active', isOnline: true, activeDispatchRequestId: null, 'currentLocation.updatedAt': { $gte: cutoff } }
        : providerType === 'lawyer'
          ? { userId: { $in: providerIds }, lawyerStatus: 'active', isAvailable: true, activeDispatchRequestId: null, 'currentLocation.updatedAt': { $gte: cutoff } }
          : { userId: { $in: providerIds }, assistantStatus: 'active', isAvailable: true, activeDispatchRequestId: null, 'currentLocation.updatedAt': { $gte: cutoff } };

    const profiles = await Model.find(query).select(`userId user_id _id ${locField} lastLocationAt`).lean();

    const candidateList = profiles
      .map((p) => {
        const loc = p[locField];
        const pingAt = loc?.lastUpdatedAt || loc?.updatedAt || p.lastLocationAt;
        if (!loc?.coordinates || loc.coordinates.length < 2 || !pingAt || Date.now() - new Date(pingAt).getTime() > 60_000) return null;
        const [cLng, cLat] = loc.coordinates;
        const distanceKm = calculateDistanceKm(lat, lng, cLat, cLng);
        const resolvedUserId = String(p.userId || p.user_id || p._id);
        return {
          // Dispatch/acceptance identity is always the authenticated User ID.
          // Keep the profile primary key separately for references such as
          // EmergencyDoctorRequest.assignedDoctorId.
          providerId: resolvedUserId,
          profileId: String(p._id),
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
export async function runGenericWave({ requestId, type, Model, radiusKm, candidates, io, buildAlertPayload, request }) {
  const waveWindowSeconds = waveWindowFor(type);
  const windowEndsAt = new Date(Date.now() + waveWindowSeconds * 1000);
  const notified = candidates.map((c) => ({
    providerId: c.providerId,
    userId: c.userId,
    profileId: c.profileId || null,
    roadEtaSeconds: c.roadEtaSeconds,
  }));

  // Persist the deadline before emitting offers. A recovery scan resumes a
  // wave after process death instead of leaving its request in `searching`.
  const claim = await Model.findOneAndUpdate(
    { _id: requestId, status: 'searching', $or: [{ windowEndsAt: null }, { windowEndsAt: { $lte: new Date() } }], ...(type === 'ride' ? {} : { retryAt: null }) },
    { $set: { notified, windowEndsAt, currentSearchRadiusKm: radiusKm } },
    { new: true }
  );
  if (!claim) return { done: true };

  await Model.updateOne(
    { _id: requestId, status: 'searching', windowEndsAt },
    {
      $addToSet: { everNotified: { $each: candidates.map((c) => ({ providerId: c.providerId })) } },
      $push: { dispatchLog: { radiusKm, candidateCount: candidates.length, outcome: 'escalated' } },
    }
  );

  // Spec 03 §5: socket delivery confirmation (packet_ack). Providers whose
  // client never acks within the window are logged as uncontactable.
  const ackedProviders = new Set();
  const onAck = (providerId) => () => {
    ackedProviders.add(String(providerId));
  };
  candidates.forEach((c) => {
    const payload = buildAlertPayload(request, c);
    io?.to(`user_${c.userId}`).emit(`${type}:alert`, payload, onAck(c.providerId));
    io?.to(`user:${c.userId}`).emit(`${type}:alert`, payload, onAck(c.providerId));
  });

  // Wait for the wave acceptance window
  const remainingWindowMs = Math.max(0, new Date(claim.windowEndsAt).getTime() - Date.now());
  await new Promise((res) => setTimeout(res, remainingWindowMs));

  const unacked = candidates.filter((c) => !ackedProviders.has(String(c.providerId)));
  if (unacked.length) {
    logger.warn(`Wave ${String(requestId)}: ${unacked.length}/${candidates.length} providers never acked the alert`);
  }

  const current = await Model.findById(requestId);
  if (!current || current.status !== 'searching') return { done: true };

  if (!current.acceptances || current.acceptances.length === 0) return { done: false };

  // Sort by effective ETA ASC (road ETA when present, haversine fallback
  // otherwise) so a missing/stale Valhalla value never parks a real acceptor.
  const sortedAcceptances = [...current.acceptances].sort((a, b) =>
    etaOrFallback(a.roadEtaSeconds, a.distanceKm) - etaOrFallback(b.roadEtaSeconds, b.distanceKm)
  );

  // Attempt Redlock on winner to eliminate double booking
  let winner = null;
  let lockSecret = null;

  for (const candidate of sortedAcceptances) {
    const lockKey = `lock:provider:${candidate.providerId}`;
    lockSecret = await acquireLock(lockKey, 15000);
    if (lockSecret) {
      const claimed = await claimProvider(type, candidate.providerId, requestId);
      if (claimed) {
        winner = candidate;
        break;
      }
      await releaseLock(lockKey, lockSecret);
      lockSecret = null;
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
    updateFields.assignedDoctorId = winner.profileId;
    updateFields.assignedDoctorUserId = winner.userId;
  } else if (type === 'lawyer') {
    updateFields.lawyerId = winner.userId;
  } else if (type === 'assistant') {
    updateFields.assistantId = winner.userId;
  } else if (type === 'ride') {
    updateFields.riderId = winner.userId;
    updateFields.acceptedAt = new Date();
  }

  let assignResult;
  try {
    assignResult = await Model.updateOne(
      { _id: requestId, status: 'searching' },
      {
        $set: updateFields,
        $push: {
          dispatchLog: { radiusKm, candidateCount: candidates.length, outcome: 'assigned', timestamp: new Date() },
          ...(type === 'ride'
            ? { statusHistory: { status: updateFields.status, at: new Date(), note: 'Instant wave assigned' } }
            : {}),
        },
      }
    );
  } catch (error) {
    await releaseProviderClaim(type, winner.userId, requestId).catch((releaseError) => {
      logger.error(`Failed releasing ${type} claim after assignment error: ${releaseError.message}`);
    });
    await releaseLock(`lock:provider:${winner.providerId}`, lockSecret).catch(() => {});
    throw error;
  }

  if (!assignResult.modifiedCount) {
    await releaseProviderClaim(type, winner.userId, requestId);
    await releaseLock(`lock:provider:${winner.providerId}`, lockSecret);
    return { done: true };
  }
  await releaseLock(`lock:provider:${winner.providerId}`, lockSecret);

  const finalPayload = {
    requestId: String(requestId),
    providerId: winner.userId,
    profileId: winner.profileId,
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
      riderId: winner.userId,
    });
  }

  // Tell every provider who accepted this wave but lost winner selection.
  for (const acceptance of current.acceptances || []) {
    if (String(acceptance.providerId) === String(winner.providerId)) continue;
    const loser = notified.find((item) => String(item.providerId) === String(acceptance.providerId));
    if (!loser) continue;
    const loserPayload = { requestId: String(requestId), providerId: String(acceptance.providerId), status: 'lost_bid', message: 'Another provider was assigned this request.' };
    io?.to(`user:${loser.userId}`).emit(`${type}:lost_bid`, loserPayload);
    io?.to(`user_${loser.userId}`).emit(`${type}:lost_bid`, loserPayload);
  }

  // Spec 11: assignment is recorded for the event backbone.
  // RIDE-B-03: the outcome is ALSO cached + persisted (dispatchLog `assigned`)
  // so a reconnecting provider can replay winner/loser without re-emitting.
  const loserIds = (current.acceptances || [])
    .map((a) => String(a.providerId))
    .filter((id) => id !== String(winner.providerId));
  rememberWaveOutcome(requestId, {
    winnerId: String(winner.providerId),
    winnerUserId: String(winner.userId),
    loserIds,
    status: updateFields.status,
    roadEtaSeconds: etaOrFallback(winner.roadEtaSeconds, winner.distanceKm),
    durable: true,
  });
  writeOutboxEvent({
    aggregateType: type,
    aggregateId: String(requestId),
    eventType: `${type}.assigned`,
    payload: {
      providerId: winner.userId,
      profileId: winner.profileId,
      distanceKm: winner.distanceKm,
      roadEtaSeconds: winner.roadEtaSeconds,
      status: updateFields.status,
    },
  }).catch((err) => logger.error(`outbox assignment event failed (${type}/${requestId}): ${err.message}`));

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

    // Spec 11: every dispatch records an outbox event (poller → event backbone).
    void writeOutboxEvent({
      aggregateType: type,
      aggregateId: String(requestId),
      eventType: `${type}.dispatch_started`,
      payload: { status: 'searching', radiiKm },
    }).catch((err) => logger.error(`dispatch-start outbox error (${type}/${requestId}): ${err.message}`));

    const [lng, lat] = resolveRequestCoords(request);
    const io = getIO();
    for (const radiusKm of radiiKm) {
      const current = await Model.findById(requestId);
      if (!current || current.status !== 'searching') return;
      if (current.windowEndsAt && new Date(current.windowEndsAt) > new Date()) {
        await new Promise((resolve) => setTimeout(resolve, new Date(current.windowEndsAt).getTime() - Date.now()));
        const afterWindow = await Model.findById(requestId);
        if (!afterWindow || afterWindow.status !== 'searching') return;
        if (afterWindow.acceptances?.length) continue;
      }

      const activeRadiusKm = current.retryCount > 0 && current.retryWaveIndex < current.retryRadii?.length
        ? current.retryRadii[current.retryWaveIndex]
        : radiusKm;
      const nextRetryWaveIndex = type === 'ride' && current.retryCount > 0 ? current.retryWaveIndex + 1 : current.retryWaveIndex;
      if (current.retryCount > 0) {
        const cursorUpdate = await Model.updateOne(
          { _id: requestId, status: 'searching', retryCount: current.retryCount, retryWaveIndex: current.retryWaveIndex || 0 },
          { $set: { retryWaveIndex: nextRetryWaveIndex } },
        );
        if (!cursorUpdate.modifiedCount) return;
      }
      io?.to(`${type}:${requestId}`).emit(`${type}:search_update`, { requestId: String(requestId), radiusKm: activeRadiusKm });
      io?.to(`request_${requestId}`).emit(`${type}:search_update`, { requestId: String(requestId), radiusKm: activeRadiusKm });

      const excludedIds = (current.everNotified || []).map((n) => n.providerId);

      // On the one legacy sequential ride retry, use the recorded expanded
      // radii once instead of reusing the normal configured rings.
      const effectiveRadiusKm = activeRadiusKm;

      // 1) H3 fast-path lookup from Redis
      const { candidates: hexIds } = await findCandidatesByHex({
        lat,
        lng,
        providerType,
        excludeIds: excludedIds,
      });

      let candidates = [];
      if (hexIds.length > 0) {
        candidates = await hydrateAndFilterCandidates(hexIds, providerType, lat, lng, effectiveRadiusKm);
      }

      // 2) Fallback to MongoDB geo query if H3 cache is cold or empty
      if (candidates.length === 0 && typeof findEligibleProvidersFallback === 'function') {
        const found = await findEligibleProvidersFallback(lng, lat, effectiveRadiusKm, excludedIds, current);
        const fallbackIds = (found || []).map((f) => f._id || f.userId || f.user_id).filter(Boolean).map(String);
        candidates = fallbackIds.length ? await hydrateAndFilterCandidates(fallbackIds, providerType, lat, lng, effectiveRadiusKm) : [];
      }

      if (candidates.length === 0) continue;

      const normalizedCandidates = candidates.map((candidate) => ({
        ...candidate,
        providerId: String(candidate.providerId),
        userId: String(candidate.userId || candidate.providerId),
      }));

      const { done } = await runGenericWave({
        requestId,
        type,
        Model,
        radiusKm,
        candidates: normalizedCandidates,
        io,
        buildAlertPayload,
        request: current,
      });

      if (done) return;
    }

    // All radii exhausted without acceptance
    const finalCheck = await Model.findById(requestId);
    if (finalCheck && finalCheck.status === 'searching') {
      // Spec 03 §5: one automatic retry with expanded rings (backoff 45s),
      // then terminal no-responders. Opt out per-request with autoRetry: false.
      if (finalCheck.autoRetry !== false && !finalCheck.retryCount) {
        const retryRadii = radiiKm.map((r) => Math.round(r * 1.5));
        const retryAt = new Date(Date.now() + 45_000);
        const scheduled = await Model.findOneAndUpdate(
          { _id: requestId, status: 'searching', retryCount: { $lt: 1 } },
          { $set: { retryCount: 1, retryAt, retryRadii, retryWaveIndex: 0, status: NO_RESPONDERS_STATUS[type] || 'no_responders_found', windowEndsAt: null }, $push: { statusHistory: { status: NO_RESPONDERS_STATUS[type] || 'no_responders_found', at: new Date(), note: 'No providers accepted; durable expanded-radius retry scheduled' } } },
          { new: true },
        );
        if (!scheduled) return;
        Object.assign(finalCheck, scheduled.toObject?.() || scheduled);
      } else {
        const closed = await Model.findOneAndUpdate(
          { _id: requestId, status: 'searching' },
          { $set: { status: NO_RESPONDERS_STATUS[type] || 'no_responders_found', windowEndsAt: null, retryAt: null }, $push: { statusHistory: { status: NO_RESPONDERS_STATUS[type] || 'no_responders_found', at: new Date(), note: 'No providers accepted within maximum dispatch radius' } } },
          { new: true },
        );
        if (!closed) return;
        Object.assign(finalCheck, closed.toObject?.() || closed);
      }

      // Keep the retry decision durable across process restarts and replicas.

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

  // A delayed socket event must not let a provider vote while already serving
  // a different active request. The durable check closes the stale-notice gap.
  const providerModelType = config.type === 'ride' ? 'rider' : config.type;
  const getProviderModel = PROVIDER_MODEL[providerModelType];
  if (getProviderModel) {
    const ProviderModel = await getProviderModel();
    const identity = providerModelType === 'emergency_doctor'
      ? { user_id: providerId }
      : { userId: providerId };
    const provider = await ProviderModel.findOne({ ...identity, activeDispatchRequestId: null }).select('_id').lean();
    if (!provider) return { success: false, status: 'provider_busy' };
  }

  const pIdStr = String(providerId);
  const uIdStr = String(user._id || user.id);
  const n = (request.notified || []).find((x) => x.providerId === pIdStr || x.userId === uIdStr);
  if (!n) {
    return { success: false, status: 'not_eligible', message: 'Provider not notified in current wave.' };
  }

  const coords = resolveRequestCoords(request);
    const userCoords = user.currentLocation?.coordinates;
    if (!Array.isArray(userCoords) || userCoords.length !== 2 || !userCoords.every((value) => Number.isFinite(Number(value)))) {
      return { success: false, status: 'location_unavailable', message: 'Share a valid live location before accepting this request.' };
    }
  const distanceKm = Math.round(calculateDistanceKm(coords[1], coords[0], userCoords[1], userCoords[0]) * 10) / 10;

  const r = await Model.updateOne(
    { _id: requestId, status: 'searching', 'acceptances.providerId': { $ne: pIdStr } },
    {
      $push: {
        acceptances: {
          providerId: pIdStr,
          ...(n.profileId ? { profileId: String(n.profileId) } : {}),
          distanceKm: distanceKm || 1,
          roadEtaSeconds: Number(n.roadEtaSeconds) > 0 ? Number(n.roadEtaSeconds) : null,
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

const retryModels = [
  ['ride', '../models/RideBooking.js', '../services/rideDispatchService.js', 'startRideDispatch'],
  ['lawyer', '../models/LawyerBooking.js', '../services/lawyerDispatchService.js', 'startLawyerDispatch'],
  ['assistant', '../models/AssistantBooking.js', '../services/assistantDispatchService.js', 'startAssistantDispatch'],
  ['emergency_doctor', '../models/EmergencyDoctorRequest.js', '../services/emergencyDoctorDispatchService.js', 'startEmergencyDoctorDispatch'],
];

async function recoverLegacyRideRetries(now, limit = 25) {
  const RideBooking = (await import('../models/RideBooking.js')).default;
  const { dispatchSequentially } = await import('./rideService.js');
  const due = await RideBooking.find({ status: 'no_riders_found', retryCount: 1, retryAt: { $lte: now } })
    .select('_id retryRadii').limit(limit).lean();
  for (const row of due) {
    const claimed = await RideBooking.findOneAndUpdate(
      { _id: row._id, status: 'no_riders_found', retryCount: 1, retryAt: { $lte: now } },
      { $set: { status: 'searching', retryAt: null, retryWaveIndex: 0 } },
      { new: true, select: '_id' },
    );
    if (claimed) await dispatchSequentially(row._id, { radii: row.retryRadii, markRetryAttempt: true });
  }
}

export async function claimProvider(type, providerId, requestId) {
  const providerModelType = type === 'ride' ? 'rider' : type;
  const getModel = PROVIDER_MODEL[providerModelType];
  if (!getModel) return false;
  const Model = await getModel();
  const identity = providerModelType === 'emergency_doctor'
    ? { user_id: providerId }
    : { userId: providerId };
  const claimed = await Model.findOneAndUpdate(
    { ...identity, activeDispatchRequestId: null },
    { $set: { activeDispatchRequestId: requestId } },
    { new: true, select: '_id' }
  );
  return Boolean(claimed);
}

export async function releaseProviderClaim(type, providerId, requestId) {
  const providerModelType = type === 'ride' ? 'rider' : type;
  const getModel = PROVIDER_MODEL[providerModelType];
  if (!getModel || !providerId || !requestId) return false;
  const Model = await getModel();
  const identity = providerModelType === 'emergency_doctor'
    ? { user_id: providerId }
    : { userId: providerId };
  const result = await Model.updateOne(
    { ...identity, activeDispatchRequestId: requestId },
    { $set: { activeDispatchRequestId: null } }
  );
  return Boolean(result.modifiedCount);
}

export async function recoverInstantDispatchRetries(now = new Date(), limit = 25) {
  await recoverLegacyRideRetries(now, limit);
  for (const [type, modelPath, servicePath, startName] of retryModels) {
    if (type === 'ride') continue; // Ride recovery uses legacy sequential dispatch below.
    const Model = (await import(modelPath)).default;
    const service = await import(servicePath);
    const due = await Model.find({ status: NO_RESPONDERS_STATUS[type], retryCount: 1, retryAt: { $lte: now } }).select('_id retryRadii retryWaveIndex').limit(limit).lean();
    for (const row of due) {
      const claimed = await Model.findOneAndUpdate(
        { _id: row._id, status: NO_RESPONDERS_STATUS[type], retryCount: 1, retryAt: { $lte: now } },
        { $set: { status: 'searching', retryAt: null, windowEndsAt: null, retryWaveIndex: row.retryWaveIndex || 0 } },
        { new: true },
      );
      if (claimed) await service[startName](row._id, row.retryRadii);
    }
    const staleWaves = await Model.find({ status: 'searching', windowEndsAt: { $lte: now } }).select('_id').limit(limit).lean();
    for (const row of staleWaves) {
      const claimedWave = await Model.findOneAndUpdate(
        { _id: row._id, status: 'searching', windowEndsAt: { $lte: now } },
        { $set: { windowEndsAt: null } },
        { new: true, select: '_id' },
      );
      if (claimedWave) await service[startName](row._id);
    }
  }
}

export function startInstantDispatchRetryRecovery(intervalMs = 5_000) {
  const timer = setInterval(async () => {
    try {
      await recoverInstantDispatchRetries(new Date());
    } catch (err) {
      logger.error(`instant dispatch retry recovery error: ${err.message}`);
    }
  }, intervalMs);
  timer.unref?.();
  return timer;
}

export function stopInstantDispatchRetryRecovery(timer) {
  if (timer) clearInterval(timer);
}
