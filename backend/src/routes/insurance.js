import { escapeRegex, capSearch } from '../utils/escapeRegex.js';
import { pickBody } from '../utils/pick.js';
import express from 'express';
import { z } from 'zod';
import Insurance from '../models/Insurance.js';
import Hospital from '../models/Hospital.js';
import Notification from '../models/Notification.js';
import { protect, adminOnly, authorize } from '../middleware/auth.js';
import { authorizeObject } from '../middleware/authorize.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../config/logger.js';
// INS-B-02/03: fail-closed tenant predicate for list + stats.
import { applyTenantScope } from '../utils/tenantScope.js';
// INS-B-04: no raw err.message in a 500 body.
import { sendServerError } from '../utils/safeError.js';
// INS-B-04: integer-paise comparison so a float cannot slip past the ceiling.
import { toPaise, fromPaise } from '../services/ledgerService.js';
import { validate, createInsuranceSchema } from '../utils/validate.js';
import { generateTimestampedId } from '../utils/idGenerator.js';
import { paymentLimiter } from '../middleware/rateLimit.js';
import { idempotencyGuard } from '../middleware/idempotency.js';

// P3 + P1 #6: explicit allowlist matching the pickBody() list in the PUT
// handler below. Unknown keys are stripped by zod, so req.body can never carry
// a privileged path (claimId, hospitalId, patientId, claimStatus,
// approvedAmount) into the route even if the pick list is edited later, and
// every value is TYPE-checked against models/Insurance.js: contact is text,
// documents are {name,url} pairs, diagnosis/treatmentPlan are bounded text,
// estimatedCost is numeric (edit forms send `Input type=number` strings, so
// union'd like the pharmacy price fields — mongoose casts on update).
// `notes` is gone from both schema and pickBody: the model has no such field
// (strict mode dropped it on every save), making it a dead allowlist entry.
const updateInsuranceSchema = z.object({
  tpaContact: z.string().trim().max(300).optional(),
  documents: z.array(z.object({
    name: z.string().max(300).optional(),
    url: z.string().max(2048).optional(),
  })).max(50).optional(),
  diagnosis: z.string().trim().max(4000).optional(),
  treatmentPlan: z.string().trim().max(8000).optional(),
  estimatedCost: z.union([z.number().nonnegative().max(100000000), z.string().max(30)]).optional(),
});
// INS-M-02: the pre-auth is a state machine, not a free-form status write.
// Request (cashless only, empanelled hospital only) -> decision (admin, with a
// mandatory reason for any denial or partial) -> optional resubmission after a
// denial. Every attempt is appended to `preAuthAttempts`, so attempt N+1 can
// never rewrite why attempt N was denied.
const preAuthRequestSchema = z.object({
  requestedAmount: z.number().positive().optional(),
});
const preAuthDecisionSchema = z.object({
  decision: z.enum(['Approved', 'Partially Approved', 'Rejected']),
  decisionAmount: z.number().positive().optional(),
  denialReason: z.string().trim().min(5, 'A denial reason of at least 5 characters is required').max(500).optional(),
  preAuthExpiry: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'preAuthExpiry must be a valid date').optional(),
}).refine(
  (d) => (d.decision === 'Rejected' ? Boolean(d.denialReason) : typeof d.decisionAmount === 'number'),
  { message: 'A denial reason is required to reject; decisionAmount is required to approve' }
).refine(
  (d) => d.decision !== 'Partially Approved' || Boolean(d.denialReason),
  { message: 'A denial reason is required for a partial approval' }
);
const fileClaimSchema = z.object({ claimAmount: z.number().positive().optional() });
const settleClaimSchema = z.object({ approvedAmount: z.number().optional() });

const router = express.Router();

const generateClaimId = () => generateTimestampedId('CLM');

