import mongoose from 'mongoose';
import EmergencyRequest from '../models/EmergencyRequest.js';
import Ambulance from '../models/Ambulance.js';
import Hospital from '../models/Hospital.js';
import RiderProfile from '../models/RiderProfile.js';
import RideBooking from '../models/RideBooking.js';
import Vehicle from '../models/Vehicle.js';
import User from '../models/User.js';
import { getIO } from './socketService.js';
import Notification from '../models/Notification.js';
import { calculateDistanceKm, estimateETA } from './rideService.js';
export { calculateDistanceKm, estimateETA };
import logger from '../config/logger.js';
import { findCandidatesByHex } from '../lib/h3Cache.js';
import { rankCandidatesByRoadETA } from '../lib/valhallaRouting.js';
import { writeOutboxEvent } from '../lib/transactionalOutbox.js';

// Doc 01 §3 — no hardcodes
const AMBULANCE_RADII = (process.env.SOS_AMBULANCE_RADII || '5,10,15').split(',').map(Number);
const VEHICLE_RADII = (process.env.SOS_VEHICLE_RADII || '5,10,15').split(',').map(Number);
const WINDOW_MS = Number(process.env.SOS_WINDOW_SECONDS || 30) * 1000;
const LOC_MAX_AGE_MS = Number(process.env.SOS_LOCATION_MAX_AGE_SECONDS || 120) * 1000;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export const SOS_CONFIG = {
  AMBULANCE_RADII, VEHICLE_RADII,
  WINDOW_SECONDS: WINDOW_MS / 1000,
  LOC_MAX_AGE_SECONDS: LOC_MAX_AGE_MS / 1000,
};

const WINDOW_SECONDS = WINDOW_MS / 1000;

/**
 * Sync hospital's ambulanceAvailability flag (Doc 04 §5):
   - ambulanceService: static flag from Join Platform / hospital settings (service provides ambulance or not)
   - ambulancesAvailable: live count of online, on-duty, emergency-support ambulances
   These are kept separate so patient SOS badges show correct state.
 */
export async function syncHospitalAmbulanceFlag(hospitalId) {
  try {
    if (!hospitalId) return;
    const available = await Ambulance.countDocuments({
      hospitalId, isOnline: true, isOnDuty: false, emergencySupport: true,
    });
    await Hospital.findByIdAndUpdate(hospitalId, { ambulancesAvailable: available });
  } catch (err) {
    logger.warn(`syncHospitalAmbulanceFlag error: ${err.message}`);
  }
}

const freshnessCutoff = () => new Date(Date.now() - LOC_MAX_AGE_MS);

