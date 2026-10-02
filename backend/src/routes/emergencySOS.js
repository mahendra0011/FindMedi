import express from 'express';
import EmergencyRequest from '../models/EmergencyRequest.js';
import Hospital from '../models/Hospital.js';
import Ambulance from '../models/Ambulance.js';
import { protect, authorize } from '../middleware/auth.js';
import { bookingLimiter } from '../middleware/rateLimit.js';
import {
  handleProviderAccept,
  selectDestinationHospital,
  findEligibleAmbulances,
  findEligibleEmergencyVehicles,
} from '../services/emergencyDispatchService.js';
import RiderProfile from '../models/RiderProfile.js';
import {
  startManualModeSearch,
  bookChosenProvider,
  startAutoEscalateLoop,
  startAutoFindLoop,
} from '../services/sosVehicleService.js';
import SOSVehicleSettings from '../models/SOSVehicleSettings.js';
import { getIO } from '../services/socketService.js';
import logger from '../config/logger.js';

const router = express.Router();

// Ownership helper for a single SOS request (RIDE-B-11/12/15).
// Allowed: the patient who raised it, the provider it is assigned to, a
// superadmin. Everything else (any other logged-in account) is refused.
const isSosOwner = (req, r) => Boolean(r) && String(r.userId) === String(req.user._id || req.user.id);

const isAssignedProvider = async (req, r) => {
  if (!r?.assignedProviderId) return false;
  if (String(r.assignedProviderId) === String(req.user._id || req.user.id)) return true;
  if (r.assignedProviderType === 'ambulance') {
    const amb = await Ambulance.findById(r.assignedProviderId).select('userId').lean().catch(() => null);
    return Boolean(amb?.userId && String(amb.userId) === String(req.user._id || req.user.id));
  }
  return false;
};

const canAccessSos = async (req, r) => {
  if (!r) return false;
  if (req.user.role === 'superadmin') return true;
  if (isSosOwner(req, r)) return true;
  return isAssignedProvider(req, r);
};

/**
 * RIDE-B-01: middleware form of `canAccessSos` for every `/:id/*` route.
 *
 * The finding was that `/:id/status`, `/:id/book/:providerId`, `/:id/cancel` and
 * `/:id/progress` were `protect`-only. With any valid token an attacker could
 * poll a victim's LIVE LOCATION and emergency category, cancel a real dispatch
 * (a safety-of-life action), or push providers onto someone else's incident.
 *
 * This loads the session once, then answers **404** — not 403 — for anyone who
 * is not the requester, the assigned provider or a superadmin, so an id cannot
 * even be probed for existence.
 */
const requireSosAccess = async (req, res, next) => {
  try {
    const r = await EmergencyRequest.findById(req.params.id).select(
      'userId assignedProviderId assignedProviderType status'
    );
    if (!r) return res.status(404).json({ message: 'Request not found' });
    if (!(await canAccessSos(req, r))) {
      logger.warn(
        `RIDE-B-01: SOS access denied user=${req.user?._id} role=${req.user?.role} sos=${req.params.id} path=${req.originalUrl}`
      );
      return res.status(404).json({ message: 'Request not found' });
    }
    req.sosRequest = r;
    return next();
  } catch (err) {
    return next(err);
  }
};

