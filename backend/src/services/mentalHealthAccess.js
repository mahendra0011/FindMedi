/**
 * MIND-B-01 / MIND-B-02 — mental-health access and crisis-escalation helpers.
 *
 * Why a dedicated service rather than the generic `authorizeObject`:
 * mental-health records are the highest-sensitivity PHI class in the platform
 * (DPDP "special category" / HIPAA psychotherapy note), and their access rule is
 * not the same shape as a prescription or a lab order. Three properties are
 * specific to this data class:
 *
 *   1. PATIENT AUTHORSHIP — the patient may always read their own record, even
 *      outside the tenant that created it (a referral to a specialist must not
 *      cut the patient off from their own history).
 *   2. SAME-TENANT TREATMENT TEAM — clinicians may read within their own
 *      hospital/facility ONLY, and never a row whose tenant is missing (the
 *      existing `req.user.hospitalId && r.hospitalId` checks fail OPEN when
 *      either side is unset — the defect behind MIND-B-01).
 *   3. CONSENT SCOPE — when `consentBasis.scope` is `Care Team Only`, family and
 *      insurer roles are excluded even inside the same tenant.
 */

import logger from '../config/logger.js';

/** Clinical roles that may read a psychiatric record inside their own tenant. */
export const MENTAL_HEALTH_CLINICAL_ROLES = Object.freeze([
  'doctor', 'hospital_admin', 'admin', 'superadmin', 'clinic_doctor',
  'therapist', 'psychiatrist', 'counsellor', 'counselor', 'psychologist',
  'mental_health_provider',
]);

/** Roles whose access is additionally governed by `consentBasis.scope`. */
export const MENTAL_HEALTH_BOUNDED_ROLES = Object.freeze([
  'family', 'caregiver', 'insurer', 'insurance', 'employer', 'employer_admin',
]);

/** Roles permitted to acknowledge a crisis event (safety-critical writes). */
export const MENTAL_HEALTH_CRISIS_ACK_ROLES = Object.freeze([
  'superadmin', 'admin', 'hospital_admin', 'doctor', 'clinic_doctor',
  'therapist', 'psychiatrist', 'psychologist', 'counsellor', 'counselor',
]);

/**
 * MIND-B-02: response deadlines, in minutes, by severity.
 *
 * These are clinical SLAs, not arbitrary numbers. `Immediate` means imminent risk
 * to life (suicidality, active psychosis) and is a 15-minute window because that
 * is roughly the difference between a phone call arriving in time and not.
 */
export const CRISIS_SLA_MINUTES = Object.freeze({
  Immediate: 15,
  High: 4 * 60,      // 4 hours
  Medium: 24 * 60,   // 24 hours
});

const sameId = (a, b) => {
  if (!a || !b) return false;
  return String(a) === String(b);
};

/**
 * MIND-B-02: risk values that MUST open a crisis event.
 *
 * A crisis is opened by the SERVER from the assessment the clinician submits —
 * never by the client sending a `crisis: true` flag, which would let anyone
 * either suppress a real risk or manufacture a false one.
 */
export function isCrisisSeverity(severity) {
  return severity === 'Immediate' || severity === 'High';
}

/**
 * The Mongo filter for unacknowledged, unresolved High/Immediate crises.
 *
 * Kept here rather than inlined in the route so the "what counts as an open
 * crisis" rule has exactly one definition — a second, slightly different query in
 * the queue route would silently hide breaches from the on-call list.
 */
export const openCrisisQuery = () => ({
  'crisisEvents.acknowledgedAt': null,
  'crisisEvents.resolvedAt': null,
  $or: [
    { 'crisisEvents.severity': 'Immediate' },
    { 'crisisEvents.severity': 'High' },
  ],
});

/**
 * Build the authorisation decision for one mental-health referral.
 *
 * @returns {{ ok: boolean, reason?: string, code?: string }}
 *   `ok: false` with `code: 'not_found'` means the caller must receive 404 — we
 *   do not confirm the existence of another tenant's psychiatric record.
 */