function toObjectIds(ids) {
  return (ids || [])
    .filter((id) => id && mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
}

/**
 * File 02 §5 — H3 fast-path (Redis hex-ring → hydrate + exact distance).
 * Returns [] when H3 yields nothing usable — caller MUST fall through to $geoNear.
 * Mongo $geoNear stays source of truth; H3 is pure speed layer.
 */
async function hydrateAmbulanceCandidates(pickupLng, pickupLat, radiusKm, excludeIds) {
  try {
    const { candidates } = await findCandidatesByHex({
      lat: Number(pickupLat),
      lng: Number(pickupLng),
      providerType: 'ambulance',
      excludeIds,
    });
    if (!candidates.length) return [];
    const userIds = toObjectIds(candidates);
    if (!userIds.length) return [];
    const docs = await Ambulance.find({
      userId: { $in: userIds },
      _id: { $nin: toObjectIds(excludeIds) },
      isOnline: true,
      isOnDuty: false,
      emergencySupport: true,
      'currentLocation.updatedAt': { $gte: freshnessCutoff() },
    }).populate('hospitalId', 'name emergencySupport status').lean();
    const out = [];
    for (const d of docs) {
      const hosp = d.hospitalId;
      if (!hosp || hosp.emergencySupport !== true || hosp.status !== 'approved') continue;
      const coords = d.currentLocation?.coordinates;
      if (!coords || coords.length < 2) continue;
      const distanceKm = Math.round(calculateDistanceKm(Number(pickupLat), Number(pickupLng), coords[1], coords[0]) * 10) / 10;
      if (distanceKm > radiusKm) continue;
      out.push({
        ...d,
        hospital: hosp,
        distanceKm,
        coordinates: coords, // [lng, lat]
        userId: d.userId ? String(d.userId) : null
      });
    }

    // Rank candidates by real emergency road arrival duration via Valhalla
    const ranked = await rankCandidatesByRoadETA([Number(pickupLng), Number(pickupLat)], out, 'emergency');
    return ranked.slice(0, Number(process.env.SOS_MAX_CANDIDATES_PER_WAVE || 30));
  } catch (err) {
    logger.error(`hydrateAmbulanceCandidates H3 error: ${err.message}`);
    return [];
  }
}

async function hydrateVehicleRiderCandidates(pickupLng, pickupLat, radiusKm, excludeIds) {
  try {
    const { candidates } = await findCandidatesByHex({
      lat: Number(pickupLat),
      lng: Number(pickupLng),
      providerType: 'rider',
      excludeIds,
    });
    if (!candidates.length) return [];
    const userIds = toObjectIds(candidates);
    if (!userIds.length) return [];
    const matchingVehicles = await Vehicle.find({
      type: { $in: ['auto', 'car', 'van', 'e_rickshaw'] },
    }).select('_id');
    const vehicleIds = matchingVehicles.map((v) => v._id);
    if (!vehicleIds.length) return [];
    const ACTIVE_RIDE_STATUSES = ['accepted', 'rider_arriving', 'arrived', 'in_progress'];
    const busyOnRide = await RideBooking.distinct('riderId', { status: { $in: ACTIVE_RIDE_STATUSES } });
    const busyOnSOS = await EmergencyRequest.distinct('assignedProviderId', {
      assignedProviderType: 'rider',
      status: { $in: ['assigned', 'en_route'] },
    });
    const skipUsers = toObjectIds([...(excludeIds || []), ...busyOnRide.map(String), ...busyOnSOS.map(String)]);
    const profiles = await RiderProfile.find({
      userId: { $in: userIds, $nin: skipUsers },
      isOnline: true,
      riderStatus: 'active',
      emergencySupport: true,
      vehicleId: { $in: vehicleIds },
      'currentLocation.updatedAt': { $gte: freshnessCutoff() },
    }).populate('userId', 'name phone').populate('vehicleId').lean();
    const out = [];
    for (const p of profiles) {
      const coords = p.currentLocation?.coordinates;
      if (!coords || coords.length < 2) continue;
      const distanceKm = Math.round(calculateDistanceKm(Number(pickupLat), Number(pickupLng), coords[1], coords[0]) * 10) / 10;
      if (distanceKm > radiusKm) continue;
      out.push({ ...p, user: p.userId, vehicle: p.vehicleId, distanceKm });
    }
    out.sort((a, b) => a.distanceKm - b.distanceKm);
    return out.slice(0, Number(process.env.SOS_MAX_CANDIDATES_PER_WAVE || 30));
  } catch (err) {
    logger.error(`hydrateVehicleRiderCandidates H3 error: ${err.message}`);
    return [];
  }
}

/**
 * Find nearby hospital-owned ambulances eligible for emergency dispatch
 * Doc 01 §5: GPS must be fresh (≤2min), Doc 02: userId direct (no Staff lookup)
 */
export async function findEligibleAmbulances(pickupLng, pickupLat, radiusKm = 10, excludeIds = []) {
  try {
    if (mongoose.connection.readyState !== 1) return [];
    if (!Number.isFinite(Number(pickupLng)) || !Number.isFinite(Number(pickupLat))) {
      logger.error(`findEligibleAmbulances: invalid coordinates lng=${pickupLng} lat=${pickupLat}`);
      return [];
    }
    const radiusMeters = radiusKm * 1000;

    const ex = excludeIds
      .filter(id => id && mongoose.Types.ObjectId.isValid(id))
      .map(id => new mongoose.Types.ObjectId(id));

    // File 02 §5 — H3 fast-path first; empty → $geoNear fallback below.
    const h3Ambulances = await hydrateAmbulanceCandidates(pickupLng, pickupLat, radiusKm, excludeIds);
    if (h3Ambulances.length) return h3Ambulances;

    const ambulances = await Ambulance.aggregate([
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [Number(pickupLng), Number(pickupLat)],
          },
          key: 'currentLocation.coordinates',
          distanceField: 'distanceMeters',
          maxDistance: radiusMeters,
          spherical: true,
          query: {
            isOnline: true,
            isOnDuty: false,
            emergencySupport: true,
            'currentLocation.updatedAt': { $gte: freshnessCutoff() },
            _id: { $nin: ex.length > 0 ? ex : [] },
          },
        },
      },
      {
        $lookup: {
          from: 'hospitals',
          localField: 'hospitalId',
          foreignField: '_id',
          as: 'hospital',
        },
      },
      { $unwind: '$hospital' },
      {
        $match: {
          'hospital.emergencySupport': true,
          'hospital.status': 'approved',
        },
      },
      { $limit: Number(process.env.SOS_MAX_CANDIDATES_PER_WAVE || 30) },
    ]);

    return ambulances.map(a => ({
      ...a,
      distanceKm: Math.round(((a.distanceMeters || 0) / 1000) * 10) / 10,
      userId: a.userId ? String(a.userId) : null,
    }));
  } catch (err) {
    logger.error(`findEligibleAmbulances error: ${err.message}`);
    return [];
  }
}

