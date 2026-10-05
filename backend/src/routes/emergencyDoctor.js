import express from 'express';
import EmergencyDoctorRequest from '../models/EmergencyDoctorRequest.js';
import Doctor from '../models/Doctor.js';
import { protect, authorize } from '../middleware/auth.js';
import { bookingLimiter } from '../middleware/rateLimit.js';
import { getIO } from '../services/socketService.js';
import { startEmergencyDoctorDispatch, acceptEmergencyDoctorRequest, rejectEmergencyDoctorRequest } from '../services/emergencyDoctorDispatchService.js';
import { upsertProviderLocationCache, removeProviderFromCache } from '../lib/h3Cache.js';
import logger from '../config/logger.js';
import { releaseProviderClaim } from '../services/instantDispatchService.js';
import { randomDigits } from '../utils/secureRandom.js';

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

/**
 * Ownership check for a single emergency-doctor request (RIDE-B-14/15).
 * Allowed: the patient who raised it, the doctor assigned to it, a superadmin.
 * Works with both raw ObjectIds and populated documents.
 */
function canAccessEmergencyDoctorRequest(req, request) {
  if (!request) return false;
  if (req.user?.role === 'superadmin') return true;
  const id = (v) => (v && typeof v === 'object' ? String(v._id) : v ? String(v) : null);
  if (id(request.patientId) && id(request.patientId) === String(req.user._id)) return true;
  if (id(request.assignedDoctorUserId) && id(request.assignedDoctorUserId) === String(req.user._id)) return true;
  if (id(request.assignedDoctorId) && id(request.assignedDoctorId) === String(req.user._id)) return true;
  return false;
}

