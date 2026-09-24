import express from 'express';
import EmergencyDoctorRequest from '../models/EmergencyDoctorRequest.js';
import Doctor from '../models/Doctor.js';
import { protect } from '../middleware/auth.js';
import { getIO } from '../services/socketService.js';
import logger from '../config/logger.js';

const router = express.Router();

/**
 * Helper to calculate haversine distance between two [lng, lat] coordinates in km
 */
function calculateDistanceKm(coord1, coord2) {
  const [lng1, lat1] = coord1;
  const [lng2, lat2] = coord2;
  const R = 6371; // Earth radius km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// ─── 1. POST /api/emergency-doctor/dispatch ──────────────────────────────
router.post('/dispatch', protect, async (req, res) => {
  try {
    const {
      patientName,
      patientPhone,
      patientAge,
      patientGender,
      bloodGroup,
      pickupLocation, // { type: 'Point', coordinates: [lng, lat] }
      pickupAddress,
      landmark,
      emergencyCategory,
      symptomsDescription,
      severity = 'Severe',
    } = req.body;

    if (!pickupLocation?.coordinates || pickupLocation.coordinates.length !== 2) {
      return res.status(400).json({ success: false, message: 'Valid GPS coordinates required' });
    }

    const bookingId = `DOC-SOS-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    const emergencyDoc = await EmergencyDoctorRequest.create({
      bookingId,
      patientId: req.user._id || req.user.id,
      patientName: patientName || req.user.name || 'Emergency Patient',
      patientPhone: patientPhone || req.user.phone || '',
      patientAge: patientAge || null,
      patientGender: patientGender || '',
      bloodGroup: bloodGroup || 'Unknown',
      pickupLocation,
      pickupAddress: pickupAddress || 'Current GPS Location',
      landmark: landmark || '',
      emergencyCategory: emergencyCategory || 'General Medical Emergency',
      symptomsDescription: symptomsDescription || '',
      severity,
      status: 'searching',
      timeline: [
        {
          stage: 'created',
          timestamp: new Date(),
          note: `Emergency request triggered: ${emergencyCategory}`,
          coordinates: pickupLocation.coordinates,
        },
      ],
    });

    // Cascading search for available Clinic Doctors with emergencySupport: true & isEmergencyDutyActive: true
    const searchRadiusKm = 10;
    const eligibleDoctors = await Doctor.find({
      emergencySupport: true,
      isEmergencyDutyActive: true,
      available: true,
      emergencyDoctorLocation: {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: pickupLocation.coordinates,
          },
          $maxDistance: searchRadiusKm * 1000,
        },
      },
    }).limit(5);

    // Fallback: if nearSphere fails or no docs in exact sphere, look for any on-duty doctor
    let targetDoctors = eligibleDoctors;
    if (!targetDoctors.length) {
      targetDoctors = await Doctor.find({
        emergencySupport: true,
        isEmergencyDutyActive: true,
        available: true,
      }).limit(5);
    }

    // Broadcast Socket event to target doctors
    try {
      const io = getIO();
      if (io) {
        targetDoctors.forEach((doc) => {
          if (doc.user_id) {
            io.to(`user_${doc.user_id}`).emit('emergency_doctor:incoming_alert', {
              requestId: emergencyDoc._id,
              bookingId: emergencyDoc.bookingId,
              patientName: emergencyDoc.patientName,
              emergencyCategory: emergencyDoc.emergencyCategory,
              pickupAddress: emergencyDoc.pickupAddress,
              coordinates: emergencyDoc.pickupLocation.coordinates,
              severity: emergencyDoc.severity,
              pricing: emergencyDoc.pricing,
            });
          }
        });
      }
    } catch (socketErr) {
      logger.warn(`Emergency doctor socket broadcast notice: ${socketErr.message}`);
    }

    res.status(201).json({
      success: true,
      message: 'Emergency doctor search initiated',
      request: emergencyDoc,
      candidateDoctorsCount: targetDoctors.length,
    });
  } catch (err) {
    logger.error(`Emergency doctor dispatch error: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 2. PUT /api/emergency-doctor/toggle-duty ─────────────────────────────
router.put('/toggle-duty', protect, async (req, res) => {
  try {
    const { isEmergencyDutyActive, emergencyRadiusKm = 10, coordinates } = req.body;
    const userId = req.user._id || req.user.id;

    const updateFields = {
      emergencySupport: isEmergencyDutyActive !== undefined ? isEmergencyDutyActive : true,
      isEmergencyDutyActive: !!isEmergencyDutyActive,
      emergencyRadiusKm: Number(emergencyRadiusKm) || 10,
    };

    if (coordinates && coordinates.length === 2) {
      updateFields.emergencyDoctorLocation = {
        type: 'Point',
        coordinates: [Number(coordinates[0]), Number(coordinates[1])],
        lastUpdatedAt: new Date(),
      };
    }

    const doctor = await Doctor.findOneAndUpdate(
      { user_id: userId },
      { $set: updateFields },
      { new: true }
    );

    if (!doctor) {
      // Fallback: check if id matches _id directly
      const doctorById = await Doctor.findByIdAndUpdate(userId, { $set: updateFields }, { new: true });
      if (!doctorById) {
        return res.status(404).json({ success: false, message: 'Doctor profile not found for this account' });
      }
      return res.json({ success: true, doctor: doctorById });
    }

    res.json({ success: true, doctor });
  } catch (err) {
    logger.error(`Toggle emergency duty error: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 3. GET /api/emergency-doctor/duty-status ─────────────────────────────
router.get('/duty-status', protect, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    let doctor = await Doctor.findOne({ user_id: userId });
    if (!doctor) {
      doctor = await Doctor.findById(userId);
    }
    if (!doctor) {
      return res.json({ success: true, isEmergencyDutyActive: false, emergencyRadiusKm: 10 });
    }
    res.json({
      success: true,
      isEmergencyDutyActive: !!doctor.isEmergencyDutyActive,
      emergencySupport: !!doctor.emergencySupport,
      emergencyRadiusKm: doctor.emergencyRadiusKm || 10,
      location: doctor.emergencyDoctorLocation,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 4. POST /api/emergency-doctor/:requestId/accept ──────────────────────
router.post('/:requestId/accept', protect, async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user._id || req.user.id;

    let doctor = await Doctor.findOne({ user_id: userId });
    if (!doctor) doctor = await Doctor.findById(userId);
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor profile not found' });

    // Concurrency lock check
    const existingReq = await EmergencyDoctorRequest.findById(requestId);
    if (!existingReq) return res.status(404).json({ success: false, message: 'Request not found' });
    if (existingReq.status !== 'searching') {
      return res.status(409).json({ success: false, message: 'This emergency has already been claimed by another physician' });
    }

    const doctorCoords = doctor.emergencyDoctorLocation?.coordinates || [0, 0];
    const patientCoords = existingReq.pickupLocation.coordinates;
    const distKm = calculateDistanceKm(doctorCoords, patientCoords);
    const etaMinutes = Math.max(3, Math.round(distKm * 2.5));

    const updated = await EmergencyDoctorRequest.findByIdAndUpdate(
      requestId,
      {
        $set: {
          assignedDoctorId: doctor._id,
          assignedDoctorUserId: userId,
          clinicId: doctor.facilityId || null,
          status: 'assigned',
          transitDistanceKm: distKm,
          estimatedArrivalMinutes: etaMinutes,
          doctorLiveLocation: {
            type: 'Point',
            coordinates: doctorCoords,
            updatedAt: new Date(),
          },
        },
        $push: {
          timeline: {
            stage: 'assigned',
            timestamp: new Date(),
            note: `Accepted by Dr. ${doctor.name}`,
            coordinates: doctorCoords,
          },
        },
      },
      { new: true }
    );

    // Notify Patient via Socket
    try {
      const io = getIO();
      if (io) {
        io.to(`user_${existingReq.patientId}`).emit('emergency_doctor:doctor_assigned', {
          requestId: updated._id,
          doctor: {
            id: doctor._id,
            name: doctor.name,
            phone: doctor.phone,
            specialization: doctor.specialization,
            photo: doctor.profile_photo,
            etaMinutes,
            distanceKm: distKm,
          },
        });
      }
    } catch {}

    res.json({ success: true, request: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 5. PUT /api/emergency-doctor/:requestId/telemetry ────────────────────
router.put('/:requestId/telemetry', protect, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { coordinates, heading = 0, speed = 0 } = req.body;

    if (!coordinates || coordinates.length !== 2) {
      return res.status(400).json({ success: false, message: 'Coordinates [lng, lat] required' });
    }

    const updated = await EmergencyDoctorRequest.findByIdAndUpdate(
      requestId,
      {
        $set: {
          'doctorLiveLocation.coordinates': coordinates,
          'doctorLiveLocation.heading': heading,
          'doctorLiveLocation.speed': speed,
          'doctorLiveLocation.updatedAt': new Date(),
        },
      },
      { new: true }
    );

    // Stream update to patient in real-time
    try {
      const io = getIO();
      if (io && updated) {
        io.to(`user_${updated.patientId}`).emit('emergency_doctor:gps_update', {
          requestId: updated._id,
          coordinates,
          heading,
          speed,
        });
      }
    } catch {}

    res.json({ success: true, location: updated?.doctorLiveLocation });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 6. PUT /api/emergency-doctor/:requestId/status ──────────────────────
router.put('/:requestId/status', protect, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, note = '', clinicalReport } = req.body;

    const allowed = ['en_route', 'arrived', 'in_triage', 'completed', 'escalated_to_ambulance'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status: ${status}` });
    }

    const updateData = { status };
    if (clinicalReport) {
      updateData.clinicalReport = clinicalReport;
    }

    const updated = await EmergencyDoctorRequest.findByIdAndUpdate(
      requestId,
      {
        $set: updateData,
        $push: {
          timeline: {
            stage: status,
            timestamp: new Date(),
            note,
          },
        },
      },
      { new: true }
    );

    // Notify patient
    try {
      const io = getIO();
      if (io && updated) {
        io.to(`user_${updated.patientId}`).emit('emergency_doctor:status_changed', {
          requestId: updated._id,
          status,
          note,
        });
      }
    } catch {}

    res.json({ success: true, request: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 7. GET /api/emergency-doctor/:requestId ──────────────────────────────
router.get('/:requestId', protect, async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = await EmergencyDoctorRequest.findById(requestId)
      .populate('assignedDoctorId', 'name specialization phone profile_photo hospitalId facilityId')
      .populate('patientId', 'name phone email');

    if (!request) return res.status(404).json({ success: false, message: 'Emergency request not found' });
    res.json({ success: true, request });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 8. POST /api/emergency-doctor/:requestId/cancel ─────────────────────
router.post('/:requestId/cancel', protect, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { reason = 'Cancelled by user', cancelledBy = 'patient' } = req.body;

    const updated = await EmergencyDoctorRequest.findByIdAndUpdate(
      requestId,
      {
        $set: {
          status: cancelledBy === 'doctor' ? 'cancelled_by_doctor' : 'cancelled_by_user',
          cancelledBy,
          cancellationReason: reason,
        },
        $push: {
          timeline: {
            stage: 'cancelled',
            timestamp: new Date(),
            note: `Cancelled (${cancelledBy}): ${reason}`,
          },
        },
      },
      { new: true }
    );

    res.json({ success: true, message: 'Emergency doctor request cancelled', request: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
