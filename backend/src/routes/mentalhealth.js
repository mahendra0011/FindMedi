import express from 'express';
import { z } from 'zod';
import MentalHealth from '../models/MentalHealth.js';
import User from '../models/User.js';
import Billing from '../models/Billing.js';
import Notification from '../models/Notification.js';
import { protect, adminOnly, authorize } from '../middleware/auth.js';
import { validate, createMentalHealthReferralSchema } from '../utils/validate.js';
import { generateOrderId, generateInvoiceId } from '../utils/idGenerator.js';
import { getISTDateString } from '../utils/dateUtils.js';
import { escapeRegex, capSearch } from '../utils/escapeRegex.js';
import { auditLog } from '../middleware/audit.js';
import { authorizeObject } from '../middleware/authorize.js';
import { sendServerError } from '../utils/safeError.js';
import logger from '../config/logger.js';
import {
  denyMentalHealth,
  openCrisisEvent,
  MENTAL_HEALTH_CLINICAL_ROLES,
  MENTAL_HEALTH_CRISIS_ACK_ROLES,
} from '../services/mentalHealthAccess.js';
import {
  assertPurposeConsent,
  retentionDeadlineFor,
  sweepRetention,
  sessionsPastRetention,
  buildRenewal,
  isLapsed,
  MH_PURPOSES,
  DEFAULT_RETENTION_DAYS,
} from '../services/mentalHealthConsent.js';
import {
  score,
  trend,
  INSTRUMENTS,
  INSTRUMENT_IDS,
  RESPONSE_OPTIONS,
} from '../services/mentalHealthScreening.js';
import {
  assertMentalHealthAccess,
  isCrisisSeverity,
  CRISIS_SLA_MINUTES,
  openCrisisQuery,
} from '../services/mentalHealthAccess.js';

// P3 + P1 #6: explicit shape instead of passthrough. Flat keys mirror the
// assessment sub-doc in models/MentalHealth.js (mongoose strict drops anything
// else on save), and treatmentPlan/treatmentType/riskAssessment/diagnosis/
// riskNotes are the fields the handler below actually reads — nothing else
// survives validate(). Values are TYPE-checked now: bounded text for the
// narrative fields, the model's own enums for the coded ones — `z.any()`
// accepted arbitrary objects/arrays as a "riskAssessment".
const assessmentShape = {
  mentalStatus: z.string().max(4000).optional(),
  personalHistory: z.string().max(8000).optional(),
  familyHistory: z.string().max(8000).optional(),
  socialHistory: z.string().max(8000).optional(),
  riskAssessment: z.enum(['Low', 'Medium', 'High', 'Immediate']).optional(),
  diagnosis: z.string().max(2000).optional(),
  diagnosisCode: z.string().max(60).optional(),
  treatmentPlan: z.string().max(8000).optional(),
  treatmentType: z.enum(['Medication', 'Therapy', 'Counseling', 'Combined']).optional(),
  riskNotes: z.string().max(4000).optional(),
};
const mhAssessmentSchema = z.object({
  ...assessmentShape,
  // The crisis trigger also reads a NESTED body.assessment?.riskAssessment
  // (mentalhealth.js risk check) as an alternate payload shape.
  assessment: z.object(assessmentShape).optional(),
});
// P1-5: the client may edit ONLY these two fields. `date`, `conductedBy`,
// `retainUntil` and `consentId` are stamped by the handler below, and unknown
// keys are stripped by zod so they cannot be smuggled through the spread.
const mhSessionSchema = z.object({
  type: z.string().max(160).optional(),
  notes: z.string().max(8000).optional(),
});
// P3 + P1 #6: explicit allowlist — prescribedBy/prescribedAt are stamped by
// the handler (adminOnly route), so a client cannot pre-set them or smuggle
// other keys into the medication sub-doc. Values bounded: a "dosage" is text,
// not an arbitrary JSON value.
const mhMedicationSchema = z.object({
  name: z.string().trim().max(300).optional(),
  dosage: z.string().trim().max(300).optional(),
  frequency: z.string().trim().max(300).optional(),
});
const mhFamilySchema = z.object({ familyMemberName: z.string().optional(), relationship: z.string().optional(), involvementType: z.string().optional(), notes: z.string().optional(), contactNumber: z.string().optional() });
const mhConsentSchema = z.object({ consentType: z.string().optional(), documentUrl: z.string().optional(), expiryDate: z.string().optional(), notes: z.string().optional() });
const mhBillingSchema = z.object({ amount: z.number().optional(), description: z.string().optional(), sessionType: z.string().optional() });