/**
 * Find nearby independent vehicles (Auto, Car, Van, E-Rickshaw) with Emergency Support
 * Bikes strictly excluded. Freshness-checked.
 */
export async function findEligibleEmergencyVehicles(pickupLng, pickupLat, radiusKm = 10, excludeIds = []) {
  try {
    if (mongoose.connection.readyState !== 1) return [];
    if (!Number.isFinite(Number(pickupLng)) || !Number.isFinite(Number(pickupLat))) {
      logger.error(`findEligibleEmergencyVehicles: invalid coordinates lng=${pickupLng} lat=${pickupLat}`);
      return [];
    }
    const radiusMeters = radiusKm * 1000;

    // File 02 §5 — H3 fast-path first; empty → $geoNear fallback below.
    const h3Riders = await hydrateVehicleRiderCandidates(pickupLng, pickupLat, radiusKm, excludeIds);
    if (h3Riders.length) return h3Riders;

    const matchingVehicles = await Vehicle.find({
      type: { $in: ['auto', 'car', 'van', 'e_rickshaw'] },
    }).select('_id type brand model rcNumber');
    const vehicleIds = matchingVehicles.map(v => v._id);

    if (vehicleIds.length === 0) return [];

    // Exclude users already notified (everNotified) + riders on active ride + riders already assigned to another SOS
    const excludeUserIds = new Set(excludeIds.filter(Boolean).map(id => String(id)));

    // Active ride statuses
    const ACTIVE_RIDE_STATUSES = ['accepted', 'rider_arriving', 'arrived', 'in_progress'];
    const busyOnRide = await RideBooking.distinct('riderId', { status: { $in: ACTIVE_RIDE_STATUSES } });
    busyOnRide.filter(Boolean).forEach(id => excludeUserIds.add(String(id)));

    const busyOnSOS = await EmergencyRequest.distinct('assignedProviderId', {
      assignedProviderType: 'rider',
      status: { $in: ['assigned', 'en_route'] },
    });
    busyOnSOS.filter(Boolean).forEach(id => excludeUserIds.add(String(id)));

    const skipUsers = [...excludeUserIds]
      .filter(id => mongoose.Types.ObjectId.isValid(id))
      .map(id => new mongoose.Types.ObjectId(id));

    const riders = await RiderProfile.aggregate([
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [Number(pickupLng), Number(pickupLat)],
          },
          key: 'currentLocation.coordinates',
          distanceField: 'distanceMeters',
          maxDistance: radiusMeters,
          spherical: true,
          query: {
            isOnline: true,
            riderStatus: 'active',
            emergencySupport: true,
            vehicleId: { $in: vehicleIds },
            'currentLocation.updatedAt': { $gte: freshnessCutoff() },
            userId: { $nin: skipUsers },
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $lookup: {
          from: 'vehicles',
          localField: 'vehicleId',
          foreignField: '_id',
          as: 'vehicle',
        },
      },
      { $unwind: { path: '$vehicle', preserveNullAndEmptyArrays: true } },
      { $limit: Number(process.env.SOS_MAX_CANDIDATES_PER_WAVE || 30) },
    ]);

    return riders.map(r => ({
      ...r,
      distanceKm: Math.round(((r.distanceMeters || 0) / 1000) * 10) / 10,
    }));
  } catch (err) {
    logger.error(`findEligibleEmergencyVehicles error: ${err.message}`);
    return [];
  }
}

