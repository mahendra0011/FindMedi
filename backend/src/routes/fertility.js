import express from 'express';
import Provider from '../models/Provider.js';
import FertilityCycle from '../models/FertilityCycle.js';
import User from '../models/User.js';
import { protect, authorize } from '../middleware/auth.js';
import { authorizeObject } from '../middleware/authorize.js';
import { auditLog } from '../middleware/audit.js';
import {
  validate, createFertilityCycleSchema, fertilityCycleStatusSchema, fertilityOutcomeSchema,
} from '../utils/validate.js';
import { resolveProfileAccess } from '../services/profileAccess.js';

const router = express.Router();

const OBJECT_ID = /^[0-9a-f]{24}$/i;
const requireObjectId = (req, res, next) => (
  OBJECT_ID.test(String(req.params.id))
    ? next()
    : res.status(404).json({ message: 'Not found' })
);

const actorId = (req) => req.user._id ?? req.user.id;

// A cycle that reached a terminal state never reopens: a returning patient
// starts a new cycleNo, which is exactly the recurrence history the clinic
// needs. Only active cycles move.
const CYCLE_TRANSITIONS = { active: ['completed', 'cancelled'], completed: [], cancelled: [] };

// Same ownership discipline as the dental/eye/dialysis tracks: provider
// ownership proven through the parent, explicit protect first.
const providerOwner = {
  model: Provider,
  idFrom: (req) => req.body.providerId,
  ownerField: 'ownerUserId',
  actorRoles: [],
  write: true,
};
const providerOwnerOf = (Model) => ({
  model: Model,
  idFrom: (req) => req.params.id,
  ownerLoader: async (doc) => {
    const provider = await Provider.findById(doc.providerId);
    return provider?.ownerUserId ?? null;
  },
  actorRoles: [],
  write: true,
});

const myProviderIds = async (req) => {
  const rows = await Provider.find({ ownerUserId: actorId(req) }).select('_id').lean();
  return rows.map((r) => r._id);
};

const requirePatient = async (patientId) => {
  const user = await User.findById(patientId).select('_id').lean();
  return Boolean(user);
};

// ─── Fertility cycles ───────────────────────────────────────────────────────
// authz: object
router.post('/cycles', protect, validate(createFertilityCycleSchema), authorizeObject(providerOwner), async (req, res) => {
  try {
    if (!(await requirePatient(req.body.patientId))) return res.status(404).json({ message: 'Patient not found' });
    res.set('Cache-Control', 'no-store');
    const me = actorId(req);
    const row = await FertilityCycle.create({
      patientId: req.body.patientId,
      providerId: req.body.providerId,
      recordedBy: me,
      cycleNo: req.body.cycleNo,
      cycleType: req.body.cycleType,
      procedures: (req.body.procedures ?? []).map((p) => ({
        name: p.name, date: p.date, status: p.status ?? 'planned',
      })),
      artConsent: req.body.artConsent?.granted
        ? { granted: true, grantedAt: req.body.artConsent.grantedAt ? new Date(req.body.artConsent.grantedAt) : new Date() }
        : { granted: false, grantedAt: null },
      artDocuments: req.body.artDocuments ?? [],
      notes: req.body.notes ?? '',
    });
    await auditLog('fertility_cycle_created', me, { patientId: String(req.body.patientId), providerId: String(req.body.providerId), cycleId: String(row._id), ip: req.ip, userAgent: req.get('user-agent') });
    return res.status(201).json(row);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// authz: object
router.get('/cycles', protect, authorize('records:read'), async (req, res) => {
  try {
    const patientId = req.query.patientId == null || req.query.patientId === '' ? null : String(req.query.patientId);
    if (!patientId || !OBJECT_ID.test(patientId)) return res.status(400).json({ message: 'patientId is required' });
    const status = req.query.status == null || req.query.status === '' ? null : String(req.query.status);
    if (status && !['active', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Unknown status filter' });
    }
    res.set('Cache-Control', 'no-store');
    const rows = await FertilityCycle.find({
      patientId, providerId: { $in: await myProviderIds(req) }, ...(status ? { status } : {}),
    }).sort({ createdAt: -1 }).limit(50).lean();
    return res.json({ total: rows.length, cycles: rows });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// authz: object
router.patch('/cycles/:id/status', protect, requireObjectId, validate(fertilityCycleStatusSchema), authorizeObject(providerOwnerOf(FertilityCycle)), async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const cycle = req.scoped;
    if (!CYCLE_TRANSITIONS[cycle.status].includes(req.body.status)) {
      return res.status(409).json({ message: `Cannot move cycle from ${cycle.status} to ${req.body.status}`, code: 'INVALID_TRANSITION' });
    }
    cycle.status = req.body.status;
    await cycle.save();
    await auditLog('fertility_cycle_status', actorId(req), { patientId: String(cycle.patientId), cycleId: String(cycle._id), status: cycle.status, ip: req.ip, userAgent: req.get('user-agent') });
    return res.json({ id: String(cycle._id), status: cycle.status });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// ─── Outcome reporting: the sensitive write ────────────────────────────────
// The result discloses a pregnancy outcome, so this route exists separately
// from the status move: it records the result, stamps it once, completes the
// cycle atomically, and audits with patientId so the patient sees exactly who
// recorded what in their access log. A second outcome is 409, never an edit.
// authz: object
router.patch('/cycles/:id/outcome', protect, requireObjectId, validate(fertilityOutcomeSchema), authorizeObject(providerOwnerOf(FertilityCycle)), async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const cycle = req.scoped;
    // Outcome-recorded is checked first: a completed cycle WITH a result gets
    // the precise code, a non-active cycle without one gets the transition
    // code. Either way the recorded result is never overwritten.
    if (cycle.outcome?.result) {
      return res.status(409).json({ message: 'An outcome is already recorded for this cycle', code: 'OUTCOME_RECORDED' });
    }
    if (cycle.status !== 'active') {
      return res.status(409).json({ message: 'Outcomes are recorded on active cycles only', code: 'INVALID_TRANSITION' });
    }
    cycle.outcome = { result: req.body.result, recordedAt: new Date() };
    cycle.status = 'completed';
    await cycle.save();
    // The result VALUE stays out of the audit args (it is PHI in a mirrored
    // trail); the fact of recording, by whom, for which cycle, is what the
    // access log needs.
    await auditLog('fertility_outcome_recorded', actorId(req), { patientId: String(cycle.patientId), cycleId: String(cycle._id), ip: req.ip, userAgent: req.get('user-agent') });
    return res.json({ id: String(cycle._id), status: cycle.status, outcome: { result: cycle.outcome.result, recordedAt: cycle.outcome.recordedAt } });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// ─── Patient's own fertility cycles ─────────────────────────────────────────
// authz: object
router.get('/mine', protect, authorize('records:read:own'), async (req, res) => {
  try {
    const access = await resolveProfileAccess(req, req.query.personId);
    if (!access.ok) return res.status(404).json({ message: 'Profile not found' });
    res.set('Cache-Control', 'no-store');
    const me = actorId(req);
    const rows = await FertilityCycle.find({ patientId: me, familyMemberId: access.scope })
      .sort({ createdAt: -1 }).limit(20).lean();
    return res.json({
      person: access.profile,
      cycles: rows.map((c) => ({
        id: String(c._id), providerId: String(c.providerId), cycleNo: c.cycleNo, cycleType: c.cycleType,
        status: c.status, procedures: c.procedures ?? [],
        outcome: c.outcome?.result ? { result: c.outcome.result, recordedAt: c.outcome.recordedAt } : null,
      })),
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

export default router;