// ─── INS-M-02 helpers ───────────────────────────────────────────────────────
// Empanelment: cashless means the HOSPITAL bills the insurer directly, which is
// only possible if the insurer recognises that hospital. `Hospital.
// insuranceAccepted` already existed as free text but nothing ever read it.
const providerMatches = (entry, provider) =>
  String(entry?.provider || '').trim().toLowerCase() === String(provider || '').trim().toLowerCase();

async function checkEmpanelment(hospitalId, provider) {
  if (!hospitalId) {
    return {
      ok: false,
      code: 'EM-PANELMENT_UNVERIFIABLE',
      message: 'Cashless pre-auth needs a hospital to verify empanelment against; this claim has none',
    };
  }
  const hospital = await Hospital.findById(hospitalId);
  if (!hospital) {
    return {
      ok: false,
      code: 'EM-PANELMENT_UNVERIFIABLE',
      message: 'The hospital linked to this claim could not be loaded to verify empanelment',
    };
  }
  if (!hospital.insuranceAccepted?.some((e) => providerMatches(e, provider))) {
    return {
      ok: false,
      code: 'HOSPITAL_NOT_EM_PANELLED',
      message: `This hospital is not empanelled with ${provider || 'the insurer'} — cashless is unavailable, file as Reimbursement instead`,
    };
  }
  return { ok: true };
}

// The patient learns their claim outcome (the old code notified on decision and
// settlement). Fire-and-forget: the write above has already committed, so a
// down Mongo must not turn a settled claim into a 500 the client retries.
function notifyPatient(claim, title, message) {
  if (!claim?.patientId) return;
  void Notification.create({ title, message, type: 'billing', userId: claim.patientId.toString() })
    .catch((err) => logger.warn({ title, err: err?.message }, 'insurance notification failed'));
}

// INS-M-02: `claimStatus` is the schema path and the canonical field. The old
// routes wrote a schema-less `status` instead, so the badge the UI reads
// (`claimStatus`) never moved while list filters and stats counted a hidden
// parallel field. Reads accept BOTH (rows written before this fix only have
// `status`); every write now sets `claimStatus` and $unsets the legacy field,
// so rows migrate to one source of truth the next time they are touched.
const claimStatusIs = (value) => ({ $or: [{ claimStatus: value }, { status: value }] });
const CLAIM_TERMINAL = ['Settled', 'Rejected'];

