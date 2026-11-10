/**
 * Telemedicine gate (doc 05/09: NMC telemedicine rules - consent, ID,
 * prescribing limits). Blocks a teleconsult booking unless:
 *   1. patient identity is verified (User.isVerified),
 *   2. a GRANTED ConsentRecord exists for the patient+doctor (purpose
 *      contains 'telemedicine' or 'Telemedicine'),
 *   3. the practitioner offers a 'video'/'audio'/'chat' mode (prescribing
 *      only via supported modes).
 * In shadow mode violations are logged but allowed (see shadowMode.js).
 */
import { auditLog } from './audit.js';
import User from '../models/User.js';
import ConsentRecord from '../models/ConsentRecord.js';
import PractitionerProfile from '../models/PractitionerProfile.js';

export const telemedicineGate = async (req, res, next) => {
  try {
    const patientId = req.user?._id || req.user?.id;
    const { doctorId, mode } = req.body || {};
    const consultMode = String(mode || 'video').toLowerCase();
    if (!['video', 'audio', 'chat'].includes(consultMode)) return next();

    const patient = await User.findById(patientId).select('isVerified').lean();
    if (!patient?.isVerified) {
      await auditLog('telemed_denied', req.user || {}, { reason: 'unverified_patient', ip: req.ip });
      return res.status(403).json({ message: 'Verify your account before teleconsult', code: 'TELEMED_UNVERIFIED' });
    }

    if (doctorId) {
      const consent = await ConsentRecord.findOne({
        patientId,
        doctorId,
        status: 'GRANTED',
        expiresAt: { $gt: new Date() },
      }).lean();
      const purposeOk = consent && /telemed/i.test(String(consent.purposeOfCare || ''));
      if (!consent || !purposeOk) {
        await auditLog('telemed_denied', req.user || {}, { reason: 'missing_consent', doctorId, ip: req.ip });
        return res.status(403).json({ message: 'Telemedicine consent required', code: 'TELEMED_CONSENT_REQUIRED' });
      }

      const profile = await PractitionerProfile.findOne({ userId: doctorId }).lean();
      const supportsMode = Array.isArray(profile?.modes) && profile.modes.some((m) => m.mode === consultMode);
      if (profile && !supportsMode) {
        await auditLog('telemed_denied', req.user || {}, { reason: 'mode_not_supported', doctorId, mode: consultMode, ip: req.ip });
        return res.status(403).json({ message: 'Practitioner does not offer this teleconsult mode', code: 'TELEMED_MODE_UNSUPPORTED' });
      }
    }

    return next();
  } catch {
    return res.status(500).json({ message: 'Telemedicine gate error' });
  }
};