function emitSearchUpdate(io, requestId, phase, radiusKm) {
  if (!io) return;
  const statusText = phase === 'ambulance'
    ? `Searching for nearest hospital ambulance within ${radiusKm} km…`
    : `No ambulance found nearby — checking available vehicles within ${radiusKm} km…`;
  io.to(`emergency:${requestId}`).emit('emergency_searching_update', {
    requestId: String(requestId),
    phase,
    radiusKm,
    statusText,
  });
}

function buildExcludeQuery(everNotified) {
  const ex = everNotified ? everNotified.map(id => new mongoose.Types.ObjectId(id)) : [];
  return { everNotified: { $nin: ex } };
}

function buildAmbulanceAlert(request, amb) {
  return {
    requestId: String(request._id),
    category: request.category,
    isSelf: request.reporterMode === 'self',
    patient: request.patientDetails,
    reporter: request.reporterOwnDetailsShared ? request.reporterDetails : null,
    location: request.location,
    distanceKm: amb.distanceKm,
    windowSeconds: WINDOW_SECONDS,
    hospitalName: amb.hospital?.name || 'Hospital Ambulance',
    ambulanceId: String(amb._id),
    providerType: 'ambulance',
  };
}

function buildRiderAlert(request, veh) {
  return {
    requestId: String(request._id),
    category: request.category,
    isSelf: request.reporterMode === 'self',
    patient: request.patientDetails,
    reporter: request.reporterOwnDetailsShared ? request.reporterDetails : null,
    location: request.location,
    distanceKm: veh.distanceKm,
    windowSeconds: WINDOW_SECONDS,
    vehicleType: veh.vehicle?.type || 'Vehicle',
    providerId: String(veh.user?._id),
    providerType: 'rider',
  };
}

function sendAlert(io, requestId, candidate) {
  if (!io) return;
  const payload = candidate.raw;
  io.to(`user:${candidate.userId}`).emit('incoming_emergency', payload);
  if (candidate.providerType === 'ambulance') {
    io.to(`ambulance:${candidate.providerId}`).emit('incoming_emergency', payload);
  }
}

/**
 * Doc 01 §6.2 wave runner — 30s window, nearest-acceptor wins
 */
export async function runWave({ requestId, phase, radiusKm, candidates, emitAlert }) {
  const existing = await EmergencyRequest.findById(requestId).select('everNotified');
  const prevEverNotified = existing?.everNotified || [];

  await EmergencyRequest.findByIdAndUpdate(requestId, {
    $set: {
      currentSearchPhase: phase,
      currentSearchRadiusKm: radiusKm,
      notified: candidates.map(c => ({
        providerId: c.providerId, providerType: c.providerType, userId: c.userId,
      })),
      acceptances: [],
      rejections: [],
      windowEndsAt: new Date(Date.now() + WINDOW_MS),
    },
    $addToSet: { everNotified: { $each: candidates.map(c => ({ providerId: c.providerId })) } },
    $push: { dispatchLog: { radiusKm, phase, candidateCount: candidates.length, outcome: 'escalated' } },
  });

  candidates.forEach(emitAlert);

  const deadline = Date.now() + WINDOW_MS;
  while (Date.now() < deadline) {
    await sleep(1000);
    const r = await EmergencyRequest.findById(requestId).select('status notified acceptances rejections everNotified');
    if (!r || r.status !== 'searching') return { done: true };
    if (r.notified?.length && r.rejections.length >= r.notified.length) break;
  }

  const result = await finalizeWave(requestId);
  if (!result.done) {
    // Nobody accepted — tell this wave's providers their window expired
    const io = getIO();
    if (io) {
      candidates.forEach((c) => {
        io.to(`user:${c.userId}`).emit('emergency_expired_no_response', { requestId: String(requestId) });
      });
    }
  }
  return result;
}

