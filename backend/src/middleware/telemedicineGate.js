/**
 * Telemedicine gate (doc 05/09: NMC telemedicine rules - consent, ID,
 * prescribing limits). Blocks a teleconsult booking unless:
 *   1. patient identity is verified (User.isVerified),
 *   2. a GRANTED ConsentRecord exists for the patient+doctor (purpose
 *      contains 'telemedicine' or 'Telemedicine'),
 *   3. the practitioner offers a 'video'/'audio'/'chat' mode (prescribing
 *      only via supported modes).
 * The booking path posts the appointment payload under `req.body.appointment`,
 * so both shapes are accepted. In shadow mode violations are logged but allowed
 * (see shadowMode.js).
 */
import { auditLog } from './audit.js';
import User from '../models/User.js';
import ConsentRecord from '../models/ConsentRecord.js';
import Doctor from '../models/Doctor.js';
import PractitionerProfile from '../models/PractitionerProfile.js';
import { normalizeMode } from '../lib/appointmentModes.js';

const TELE_MODES = new Set(['video', 'audio', 'chat']);
const OBJECT_ID = /^[0-9a-f]{24}$/i;

function inferMode(body = {}) {
  const appt = body.appointment || {};
  const direct = appt.appointmentMode || body.appointmentMode || body.mode;
  if (direct) return String(normalizeMode(String(direct))).toLowerCase();
  const type = String(appt.type || body.type || '').toLowerCase();
  if (type.includes('video')) return 'video';
  if (type.includes('audio')) return 'audio';
  if (type.includes('chat')) return 'chat';
  return 'offline';
}

async function resolveDoctor(doctorId) {
  if (!doctorId) return { doctorUserId: null, supportsMode: () => true };
  const id = String(doctorId);
  if (OBJECT_ID.test(id)) {
    const doctor = await Doctor.findById(id).select('user_id appointmentModes').lean();
    if (doctor) {
      const modes = Array.isArray(doctor.appointmentModes) ? doctor.appointmentModes.map((m) => normalizeMode(m)) : null;
      return {
        doctorUserId: doctor.user_id ? String(doctor.user_id) : id,
        supportsMode: (mode) => !modes || modes.includes(mode),
      };
    }
    const profile = await PractitionerProfile.findOne({
      $or: [{ _id: id }, { userId: id }],
    }).select('userId modes').lean();
    if (profile) {
      const modes = Array.isArray(profile.modes) ? profile.modes.map((m) => normalizeMode(m.mode)) : null;
      return {
        doctorUserId: String(profile.userId || id),
        supportsMode: (mode) => !modes || modes.includes(mode),
      };
    }
  }
  return { doctorUserId: id, supportsMode: () => true };
}

export const telemedicineGate = async (req, res, next) => {
  try {
    const consultMode = inferMode(req.body);
    if (!TELE_MODES.has(consultMode)) return next();

    const patientId = req.user?._id || req.user?.id;
  // Staff/admin/doctor-created appointments are a separate flow; the gate
  // only enforces NMC rules on patient-initiated teleconsult bookings.
  if (req.user?.role && req.user.role !== 'patient') return next();
    const patient = await User.findById(patientId).select('isVerified').lean();
    if (!patient?.isVerified) {
      await auditLog('telemed_denied', req.user || {}, { reason: 'unverified_patient', ip: req.ip });
      return res.status(403).json({ message: 'Verify your account before teleconsult', code: 'TELEMED_UNVERIFIED' });
    }

    const appt = req.body.appointment || {};
    const doctorId = appt.doctorId || req.body.doctorId;
    const resolved = await resolveDoctor(doctorId);

    if (doctorId) {
      const consent = resolved.doctorUserId ? await ConsentRecord.findOne({
        patientId,
        doctorId: resolved.doctorUserId,
        status: 'GRANTED',
        expiresAt: { $gt: new Date() },
      }).lean() : null;
      const purposeOk = consent && /telemed/i.test(String(consent.purposeOfCare || ''));
      if (!consent || !purposeOk) {
        await auditLog('telemed_denied', req.user || {}, { reason: 'missing_consent', doctorId, ip: req.ip });
        return res.status(403).json({ message: 'Telemedicine consent required', code: 'TELEMED_CONSENT_REQUIRED' });
      }

      if (!resolved.supportsMode(consultMode)) {
        await auditLog('telemed_denied', req.user || {}, { reason: 'mode_not_supported', doctorId, mode: consultMode, ip: req.ip });
        return res.status(403).json({ message: 'Practitioner does not offer this teleconsult mode', code: 'TELEMED_MODE_UNSUPPORTED' });
      }
    }

    return next();
  } catch {
    return res.status(500).json({ message: 'Telemedicine gate error' });
  }
};
