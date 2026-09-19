import express from 'express';
import EmergencyRequest from '../models/EmergencyRequest.js';
import Hospital from '../models/Hospital.js';
import Ambulance from '../models/Ambulance.js';
import RiderProfile from '../models/RiderProfile.js';
import User from '../models/User.js';
import { protect, optionalProtect } from '../middleware/auth.js';
import { validate, emergencySOSSchema } from '../utils/validate.js';
import {
  startEmergencyDispatch,
  handleProviderAccept,
  selectDestinationHospital,
} from '../services/emergencyDispatchService.js';
import { calculateDistanceKm } from '../services/rideService.js';
import { getIO } from '../services/socketService.js';
import logger from '../config/logger.js';

const router = express.Router();

// ─── POST /api/emergency-sos ────────────────────────────────────────────────
router.post('/', protect, validate(emergencySOSSchema), async (req, res) => {
  try {
    const {
      reporterMode,
      patientDetails,
      reporterOwnDetailsShared,
      reporterDetails,
      category,
      address,
    } = req.body;
    let { lat, lng } = req.body;
    if ((lat === undefined || lng === undefined) && req.body.location?.coordinates?.length === 2) {
      [lng, lat] = req.body.location.coordinates;
    }

    const existingActive = await EmergencyRequest.findOne({
      userId: req.user._id,
      status: { $in: ['searching', 'assigned', 'en_route'] },
    });

    if (existingActive) {
      return res.status(400).json({
        message: 'You already have an active emergency request in progress.',
        requestId: existingActive._id,
        status: existingActive.status,
      });
    }

    let finalPatient = patientDetails || {};
    if (reporterMode === 'self') {
      finalPatient = {
        name: req.user.name || '',
        phone: req.user.phone || '',
        age: req.user.age || req.user.medicalProfile?.age || null,
        bloodGroup: req.user.bloodGroup || req.user.medicalProfile?.bloodGroup || '',
        knownAllergies: req.user.medicalProfile?.allergies || '',
        knownConditions: req.user.medicalProfile?.conditions || '',
        ...patientDetails,
      };
    }

    const emergency = await EmergencyRequest.create({
      userId: req.user._id,
      reporterMode,
      patientDetails: finalPatient,
      reporterOwnDetailsShared: reporterMode === 'other' ? Boolean(reporterOwnDetailsShared) : false,
      reporterDetails:
        reporterMode === 'other' && reporterOwnDetailsShared
          ? { name: req.user.name, phone: req.user.phone, ...reporterDetails }
          : undefined,
      category: category || '',
      location: {
        type: 'Point',
        coordinates: [Number(lng), Number(lat)],
        address: address || 'Emergency Location',
      },
      status: 'searching',
    });

    startEmergencyDispatch(emergency._id).catch(err => {
      logger.error(`startEmergencyDispatch background error: ${err.message}`);
    });

    res.status(201).json({
      success: true,
      message: 'Emergency request created. Dispatching nearest responder…',
      emergency,
    });
  } catch (err) {
    logger.error(`Create Emergency SOS error: ${err.message}`);
    res.status(500).json({ message: 'Failed to create emergency request', error: err.message });
  }
});

// ─── POST /api/emergency-sos/:id/cancel ─────────────────────────────────────
router.post('/:id/cancel', protect, async (req, res) => {
  try {
    const { reason } = req.body;
    const request = await EmergencyRequest.findOne({
      _id: req.params.id,
      userId: req.user._id,
      status: { $in: ['searching', 'assigned'] },
    });

    if (!request) {
      return res.status(404).json({ message: 'Active emergency request not found' });
    }

    request.status = 'cancelled_by_user';
    request.cancelledAt = new Date();
    await request.save();

    if (request.assignedProviderType === 'ambulance' && request.assignedProviderId) {
      await Ambulance.findByIdAndUpdate(request.assignedProviderId, { isOnDuty: false, currentEmergencyId: null });
    }

    const io = getIO();
    if (io) {
      io.to(`emergency:${request._id}`).emit('emergency_cancelled', {
        requestId: String(request._id),
        reason: reason || 'Cancelled by user',
      });
      if (request.assignedProviderId) {
        if (request.assignedProviderType === 'ambulance') {
          io.to(`ambulance:${request.assignedProviderId}`).emit('emergency_cancelled', {
            requestId: String(request._id),
            reason: reason || 'Cancelled by user',
          });
          // Also close all notified overlays for in-flight waves
          (request.notified || []).forEach(n =>
            io.to(`user:${n.userId}`).emit('emergency_closed', { requestId: String(request._id) }));
        } else {
          io.to(`user:${request.assignedProviderId}`).emit('emergency_cancelled', {
            requestId: String(request._id),
            reason: reason || 'Cancelled by user',
          });
        }
      } else {
        (request.notified || []).forEach(n =>
          io.to(`user:${n.userId}`).emit('emergency_closed', { requestId: String(request._id) }));
      }
    }

    res.json({ success: true, message: 'Emergency request cancelled', request });
  } catch (err) {
    res.status(500).json({ message: 'Failed to cancel emergency request', error: err.message });
  }
});