/**
 * Doc 01 §6.2 — pick nearest acceptor. Exported for unit tests.
 * Tie → earliest acceptedAt wins.
 */
export async function finalizeWave(requestId) {
  const r = await EmergencyRequest.findById(requestId);
  if (!r || r.status !== 'searching') return { done: true };
  if (!r.acceptances?.length) return { done: false };

  const sorted = [...r.acceptances].sort((a, b) =>
    (a.distanceKm - b.distanceKm) || (new Date(a.acceptedAt) - new Date(b.acceptedAt)));
  const winner = sorted[0];
  const ok = await assignWinner(r, winner, sorted.slice(1));
  return { done: ok, winner };
}

async function getProviderLocation(providerId, providerType) {
  if (providerType === 'ambulance') {
    const amb = await Ambulance.findById(providerId).select('currentLocation').lean();
    const coords = amb?.currentLocation?.coordinates;
    if (!coords?.length) return null;
    return { lng: coords[0], lat: coords[1] };
  }
  const rp = await RiderProfile.findOne({ userId: providerId }).select('currentLocation').lean();
  const coords = rp?.currentLocation?.coordinates;
  if (!coords?.length) return null;
  return { lng: coords[0], lat: coords[1] };
}

export async function buildResponderPayload(winner) {
  if (winner.providerType === 'ambulance') {
    const ambulance = await Ambulance.findById(winner.providerId).populate('hospitalId');
    const hospitalName = ambulance?.hospitalId?.name || 'Hospital';
    const etaMin = estimateETA(winner.distanceKm || 2.5, 'ambulance');
    const driverUser = winner.userId ? await User.findById(winner.userId).select('name phone').lean() : null;
    return {
      providerType: 'ambulance',
      hospitalName,
      registrationNumber: ambulance?.registrationNumber,
      ambulanceType: ambulance?.ambulanceType,
      equipmentLevel: ambulance?.equipmentLevel,
      driverName: driverUser?.name || ambulance?.driverName || ambulance?.currentDriverPhone || 'Ambulance Driver',
      driverPhone: driverUser?.phone || ambulance?.driverPhone || ambulance?.currentDriverPhone,
      currentLocation: ambulance?.currentLocation,
      distanceKm: winner.distanceKm,
      etaMin,
    };
  }
  const riderUser = await User.findById(winner.providerId).select('name phone').lean();
  const riderProfile = await RiderProfile.findOne({ userId: winner.providerId }).populate('vehicleId').lean();
  const vehicleType = riderProfile?.vehicleId?.type || 'car';
  return {
    providerType: 'rider',
    vehicleType,
    driverName: riderUser?.name || 'Emergency Driver',
    driverPhone: riderUser?.phone,
    currentLocation: riderProfile?.currentLocation,
    distanceKm: winner.distanceKm,
    etaMin: estimateETA(winner.distanceKm || 2.5, vehicleType),
  };
}

/**
 * Doc 01 §6.4 — atomic winner assign
 */