// ─── 1. POST /api/emergency-doctor/dispatch ──────────────────────────────
router.post('/dispatch', protect, authorize('emergency:write'), bookingLimiter, async (req, res) => {
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

    const bookingId = `DOC-SOS-${Date.now().toString(36).toUpperCase()}-${randomDigits(3)}`;

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

    // Spec 09 §4 / Spec 23 §4: ESI-style severity score (1 = critical … 5 = mild).
    const severityText = `${emergencyCategory || ''} ${symptomsDescription || ''}`;
    const severityScore = /chest|cardiac|heart|stroke|seizure|unconscious/i.test(severityText) ? 1
      : /breath|asthma|anaphylaxis|overdose|suicid/i.test(severityText) ? 2
      : /injur|accident|burn|bleed|fracture/i.test(severityText) ? 3
      : /fever|pain|vomit|dizz/i.test(severityText) ? 4 : 5;
    emergencyDoc.severityScore = severityScore;
    emergencyDoc.timeline.push({ stage: 'triaged', timestamp: new Date(), note: `Severity score ${severityScore}/5` });
    await emergencyDoc.save();

    // Trigger unified wave dispatch with H3 pre-filter and Mongo fallback
    startEmergencyDoctorDispatch(emergencyDoc._id).catch((err) => {
      logger.error(`startEmergencyDoctorDispatch error: ${err.message}`);
    });

    res.status(201).json({
      success: true,
      message: 'Emergency doctor flying squad requested. Dispatched via wave engine.',
      booking: emergencyDoc,
      requestId: emergencyDoc._id,
      bookingId: emergencyDoc.bookingId,
    });
  } catch (err) {
    logger.error(`Emergency doctor dispatch error: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 2. PUT /api/emergency-doctor/toggle-duty ─────────────────────────────
router.put('/toggle-duty', protect, authorize('emergency:write'), async (req, res) => {
  try {
    const { isEmergencyDutyActive, emergencyRadiusKm = 10, coordinates } = req.body;
    const userId = req.user._id || req.user.id;

    const updateFields = {
      emergencySupport: isEmergencyDutyActive !== undefined ? isEmergencyDutyActive : true,
      isEmergencyDutyActive: !!isEmergencyDutyActive,
      emergencyRadiusKm: Number(emergencyRadiusKm) || 10,
    };

    if (coordinates && coordinates.length === 2) {
      const lat = Number(coordinates[1]);
      const lng = Number(coordinates[0]);
      const h3Result = await upsertProviderLocationCache({
        providerId: userId,
        providerType: 'doctor',
        lat,
        lng,
      });

      updateFields.emergencyDoctorLocation = {
        type: 'Point',
        coordinates: [lng, lat],
        lat,
        lng,
        h3Index8: h3Result?.h3Index8 || null,
        h3Index9: h3Result?.h3Index9 || null,
        lastUpdatedAt: new Date(),
      };
    }

    if (isEmergencyDutyActive === false) {
      removeProviderFromCache({ providerId: userId, providerType: 'doctor' }).catch(() => {});
    }

    let doctor = await Doctor.findOneAndUpdate(
      { user_id: userId },
      { $set: updateFields },
      { new: true }
    );

    if (!doctor) {
      doctor = await Doctor.findByIdAndUpdate(userId, { $set: updateFields }, { new: true });
      if (!doctor) {
        return res.status(404).json({ success: false, message: 'Doctor profile not found for this account' });
      }
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
router.post('/:requestId/accept', protect, authorize('emergency:write'), async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user._id || req.user.id;

    const doctor = await Doctor.findOne({ user_id: userId });
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor profile not found' });

    // Concurrency lock check
    const existingReq = await EmergencyDoctorRequest.findById(requestId);
    if (!existingReq) return res.status(404).json({ success: false, message: 'Request not found' });
    if (existingReq.status !== 'searching') {
      return res.status(409).json({ success: false, message: 'This emergency has already been claimed by another physician' });
    }

    // RIDE-B-16: eligibility before the claim.
    //  1) the doctor profile must be approved,
    //  2) the doctor must actually be on emergency duty (no duty => no claim),
    //  3) the doctor must have a real location and be within the service radius —
    //     the [0,0] fallback used to fabricate a huge ETA that the patient was
    //     shown for a doctor who was never dispatched.
    if (doctor.approved === false) {
      return res.status(403).json({ success: false, message: 'Your doctor profile is not approved for emergency duty' });
    }
    if (doctor.emergencyDoctorOnDuty === false || doctor.isOnEmergencyDuty === false) {
      return res.status(403).json({ success: false, message: 'You are not on emergency duty' });
    }
    const rawCoords = doctor.emergencyDoctorLocation?.coordinates;
    const hasRealLocation = Array.isArray(rawCoords)
      && rawCoords.length === 2
      && Number.isFinite(Number(rawCoords[0]))
      && Number.isFinite(Number(rawCoords[1]))
      && !(Number(rawCoords[0]) === 0 && Number(rawCoords[1]) === 0);
    if (!hasRealLocation) {
      return res.status(403).json({ success: false, message: 'Share your live location before accepting an emergency' });
    }
    const doctorCoords = rawCoords;
    const patientCoords = existingReq.pickupLocation.coordinates;
    const distKm = calculateDistanceKm(doctorCoords, patientCoords);
    const radiusKm = Number(doctor.emergencyRadiusKm || doctor.emergencyDoctorRadiusKm || existingReq.startingRadiusKm || 25);
    if (distKm > radiusKm) {
      return res.status(403).json({ success: false, message: `You are ${distKm} km away — outside your ${radiusKm} km emergency radius` });
    }
    const etaMinutes = Math.max(3, Math.round(distKm * 2.5));

    // RIDE-B-16: the claim is applied ATOMICALLY with `{ status: 'searching' }`
    // in the filter, so two doctors racing for the same emergency cannot both win
    // (the loser gets null and a 409).
    const doctorClaimed = await Doctor.findOneAndUpdate(
      { _id: doctor._id, activeDispatchRequestId: null },
      { $set: { activeDispatchRequestId: requestId } },
      { new: true, select: '_id' }
    );
    if (!doctorClaimed) return res.status(409).json({ success: false, message: 'You are already assigned to an active emergency' });

    let updated;
    try {
      updated = await EmergencyDoctorRequest.findOneAndUpdate(
        { _id: requestId, status: 'searching' },
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
    } catch (error) {
      await releaseProviderClaim('emergency_doctor', userId, requestId).catch((releaseError) => {
        logger.error(`Failed to release doctor claim after accept error: ${releaseError.message}`);
      });
      throw error;
    }

    // RIDE-B-16: the loser's atomic update returns null (someone else claimed it).
    if (!updated) {
      await releaseProviderClaim('emergency_doctor', userId, requestId);
      return res.status(409).json({ success: false, message: 'This emergency has already been claimed by another physician' });
    }

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
router.put('/:requestId/telemetry', protect, authorize('emergency:read'), async (req, res) => {
  try {
    const { requestId } = req.params;
    const { coordinates, heading = 0, speed = 0 } = req.body;

    if (!coordinates || coordinates.length !== 2) {
      return res.status(400).json({ success: false, message: 'Coordinates [lng, lat] required' });
    }

    // RIDE-B-14: telemetry may only be written by the doctor assigned to THIS
    // request. `authorize('emergency:read')` is granted to patients and staff
    // alike, so any holder could spoof another patient's live doctor location.
    const telemetryScope = req.user.role === 'superadmin'
      ? { _id: requestId }
      : { _id: requestId, assignedDoctorUserId: req.user._id };

    const updated = await EmergencyDoctorRequest.findByIdAndUpdate(
      telemetryScope,
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

    if (!updated) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this emergency request' });
    }
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
router.put('/:requestId/status', protect, authorize('emergency:write'), async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, note = '', clinicalReport } = req.body;

    const allowed = ['en_route', 'arrived', 'in_triage', 'completed', 'escalated_to_ambulance'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status: ${status}` });
    }

    // ED-M-01 lifecycle parity: terminal states are idempotent, non-terminal
    // transitions are CAS-guarded so a duplicate `completed` or a stale
    // client cannot move a closed request, matching assistant/lawyer 409s.
    const existingReq = await EmergencyDoctorRequest.findById(requestId).select('status').lean();
    if (!existingReq) {
      return res.status(404).json({ success: false, message: 'Emergency request not found' });
    }
    const TERMINAL_ED = ['completed', 'cancelled_by_user', 'cancelled_by_doctor', 'escalated_to_ambulance'];
    if (TERMINAL_ED.includes(existingReq.status)) {
      const idempotent = existingReq.status === status
        || (existingReq.status === 'escalated_to_ambulance' && status === 'escalated_to_ambulance');
      return res.status(idempotent ? 200 : 409).json({
        success: idempotent,
        message: idempotent ? 'Request was already closed' : `Cannot move a ${existingReq.status} request to ${status}`,
      });
    }
    const ELIGIBLE_ED = {
      en_route: ['assigned', 'in_progress'],
      arrived: ['en_route', 'assigned', 'in_progress'],
      in_triage: ['arrived', 'en_route', 'assigned', 'in_progress'],
      completed: ['assigned', 'in_progress', 'en_route', 'arrived', 'in_triage'],
      escalated_to_ambulance: ['assigned', 'in_progress', 'en_route', 'arrived', 'in_triage'],
    };
    if (!((ELIGIBLE_ED[status] || []).includes(existingReq.status))) {
      return res.status(409).json({
        success: false,
        message: `Cannot move a ${existingReq.status} request to ${status}`,
      });
    }

    const updateData = { status };
    if (clinicalReport) {
      updateData.clinicalReport = clinicalReport;
    }

    // RIDE-B-14: only the assigned doctor (or a superadmin) may drive the
    // lifecycle of an emergency request — otherwise any user holding
    // `emergency:write` could complete/escalate somebody else's SOS.
    // ED-M-01: the status predicate is part of the filter so a concurrent
    // close wins atomically (loser gets null → 409, never a double close).
    const statusScope = req.user.role === 'superadmin'
      ? { _id: requestId, status: existingReq.status }
      : { _id: requestId, assignedDoctorUserId: req.user._id, status: existingReq.status };

    const updated = await EmergencyDoctorRequest.findOneAndUpdate(
      statusScope,
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

    if (!updated) {
      const latestStatus = await EmergencyDoctorRequest.findById(requestId).select('status').lean();
      if (latestStatus && latestStatus.status !== existingReq.status) {
        return res.status(latestStatus.status === status ? 200 : 409).json({
          success: latestStatus.status === status,
          message: latestStatus.status === status ? 'Request was already closed' : `Request is now ${latestStatus.status}`,
        });
      }
      return res.status(403).json({ success: false, message: 'You are not assigned to this emergency request' });
    }
    if (['completed', 'escalated_to_ambulance'].includes(status) && updated.assignedDoctorUserId) {
      await releaseProviderClaim('emergency_doctor', updated.assignedDoctorUserId, updated._id);
    }

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
    // RIDE-B-15: `protect` alone leaked the whole request (patient name/phone/
    // email, live location, clinical report) to any logged-in account.
    if (!canAccessEmergencyDoctorRequest(req, request)) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this emergency request' });
    }
    res.json({ success: true, request });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 8. POST /api/emergency-doctor/:requestId/cancel ─────────────────────
