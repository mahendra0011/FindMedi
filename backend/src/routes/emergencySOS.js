import express from 'express';
import EmergencyRequest from '../models/EmergencyRequest.js';
import Hospital from '../models/Hospital.js';
import Ambulance from '../models/Ambulance.js';
import { protect } from '../middleware/auth.js';
import {
  startEmergencyDispatch,
  handleProviderAccept,
  selectDestinationHospital,
} from '../services/emergencyDispatchService.js';
import {
  startManualModeSearch,
  bookChosenProvider,
  startAutoBookSearch,
  startAutoFindLoop,
} from '../services/sosVehicleService.js';
import SOSVehicleSettings from '../models/SOSVehicleSettings.js';
import { getIO } from '../services/socketService.js';
import logger from '../config/logger.js';

const router = express.Router();

// ─── POST /api/emergency-sos — legacy create (auto tiered dispatch) ───
router.post('/', protect, async (req, res) => {
  try {
    const { reporterMode = 'self', patientDetails = {}, reporterOwnDetailsShared, reporterDetails, category = '', lat, lng, address = '' } = req.body;
    if (lat === undefined || lng === undefined) return res.status(400).json({ message: 'lat/lng required' });
    const doc = await EmergencyRequest.create({
      userId: req.user._id || req.user.id,
      reporterMode,
      patientDetails,
      reporterOwnDetailsShared: !!reporterOwnDetailsShared,
      reporterDetails: reporterDetails || {},
      category,
      location: { type: 'Point', coordinates: [Number(lng), Number(lat)], address },
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
    startEmergencyDispatch(doc._id).catch((e) => logger.error(`dispatch fail ${doc._id}: ${e.message}`));
    res.status(201).json({ emergency: { _id: doc._id, id: doc._id, status: doc.status, requestMode: doc.requestMode } });
  } catch (err) {
    logger.error(`SOS create error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/emergency-sos/start — new 3-mode entry ───
router.post('/start', protect, async (req, res) => {
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
      lat, lng, address = '',
    } = req.body;
    if (lat === undefined || lng === undefined) return res.status(400).json({ message: 'lat/lng required' });
    if (requestMode === 'manual_select' && (!selectedVehicleTypes || !selectedVehicleTypes.length)) {
      return res.status(400).json({ message: 'Kam se kam ek vehicle type chuno' });
    }
    const request = await EmergencyRequest.create({
      userId: req.user._id || req.user.id,
      reporterMode,
      patientDetails,
      reporterOwnDetailsShared: !!reporterOwnDetailsShared,
      reporterDetails: reporterDetails || {},
      category,
      location: { type: 'Point', coordinates: [Number(lng), Number(lat)], address },
      status: 'searching',
      requestMode,
      selectedVehicleTypes: requestMode === 'manual_select' ? selectedVehicleTypes : requestMode === 'auto_select_ambulance' ? ['ambulance'] : ['auto', 'e_rickshaw', 'car', 'van', 'ambulance'],
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
      startAutoBookSearch(requestId, request.startingRadiusKm).catch((e) => logger.error(`autobook fail: ${e.message}`));
    } else if (requestMode === 'manual_select') {
      startManualModeSearch(requestId, request.startingRadiusKm).catch((e) => logger.error(`manual search fail: ${e.message}`));
    } else {
      startEmergencyDispatch(requestId).catch((e) => logger.error(`dispatch fail: ${e.message}`));
    }

    res.status(201).json({ requestId, requestMode: request.requestMode, status: request.status, mode: requestMode, startingRadiusKm: request.startingRadiusKm });
  } catch (err) {
    logger.error(`SOS start error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/emergency-sos/:id/book/:providerId ───
router.post('/:id/book/:providerId', protect, async (req, res) => {
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
router.post('/:id/search-again', protect, async (req, res) => {
  try {
    const cur = await EmergencyRequest.findById(req.params.id).select('currentSearchRadiusKm status');
    if (!cur) return res.status(404).json({ message: 'Request not found' });
    if (cur.status !== 'searching') return res.status(400).json({ message: 'Request not searching' });
    const result = await startManualModeSearch(req.params.id, cur.currentSearchRadiusKm || 5);
    if (result.error) return res.status(400).json({ message: result.error });
    res.json({ accepted: result.accepted || [], done: result.done });
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
    const result = await startManualModeSearch(req.params.id, km);
    if (result.error) return res.status(400).json({ message: result.error });
    res.json({ accepted: result.accepted || [], done: result.done });
  } catch (err) {
    logger.error(`SOS search-radius error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/emergency-sos/:id/accepted-candidates ───
router.get('/:id/accepted-candidates', protect, async (req, res) => {
  try {
    const r = await EmergencyRequest.findById(req.params.id).select('acceptances windowEndsAt userId');
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
router.get('/:id/status', protect, async (req, res) => {
  try {
    const request = await EmergencyRequest.findById(req.params.id).select(
      'status requestMode selectedVehicleTypes autoBookEnabled autoFindEnabled startingRadiusKm currentSearchRadiusKm currentSearchPhase dispatchLog notified acceptances windowEndsAt assignedProviderId assignedProviderType assignedVehicleType assignedHospitalId assignedAt selectedHospitalId'
    );
    if (!request) return res.status(404).json({ message: 'Request not found' });
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
router.post('/:id/accept', protect, async (req, res) => {
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

router.post('/:id/reject', protect, async (req, res) => {
  try {
    const { providerId } = req.body;
    await EmergencyRequest.updateOne(
      { _id: req.params.id, status: 'searching' },
      { $addToSet: { rejections: String(providerId || req.user._id || req.user.id) } }
    );
    res.json({ success: true });
  } catch (err) {
    logger.error(`SOS reject error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/cancel', protect, async (req, res) => {
  try {
    const r = await EmergencyRequest.findById(req.params.id);
    if (!r) return res.status(404).json({ message: 'Request not found' });
    r.status = 'cancelled_by_user';
    await r.save();
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

router.put('/:id/complete', protect, async (req, res) => {
  try {
    const r = await EmergencyRequest.findById(req.params.id);
    if (!r) return res.status(404).json({ message: 'Request not found' });
    r.status = 'completed';
    r.completedAt = new Date();
    await r.save();
    if (r.assignedProviderType === 'ambulance' && r.assignedProviderId) {
      await Ambulance.findByIdAndUpdate(r.assignedProviderId, { isOnDuty: false, currentEmergencyId: null }).catch(() => {});
    }
    const io = getIO();
    if (io) io.to(`emergency:${r._id}`).emit('emergency_completed', { requestId: String(r._id) });
    res.json({ success: true });
  } catch (err) {
    logger.error(`SOS complete error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id/nearby-hospitals', protect, async (req, res) => {
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

router.put('/:id/select-hospital', protect, async (req, res) => {
  try {
    const out = await selectDestinationHospital(req.params.id, req.body.hospitalId);
    if (out.status !== 'success') return res.status(400).json({ message: 'Could not set hospital' });
    res.json({ success: true, hospital: out.hospital });
  } catch (err) {
    logger.error(`SOS select-hospital error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/emergency-sos/:id (keep last — :id catch-all) ───
router.get('/:id', protect, async (req, res) => {
  try {
    const em = await EmergencyRequest.findById(req.params.id).lean();
    if (!em) return res.status(404).json({ message: 'Request not found' });
    res.json({ emergency: em });
  } catch (err) {
    logger.error(`SOS get error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

export default router;