export async function assignWinner(request, winner, losers = []) {
  let assignedHospitalId;
  if (winner.providerType === 'ambulance') {
    const amb = await Ambulance.findById(winner.providerId).select('hospitalId').lean();
    assignedHospitalId = amb?.hospitalId || undefined;
  }
  const update = {
    status: 'assigned',
    assignedProviderId: winner.providerId,
    assignedProviderType: winner.providerType,
    assignedAt: new Date(),
  };
  if (assignedHospitalId) update.assignedHospitalId = assignedHospitalId;
  if (winner.providerType === 'rider') {
    const rp = await RiderProfile.findOne({ userId: winner.providerId }).populate('vehicleId').lean();
    if (rp?.vehicleId?.type) update.assignedVehicleType = rp.vehicleId.type;
  }

  const updated = await EmergencyRequest.findOneAndUpdate(
    { _id: request._id, status: 'searching' },
    update,
    { new: true }
  );
  if (!updated) return false;

  if (winner.providerType === 'ambulance') {
    await Ambulance.findByIdAndUpdate(winner.providerId, {
      isOnDuty: true,
      currentEmergencyId: request._id,
    });
  }

  const io = getIO();
  const payload = await buildResponderPayload(winner);
  if (io) {
    io.to(`user:${winner.userId}`).emit('emergency_assigned_to_you', {
      requestId: String(request._id), ...payload,
    });
    if (winner.providerType === 'ambulance') {
      io.to(`ambulance:${winner.providerId}`).emit('emergency_assigned_to_you', {
        requestId: String(request._id), ...payload,
      });
    }
    io.to(`emergency:${request._id}`).emit('emergency_assigned', {
      requestId: String(request._id), ...payload,
    });
    losers.forEach(l => io.to(`user:${l.userId}`).emit('emergency_lost', {
      requestId: String(request._id),
      message: 'Ye emergency kisi aur paas wale responder ko assign ho gayi.',
    }));
    // Close overlay for notified non-responders
    (request.notified || [])
      .filter(n => n.userId !== winner.userId)
      .forEach(n => io.to(`user:${n.userId}`).emit('emergency_closed', { requestId: String(request._id) }));
  }
  // Best-effort notification for winner's bell (never break dispatch)
  try {
    await Notification.create({
      title: 'Emergency Assigned',
      message: `Naya emergency job assign hua — ${request.category || 'General'}`,
      type: 'system',
      userId: String(winner.userId),
    });
  } catch {}
  // Spec 08: trauma-desk pre-alert + green-corridor route (best-effort).
  try {
    if (assignedHospitalId) {
      const deskUsers = await User.find(
        { hospitalId: assignedHospitalId, role: 'hospital_admin' },
        { _id: 1 }
      ).lean();
      for (const u of deskUsers) {
        await Notification.create({
          title: 'Incoming Emergency (Pre-Alert)',
          message: `Ambulance en route — ${request.category || 'Emergency'} patient inbound.`,
          type: 'emergency',
          userId: String(u._id),
        }).catch(() => {});
      }
      if (io) {
        io.to(`hospital:${assignedHospitalId}`).emit('emergency_prealert', {
          requestId: String(request._id),
          category: request.category,
          providerType: winner.providerType,
        });
      }
    }
    if (winner.providerType === 'ambulance' && io) {
      const ambLoc = await getProviderLocation(winner.providerId, 'ambulance');
      const pickup = request.location?.coordinates;
      if (ambLoc && pickup?.length === 2) {
        const { getValhallaRoute } = await import('../lib/valhallaRouting.js');
        const corridor = await getValhallaRoute([ambLoc.lng, ambLoc.lat], pickup, 'emergency');
        io.to(`emergency:${request._id}`).emit('emergency_green_corridor', {
          requestId: String(request._id),
          route: corridor,
        });
      }
    }
  } catch (corridorErr) {
    logger.warn(`Pre-alert/corridor skipped: ${corridorErr.message}`);
  }
  // Spec 11: SOS assignment recorded for the event backbone.
  writeOutboxEvent({
    aggregateType: 'emergency_sos',
    aggregateId: String(request._id),
    eventType: 'emergency_sos.assigned',
    payload: {
      providerId: winner.providerId,
      providerType: winner.providerType,
      distanceKm: winner.distanceKm,
    },
  }).catch(() => {});
  return true;
}

/**
 * Start the Two-Phase Tiered Emergency SOS Dispatch (Doc 01 §6.1)
 */