// ─── Create Insurance Claim ────────────────────────────────────────────────
router.post('/', protect, authorize('insurance:write', 'insurance:write:own'), paymentLimiter, validate(createInsuranceSchema), async (req, res) => {
  try {
    // LAW-006: patient can only create claim for themselves
    const patientId = req.user.role === 'patient' ? req.user._id : req.body.patientId;
    if (!patientId) return res.status(400).json({ message: 'patientId required' });

    const hospitalId = req.body.hospitalId || req.user.hospitalId || undefined;

    // INS-M-02: fail early on an empanelment problem when the hospital is known.
    // A claim created without a hospital still gets its hard check at pre-auth
    // request time — that is where the money is actually committed.
    if ((req.body.coverageType || 'Cashless') === 'Cashless' && hospitalId) {
      const emp = await checkEmpanelment(hospitalId, req.body.insuranceProvider);
      if (!emp.ok) return res.status(422).json({ message: emp.message, code: emp.code });
    }

    const claim = await Insurance.create({
      ...req.body,
      // INS-M-02: claimId is required+unique on the schema, but zod stripped it
      // from the body and generateClaimId() was never called — every create
      // failed validation. The id is server-generated; clients cannot pick it.
      claimId: generateClaimId(),
      patientId,
      hospitalId,
      createdBy: req.user._id,
    });
    void import('../lib/pgDualWrite.js').then((m) => m.mirrorInsurance(claim)).catch(() => {});
    res.status(201).json(claim);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── List Claims ──────────────────────────────────────────────────────────
router.get('/', protect, authorize('insurance:read', 'insurance:read:own'), async (req, res) => {
  try {
    const { status, search, patientId } = req.query;
    const filter = { deletedAt: { $exists: false } };
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if (req.user.role === 'patient') {
      filter.patientId = req.user._id;
    } else if (patientId) {
      // INS-B-02: a ?patientId= filter must not be a cross-tenant key. The hospital
      // predicate above is conditional on the CALLER having a hospitalId, so a
      // tenant-less staff account produced a platform-wide read of any patient's
      // claims by id. applyTenantScope fails closed instead.
      const scope = applyTenantScope(req, filter, { fields: ['hospitalId'] });
      if (!scope.ok) return res.status(403).json({ message: scope.message });
      filter.patientId = patientId;
    } else {
      const scope2 = applyTenantScope(req, filter, { fields: ['hospitalId'] });
      if (!scope2.ok) return res.status(403).json({ message: scope2.message });
    }
    // INS-M-02: filter on the canonical claimStatus, tolerating rows written
    // before the split-brain fix that only carry the legacy `status`. Status
    // and search must BOTH hold (not either), so each group is its own $or
    // under a shared $and.
    const filters = [];
    if (status) filters.push(claimStatusIs(status));
    if (search) filters.push({ $or: [
      { claimId: new RegExp(escapeRegex(capSearch(search)), 'i') },
      { patientName: new RegExp(escapeRegex(capSearch(search)), 'i') },
    ] });
    if (filters.length) filter.$and = filters;
    const claims = await Insurance.find(filter).populate('patientId', 'name email phone').sort({ createdAt: -1 });
    res.json({ claims });
  } catch (err) { sendServerError(res, err, 'Insurance request failed'); }
});

// ─── Get Single Claim ──────────────────────────────────────────────────────
// AUTHZ-B-02: the inline check only allowed `hospital_admin`/`superadmin`, so an
// accountant, a hospital admin of a DIFFERENT hospital, or any staff role with
// `insurance:read` could read another patient's claim — and the 403 also proved
// the id existed. `authorizeObject` now owns the decision: owner, same tenant, or
// an explicitly listed actor role, and 404 for everything else.
router.get('/:id', protect, authorize('insurance:read', 'insurance:read:own'), authorizeObject({
  model: Insurance,
  ownerField: 'patientId',
  tenantFields: ['hospitalId', 'facilityId'],
  actorRoles: ['hospital_admin', 'accountant'],
  read: true,
}), async (req, res) => {
  try {
    const claim = await Insurance.findById(req.params.id).populate('patientId', 'name email phone');
    if (!claim) return res.status(404).json({ message: 'Claim not found' });
    res.json(claim);
  } catch (err) { sendServerError(res, err, 'Insurance request failed'); }
});

// ─── Update Claim (LAW-006: allowlist only safe fields) ──────────────────
// AUTHZ-B-02: this route had NO ownership check at all — `authorize()` alone let
// any holder of `insurance:write:own` (i.e. every patient) rewrite any other
// patient's claim by id. The allowlist stopped field tampering, not object access.
router.put('/:id', protect, authorize('insurance:write', 'insurance:write:own'), paymentLimiter, validate(updateInsuranceSchema), authorizeObject({
  model: Insurance,
  ownerField: 'patientId',
  tenantFields: ['hospitalId', 'facilityId'],
  actorRoles: ['hospital_admin', 'accountant'],
  write: true,
}), async (req, res) => {
  try {
    // LAW-006: allowlist only safe fields — block claimId, hospitalId, patientId, claimStatus, approvedAmount.
    // INS-M-02: coverageType is no longer editable after creation — flipping a
    // claim between Cashless and Reimbursement mid-workflow would change which
    // gates apply (empanelment, pre-auth) behind an already-approved attempt.
    const updated = await Insurance.findByIdAndUpdate(
      req.params.id,
      // 'notes' removed with the schema: the model never had the field.
      pickBody(req.body, ['tpaContact', 'documents', 'diagnosis', 'treatmentPlan', 'estimatedCost']),
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Claim not found' });
    res.json(updated);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Pre-Authorization: request (INS-M-02) ────────────────────────────────
// Cashless only: the insurer pays the empanelled hospital directly, so the
// hospital must be empanelled and an amount must exist to authorise. Reimburse-
// ment claims never enter this machine (preAuthStatus stays 'Not Required').
router.post('/:id/pre-auth', protect, authorize('insurance:write'), paymentLimiter, adminOnly, validate(preAuthRequestSchema), async (req, res) => {
  try {
    const claim = await Insurance.findById(req.params.id);
    if (!claim) return res.status(404).json({ message: 'Claim not found' });
    if (claim.preAuthStatus === 'Pending') {
      return res.status(409).json({ message: 'A pre-auth is already pending on this claim', code: 'PRE_AUTH_ALREADY_PENDING' });
    }
    if (claim.coverageType !== 'Cashless') {
      return res.status(422).json({ message: 'Pre-auth only applies to cashless coverage; reimbursement claims are filed directly', code: 'PRE_AUTH_CASHLESS_ONLY' });
    }
    if (CLAIM_TERMINAL.includes(claim.claimStatus)) {
      return res.status(409).json({ message: 'Claim is already settled or rejected', code: 'CLAIM_NOT_ELIGIBLE' });
    }

    const hospitalId = claim.hospitalId || req.user.hospitalId;
    const emp = await checkEmpanelment(hospitalId, claim.insuranceProvider);
    if (!emp.ok) return res.status(422).json({ message: emp.message, code: emp.code });

    const requestedAmount = req.body.requestedAmount ?? claim.estimatedCost;
    if (!requestedAmount || requestedAmount <= 0) {
      return res.status(400).json({ message: 'A requested amount (or an estimated cost) is required to request pre-auth', code: 'REQUESTED_AMOUNT_REQUIRED' });
    }

    const attemptNumber = (claim.preAuthAttempts?.length || 0) + 1;
    const updated = await Insurance.findOneAndUpdate(
      // CAS: only one pending attempt may exist at a time.
      { _id: claim._id, preAuthStatus: { $ne: 'Pending' } },
      {
        $set: {
          preAuthStatus: 'Pending',
          preAuthAmount: requestedAmount,
          preAuthDate: new Date(),
          // Backfill the admitting hospital so empanelment stays verifiable.
          ...(claim.hospitalId ? {} : { hospitalId }),
        },
        $unset: { preAuthDenialReason: '' },
        $push: {
          preAuthAttempts: {
            attemptNumber,
            requestedAmount,
            status: 'Pending',
            requestedBy: req.user._id,
            requestedAt: new Date(),
          },
        },
      },
      { new: true }
    );
    if (!updated) {
      return res.status(409).json({ message: 'A pre-auth is already pending on this claim', code: 'PRE_AUTH_ALREADY_PENDING' });
    }
    res.json(updated);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Pre-Authorization: decision (INS-M-02) ────────────────────────────────
// The OLD route accepted any `preAuthStatus` string from the body with no
// pending check, no denial reason and no attempt history — an admin could jump
// straight to 'Approved', and a rejection left no trace of why.
router.put('/:id/pre-auth', protect, authorize('insurance:write'), paymentLimiter, adminOnly, validate(preAuthDecisionSchema), async (req, res) => {
  try {
    const { decision, decisionAmount, denialReason, preAuthExpiry } = req.body;
    const claim = await Insurance.findById(req.params.id);
    if (!claim) return res.status(404).json({ message: 'Claim not found' });
    if (claim.preAuthStatus !== 'Pending') {
      return res.status(409).json({ message: 'No pending pre-auth to decide on', code: 'PRE_AUTH_NOT_PENDING' });
    }
    const latest = claim.preAuthAttempts?.[claim.preAuthAttempts.length - 1];
    if (latest?.requestedAmount && decision !== 'Rejected' && decisionAmount > latest.requestedAmount) {
      return res.status(400).json({
        message: `Approved amount cannot exceed the requested amount (${latest.requestedAmount})`,
        code: 'AMOUNT_EXCEEDS_REQUEST',
        maxApprovedAmount: latest.requestedAmount,
      });
    }

    const now = new Date();
    const expiry = decision === 'Rejected'
      ? undefined
      : (preAuthExpiry ? new Date(preAuthExpiry) : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000));

    const $set = {
      preAuthStatus: decision,
      'preAuthAttempts.$.status': decision,
      'preAuthAttempts.$.decisionAmount': decisionAmount ?? null,
      'preAuthAttempts.$.denialReason': denialReason ?? null,
      'preAuthAttempts.$.decidedBy': req.user._id,
      'preAuthAttempts.$.decidedAt': now,
    };
    const $unset = {};
    if (decision === 'Rejected') {
      // Nothing is authorised, and the headline reason points at this denial.
      $set.preAuthAmount = null;
      $set.preAuthDenialReason = denialReason;
      $unset.preAuthExpiry = '';
    } else {
      $set.preAuthAmount = decisionAmount;
      $set.preAuthExpiry = expiry;
      if (denialReason) {
        // A partial approval carries a partial denial — keep the reason visible.
        $set.preAuthDenialReason = denialReason;
      } else {
        $unset.preAuthDenialReason = '';
      }
    }

    // CAS on BOTH the top-level status and the pending attempt: the positional
    // `$` binds to the single attempt whose status is 'Pending'.
    const updated = await Insurance.findOneAndUpdate(
      { _id: claim._id, preAuthStatus: 'Pending', 'preAuthAttempts.status': 'Pending' },
      { $set, $unset },
      { new: true }
    );
    if (!updated) {
      return res.status(409).json({ message: 'No pending pre-auth to decide on', code: 'PRE_AUTH_NOT_PENDING' });
    }
    notifyPatient(updated, `Pre-Authorization ${decision}`, `Your ${updated.insuranceProvider} claim pre-auth is ${decision}. Amount: ₹${decisionAmount || 0}`);
    res.json(updated);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Pre-Authorization: resubmission after a denial (INS-M-02) ─────────────
router.post('/:id/pre-auth/resubmit', protect, authorize('insurance:write'), paymentLimiter, adminOnly, validate(preAuthRequestSchema), async (req, res) => {
  try {
    const claim = await Insurance.findById(req.params.id);
    if (!claim) return res.status(404).json({ message: 'Claim not found' });
    if (claim.preAuthStatus !== 'Rejected') {
      return res.status(409).json({ message: 'Only a denied pre-auth can be resubmitted', code: 'PRE_AUTH_NOT_DENIED' });
    }
    if (claim.coverageType !== 'Cashless') {
      return res.status(422).json({ message: 'Pre-auth only applies to cashless coverage', code: 'PRE_AUTH_CASHLESS_ONLY' });
    }

    // Empanelment can lapse between attempt 1 and attempt N — re-check it.
    const hospitalId = claim.hospitalId || req.user.hospitalId;
    const emp = await checkEmpanelment(hospitalId, claim.insuranceProvider);
    if (!emp.ok) return res.status(422).json({ message: emp.message, code: emp.code });

    const prior = claim.preAuthAttempts?.[claim.preAuthAttempts.length - 1];
    const requestedAmount = req.body.requestedAmount ?? prior?.requestedAmount ?? claim.estimatedCost;
    if (!requestedAmount || requestedAmount <= 0) {
      return res.status(400).json({ message: 'A requested amount is required to resubmit', code: 'REQUESTED_AMOUNT_REQUIRED' });
    }

    const attemptNumber = (claim.preAuthAttempts?.length || 0) + 1;
    const updated = await Insurance.findOneAndUpdate(
      { _id: claim._id, preAuthStatus: 'Rejected' },
      {
        $set: {
          preAuthStatus: 'Pending',
          preAuthAmount: requestedAmount,
          preAuthDate: new Date(),
          ...(claim.hospitalId ? {} : { hospitalId }),
        },
        $unset: { preAuthDenialReason: '' },
        $push: {
          preAuthAttempts: {
            attemptNumber,
            requestedAmount,
            status: 'Pending',
            requestedBy: req.user._id,
            requestedAt: new Date(),
          },
        },
      },
      { new: true }
    );
    if (!updated) {
      return res.status(409).json({ message: 'Only a denied pre-auth can be resubmitted', code: 'PRE_AUTH_NOT_DENIED' });
    }
    res.json(updated);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── File Claim ────────────────────────────────────────────────────────────
router.put('/:id/file-claim', protect, authorize('insurance:write'), paymentLimiter, adminOnly, validate(fileClaimSchema), async (req, res) => {
  try {
    const existing = await Insurance.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Claim not found' });

    // INS-M-02: THIS is where the two workflows actually diverge. A cashless
    // claim is billed by the hospital directly against an approved pre-auth —
    // filing it without one would mean the insurer is asked to pay twice with
    // no authorisation on file. Reimbursement (patient paid first) needs no
    // pre-auth at all and files freely.
    if (existing.coverageType === 'Cashless'
      && !['Approved', 'Partially Approved'].includes(existing.preAuthStatus)) {
      return res.status(409).json({
        message: 'Cashless claims need an approved pre-auth before filing',
        code: 'PRE_AUTH_REQUIRED',
      });
    }

    const claim = await Insurance.findOneAndUpdate(
      // CAS: terminal states must not be re-filed; the legacy `status` guard
      // catches rows written before the split-brain fix.
      { _id: existing._id, claimStatus: { $nin: ['Filed', 'Settled'] }, status: { $nin: ['Filed', 'Settled'] } },
      {
        $set: {
          claimStatus: 'Filed',
          claimDate: new Date(),
          ...(req.body.claimAmount ? { claimAmount: req.body.claimAmount } : {}),
        },
        $unset: { status: '' },
      },
      { new: true }
    );
    if (!claim) return res.status(409).json({ message: 'Claim is already filed or settled', code: 'CLAIM_ALREADY_FILED' });
    res.json(claim);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Settle Claim ──────────────────────────────────────────────────────────
router.put('/:id/settle', protect, authorize('insurance:write'), paymentLimiter, idempotencyGuard({ prefix: 'claim-settle', failClosed: true }), adminOnly, validate(settleClaimSchema), async (req, res) => {
  try {
    // INS-B-04: the settlement amount is DERIVED, never accepted.
    //
    // `approvedAmount` used to be written straight from the body, so the payer
    // could settle a claim for MORE than was claimed (or for a negative/NaN
    // amount that later corrupted the stats aggregate and the insurer payout).
    //
    // The server computes the ceiling from the claim itself and refuses anything
    // above it, comparing in INTEGER PAISE so a float cannot slip past by a
    // fraction of a rupee. A client-supplied amount may only assert a LOWER value
    // (a deliberate partial settlement).
    const existing = await Insurance.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Claim not found' });

    const claimCeiling = toPaise(existing.claimAmount ?? existing.estimatedCost ?? 0);
    if (claimCeiling <= 0) {
      return res.status(422).json({
        message: 'This claim has no claimable amount to settle against',
        code: 'CLAIM_AMOUNT_MISSING',
      });
    }

    const requested = req.body.approvedAmount === undefined
      ? claimCeiling
      : toPaise(req.body.approvedAmount);

    if (requested <= 0) {
      return res.status(400).json({ message: 'Approved amount must be greater than 0' });
    }
    if (requested > claimCeiling) {
      logger.warn(`INS-B-04: settlement above the claim ceiling was rejected claim=${existing._id} requested=${fromPaise(requested)} ceiling=${fromPaise(claimCeiling)}`);
      return res.status(400).json({
        message: `Approved amount cannot exceed the claimed amount (${fromPaise(claimCeiling)})`,
        code: 'AMOUNT_EXCEEDS_CLAIM',
        maxApprovedAmount: fromPaise(claimCeiling),
      });
    }

    // INS-B-04/INS-M-02: the compare-and-set doubles as the state guard, so a
    // concurrent double-settle cannot write a second Settled row. Both the
    // canonical claimStatus and the legacy `status` are held terminal — a row
    // written before the split-brain fix may only have the latter.
    const claim = await Insurance.findOneAndUpdate(
      { _id: existing._id, claimStatus: { $nin: CLAIM_TERMINAL }, status: { $nin: CLAIM_TERMINAL } },
      { $set: { claimStatus: 'Settled', approvedAmount: fromPaise(requested), settlementDate: new Date() }, $unset: { status: '' } },
      { new: true }
    );
    if (!claim) {
      return res.status(409).json({ message: 'Claim is already settled or rejected' });
    }

    await auditLog('settle_insurance_claim', req.user._id, {
      claimId: claim._id,
      approvedAmount: claim.approvedAmount,
      claimCeiling: fromPaise(claimCeiling),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    notifyPatient(claim, 'Claim Settled', `Your ${claim.insuranceProvider} claim of ₹${claim.approvedAmount || 0} has been settled.`);
    res.json(claim);
  } catch (err) { sendServerError(res, err, 'Insurance request failed'); }
});

// ─── Stats ─────────────────────────────────────────────────────────────────
router.get('/stats/main', protect, authorize('insurance:read'), async (req, res) => {
  try {
    // INS-B-03: every count and the aggregate ran with NO filter at all, so
    // `insurance:read` (which an accountant holds) saw platform-wide claim counts
    // and the total approved amount for EVERY hospital. The stats are now the
    // callers own scope, derived from ONE base filter.
    const base = {};
    // A tenant-less caller is denied rather than shown everyone numbers.
    const scope = applyTenantScope(req, base, { fields: ['hospitalId'], allowSharedRowsForNonStaff: false });
    if (!scope.ok) return res.status(403).json({ message: scope.message });
    // A patient has no facility, so their stats are their own claims only.
    if (req.user.role === 'patient') base.patientId = req.user._id;

    // INS-M-02: `approved` now includes 'Partially Approved' (counting only
    // 'Approved' hid every partial approval), claim buckets follow the canonical
    // claimStatus with legacy-row tolerance (rows written before the split-brain
    // fix only have `status`), and `rejected` is returned for the first time.
    const count = (extra) => Insurance.countDocuments({ ...base, ...extra });
    const byClaimStatus = (value) => count(claimStatusIs(value));
    const [total, pending, approved, rejected, filed, settled, cashless] = await Promise.all([
      count({}),
      count({ preAuthStatus: 'Pending' }),
      count({ preAuthStatus: { $in: ['Approved', 'Partially Approved'] } }),
      byClaimStatus('Rejected'),
      byClaimStatus('Filed'),
      byClaimStatus('Settled'),
      count({ coverageType: 'Cashless' }),
    ]);
    const totalAmount = await Insurance.aggregate([
      { $match: { ...base, $or: [
        { claimStatus: { $in: ['Approved', 'Settled'] } },
        { status: { $in: ['Approved', 'Settled'] } },
      ] } },
      { $group: { _id: null, total: { $sum: '$approvedAmount' } } }
    ]);
    res.json({ total, pending, approved, rejected, filed, settled, cashless, totalAmount: totalAmount[0]?.total || 0 });
  } catch (err) { sendServerError(res, err, 'Failed to compute insurance stats'); }
});

export default router;