export function assertMentalHealthAccess(user, referral, opts = {}) {
  if (!user || !referral) return { ok: false, code: 'not_found', reason: 'not_found' };
  if (user.role === 'superadmin') return { ok: true, reason: 'superadmin' };

  // 1. The patient themselves — always allowed, tenant or not.
  if (sameId(user._id, referral.patientId) || sameId(user.patientId, referral.patientId)) {
    return { ok: true, reason: 'own_record' };
  }
  if (user.role === 'patient') {
    return { ok: false, code: 'not_found', reason: 'not_a_participant' };
  }

  // 2. Bounded (family / insurer) roles — same tenant AND within consent scope.
  if (MENTAL_HEALTH_BOUNDED_ROLES.includes(user.role)) {
    const tenant = user.hospitalId || user.facilityId;
    if (!tenant || !sameId(tenant, referral.hospitalId)) {
      return { ok: false, code: 'not_found', reason: 'cross_tenant' };
    }
    if (!referral.consentToShare) {
      return { ok: false, code: 'forbidden', reason: 'consent_scope_excludes_third_parties' };
    }
    const scope = referral.consentBasis?.scope || 'Care Team Only';
    if (scope === 'Care Team Only') {
      return { ok: false, code: 'forbidden', reason: 'consent_scope_is_care_team_only' };
    }
    return { ok: true, reason: 'consented_third_party' };
  }

  // 3. Clinical roles — same tenant, FAIL CLOSED.
  if (!MENTAL_HEALTH_CLINICAL_ROLES.includes(user.role)) {
    return { ok: false, code: 'forbidden', reason: 'role_not_permitted' };
  }
  const tenant = user.hospitalId || user.facilityId;
  // Both sides must have a tenant and they must match. The previous check was
  // `if (req.user.hospitalId && r.hospitalId?.toString() !== ...)`, which ALLOWS
  // whenever either side is unset — that is MIND-B-01 in one line.
  if (!tenant) {
    return { ok: false, code: 'forbidden', reason: 'caller_has_no_tenant' };
  }
  if (!referral.hospitalId) {
    return { ok: false, code: 'forbidden', reason: 'record_has_no_tenant' };
  }
  if (!sameId(tenant, referral.hospitalId)) {
    return { ok: false, code: 'not_found', reason: 'cross_tenant' };
  }

  // 4. Some actions are narrower than a general read.
  if (opts.action === 'crisis_ack' && !MENTAL_HEALTH_CRISIS_ACK_ROLES.includes(user.role)) {
    return { ok: false, code: 'forbidden', reason: 'role_cannot_acknowledge_crisis' };
  }

  return { ok: true, reason: 'same_tenant_clinical' };
}

 /**
 * Send the correct HTTP response for a denial. Kept separate so every call site
 * cannot accidentally answer 403 where 404 is required (existence disclosure).
 */
export function denyMentalHealth(res, decision) {
  if (decision.code === 'not_found') {
    return res.status(404).json({ message: 'Referral not found' });
  }
  logger.warn('MIND-B-01: mental-health access denied reason=' + decision.reason);
  return res.status(403).json({ message: 'Access denied' });
}

/**
 * MIND-B-02: open a crisis event with its SLA deadline.
 *
 * Server-derived from the submitted risk assessment. Returns the event so the
 * caller can notify on-call and audit it.
 */
export function openCrisisEvent({ severity, risk, flaggedBy }) {
  const minutes = CRISIS_SLA_MINUTES[severity] ?? CRISIS_SLA_MINUTES.High;
  const flaggedAt = new Date();
  return {
    severity,
    risk: risk || '',
    flaggedAt,
    flaggedBy: flaggedBy || null,
    responseDueAt: new Date(flaggedAt.getTime() + minutes * 60 * 1000),
    acknowledgedAt: null,
    acknowledgedBy: null,
    escalatedAt: null,
    escalatedTo: '',
    actionTaken: '',
    resolvedAt: null,
    notes: '',
  };
}