// ─── POST /api/emergency-sos — legacy create (auto tiered dispatch) ───
router.post('/', protect, authorize('emergency:write'), bookingLimiter, async (req, res) => {
  try {
    const { reporterMode = 'self', patientDetails = {}, reporterOwnDetailsShared, reporterDetails, category = '', lat, lng, accuracy, address = '' } = req.body;
    if (lat === undefined || lng === undefined) return res.status(400).json({ message: 'lat/lng required' });
    if (reporterMode === 'self' && !patientDetails.gender && req.user.gender) {
      patientDetails.gender = String(req.user.gender).toLowerCase();
    }
    const doc = await EmergencyRequest.create({
      userId: req.user._id || req.user.id,
      reporterMode,
      patientDetails,
      reporterOwnDetailsShared: !!reporterOwnDetailsShared,
      reporterDetails: reporterDetails || {},
      category,
      location: { type: 'Point', coordinates: [Number(lng), Number(lat)], address, accuracy: accuracy != null ? Number(accuracy) : null },
      status: 'searching',
      requestMode: 'auto_select_ambulance',
      selectedVehicleTypes: ['ambulance'],
      autoBookEnabled: true,
      autoFindEnabled: true,
      startingRadiusKm: 5,
      currentSearchRadiusKm: 5,
      currentSearchPhase: 'ambulance',
    });
    // background dispatch, don't block response
    startAutoEscalateLoop(String(doc._id), [5, 10, 15, 20], 5).catch((e) => logger.error(`legacy create dispatch fail ${doc._id}: ${e.message}`));
    res.status(201).json({ emergency: { _id: doc._id, id: doc._id, status: doc.status, requestMode: doc.requestMode } });
  } catch (err) {
    logger.error(`SOS create error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/emergency-sos/start — new 3-mode entry ───
// RIDE-B-13: `/start` was `protect`-only — no bookingLimiter, no permission and
// no "one active SOS" check, so a single account could script thousands of
// alerts, each fanning out notifications to every nearby provider (alert fatigue
// for real responders + dispatch/socket storms).
router.post('/start', protect, authorize('emergency:write', 'emergency:write:own'), bookingLimiter, async (req, res) => {
  try {
    const {
      requestMode = 'auto_select_ambulance',
      selectedVehicleTypes = [],
      autoBookEnabled = false,
      autoFindEnabled = false,
      startingRadiusKm = 5,
      reporterMode = 'self',
      patientDetails = {},
      reporterOwnDetailsShared,
      reporterDetails,
      category = '',
      lat, lng, accuracy, address = '',
    } = req.body;
    if (lat === undefined || lng === undefined) return res.status(400).json({ message: 'lat/lng required' });
    // Reject non-finite coordinates before they reach the geo queries.
    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))
      || Math.abs(Number(lat)) > 90 || Math.abs(Number(lng)) > 180) {
      return res.status(400).json({ message: 'Invalid lat/lng' });
    }
    // One ACTIVE SOS per user — a second concurrent alert is almost always a
    // double-tap or a script, not a second emergency.
    try {
      const active = await EmergencyRequest.findOne({
        userId: req.user._id || req.user.id,
        status: { $in: ['searching', 'assigned', 'en_route', 'picked_up'] },
      }).select('_id status');
      if (active) {
        return res.status(409).json({
          success: false,
          message: 'You already have an active emergency request',
          requestId: active._id,
          status: active.status,
        });
      }
    } catch { /* guard is best effort */ }
    if (requestMode === 'manual_select' && (!selectedVehicleTypes || !selectedVehicleTypes.length)) {
      return res.status(400).json({ message: 'Kam se kam ek vehicle type chuno' });
    }
    if (reporterMode === 'self' && !patientDetails.gender && req.user.gender) {
      patientDetails.gender = String(req.user.gender).toLowerCase();
    }
    let vehicleSettings = null;
    try { vehicleSettings = await SOSVehicleSettings.findOne().lean(); } catch {}
    const includeAmbInAuto = requestMode === 'auto_select_vehicle' && !!vehicleSettings?.includeAmbulanceInAutoVehicleMode;
    const request = await EmergencyRequest.create({
      userId: req.user._id || req.user.id,
      reporterMode,
      patientDetails,
      reporterOwnDetailsShared: !!reporterOwnDetailsShared,
      reporterDetails: reporterDetails || {},
      category,
      location: { type: 'Point', coordinates: [Number(lng), Number(lat)], address, accuracy: accuracy != null ? Number(accuracy) : null },
      status: 'searching',
      requestMode,
      selectedVehicleTypes: requestMode === 'manual_select' ? selectedVehicleTypes : requestMode === 'auto_select_ambulance' ? ['ambulance'] : (includeAmbInAuto ? ['auto', 'e_rickshaw', 'car', 'van', 'ambulance'] : ['auto', 'e_rickshaw', 'car', 'van']),
      autoBookEnabled: requestMode === 'auto_select_ambulance' ? true : !!autoBookEnabled,
      autoFindEnabled: !!autoFindEnabled,
      startingRadiusKm: Number(startingRadiusKm) || 5,
      currentSearchRadiusKm: Number(startingRadiusKm) || 5,
      currentSearchPhase: requestMode === 'auto_select_ambulance' ? 'ambulance' : 'vehicle',
    });

    const requestId = String(request._id);
    let settings = null;
    try { settings = await SOSVehicleSettings.findOne().lean(); } catch {}
    const radiusSteps = settings?.radiusSteps?.length ? settings.radiusSteps : [5, 10, 15, 20];
    const maxRetries = settings?.maxRetriesPerRadius ?? 3;
    const pauseMs = (settings?.retryPauseSeconds ?? 3) * 1000;

    // Fire-and-respond: searching UI shows immediately, waves run in background
    if (requestMode === 'auto_select_ambulance' && autoFindEnabled) {
      startAutoFindLoop(requestId, radiusSteps, maxRetries, pauseMs).catch((e) => logger.error(`autofind fail: ${e.message}`));
    } else if (requestMode === 'auto_select_vehicle' && autoFindEnabled) {
      startAutoFindLoop(requestId, radiusSteps, maxRetries, pauseMs).catch((e) => logger.error(`autofind fail: ${e.message}`));
    } else if (requestMode === 'auto_select_ambulance' || autoBookEnabled) {
      startAutoEscalateLoop(requestId, radiusSteps, request.startingRadiusKm).catch((e) => logger.error(`autobook fail: ${e.message}`));
    } else if (requestMode === 'manual_select') {
      startManualModeSearch(requestId, request.startingRadiusKm).catch((e) => logger.error(`manual search fail: ${e.message}`));
    } else {
      // auto_select_vehicle + autoBook OFF + autoFind OFF → patient khud choose karega;
      // legacy auto-assign dispatch kabhi nahi (mode violation hota)
      startManualModeSearch(requestId, request.startingRadiusKm).catch((e) => logger.error(`manual search fail: ${e.message}`));
    }

    res.status(201).json({ requestId, requestMode: request.requestMode, status: request.status, mode: requestMode, startingRadiusKm: request.startingRadiusKm });
  } catch (err) {
    logger.error(`SOS start error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/emergency-sos/:id/book/:providerId ───
router.post('/:id/book/:providerId', protect, requireSosAccess, async (req, res) => {
  try {
    const result = await bookChosenProvider(req.params.id, req.params.providerId);
    if (result.error) return res.status(400).json({ message: result.error });
    res.json({ success: true, request: result.request });
  } catch (err) {
    logger.error(`SOS book error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/emergency-sos/:id/search-again — same radius retry ───
router.post('/:id/search-again', protect, requireSosAccess, async (req, res) => {
  try {
    const cur = await EmergencyRequest.findById(req.params.id).select('currentSearchRadiusKm status');
    if (!cur) return res.status(404).json({ message: 'Request not found' });
    if (cur.status !== 'searching') return res.status(400).json({ message: 'Request not searching' });
    // Fire-and-forget: 30s HTTP block nahi. Result 'emergency_window_closed' socket event se aata hai.
    startManualModeSearch(req.params.id, cur.currentSearchRadiusKm || 5, { fresh: true })
      .catch((e) => logger.error(`search-again fail: ${e.message}`));
    res.json({ started: true, radiusKm: cur.currentSearchRadiusKm || 5 });
  } catch (err) {
    logger.error(`SOS search-again error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/emergency-sos/:id/search-radius/:km ───
router.post('/:id/search-radius/:km', protect, async (req, res) => {
  try {
    const km = parseInt(req.params.km, 10);
    if (!km || km < 1 || km > 50) return res.status(400).json({ message: 'Invalid radius' });
    // RIDE-B-12: only the patient who raised the SOS (or a superadmin) may drive
    // the search radius — anyone could otherwise re-dispatch other patients'
    // emergencies and read the accepted-candidate list.
    const scope = req.user.role === 'superadmin' ? { _id: req.params.id } : { _id: req.params.id, userId: req.user._id };
    const cur = await EmergencyRequest.findOne(scope).select('status');
    if (!cur) return res.status(404).json({ message: 'Request not found' });
    if (cur.status !== 'searching') return res.status(400).json({ message: 'Request not searching' });
    startManualModeSearch(req.params.id, km).catch((e) => logger.error(`search-radius fail: ${e.message}`));
    res.json({ started: true, radiusKm: km });
  } catch (err) {
    logger.error(`SOS search-radius error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/emergency-sos/:id/accepted-candidates ───
router.get('/:id/accepted-candidates', protect, requireSosAccess, async (req, res) => {
  try {
    // RIDE-B-15: same ownership rule — the candidate list reveals which doctors
    // /riders responded to a specific patient's SOS.
    const scope = req.user.role === 'superadmin' ? { _id: req.params.id } : { _id: req.params.id, userId: req.user._id };
    const r = await EmergencyRequest.findOne(scope).select('acceptances windowEndsAt userId');
    if (!r) return res.status(404).json({ message: 'Request not found' });
    const accepted = (r.acceptances || [])
      .filter((a) => !r.windowEndsAt || new Date(a.acceptedAt) <= new Date(r.windowEndsAt))
      .sort((a, b) => a.distanceKm - b.distanceKm);
    res.json({ accepted: accepted.map((a) => ({ providerId: a.providerId, providerType: a.providerType, distanceKm: a.distanceKm, userId: a.userId })) });
  } catch (err) {
    logger.error(`SOS accepted-candidates error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});


// ─── GET /api/emergency-sos/:id/status ───
router.get('/:id/status', protect, requireSosAccess, async (req, res) => {
  try {
    const request = await EmergencyRequest.findById(req.params.id).select(
      'status requestMode selectedVehicleTypes autoBookEnabled autoFindEnabled startingRadiusKm currentSearchRadiusKm currentSearchPhase dispatchLog notified acceptances windowEndsAt assignedProviderId assignedProviderType assignedVehicleType assignedHospitalId assignedAt selectedHospitalId userId'
    );
    if (!request) return res.status(404).json({ message: 'Request not found' });
    // RIDE-B-12: live dispatch state (who is assigned, the dispatch log, the
    // accepted candidates) is per-patient — do not serve it to any account.
    if (!(await canAccessSos(req, request))) {
      return res.status(403).json({ message: 'Not authorized to view this emergency request' });
    }
    res.json({
      status: request.status,
      requestMode: request.requestMode,
      selectedVehicleTypes: request.selectedVehicleTypes,
      autoBookEnabled: request.autoBookEnabled,
      autoFindEnabled: request.autoFindEnabled,
      startingRadiusKm: request.startingRadiusKm,
      currentSearchRadiusKm: request.currentSearchRadiusKm,
      currentSearchPhase: request.currentSearchPhase,
      dispatchLog: request.dispatchLog,
      notifiedCount: (request.notified || []).length,
      acceptancesCount: (request.acceptances || []).length,
      assigned: !!request.assignedProviderId,
      providerType: request.assignedProviderType,
      vehicleType: request.assignedVehicleType,
      hospital: request.assignedHospitalId ? String(request.assignedHospitalId) : null,
      assignedAt: request.assignedAt,
    });
  } catch (err) {
    logger.error(`SOS status error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── Legacy provider + patient endpoints (restored) ───
router.post('/:id/accept', protect, authorize('emergency:write'), async (req, res) => {
  try {
    const { providerType, providerId } = req.body;
    const out = await handleProviderAccept(req.params.id, providerId, providerType, req.user);
    if (out.status === 'accepted_pending') return res.json({ status: 'accepted_pending', windowEndsAt: out.windowEndsAt, distanceKm: out.distanceKm, success: true });
    if (out.status === 'too_late') return res.status(409).json({ status: 'too_late', message: out.message, success: false });
    if (out.status === 'not_eligible') return res.status(403).json({ status: 'not_eligible', message: out.message, success: false });
    return res.status(400).json({ ...out, success: false });
  } catch (err) {
    logger.error(`SOS accept error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/reject', protect, authorize('emergency:write'), async (req, res) => {
  try {
    // RIDE-B-12: a provider may only reject on its OWN behalf. The identity
    // comes from the session — a body `providerId` let any provider blacklist
    // its competitors out of a patient's dispatch pool.
    await EmergencyRequest.updateOne(
      { _id: req.params.id, status: 'searching' },
      { $addToSet: { rejections: String(req.user._id || req.user.id) } }
    );
    res.json({ success: true });
  } catch (err) {
    logger.error(`SOS reject error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/cancel', protect, requireSosAccess, async (req, res) => {
  try {
    const r = await EmergencyRequest.findById(req.params.id).select('userId status notified assignedProviderType assignedProviderId');
    if (!r) return res.status(404).json({ message: 'Request not found' });
    const isOwner = String(r.userId) === String(req.user._id || req.user.id);
    if (!isOwner && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Sirf request karne wala cancel kar sakta hai' });
    }
    if (!['searching', 'assigned', 'en_route'].includes(r.status)) {
      return res.json({ success: true, already: r.status });
    }
    // updateOne (save nahi) — purane docs pe full-validation 500 se bachne ke liye
    await EmergencyRequest.updateOne(
      { _id: r._id },
      { $set: { status: 'cancelled_by_user', cancelledAt: new Date(), updatedAt: new Date() } }
    );
    const io = getIO();
    if (io) {
      io.to(`emergency:${r._id}`).emit('emergency_cancelled', { requestId: String(r._id) });
      (r.notified || []).forEach((n) => io.to(`user:${n.userId}`).emit('emergency_closed', { requestId: String(r._id) }));
    }
    // free ambulance if assigned
    if (r.assignedProviderType === 'ambulance' && r.assignedProviderId) {
      await Ambulance.findByIdAndUpdate(r.assignedProviderId, { isOnDuty: false, currentEmergencyId: null }).catch(() => {});
    }
    res.json({ success: true });
  } catch (err) {
    logger.error(`SOS cancel error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id/complete', protect, authorize('emergency:write'), async (req, res) => {
  try {
    const r = await EmergencyRequest.findById(req.params.id);
    if (!r) return res.status(404).json({ message: 'Request not found' });
    // RIDE-B-11: closing a live SOS frees the assigned ambulance, so it must be
    // the assigned provider, the patient, or a superadmin — `emergency:write` is
    // held by many roles and was the only gate.
    if (!(await canAccessSos(req, r))) {
      return res.status(403).json({ message: 'Not authorized to complete this emergency request' });
    }
    if (['completed', 'cancelled_by_user'].includes(r.status)) {
      return res.json({ success: true, already: r.status });
    }
    r.status = 'completed';
    r.completedAt = new Date();
    await r.save();
    if (r.assignedProviderType === 'ambulance' && r.assignedProviderId) {
      await Ambulance.findByIdAndUpdate(r.assignedProviderId, { isOnDuty: false, currentEmergencyId: null }).catch(() => {});
    }
    const io = getIO();
    if (io) io.to(`emergency:${r._id}`).emit('emergency_completed', { requestId: String(r._id) });
    try {
      const noteUserId = r.assignedProviderType === 'ambulance'
        ? (await Ambulance.findById(r.assignedProviderId).select('userId').lean())?.userId
        : r.assignedProviderId;
      if (noteUserId) {
        const Notification = (await import('../models/Notification.js')).default;
        await Notification.create({
          title: 'Job Completed',
          message: `Job complete ho gaya — ${r.patientDetails?.name || 'Patient'}`,
          type: 'system',
          userId: String(noteUserId),
        });
      }
    } catch {}
    res.json({ success: true });
  } catch (err) {
    logger.error(`SOS complete error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id/nearby-hospitals', protect, requireSosAccess, async (req, res) => {
  try {
    const r = await EmergencyRequest.findById(req.params.id).select('location');
    if (!r) return res.status(404).json({ message: 'Request not found' });
    const [lng, lat] = r.location.coordinates;
    const hospitals = await Hospital.aggregate([
      { $geoNear: { near: { type: 'Point', coordinates: [Number(lng), Number(lat)] }, key: 'location.coordinates', distanceField: 'distanceMeters', maxDistance: 20000, spherical: true, query: { status: 'approved' } } },
      { $limit: 10 },
      { $project: { name: 1, address: 1, phone: 1, location: 1, distanceMeters: 1 } },
    ]).catch(() => []);
    res.json({ hospitals });
  } catch (err) {
    logger.error(`SOS nearby-hospitals error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id/select-hospital', protect, authorize('emergency:write'), async (req, res) => {
  try {
    const out = await selectDestinationHospital(req.params.id, req.body.hospitalId);
    if (out.status !== 'success') return res.status(400).json({ message: 'Could not set hospital' });
    res.json({ success: true, hospital: out.hospital });
  } catch (err) {
    logger.error(`SOS select-hospital error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── PUT /api/emergency-sos/:id/progress — provider updates job stage ───
router.put('/:id/progress', protect, requireSosAccess, async (req, res) => {
  try {
    const { stage } = req.body;
    const valid = ['reached_pickup', 'heading_to_hospital', 'reached_hospital'];
    if (!valid.includes(stage)) return res.status(400).json({ message: 'Invalid stage' });

    const request = await EmergencyRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (!['assigned', 'en_route'].includes(request.status)) {
      return res.status(400).json({ message: 'Job is not active' });
    }

    // Ownership: rider → assignedProviderId is userId; ambulance → check Ambulance.userId
    let allowed = false;
    if (request.assignedProviderType === 'ambulance') {
      const amb = await Ambulance.findById(request.assignedProviderId).select('userId').lean();
      allowed = !!amb && String(amb.userId) === String(req.user._id || req.user.id);
    } else {
      allowed = String(request.assignedProviderId) === String(req.user._id || req.user.id);
    }
    if (!allowed) return res.status(403).json({ message: 'Access denied' });

    request.progressStage = stage;
    request.progressLog.push({ stage, at: new Date() });
    if (stage === 'heading_to_hospital') request.status = 'en_route';
    await request.save();

    const io = getIO();
    if (io) {
      io.to(`emergency:${request._id}`).emit('emergency_progress', {
        requestId: String(request._id),
        stage,
        at: new Date(),
      });
    }
    try {
      const noteUserId = request.assignedProviderType === 'ambulance'
        ? (await Ambulance.findById(request.assignedProviderId).select('userId').lean())?.userId
        : request.assignedProviderId;
      if (noteUserId) {
        const Notification = (await import('../models/Notification.js')).default;
        await Notification.create({
          title: 'Job Progress Updated',
          message: `Stage: ${stage.replace(/_/g, ' ')}`,
          type: 'sos',
          userId: String(noteUserId),
          // NOTIF-B-05: SOS alerts are critical (never rate-capped/quiet-suppressed)
          // and de-duplicated per SOS + stage.
          priority: 'critical',
          dedupKey: `sos_stage:${request._id}:${stage}`,
        });
      }
    } catch {}
    res.json({ success: true, progressStage: request.progressStage });
  } catch (err) {
    logger.error(`SOS progress error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/emergency-sos/debug/eligible-providers (admin diagnostic) ───
router.get('/debug/eligible-providers', protect, authorize('emergency:read'), async (req, res) => {
  try {
    // RIDE-B-02: this enumerates every nearby provider's id and live location.
    // In production it is not a diagnostic, it is a dispatch fingerprint: knowing
    // which drivers are near a coordinate tells an attacker who is on duty and where.
    // It now answers 404 in production so the route is not even discoverable.
    if (process.env.NODE_ENV === 'production') {
      logger.warn('RIDE-B-02: /debug/eligible-providers accessed in production by ' + req.user?.id);
      return res.status(404).json({ message: 'Not found' });
    }
    if (!['superadmin', 'hospital_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const { lat, lng, radiusKm = 10 } = req.query;
    if (!lat || !lng) return res.status(400).json({ message: 'lat/lng required' });

    const [ambulances, vehicles] = await Promise.all([
      findEligibleAmbulances(Number(lng), Number(lat), Number(radiusKm), []),
      findEligibleEmergencyVehicles(Number(lng), Number(lat), Number(radiusKm), []),
    ]);
    const [totalRiders, onlineRiders, esRiders] = await Promise.all([
      RiderProfile.countDocuments({}),
      RiderProfile.countDocuments({ isOnline: true }),
      RiderProfile.countDocuments({ isOnline: true, emergencySupport: true }),
    ]);
    const [totalAmb, onlineAmb, esAmb] = await Promise.all([
      Ambulance.countDocuments({}),
      Ambulance.countDocuments({ isOnline: true }),
      Ambulance.countDocuments({ isOnline: true, emergencySupport: true }),
    ]);

    res.json({
      eligibleNow: { ambulances: ambulances.length, vehicles: vehicles.length },
      funnelRiders: { total: totalRiders, online: onlineRiders, onlineAndEmergencySupport: esRiders },
      funnelAmbulances: { total: totalAmb, online: onlineAmb, onlineAndEmergencySupport: esAmb },
    });
  } catch (err) {
    logger.error(`SOS eligible-providers error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/emergency-sos/:id/diagnostics (owner/admin snapshot) ───
router.get('/:id/diagnostics', protect, authorize('emergency:read'), async (req, res) => {
  try {
    const r = await EmergencyRequest.findById(req.params.id).lean();
    if (!r) return res.status(404).json({ message: 'Not found' });
    if (String(r.userId) !== String(req.user._id || req.user.id) && !['superadmin', 'hospital_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json({
      status: r.status,
      requestMode: r.requestMode,
      selectedVehicleTypes: r.selectedVehicleTypes,
      currentSearchRadiusKm: r.currentSearchRadiusKm,
      currentSearchPhase: r.currentSearchPhase,
      dispatchLog: r.dispatchLog || [],
      notifiedCount: (r.notified || []).length,
      acceptancesCount: (r.acceptances || []).length,
      windowEndsAt: r.windowEndsAt,
    });
  } catch (err) {
    logger.error(`SOS diagnostics error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/emergency-sos/:id (keep last — :id catch-all) ───
router.get('/:id', protect, authorize('emergency:read'), async (req, res) => {
  try {
    const em = await EmergencyRequest.findById(req.params.id).lean();
    if (!em) return res.status(404).json({ message: 'Request not found' });

    const isAdmin = req.user.role === 'superadmin' || req.user.role === 'hospital_admin';
    const isRequester = em.userId?.toString() === req.user._id.toString();
    if (!isAdmin && !isRequester) {
      return res.status(403).json({ message: 'Not authorized to view this emergency request' });
    }

    res.json({ emergency: em });
  } catch (err) {
    logger.error(`SOS get error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

export default router;