// MIND-B-01: the client's purpose/scope choices are validated, but the
// classification and the consent timestamps are set by the SERVER. A client must
// not be able to mark its own record as anything other than special-category
// data, and must not be able to backdate a consent.
const mhPurposeSchema = z.object({
  purposeOfProcessing: z.enum([
    'Assessment', 'Direct Care', 'Crisis Intervention',
    'Court Ordered', 'Insurance Claim', 'Family Support',
  ]).optional(),
  consentGrantedBy: z.enum(['Patient', 'Guardian', 'Court Order', 'Emergency']).optional(),
  consentReference: z.string().max(120).optional(),
  consentScope: z.enum(['Care Team Only', 'Care Team + Family', 'Care Team + Insurer']).optional(),
  refusedMarketing: z.boolean().optional(),
  refusedResearch: z.boolean().optional(),
  refusedThirdParty: z.boolean().optional(),
});

// MIND-B-02: acknowledging a crisis is a distinct, auditable act.
const mhCrisisAckSchema = z.object({
  actionTaken: z.string().trim().min(3, 'Describe the action taken').max(2000),
  notes: z.string().trim().max(2000).optional(),
});

const router = express.Router();

router.post('/referrals', protect, validate(createMentalHealthReferralSchema), validate(mhPurposeSchema), async (req, res) => {
  try {
    const { patientId, referralSource, referrerName } = req.body;
    if (!patientId) return res.status(400).json({ message: 'Patient required' });
    if (!MENTAL_HEALTH_CLINICAL_ROLES.includes(req.user.role)) {
      return res.status(403).json({ message: 'Mental-health referral access required' });
    }
    const patient = await User.findById(patientId)
      .select('_id name role hospitalId facilityId')
      .lean();
    if (!patient || patient.role !== 'patient') {
      return res.status(404).json({ message: 'Patient not found' });
    }
    if (req.user.role !== 'superadmin') {
      const callerTenant = String(req.user.hospitalId || req.user.facilityId || '');
      const patientTenant = String(patient.hospitalId || patient.facilityId || '');
      if (!callerTenant || callerTenant !== patientTenant) {
        return res.status(404).json({ message: 'Patient not found' });
      }
    }

    // MIND-B-01: the SPECIAL-CATEGORY classification is set here, on the server,
    // and there is no way for a client to override it. Everything below records
    // WHY this data is held and under WHOSE authority, which is what DPDP §4 and
    // HIPAA purpose-limitation require of special-category processing.
    const referralId = generateOrderId('MH');
    const record = await MentalHealth.create({
      referralId,
      patientId,
      patientName: patient.name,
      referralSource: referralSource || 'Doctor',
      referrerName: referrerName || req.user.name,
      hospitalId: req.user.hospitalId || req.user.facilityId || undefined,
      createdBy: req.user._id,

      // Server-owned, not client-settable.
      dataClassification: 'PSYCHIATRIC_SPECIAL_CATEGORY',
      purposeOfProcessing: req.body.purposeOfProcessing || (referralSource === 'Emergency' ? 'Crisis Intervention' : 'Assessment'),
      consentBasis: {
        grantedBy: req.body.consentGrantedBy || 'Patient',
        // Server timestamp — a client cannot backdate a consent.
        consentRecordedAt: new Date(),
        consentReference: req.body.consentReference || '',
        scope: req.body.consentScope || 'Care Team Only',
        explicitlyRefused: {
          marketing: req.body.refusedMarketing === true,
          research: req.body.refusedResearch === true,
          thirdPartyDisclosure: req.body.refusedThirdParty === true,
        },
      },
    });

    // MIND-B-01: creation of a psychiatric record is itself an auditable act.
    await auditLog('create_mental_health_referral', req.user._id, {
      referralId,
      patientId,
      purposeOfProcessing: record.purposeOfProcessing,
      consentBasis: record.consentBasis.grantedBy,
      scope: record.consentBasis.scope,
      classification: record.dataClassification,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(201).json({
      referral: {
        _id: record._id,
        referralId: record.referralId,
        patientId: record.patientId,
        patientName: record.patientName,
        status: record.status,
        createdAt: record.createdAt,
      },
    });
  } catch (err) { sendServerError(res, err, 'Could not create the referral'); }
});

// File 23 §3.3: referral LISTS carry patient identity — platform roles
// (incl. superadmin) pass only with an approved break-glass grant.
// Aggregates live on GET /referrals/stats (no identities, k-anonymous).
router.get('/referrals/stats', protect, async (req, res) => {
  try {
    const allowed = ['superadmin', 'platform_admin', 'dpo', 'clinical_safety', 'analyst', 'support_l2'];
    if (!allowed.includes(req.user.role)
      && !MENTAL_HEALTH_CLINICAL_ROLES.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const match = {};
    if (MENTAL_HEALTH_CLINICAL_ROLES.includes(req.user.role)) {
      const tenantId = req.user.hospitalId || req.user.facilityId;
      if (!tenantId) return res.status(403).json({ message: 'Facility scope required' });
      match.hospitalId = tenantId;
    }
    const [byStatus, total] = await Promise.all([
      MentalHealth.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      MentalHealth.countDocuments(match),
    ]);
    // k-anonymity: suppress small cells so individuals can't be inferred.
    const safe = byStatus.map((s) => ({ status: s._id, count: s.count >= 10 ? s.count : 0 }));
    return res.json({ total, byStatus: safe });
  } catch (err) { sendServerError(res, err, 'Could not load referral stats'); }
});

router.get('/referrals', protect, async (req, res) => {
  try {
    const { status, search } = req.query;
    let filter;
    if (req.user.role === 'superadmin') {
      const { default: BreakGlassGrant } = await import('../models/BreakGlassGrant.js');
      const grant = await BreakGlassGrant.findOne({
        requesterId: req.user._id || req.user.id,
        status: 'approved',
        expiresAt: { $gt: new Date() },
      });
      if (!grant) {
        return res.status(403).json({ message: 'Break-glass approval required', code: 'BREAK_GLASS_REQUIRED' });
      }
      req.breakGlass = grant;
      filter = {};
    } else if (req.user.role === 'patient') {
      filter = { patientId: req.user._id };
    } else if (MENTAL_HEALTH_CLINICAL_ROLES.includes(req.user.role)) {
      const tenantId = req.user.hospitalId || req.user.facilityId;
      if (!tenantId) return res.status(403).json({ message: 'Facility scope required' });
      filter = { hospitalId: tenantId };
    } else {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (status && status !== 'All') filter.status = status;
    if (search) filter.$or = [{ referralId: new RegExp(escapeRegex(capSearch(search)), 'i') }, { patientName: new RegExp(escapeRegex(capSearch(search)), 'i') }];
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 25));
    const [referrals, total] = await Promise.all([
      MentalHealth.find(filter)
        .select('referralId patientId patientName referralSource status hospitalId createdAt')
        .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      MentalHealth.countDocuments(filter),
    ]);
    await auditLog('view_mental_health_referrals', req.user._id, {
      count: referrals.length, page,
      ...(req.breakGlass ? { grantId: String(req.breakGlass._id), reasonCode: req.breakGlass.reasonCode } : {}),
    });
    res.json({ referrals, page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (err) { sendServerError(res, err, 'Could not load referrals'); }
});

router.put('/referrals/:id/assessment', protect, validate(mhAssessmentSchema), async (req, res) => {
  try {
    const r = await MentalHealth.findById(req.params.id);
    if (!r) return res.status(404).json({ message: 'Not found' });
      // MIND-B-01: fail CLOSED via the shared special-category guard. The old
      // line was `req.user.hospitalId && r.hospitalId?.toString() !== ...`, which
      // ALLOWS whenever EITHER side has no tenant - so a clinician with no
      // hospitalId, or a row created before tenancy was recorded, was readable
      // and writable by ANY authenticated account. This is the highest-sensitivity
      // PHI class in the product, so it gets the strictest rule.
      const access = assertMentalHealthAccess(req.user, r);
      if (!access.ok) return denyMentalHealth(res, access);
    r.assessment = req.body;
    r.treatmentPlan = req.body.treatmentPlan;
    r.treatmentType = req.body.treatmentType;
    r.status = 'Active';

    // MIND-B-02: a High/Immediate risk assessment OPENS a crisis event
    // automatically, on the server. Previously the risk value was stored and
    // nothing happened — no notification, no deadline, no acknowledgement field —
    // so a suicidal patient could be flagged and then sit unread indefinitely.
    //
    // The trigger is derived from the assessment the clinician submitted, never
    // from a client-sent `crisis: true` flag: otherwise a client could suppress a
    // real risk, or manufacture a false one to flood the on-call queue.
    const risk = req.body.riskAssessment || req.body.assessment?.riskAssessment;
    if (isCrisisSeverity(risk) && !(r.crisisEvents || []).some(
      (c) => !c.resolvedAt && c.severity === risk
    )) {
      const event = openCrisisEvent({
        severity: risk,
        risk: req.body.diagnosis || req.body.riskNotes || '',
        flaggedBy: req.user._id,
      });
      r.crisisEvents = r.crisisEvents || [];
      r.crisisEvents.push(event);
      r.openCrisisCount = (r.openCrisisCount || 0) + 1;
      r.lastCrisisAt = event.flaggedAt;
      // Audit and log the escalation on its own so a failure there cannot roll
      // back the clinical record that has just been saved.
      auditLog('open_crisis_event', req.user._id, {
        referralId: r.referralId,
        patientId: r.patientId,
        severity: risk,
        responseDueAt: event.responseDueAt,
      }).catch((e) => logger.error(`MIND-B-02: crisis audit failed: ${e.message}`));
      logger.error(
        `MIND-B-02: CRISIS OPENED referral=${r.referralId} severity=${risk} `
        + `responseDueAt=${event.responseDueAt.toISOString()}`
      );
    }

    await r.save();
    res.json(r);
  } catch (err) { sendServerError(res, err, 'Could not save the assessment'); }
});

router.post('/referrals/:id/session', protect, validate(mhSessionSchema), async (req, res) => {
  try {
    const r = await MentalHealth.findById(req.params.id);
    if (!r) return res.status(404).json({ message: 'Not found' });
      // MIND-B-01: fail CLOSED via the shared special-category guard. The old
      // line was `req.user.hospitalId && r.hospitalId?.toString() !== ...`, which
      // ALLOWS whenever EITHER side has no tenant - so a clinician with no
      // hospitalId, or a row created before tenancy was recorded, was readable
      // and writable by ANY authenticated account. This is the highest-sensitivity
      // PHI class in the product, so it gets the strictest rule.
      const access = assertMentalHealthAccess(req.user, r);
      if (!access.ok) return denyMentalHealth(res, access);

    // MIND-M-04: a therapy session is a use of the patient's record, so it needs
    // a live consent that covers `treatment`. Previously a session could be
    // written against a referral whose only consent was revoked or lapsed, and
    // it carried no retention deadline, so nothing could ever expire it.
    const consentCheck = assertPurposeConsent(r, 'treatment');
    if (!consentCheck.ok) {
      return res.status(403).json({
        message: consentCheck.reason === 'no-consent-on-record'
          ? 'No consent on record for this referral. Record treatment consent before recording sessions.'
          : 'Active treatment consent is required (current consent is revoked, expired, or does not cover treatment).',
        reason: consentCheck.reason,
      });
    }

    r.sessions.push({
      ...req.body,
      date: new Date(),
      conductedBy: req.user.name,
      bookedBy: req.user._id,
      // Stamped from the governing consent, not a global default, so renewing
      // with a different window actually moves the deadline.
      retainUntil: retentionDeadlineFor(consentCheck.consent),
      consentId: consentCheck.consent._id ? String(consentCheck.consent._id) : null,
    });
    await r.save();
    res.json(r);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Medication Management ───────────────────────────────────────────────────
router.put('/referrals/:id/medication', protect, adminOnly, validate(mhMedicationSchema), async (req, res) => {
  try {
    const r = await MentalHealth.findById(req.params.id);
    if (!r) return res.status(404).json({ message: 'Not found' });
      // MIND-B-01: fail CLOSED via the shared special-category guard. The old
      // line was `req.user.hospitalId && r.hospitalId?.toString() !== ...`, which
      // ALLOWS whenever EITHER side has no tenant - so a clinician with no
      // hospitalId, or a row created before tenancy was recorded, was readable
      // and writable by ANY authenticated account. This is the highest-sensitivity
      // PHI class in the product, so it gets the strictest rule.
      const access = assertMentalHealthAccess(req.user, r);
      if (!access.ok) return denyMentalHealth(res, access);
    const med = req.body;
    med.prescribedBy = req.user.name;
    med.prescribedAt = new Date();
    r.medications.push(med);
    await r.save();
    res.json(r);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// Family Involvement Tracking
router.post('/referrals/:id/family', protect, validate(mhFamilySchema), async (req, res) => {
  try {
    const { familyMemberName, relationship, involvementType, notes, contactNumber } = req.body;
    const r = await MentalHealth.findById(req.params.id);
    if (!r) return res.status(404).json({ message: 'Not found' });
      // MIND-B-01: fail CLOSED via the shared special-category guard. The old
      // line was `req.user.hospitalId && r.hospitalId?.toString() !== ...`, which
      // ALLOWS whenever EITHER side has no tenant - so a clinician with no
      // hospitalId, or a row created before tenancy was recorded, was readable
      // and writable by ANY authenticated account. This is the highest-sensitivity
      // PHI class in the product, so it gets the strictest rule.
      const access = assertMentalHealthAccess(req.user, r);
      if (!access.ok) return denyMentalHealth(res, access);
    
    r.familyInvolvement.push({
      familyMemberName,
      relationship,
      involvementType: involvementType || 'Support',
      notes: notes || '',
      contactNumber: contactNumber || '',
      addedBy: req.user.name,
      addedAt: new Date()
    });
    
    await r.save();
    res.json(r);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// Consent Document Upload
router.post('/referrals/:id/consent', protect, validate(mhConsentSchema), async (req, res) => {
  try {
    const { consentType, documentUrl, expiryDate, notes, purposes, retentionDays } = req.body;
    const r = await MentalHealth.findById(req.params.id);
    if (!r) return res.status(404).json({ message: 'Not found' });
      // MIND-B-01: fail CLOSED via the shared special-category guard. The old
      // line was `req.user.hospitalId && r.hospitalId?.toString() !== ...`, which
      // ALLOWS whenever EITHER side has no tenant - so a clinician with no
      // hospitalId, or a row created before tenancy was recorded, was readable
      // and writable by ANY authenticated account. This is the highest-sensitivity
      // PHI class in the product, so it gets the strictest rule.
      const access = assertMentalHealthAccess(req.user, r);
      if (!access.ok) return denyMentalHealth(res, access);
    
    r.consents.push({
      consentType: consentType || 'Treatment Consent',
      documentUrl: documentUrl || '',
      signedBy: req.user.name,
      signedAt: new Date(),
      expiryDate: expiryDate || null,
      // MIND-M-04: purpose binding + retention window at the point of consent,
      // not inferred later from the type label.
      purposes: Array.isArray(purposes) && purposes.length ? purposes : undefined,
      retentionDays: retentionDays || undefined,
      grantedAt: new Date(),
      notes: notes || '',
      status: 'Active'
    });
    
    await r.save();
    res.json(r);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── MIND-M-01: validated screening ───────────────────────────────────────────

/**
 * The instrument definitions, so the client renders exactly the items the
 * server will score. Sending the item list from the server is what stops the
 * questionnaire and the scorer from drifting apart.
 *
 * Deliberately `records:read` rather than a bare `protect`. The route ships no
 * PHI and every authenticated role may read it - a patient self-screening needs
 * it - but leaving it undecided is exactly what the AUTHZ coverage gate exists
 * to catch, and a route nobody decided the scope of is a route nobody will
 * remember to review when the question changes.
 */
router.get('/screening/instruments', protect, authorize('records:read', 'records:read:own'), async (req, res) => {
  try {
    res.json({
      responseOptions: RESPONSE_OPTIONS,
      instruments: INSTRUMENT_IDS.map((id) => {
        const i = INSTRUMENTS[id];
        return {
          id: i.id,
          label: i.label,
          itemCount: i.itemCount,
          maxScore: i.maxScore,
          reliableChange: i.reliableChange,
          referralThreshold: i.referralThreshold,
          bands: [[0, 4], [5, 9], [10, 14], [15, 19], [20, 27]].map(([lo, hi]) => ({
            range: `${lo}-${Math.min(hi, i.maxScore)}`,
            severity: i.severity(lo),
          })).filter((b, idx, arr) => arr.findIndex((x) => x.severity === b.severity) === idx),
          items: i.items.map((it) => ({ id: it.id, text: it.text, suicidalityItem: !!it.suicidalityItem })),
        };
      }),
    });
  } catch (err) { sendServerError(res, err); }
});

/**
 * Record a completed screening.
 *
 * A non-zero answer to the PHQ-9 suicidality item raises a crisis event even
 * when the TOTAL is low. A patient can answer everything "not at all" except
 * item 9 and land in the "Minimal" band - and scoring that as Minimal is how a
 * risk signal disappears into a dashboard. The flag is computed from the item
 * definition, checked before anything else, and routed to the existing crisis
 * queue that MIND already uses.
 */
router.post('/referrals/:id/screening', protect, async (req, res) => {
  try {
    const { instrument, responses } = req.body || {};
    const r = await MentalHealth.findById(req.params.id);
    if (!r) return res.status(404).json({ message: 'Referral not found' });
    const access = assertMentalHealthAccess(req.user, r);
    if (!access.ok) return denyMentalHealth(res, access);

    const result = score(instrument, responses || {});
    if (!result.valid) {
      // 422, not 400: the request is well-formed, the INSTRUMENT is not
      // complete. And the reason names the items rather than just failing.
      return res.status(422).json({ message: 'Screening could not be scored', reason: result.reason });
    }

    r.screenings.push({
      instrument: result.instrument,
      responses: result.responses,
      total: result.total,
      maxScore: result.maxScore,
      severity: result.severity,
      suicidalityFlagged: result.suicidalityFlagged,
      referralSuggested: result.referralSuggested,
      completedAt: new Date(),
      completedBy: req.user.name,
    });

    // MIND-01: a non-zero PHQ-9 item 9 opens a crisis event in the SAME queue
    // the assessment path uses. Calling `openCrisisEvent` without pushing onto
    // `crisisEvents` would create an event object that nothing can ever read -
    // the crisis queue reads that array, so the flag would evaporate.
    if (result.suicidalityFlagged) {
      const event = openCrisisEvent({
        severity: 'High',
        risk: `${result.instrument} suicidality item endorsed (total ${result.total}/${result.maxScore}, ${result.severity})`,
        flaggedBy: req.user._id,
      });
      r.crisisEvents = r.crisisEvents || [];
      r.crisisEvents.push(event);
      r.openCrisisCount = (r.openCrisisCount || 0) + 1;
      r.lastCrisisAt = event.flaggedAt;

      // Loud, and independent of the notification path - a safety signal must
      // not depend on a notification being created successfully.
      logger.error(`[mental-health] SUICIDALITY FLAG referral=${r._id} patient=${r.patientId} instrument=${result.instrument} total=${result.total} severity=${result.severity}`);
      auditLog('mental_health_suicidality_flagged', req.user._id, {
        referralId: r.referralId,
        patientId: r.patientId,
        instrument: result.instrument,
        total: result.total,
        severity: result.severity,
      }).catch((e) => logger.error(`screening audit failed: ${e.message}`));
    }

    await r.save();

    res.status(201).json({
      instrument: result.instrument,
      total: result.total,
      maxScore: result.maxScore,
      percentage: result.percentage,
      severity: result.severity,
      suicidalityFlagged: result.suicidalityFlagged,
      referralSuggested: result.referralSuggested,
    });
  } catch (err) { sendServerError(res, err); }
});

/** MIND-M-01: trend across administrations, with clinical-meaningfulness. */
router.get('/referrals/:id/screening/trend', protect, async (req, res) => {
  try {
    const r = await MentalHealth.findById(req.params.id);
    if (!r) return res.status(404).json({ message: 'Referral not found' });
    const access = assertMentalHealthAccess(req.user, r);
    if (!access.ok) return denyMentalHealth(res, access);

    const instrument = req.query.instrument;
    if (instrument && !INSTRUMENTS[instrument]) {
      return res.status(400).json({ message: `Unknown instrument "${instrument}"`, expected: INSTRUMENT_IDS });
    }
    const wanted = instrument ? [instrument] : INSTRUMENT_IDS;

    res.json(wanted.map((id) => trend(id, (r.screenings || []).filter((s) => s.instrument === id))));
  } catch (err) { sendServerError(res, err); }
});

// ─── MIND-M-04: consent status, renewal, retention ───────────────────────────

/**
 * What can this record currently be used for?
 *
 * Answers the question a DPDP data-principal request actually asks ("what did
 * you consent to, and has it lapsed?") rather than dumping raw consent rows.
 */
router.get('/referrals/:id/consent-status', protect, async (req, res) => {
  try {
    const r = await MentalHealth.findById(req.params.id);
    if (!r) return res.status(404).json({ message: 'Not found' });
    const access = assertMentalHealthAccess(req.user, r);
    if (!access.ok) return denyMentalHealth(res, access);

    const now = new Date();
    const consents = (r.consents || []).map((c) => ({
      consentType: c.consentType,
      purposes: Array.isArray(c.purposes) && c.purposes.length ? c.purposes : ['treatment', 'medication'],
      retentionDays: c.retentionDays || DEFAULT_RETENTION_DAYS,
      expiresAt: c.expiryDate || null,
      status: c.status,
      lapsed: isLapsed(c, now),
      grantedAt: c.grantedAt || c.signedAt || null,
      renewedFrom: c.renewedFrom || null,
    }));

    res.json({
      purposesOnOffer: MH_PURPOSES,
      consents,
      treatmentsAuthorised: assertPurposeConsent(r, 'treatment', now).ok,
      sessionsPastRetention: sessionsPastRetention(r, now).length,
    });
  } catch (err) { sendServerError(res, err); }
});

/**
 * Renew a consent. The purpose set and retention window carry forward unless
 * explicitly changed, so a renewal does not silently narrow or widen what the
 * patient agreed to.
 */
router.post('/referrals/:id/consent/:consentId/renew', protect, async (req, res) => {
  try {
    const r = await MentalHealth.findById(req.params.id);
    if (!r) return res.status(404).json({ message: 'Not found' });
    const access = assertMentalHealthAccess(req.user, r);
    if (!access.ok) return denyMentalHealth(res, access);

    const index = (r.consents || []).findIndex((c) => String(c._id) === String(req.params.consentId));
    if (index === -1) return res.status(404).json({ message: 'Consent not found' });

    const { expiresAt, retentionDays, notes, purposes } = req.body || {};
    const previous = r.consents[index];

    // Supersede rather than mutate: an audit trail that edits the old record
    // cannot show what was actually agreed at the time.
    previous.status = 'Expired';
    r.consents[index] = previous;

    const renewal = buildRenewal(previous, {
      signedBy: req.user.name,
      notes,
      expiresAt,
      retentionDays,
    });
    if (Array.isArray(purposes) && purposes.length) renewal.purposes = purposes;

    r.consents.push(renewal);
    await r.save();

    await auditLog('mental_health_consent_renewed', req.user._id, {
      referralId: String(r._id),
      previousConsentId: String(previous._id),
      purposes: renewal.purposes,
      retentionDays: renewal.retentionDays,
    }).catch((e) => logger.error(`consent renewal audit failed: ${e.message}`));

    res.status(201).json(r);
  } catch (err) { sendServerError(res, err); }
});

/**
 * Destroy therapy notes past their retention window.
 *
 * DRY RUN BY DEFAULT, and `--confirm` is required to actually destroy. This is
 * irreversible and runs over the most sensitive record class in the product; a
 * scheduled job that forgets its flag would be unrecoverable. The encounter is
 * kept (date, type, clinician) and only the notes go.
 */
router.post('/referrals/:id/retention-sweep', protect, adminOnly, async (req, res) => {
  try {
    const r = await MentalHealth.findById(req.params.id);
    if (!r) return res.status(404).json({ message: 'Not found' });

    const confirm = req.body?.confirm === true;
    const result = sweepRetention(r, { dryRun: !confirm });

    if (!confirm) {
      return res.json({ ...result, message: 'Dry run. Re-send with { confirm: true } to destroy notes.' });
    }

    await r.save();
    await auditLog('mental_health_retention_sweep', req.user._id, {
      referralId: String(r._id),
      purged: result.purged,
      scanned: result.scanned,
    }).catch((e) => logger.error(`retention sweep audit failed: ${e.message}`));

    res.json(result);
  } catch (err) { sendServerError(res, err); }
});

// Create billing for mental health session
router.post('/referrals/:id/create-billing', protect, adminOnly, validate(mhBillingSchema), async (req, res) => {
  try {
    const referral = await MentalHealth.findById(req.params.id);
    if (!referral) return res.status(404).json({ message: 'Referral not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && referral.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { amount, description, sessionType } = req.body;
    
    const invoiceId = generateInvoiceId('mentalhealth');
    
    const billing = await Billing.create({
      invoiceId,
      patient: referral.patientName,
      patientId: referral.patientId,
      service: description || 'Mental Health Session',
      amount: amount || 800,
      source: 'mentalhealth',
      status: 'Pending',
      date: getISTDateString(),
    });
    
    void import('../lib/pgDualWrite.js').then((m) => m.mirrorBilling(billing)).catch(() => {});

    await Notification.create({
      title: 'New Mental Health Bill',
      message: `Mental health billing created for ${referral.patientName}`,
      type: 'billing',
      userId: req.user._id.toString(),
    });
    
    res.status(201).json(billing);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/stats', protect, async (req, res) => {
  try {
    if (!MENTAL_HEALTH_CLINICAL_ROLES.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const scope = req.user.role === 'superadmin'
      ? {}
      : { hospitalId: req.user.hospitalId || req.user.facilityId };
    if (req.user.role !== 'superadmin' && !scope.hospitalId) {
      return res.status(403).json({ message: 'Facility scope required' });
    }
    const [active, total] = await Promise.all([
      MentalHealth.countDocuments({ ...scope, status: 'Active' }),
      MentalHealth.countDocuments(scope),
    ]);
    return res.json({ active, total });
  } catch (err) {
    return sendServerError(res, err, 'Could not load mental-health statistics');
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// MIND-B-02 — CRISIS ESCALATION
// ═══════════════════════════════════════════════════════════════════════════
//
// A `riskAssessment: 'Immediate'` value with no acknowledgement field, no SLA
// and no audit trail means a suicidal patient can be flagged and then sit unread
// indefinitely. These endpoints make the escalation a STATE MACHINE rather than
// a field: flag -> notify -> acknowledge -> resolve, with a deadline the UI can
// count down and an audit row for every transition.

/**
 * The on-call queue: every unacknowledged High/Immediate crisis in the caller's
 * tenant, most overdue first. This is the query someone runs at 3am, so it is
 * tenant-scoped and backed by the crisisEvents index.
 */
router.get('/crisis/queue', protect, async (req, res) => {
  try {
    if (!MENTAL_HEALTH_CRISIS_ACK_ROLES.includes(req.user.role)) {
      return res.status(403).json({ message: 'Crisis responder access required' });
    }
    // Fail closed on tenancy: a caller with no tenant sees nothing rather than
    // everything.
    const tenant = req.user.hospitalId || req.user.facilityId;
    if (!tenant && req.user.role !== 'superadmin') {
      logger.warn('MIND-B-02: crisis queue requested by a caller with no tenant');
      return res.status(403).json({ message: 'Access denied' });
    }

    const filter = { ...openCrisisQuery() };
    if (req.user.role !== 'superadmin') filter.hospitalId = tenant;

    const rows = await MentalHealth.find(filter)
      .select('referralId patientId patientName hospitalId crisisEvents lastCrisisAt')
      .sort({ lastCrisisAt: 1 })
      .limit(200)
      .lean();

    // Flatten to one entry per open crisis with a computed time-to-breach, so the
    // client does not have to reason about the nested array.
    const now = Date.now();
    const queue = [];
    for (const r of rows) {
      for (const c of r.crisisEvents || []) {
        if (c.acknowledgedAt || c.resolvedAt) continue;
        if (!['High', 'Immediate'].includes(c.severity)) continue;
        const due = c.responseDueAt ? new Date(c.responseDueAt).getTime() : now;
        queue.push({
          referralId: r.referralId,
          patientId: r.patientId,
          patientName: r.patientName,
          hospitalId: r.hospitalId,
          severity: c.severity,
          risk: c.risk,
          flaggedAt: c.flaggedAt,
          responseDueAt: c.responseDueAt,
          minutesRemaining: Math.round((due - now) / 60000),
          overdue: due < now,
        });
      }
    }
    queue.sort((a, b) => new Date(a.responseDueAt) - new Date(b.responseDueAt));

    await auditLog('view_crisis_queue', req.user._id, { count: queue.length });
    res.json({ queue, overdueCount: queue.filter(q => q.overdue).length });
  } catch (err) { sendServerError(res, err, 'Could not load the crisis queue'); }
});

/**
 * Acknowledge a crisis. Records WHO took responsibility and WHAT they did, and
 * is the transition that makes "nobody saw this" provable or disprovable.
 */
router.put('/crisis/:id/acknowledge', protect, validate(mhCrisisAckSchema), async (req, res) => {
  try {
    const r = await MentalHealth.findById(req.params.id);
    if (!r) return res.status(404).json({ message: 'Referral not found' });
    const access = assertMentalHealthAccess(req.user, r, { action: 'crisis_ack' });
    if (!access.ok) return denyMentalHealth(res, access);

    const openIndex = (r.crisisEvents || []).findIndex(
      c => !c.acknowledgedAt && !c.resolvedAt && ['High', 'Immediate'].includes(c.severity)
    );
    if (openIndex === -1) {
      return res.status(409).json({ message: 'No open crisis event on this referral' });
    }

    const event = r.crisisEvents[openIndex];
    event.acknowledgedAt = new Date();
    event.acknowledgedBy = req.user._id;
    event.actionTaken = req.body.actionTaken;
    if (req.body.notes) event.notes = req.body.notes;
    r.openCrisisCount = Math.max(0, (r.openCrisisCount || 1) - 1);
    await r.save();

    // MIND-B-02: the SLA breach is recorded whether or not it happened.
    const due = event.responseDueAt ? new Date(event.responseDueAt).getTime() : Date.now();
    const breached = due < Date.now();
    await auditLog('acknowledge_crisis', req.user._id, {
      referralId: r.referralId,
      patientId: r.patientId,
      severity: event.severity,
      slaBreached: breached,
      responseMinutes: Math.round((event.acknowledgedAt.getTime() - new Date(event.flaggedAt).getTime()) / 60000),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    if (breached) {
      logger.error(
        `MIND-B-02: SLA BREACH on crisis referral=${r.referralId} `
        + `severity=${event.severity} responseDueAt=${event.responseDueAt}`
      );
    }

    res.json({ ok: true, event, slaBreached: breached });
  } catch (err) { sendServerError(res, err, 'Could not acknowledge the crisis'); }
});

/** Close out an acknowledged crisis with a documented outcome. */
router.put('/crisis/:id/resolve', protect, validate(mhCrisisAckSchema), async (req, res) => {
  try {
    const r = await MentalHealth.findById(req.params.id);
    if (!r) return res.status(404).json({ message: 'Referral not found' });
    const access = assertMentalHealthAccess(req.user, r, { action: 'crisis_ack' });
    if (!access.ok) return denyMentalHealth(res, access);

    const openIndex = (r.crisisEvents || []).findIndex(c => !c.resolvedAt);
    if (openIndex === -1) {
      return res.status(409).json({ message: 'No open crisis event on this referral' });
    }

    const event = r.crisisEvents[openIndex];
    if (!event.acknowledgedAt) {
      // Resolution without acknowledgement would erase the evidence that the
      // escalation was ever seen. Reject it.
      return res.status(409).json({ message: 'Acknowledge the crisis before resolving it' });
    }
    event.resolvedAt = new Date();
    event.actionTaken = req.body.actionTaken;
    if (req.body.notes) event.notes = req.body.notes;
    r.openCrisisCount = Math.max(0, (r.openCrisisCount || 1) - 1);
    await r.save();

    await auditLog('resolve_crisis', req.user._id, {
      referralId: r.referralId, patientId: r.patientId, severity: event.severity,
    });
    res.json({ ok: true, event });
  } catch (err) { sendServerError(res, err, 'Could not resolve the crisis'); }
});

export default router;