// ─── POST /api/emergency-sos/:id/accept (Doc 01 §6.5 — vote, 202 pending) ────
router.post('/:id/accept', protect, async (req, res) => {
  try {
    const { providerId, providerType } = req.body;

    let resolvedId = providerId;
    let resolvedType = providerType;

    if (!resolvedId) {
      // Ambulance login owners resolve via Ambulance.userId
      const ambulance = await Ambulance.findOne({ userId: req.user._id }).select('_id');
      if (ambulance) {
        resolvedId = String(ambulance._id);
        resolvedType = 'ambulance';
      } else {
        resolvedId = String(req.user._id);
        resolvedType = 'rider';
      }
    }

    const result = await handleProviderAccept(
      req.params.id,
      resolvedId,
      resolvedType || 'rider',
      req.user
    );

    const map = { accepted_pending: 202, too_late: 409, not_eligible: 403, forbidden: 403, not_found: 404 };
    return res.status(map[result.status] || 400).json({
      success: result.status === 'accepted_pending',
      ...result,
    });
  } catch (err) {
    logger.error(`Accept emergency error: ${err.message}`);
    res.status(500).json({ message: 'Failed to accept emergency', error: err.message });
  }
});

// ─── POST /api/emergency-sos/:id/reject (Doc 01 §6.5) ───────────────────────
router.post('/:id/reject', protect, async (req, res) => {
  try {
    const { providerId } = req.body;
    const pid = providerId || String(req.user._id);
    // Resolve ambulance providerId if caller is ambulance login without explicit id
    let resolved = pid;
    if (!providerId) {
      const amb = await Ambulance.findOne({ userId: req.user._id }).select('_id').lean();
      if (amb) resolved = String(amb._id);
    }
    await EmergencyRequest.updateOne(
      { _id: req.params.id, status: 'searching' },
      { $addToSet: { rejections: String(resolved) } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── PUT /api/emergency-sos/:id/complete (Doc 01 §8) ────────────────────────
router.put('/:id/complete', protect, async (req, res) => {
  try {
    const r = await EmergencyRequest.findOne({ _id: req.params.id, status: { $in: ['assigned', 'en_route'] } });
    if (!r) return res.status(404).json({ message: 'Active request nahi mili' });

    let ok = false;
    if (r.assignedProviderType === 'ambulance') {
      ok = await Ambulance.exists({ _id: r.assignedProviderId, userId: req.user._id });
    } else {
      ok = String(r.assignedProviderId) === String(req.user._id);
    }
    if (!ok) return res.status(403).json({ message: 'Ye request aapko assign nahi hai' });

    r.status = 'completed';
    r.completedAt = new Date();
    await r.save();
    if (r.assignedProviderType === 'ambulance') {
      await Ambulance.findByIdAndUpdate(r.assignedProviderId, { isOnDuty: false, currentEmergencyId: null });
    }

    getIO()?.to(`emergency:${r._id}`).emit('emergency_completed', { requestId: String(r._id) });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/emergency-sos/:id ─────────────────────────────────────────────
// Doc 03 §8: restrict to owner + assigned provider (no open reads)
router.get('/:id', protect, async (req, res) => {
  try {
    const request = await EmergencyRequest.findById(req.params.id)
      .populate('userId', 'name phone email avatar')
      .populate('assignedHospitalId', 'name address phone location')
      .populate('selectedHospitalId', 'name address phone location')
      .lean();

    if (!request) {
      return res.status(404).json({ message: 'Emergency request not found' });
    }

    const isOwner = String(request.userId?._id || request.userId) === String(req.user._id);
    let isProvider = false;
    if (request.assignedProviderType === 'ambulance') {
      isProvider = await Ambulance.exists({ _id: request.assignedProviderId, userId: req.user._id });
    } else if (request.assignedProviderId) {
      isProvider = String(request.assignedProviderId) === String(req.user._id);
    }
    // Notified providers may also sync state during their wave
    const isNotified = (request.notified || []).some(n => n.userId === String(req.user._id));
    const isAdmin = ['superadmin', 'hospital_admin'].includes(req.user.role);
    if (!isOwner && !isProvider && !isNotified && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to view this emergency' });
    }

    // Privacy: hide patient medical details from non-winner notified providers
    let out = request;
    if (isNotified && !isOwner && !isProvider && !isAdmin) {
      const { patientDetails, reporterDetails, ...rest } = request;
      out = { ...rest, patientDetails: undefined, reporterDetails: undefined };
    }

    let responder = null;
    if (request.status === 'assigned' || request.status === 'en_route') {
      if (request.assignedProviderType === 'ambulance' && request.assignedProviderId) {
        const amb = await Ambulance.findById(request.assignedProviderId)
          .populate('hospitalId', 'name address phone')
          .lean();
        if (amb) {
          let driverName = amb.driverName || 'Ambulance Driver';
          let driverPhone = amb.driverPhone || amb.currentDriverPhone;
          if (amb.userId) {
            const du = await User.findById(amb.userId).select('name phone').lean();
            if (du?.name) driverName = du.name;
            if (du?.phone) driverPhone = du.phone;
          }
          responder = {
            providerType: 'ambulance',
            hospitalName: amb.hospitalId?.name || 'Hospital',
            registrationNumber: amb.registrationNumber,
            ambulanceType: amb.ambulanceType,
            equipmentLevel: amb.equipmentLevel,
            driverName,
            driverPhone,
            currentLocation: amb.currentLocation,
          };
        }
      } else if (request.assignedProviderId) {
        const riderUser = await User.findById(request.assignedProviderId).select('name phone avatar').lean();
        const riderProfile = await RiderProfile.findOne({ userId: request.assignedProviderId })
          .populate('vehicleId')
          .lean();
        responder = {
          providerType: 'rider',
          driverName: riderUser?.name || 'Emergency Driver',
          driverPhone: riderUser?.phone,
          vehicleType: riderProfile?.vehicleId?.type || request.assignedVehicleType,
          currentLocation: riderProfile?.currentLocation,
        };
      }
    }

    res.json({ success: true, emergency: { ...out, responder } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/emergency-sos/:id/nearby-hospitals ────────────────────────────
router.get('/:id/nearby-hospitals', protect, async (req, res) => {
  try {
    const request = await EmergencyRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Emergency request not found' });

    const [lng, lat] = request.location.coordinates;

    const hospitals = await Hospital.find({
      status: 'approved',
      'location.coordinates': { $exists: true, $ne: [] },
    })
      .select('name address city phone emergency24x7 location rating')
      .lean();

    const withDistances = hospitals.map(h => {
      const hCoords = h.location?.coordinates;
      let dist = 5;
      if (hCoords && hCoords.length === 2) {
        dist = calculateDistanceKm(lat, lng, hCoords[1], hCoords[0]);
      }
      return { ...h, distanceKm: dist };
    });

    withDistances.sort((a, b) => a.distanceKm - b.distanceKm);

    res.json({ success: true, hospitals: withDistances.slice(0, 15) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── PUT /api/emergency-sos/:id/select-hospital ─────────────────────────────
router.put('/:id/select-hospital', protect, async (req, res) => {
  try {
    const { hospitalId } = req.body;
    if (!hospitalId) {
      return res.status(400).json({ message: 'hospitalId is required' });
    }

    const result = await selectDestinationHospital(req.params.id, hospitalId);
    if (result.status !== 'success') {
      return res.status(400).json({ message: result.message || 'Failed to select hospital' });
    }

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