router.post('/:requestId/cancel', protect, authorize('emergency:write'), async (req, res) => {
  try {
    const { requestId } = req.params;
    const { reason = 'Cancelled by user' } = req.body;

    // RIDE-B-15: `cancelledBy` came from the body, so any caller could forge the
    // audit trail ("cancelled_by_user" vs "cancelled_by_doctor"). It is derived
    // from the session now, and ownership is enforced.
    const existing = await EmergencyDoctorRequest.findById(requestId);
    if (!existing) return res.status(404).json({ success: false, message: 'Emergency request not found' });
    if (!canAccessEmergencyDoctorRequest(req, existing)) {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this emergency request' });
    }
    const isAssignedDoctor = String(existing.assignedDoctorUserId || '') === String(req.user._id);
    const cancelledBy = isAssignedDoctor ? 'doctor' : 'patient';

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

    if (existing.assignedDoctorId) await releaseProviderClaim('emergency_doctor', existing.assignedDoctorId, existing._id);
    res.json({ success: true, message: 'Emergency doctor request cancelled', request: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 8b. POST /api/emergency-doctor/:requestId/room ────────────────────────
// Spec 09: issue an encrypted video-triage session for an assigned consultation.
router.post('/:requestId/room', protect, async (req, res) => {
  try {
    const docReq = await EmergencyDoctorRequest.findById(req.params.requestId);
    if (!docReq) return res.status(404).json({ success: false, message: 'Request not found' });
    const me = String(req.user._id || req.user.id);
    const isParty = [String(docReq.userId), String(docReq.patientId), String(docReq.assignedDoctorUserId)].includes(me);
    if (!isParty && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Not a party to this consultation' });
    }
    if (!['assigned', 'in_progress'].includes(docReq.status)) {
      return res.status(400).json({ success: false, message: 'Room available only for active consultations' });
    }
    const { randomUUID } = await import('crypto');
    if (!docReq.webrtcRoom?.sessionId) {
      docReq.webrtcRoom = {
        sessionId: `EDR-${Date.now().toString(36).toUpperCase()}`,
        token: randomUUID(),
        startedAt: new Date(),
        endedAt: null,
      };
      if (docReq.status === 'assigned') docReq.status = 'in_progress';
      docReq.timeline.push({ stage: 'video_room_opened', timestamp: new Date(), note: 'Video triage session issued' });
      await docReq.save();
    }
    const io = getIO();
    io?.to(`emergency_doctor:${docReq._id}`).emit('emergency_doctor:status_changed', {
      requestId: String(docReq._id),
      status: docReq.status,
      videoSessionId: docReq.webrtcRoom.sessionId,
    });
    res.json({ success: true, room: { sessionId: docReq.webrtcRoom.sessionId, token: docReq.webrtcRoom.token } });
  } catch (err) {
    logger.error(`Video room error: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 9. POST /api/emergency-doctor/:requestId/escalate ─────────────────────
// Spec 09: doctor escalates to ALS ambulance mid-consultation — spins up a
// linked SOS EmergencyRequest and starts ambulance dispatch.
router.post('/:requestId/escalate', protect, authorize('emergency:write'), async (req, res) => {
  try {
    const { requestId } = req.params;
    const docReq = await EmergencyDoctorRequest.findById(requestId);
    if (!docReq) return res.status(404).json({ success: false, message: 'Request not found' });
    if (!['assigned', 'in_progress'].includes(docReq.status)) {
      return res.status(400).json({ success: false, message: 'Only active consultations can be escalated' });
    }
    const doctorId = String(req.user._id || req.user.id);
    if (docReq.assignedDoctorUserId && String(docReq.assignedDoctorUserId) !== doctorId && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Only the assigned doctor can escalate' });
    }

    const symptomToCategory = {
      chest_pain: 'heart_attack',
      breathing_issue: 'breathing_issue',
      injury: 'accident',
      severe_pain: 'other',
      high_fever: 'other',
      mental_health_crisis: 'other',
      other: 'other',
    };
    const { default: EmergencyRequest } = await import('../models/EmergencyRequest.js');
    const { startEmergencyDispatch } = await import('../services/emergencyDispatchService.js');
    const sos = await EmergencyRequest.create({
      userId: docReq.userId,
      reporterMode: 'other',
      patientDetails: {
        name: docReq.patientName || docReq.patientDetails?.name || 'Emergency Patient',
        age: docReq.patientAge ?? docReq.patientDetails?.age ?? null,
        gender: docReq.patientDetails?.gender || '',
        phone: docReq.patientPhone || docReq.patientDetails?.phone || '',
      },
      category: symptomToCategory[docReq.symptomCategory] || 'other',
      location: {
        type: 'Point',
        coordinates: docReq.location?.coordinates || docReq.pickupLocation?.coordinates || [79.9864, 23.1815],
        address: docReq.location?.address || docReq.pickupAddress || '',
      },
    });
    docReq.status = 'escalated_to_ambulance';
    docReq.timeline.push({ stage: 'escalated_to_ambulance', timestamp: new Date(), note: `Escalated to SOS ${sos._id} by doctor` });
    await docReq.save();
    if (docReq.assignedDoctorUserId) {
      await releaseProviderClaim('emergency_doctor', docReq.assignedDoctorUserId, docReq._id);
    }
    startEmergencyDispatch(sos._id).catch((err) => logger.error(`Escalated SOS dispatch error: ${err.message}`));

    const io = getIO();
    io?.to(`emergency_doctor:${requestId}`).emit('emergency_doctor:status_changed', {
      requestId: String(requestId),
      status: 'escalated_to_ambulance',
      sosRequestId: String(sos._id),
    });
    res.status(201).json({ success: true, message: 'Escalated to ambulance dispatch', sosRequestId: sos._id, request: docReq });
  } catch (err) {
    logger.error(`Escalate to ambulance error: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