export async function startEmergencyDispatch(requestId) {
  try {
    const request = await EmergencyRequest.findById(requestId);
    if (!request || request.status !== 'searching') return;

    // Spec 11: SOS dispatch recorded for the event backbone.
    writeOutboxEvent({
      aggregateType: 'emergency_sos',
      aggregateId: String(requestId),
      eventType: 'emergency_sos.dispatch_started',
      payload: { category: request.category, severityLevel: request.severityLevel },
    }).catch(() => {});

    const io = getIO();
    const [lng, lat] = request.location.coordinates;

    // ─── PHASE 1: Hospital ambulances 5 → 10 → 15 ───
    for (const radiusKm of AMBULANCE_RADII) {
      const current = await EmergencyRequest.findById(requestId);
      if (!current || current.status !== 'searching') return;
      emitSearchUpdate(io, requestId, 'ambulance', radiusKm);
      const found = await findEligibleAmbulances(lng, lat, radiusKm, current.everNotified || []);
      const cands = found
        .filter(a => a.userId)
        .map(a => ({
          providerId: String(a._id),
          providerType: 'ambulance',
          userId: String(a.userId),
          distanceKm: a.distanceKm,
          raw: buildAmbulanceAlert(current, a),
        }));
      if (!cands.length) continue;
      const { done } = await runWave({
        requestId, phase: 'ambulance', radiusKm, candidates: cands,
        emitAlert: (c) => sendAlert(io, requestId, c),
      });
      if (done) return;
    }

    // ─── PHASE 2: Independent vehicles 5 → 10 → 15 ───
    const checkBeforePhase2 = await EmergencyRequest.findById(requestId);
    if (!checkBeforePhase2 || checkBeforePhase2.status !== 'searching') return;

    for (const radiusKm of VEHICLE_RADII) {
      const current = await EmergencyRequest.findById(requestId);
      if (!current || current.status !== 'searching') return;
      emitSearchUpdate(io, requestId, 'vehicle', radiusKm);
      const found = await findEligibleEmergencyVehicles(lng, lat, radiusKm, current.everNotified || []);
      const cands = found
        .filter(veh => veh.user?._id)
        .map(veh => ({
          providerId: String(veh.user?._id),
          providerType: 'rider',
          userId: String(veh.user?._id),
          distanceKm: veh.distanceKm,
          raw: buildRiderAlert(current, veh),
        }));
      if (!cands.length) continue;
      const { done } = await runWave({
        requestId, phase: 'vehicle', radiusKm, candidates: cands,
        emitAlert: (c) => sendAlert(io, requestId, c),
      });
      if (done) return;
    }

    // ─── All exhausted ───
    const finalCheck = await EmergencyRequest.findById(requestId);
    if (finalCheck && finalCheck.status === 'searching') {
      finalCheck.status = 'no_responders_found';
      await finalCheck.save();
      if (io) {
        io.to(`emergency:${requestId}`).emit('emergency_no_responders_found', {
          requestId: String(requestId),
          message: 'No emergency responders could be dispatched in your area right now. Please call emergency services directly (108 / 112).',
        });
      }
      // Email-only fallback (no SMS gateway): notify the caller by email + in-app.
      try {
        const caller = await User.findById(finalCheck.userId).select('email name').lean();
        if (caller?.email) {
          const { sendEmail } = await import('./notificationService.js');
          await sendEmail({
            to: caller.email,
            subject: 'FindMedi SOS: no responders nearby — call 108/112',
            text: `Hi ${caller.name || ''}, no ambulance or emergency vehicle accepted request ${requestId} in your area. Please call 108/112 directly. Your SOS remains logged for follow-up.`,
          });
        }
        await Notification.create({
          title: 'SOS: No Responders Found',
          message: 'Koi responder nahi mila. Turant 108/112 par call karein.',
          type: 'emergency',
          userId: String(finalCheck.userId),
        });
      } catch {}
      logger.warn(`Emergency SOS ${requestId} timed out: no responders found.`);
    }
  } catch (err) {
    logger.error(`startEmergencyDispatch error: ${err.message}`);
  }
}

/**
 * Doc 01 §6.3 — Accept is only a vote, not instant assign
 */
