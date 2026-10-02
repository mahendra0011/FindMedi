/**
 * AUTHZ: may `req.user` read this patient's EHR through search?
 *
 * This is the missing half of the consent check. `searchEhr` already requires an
 * ABDM consent to exist; what it never did was check WHO is asking. Those are
 * different principals:
 *
 *   - the PATIENT granted consent to a treating clinician;
 *   - the CALLER is whoever happens to hold a token.
 *
 * Treating the first as evidence for the second is a straight-up confused-deputy
 * bug: any registered account could read any patient's diagnosis history, notes and
 * symptoms, as long as that patient had consented to anybody at all.
 *
 * The rule here is deliberately narrow and fail-closed:
 *   1. superadmin — unrestricted (break-glass is audited separately).
 *   2. The patient themselves — always, it is their own record.
 *   3. A clinician who appears in a LIVE consent for THIS patient, and — when a
 *      consentId is supplied — that exact consent. Supplying someone else's
 *      consentId must not widen access to a different patient.
 *   4. Hospital staff in the patient's own hospital, tenant match on both sides.
 *
 * Anything else is denied.
 */
import mongoose from 'mongoose';

const same = (a, b) => {
  if (a == null || b == null) return false;
  const norm = (v) => String(typeof v === 'object' ? (v._id ?? v.id ?? v) : v);
  return norm(a) === norm(b);
};

const STAFF_ROLES = new Set(['hospital_admin', 'admin']);

/** Roles that can be the counterparty on an ABDM consent. */
const CLINICIAN_ROLES = new Set([
  'doctor', 'clinic_doctor', 'hospital_admin', 'admin', 'superadmin',
  'therapist', 'psychiatrist', 'counsellor', 'counselor',
]);

export async function assertEhrSearchAccess(req, patientId, consentId = null) {
  const userId = req.user?._id;
  const role = req.user?.role;

  if (!userId) return { ok: false, reason: 'no-identity' };
  if (role === 'superadmin') return { ok: true, reason: 'superadmin' };

  // 1. Own record. Compare against both the User id and the Patient document id,
  //    because the two are different documents that both legitimately mean
  //    "this patient".
  if (same(userId, patientId)) return { ok: true, reason: 'own_record' };

  const { default: User } = await import('../models/User.js');
  const account = await User.findById(userId).select('hospitalId facilityId role').lean();
  if (account && same(account.patientId, patientId)) {
    return { ok: true, reason: 'own_patient_record' };
  }

  // 2. A live consent for THIS patient naming THIS caller.
  if (CLINICIAN_ROLES.has(role)) {
    const { default: ConsentRecord } = await import('../models/ConsentRecord.js');

    // When a consentId is supplied it must be this caller's own consent FOR THIS
    // PATIENT. Previously the lookup was `findOne({ consentId })` with no patient
    // binding, so one known id read any patient's records.
    if (consentId) {
      const exact = await ConsentRecord.findOne({
        consentId: String(consentId),
        patientId: String(patientId),
        doctorId: String(userId),
        status: 'GRANTED',
        ...(requireActiveExpiry()),
      }).lean();
      if (exact) return { ok: true, reason: 'named_consent' };
    }

    const grant = await ConsentRecord.findOne({
      patientId: String(patientId),
      doctorId: String(userId),
      status: 'GRANTED',
      ...(requireActiveExpiry()),
    }).lean();
    if (grant) return { ok: true, reason: 'live_consent' };
  }

  // 3. Hospital staff inside the patient's own hospital. Both tenants must be
  //    present and equal — "cannot determine" must never mean "allow".
  if (STAFF_ROLES.has(role)) {
    const { default: Patient } = await import('../models/Patient.js');
    const patient = await Patient.findById(patientId).select('hospitalId').lean();
    const callerTenant = account?.hospitalId || account?.facilityId;
    const patientTenant = patient?.hospitalId;
    if (callerTenant && patientTenant && String(callerTenant) === String(patientTenant)) {
      return { ok: true, reason: 'same_tenant_staff' };
    }
  }

  return { ok: false, reason: 'not-authorized' };
}

/**
 * Consent must not merely be GRANTED; it must not have lapsed.
 *
 * A record with no `expiresAt` is treated as still valid, which preserves the
 * behaviour of the original gate — but a record whose expiry has passed is
 * refused, because "granted at some point" is not "granted now".
 */
function requireActiveExpiry() {
  return {
    $or: [
      { expiresAt: null },
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } },
    ],
  };
}

/** Convenience for routes that already validated the id. */
export function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(String(id));
}

export default assertEhrSearchAccess;