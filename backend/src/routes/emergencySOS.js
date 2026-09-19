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
// User creates Emergency SOS request (hold-to-confirm triggered)
router.post('/', protect, validate(emergencySOSSchema), async (req, res) => {
  try {
    const {
      reporterMode,
      patientDetails,
      reporterOwnDetailsShared,
      reporterDetails,
      category,
      lat,
      lng,
      address,
    } = req.body;

    // Check if user already has an active searching or assigned emergency request
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

    // Determine final patient details
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

    // Fire background two-phase dispatch engine
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
// User cancels active emergency request
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

    // If an ambulance was on duty for this request, free it up
    if (request.assignedProviderType === 'ambulance' && request.assignedProviderId) {
      await Ambulance.findByIdAndUpdate(request.assignedProviderId, { isOnDuty: false });
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
        } else {
          io.to(`user:${request.assignedProviderId}`).emit('emergency_cancelled', {
            requestId: String(request._id),
            reason: reason || 'Cancelled by user',
          });
        }
      }
    }

    res.json({ success: true, message: 'Emergency request cancelled', request });
  } catch (err) {
    res.status(500).json({ message: 'Failed to cancel emergency request', error: err.message });
  }
});

// ─── POST /api/emergency-sos/:id/accept ─────────────────────────────────────
// Responder accepts (ambulance driver or rider)
router.post('/:id/accept', protect, async (req, res) => {
  try {
    const { providerId, providerType } = req.body;

    // Resolve provider ID if not explicitly sent in body
    let resolvedId = providerId;
    let resolvedType = providerType;

    if (!resolvedId) {
      // Check if current user is linked to an ambulance
      const ambulance = await Ambulance.findOne({
        currentDriverId: req.user.staffId || req.user._id,
      });
      if (ambulance) {
        resolvedId = ambulance._id;
        resolvedType = 'ambulance';
      } else {
        // Independent rider
        resolvedId = req.user._id;
        resolvedType = 'rider';
      }
    }

    const result = await handleProviderAccept(
      req.params.id,
      resolvedId,
      resolvedType || 'rider',
      req.user
    );

    if (result.status === 'too_late') {
      return res.status(409).json({ message: result.message || 'Already assigned to another responder' });
    }
    if (result.status !== 'assigned') {
      return res.status(400).json({ message: result.message || 'Unable to accept emergency' });
    }

    res.json({ success: true, ...result });
  } catch (err) {
    logger.error(`Accept emergency error: ${err.message}`);
    res.status(500).json({ message: 'Failed to accept emergency', error: err.message });
  }
});

// ─── POST /api/emergency-sos/:id/reject ─────────────────────────────────────
// Provider explicitly rejects incoming alert
router.post('/:id/reject', protect, async (req, res) => {
  try {
    const { providerId } = req.body;
    res.json({ success: true, message: 'Emergency alert rejected' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/emergency-sos/:id ─────────────────────────────────────────────
// Fetch status and full details of emergency request
router.get('/:id', optionalProtect, async (req, res) => {
  try {
    const request = await EmergencyRequest.findById(req.params.id)
      .populate('userId', 'name phone email avatar')
      .populate('assignedHospitalId', 'name address phone location')
      .populate('selectedHospitalId', 'name address phone location')
      .lean();

    if (!request) {
      return res.status(404).json({ message: 'Emergency request not found' });
    }

    // Attach responder details if assigned
    let responder = null;
    if (request.status === 'assigned' || request.status === 'en_route') {
      if (request.assignedProviderType === 'ambulance' && request.assignedProviderId) {
        const amb = await Ambulance.findById(request.assignedProviderId)
          .populate('hospitalId', 'name address phone')
          .populate('currentDriverId', 'name contactNumber')
          .lean();
        if (amb) {
          responder = {
            providerType: 'ambulance',
            hospitalName: amb.hospitalId?.name || 'Hospital',
            registrationNumber: amb.registrationNumber,
            ambulanceType: amb.ambulanceType,
            equipmentLevel: amb.equipmentLevel,
            driverName: amb.currentDriverId?.name || 'Ambulance Driver',
            driverPhone: amb.currentDriverId?.contactNumber || amb.currentDriverPhone,
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

    res.json({ success: true, emergency: { ...request, responder } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/emergency-sos/:id/nearby-hospitals ────────────────────────────
// Fetch nearby hospitals sorted by distance from the patient's location
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
// Responder selects destination hospital
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