export async function handleProviderAccept(requestId, providerId, providerType, user) {
  try {
    const request = await EmergencyRequest.findById(requestId).select('status notified location windowEndsAt');
    if (!request) return { status: 'not_found' };
    if (request.status !== 'searching')
      return { status: 'too_late', message: 'Ye emergency kisi aur responder ko assign ho chuki hai.' };

    const n = (request.notified || []).find(
      x => x.providerId === String(providerId) && x.providerType === providerType);
    if (!n || n.userId !== String(user._id || user.id))
      return { status: 'not_eligible', message: 'Ye alert aapko nahi bheja gaya tha.' };

    // Ownership check for ambulance (Doc 02): must own the ambulance login
    if (providerType === 'ambulance') {
      const amb = await Ambulance.findById(providerId).select('userId').lean();
      if (!amb || String(amb.userId) !== String(user._id || user.id))
        return { status: 'not_eligible', message: 'Ye alert aapko nahi bheja gaya tha.' };
    }

    const loc = await getProviderLocation(providerId, providerType);
    if (!loc) return { status: 'too_late', message: 'Window band ho gayi.' };
    const [pLng, pLat] = request.location.coordinates;
    const distanceKm = calculateDistanceKm(pLat, pLng, loc.lat, loc.lng);

    const r = await EmergencyRequest.updateOne(
      { _id: requestId, status: 'searching', 'acceptances.providerId': { $ne: String(providerId) } },
      { $push: { acceptances: { providerId: String(providerId), providerType, userId: String(user._id || user.id), distanceKm } } }
    );
    if (!r.modifiedCount) return { status: 'too_late', message: 'Window band ho gayi.' };

    return { status: 'accepted_pending', windowEndsAt: request.windowEndsAt, distanceKm };
  } catch (err) {
    logger.error(`handleProviderAccept error: ${err.message}`);
    return { status: 'error', message: err.message };
  }
}

/**
 * Handle Destination Hospital Selection by Responder
 */
export async function selectDestinationHospital(requestId, hospitalId) {
  try {
    const hospital = await Hospital.findById(hospitalId).select('name address phone location');
    if (!hospital) return { status: 'not_found' };

    const updated = await EmergencyRequest.findByIdAndUpdate(
      requestId,
      { selectedHospitalId: hospitalId, status: 'en_route' },
      { new: true }
    );

    const io = getIO();
    if (io) {
      io.to(`emergency:${requestId}`).emit('emergency_hospital_selected', {
        requestId: String(requestId),
        hospital,
      });
    }

    return { status: 'success', request: updated, hospital };
  } catch (err) {
    logger.error(`selectDestinationHospital error: ${err.message}`);
    return { status: 'error', message: err.message };
  }
}

/**
 * Doc 01 §7 — server restart recovery (single instance)
 * Mode-aware resume: har request wahi loop se resume hoti hai jo /start ne chuna tha.
 */
export async function recoverStuckRequests() {
  try {
    await EmergencyRequest.updateMany(
      { status: 'searching', createdAt: { $lt: new Date(Date.now() - 5 * 60 * 1000) } },
      { status: 'no_responders_found' }
    );
    const live = await EmergencyRequest.find({ status: 'searching' })
      .select('_id requestMode autoBookEnabled autoFindEnabled startingRadiusKm currentSearchRadiusKm');
    // Dynamic import (static cycle avoid: sosVehicleService humse import karta hai)
    const sos = await import('./sosVehicleService.js').catch(() => null);
    const settings = await EmergencyRequest.db.collection('sosvehiclesettings').findOne({}).catch(() => null);
    const radiusSteps = settings?.radiusSteps?.length ? settings.radiusSteps : [5, 10, 15, 20];
    live.forEach(r => {
      const id = String(r._id);
      try {
        if (!sos) return startEmergencyDispatch(id).catch(() => {});
        if (r.autoFindEnabled) {
          const maxRetries = settings?.maxRetriesPerRadius ?? 3;
          const pauseMs = (settings?.retryPauseSeconds ?? 3) * 1000;
          sos.startAutoFindLoop(id, radiusSteps, maxRetries, pauseMs).catch(() => {});
        } else if (r.requestMode === 'auto_select_ambulance' || r.autoBookEnabled) {
          sos.startAutoEscalateLoop(id, radiusSteps, r.startingRadiusKm || 5).catch(() => {});
        } else if (r.requestMode === 'manual_select') {
          sos.startManualModeSearch(id, r.currentSearchRadiusKm || r.startingRadiusKm || 5).catch(() => {});
        } else {
          startEmergencyDispatch(id).catch(() => {});
        }
      } catch {}
    });
    if (live.length) logger.info(`recoverStuckRequests: resumed ${live.length} searching requests`);
  } catch (err) {
    logger.error(`recoverStuckRequests error: ${err.message}`);
  }
}
