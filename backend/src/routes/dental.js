import express from 'express';
import Provider from '../models/Provider.js';
import DentalChart from '../models/DentalChart.js';
import DentalTreatmentPlan from '../models/DentalTreatmentPlan.js';
import DentalLabWork from '../models/DentalLabWork.js';
import SterilisationLog from '../models/SterilisationLog.js';
import User from '../models/User.js';
import { protect, authorize } from '../middleware/auth.js';
import { authorizeObject } from '../middleware/authorize.js';
import { auditLog } from '../middleware/audit.js';
import {
  validate, createDentalChartSchema, createDentalPlanSchema, dentalPlanStatusSchema,
  createDentalLabWorkSchema, dentalLabStatusSchema, createSterilisationSchema,
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

// Status machines live here, not in the models: the enum is storage, the
// allowed MOVES are policy. A fitted prosthesis is never "un-fitted" and a
// decided plan is never reopened — remakes and revisions are new rows.
const PLAN_TRANSITIONS = {
  draft: ['active', 'cancelled'], active: ['completed', 'cancelled'],
  completed: [], cancelled: [],
};
const LAB_TRANSITIONS = { sent: ['received'], received: ['fitted'], fitted: [] };

// Writes resolve ownership through the parent provider (the providerServices
// pattern), with an explicit `protect` first: authorizeObject 401s without a
// session, and only protect populates req.user from it. A dentist charts only
// inside listings they own. Employed dentists without ownership cannot write —
// staff-scoped clinical writes need the Staff→provider roster link, which
// does not exist yet.
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

// ─── Dental charts (odontogram snapshots) ───────────────────────────────────
// authz: object
router.post('/charts', protect, validate(createDentalChartSchema), authorizeObject(providerOwner), async (req, res) => {
  try {
    if (!(await requirePatient(req.body.patientId))) return res.status(404).json({ message: 'Patient not found' });
    res.set('Cache-Control', 'no-store');
    const me = actorId(req);
    const row = await DentalChart.create({
      patientId: req.body.patientId,
      providerId: req.body.providerId,
      recordedBy: me,
      teeth: req.body.teeth,
      images: req.body.images ?? [],
      photoConsent: req.body.photoConsent?.granted
        ? { granted: true, grantedAt: req.body.photoConsent.grantedAt ? new Date(req.body.photoConsent.grantedAt) : new Date() }
        : { granted: false, grantedAt: null },
    });
    await auditLog('dental_chart_created', me, { patientId: String(req.body.patientId), providerId: String(req.body.providerId), chartId: String(row._id), ip: req.ip, userAgent: req.get('user-agent') });
    return res.status(201).json(row);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// authz: object
router.get('/charts', protect, authorize('records:read'), async (req, res) => {
  try {
    const patientId = req.query.patientId == null || req.query.patientId === '' ? null : String(req.query.patientId);
    if (!patientId || !OBJECT_ID.test(patientId)) return res.status(400).json({ message: 'patientId is required' });
    res.set('Cache-Control', 'no-store');
    // Ownership-scoped list: only rows inside my listings. A blanket list
    // across providers would turn this into a patient-record search engine.
    const rows = await DentalChart.find({ patientId, providerId: { $in: await myProviderIds(req) } })
      .sort({ recordedAt: -1 }).limit(50).lean();
    return res.json({ total: rows.length, charts: rows });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// ─── Treatment plans ────────────────────────────────────────────────────────
// authz: object
router.post('/plans', protect, validate(createDentalPlanSchema), authorizeObject(providerOwner), async (req, res) => {
  try {
    if (!(await requirePatient(req.body.patientId))) return res.status(404).json({ message: 'Patient not found' });
    res.set('Cache-Control', 'no-store');
    const me = actorId(req);
    const row = await DentalTreatmentPlan.create({
      patientId: req.body.patientId,
      providerId: req.body.providerId,
      recordedBy: me,
      title: req.body.title ?? '',
      stages: (req.body.stages ?? []).map((s) => ({
        name: s.name, teeth: s.teeth ?? [], costAmount: s.costAmount ?? 0, status: s.status ?? 'planned',
      })),
      status: req.body.status ?? 'draft',
    });
    await auditLog('dental_plan_created', me, { patientId: String(req.body.patientId), providerId: String(req.body.providerId), planId: String(row._id), ip: req.ip, userAgent: req.get('user-agent') });
    return res.status(201).json(row);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// authz: object
router.get('/plans', protect, authorize('records:read'), async (req, res) => {
  try {
    const patientId = req.query.patientId == null || req.query.patientId === '' ? null : String(req.query.patientId);
    if (!patientId || !OBJECT_ID.test(patientId)) return res.status(400).json({ message: 'patientId is required' });
    res.set('Cache-Control', 'no-store');
    const rows = await DentalTreatmentPlan.find({ patientId, providerId: { $in: await myProviderIds(req) } })
      .sort({ createdAt: -1 }).limit(50).lean();
    return res.json({
      total: rows.length,
      plans: rows.map((p) => ({ ...p, estimateTotal: (p.stages ?? []).reduce((sum, s) => sum + (s.costAmount || 0), 0) })),
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// authz: object
router.patch('/plans/:id/status', protect, requireObjectId, validate(dentalPlanStatusSchema), authorizeObject(providerOwnerOf(DentalTreatmentPlan)), async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const plan = req.scoped;
    if (!PLAN_TRANSITIONS[plan.status].includes(req.body.status)) {
      return res.status(409).json({ message: `Cannot move plan from ${plan.status} to ${req.body.status}`, code: 'INVALID_TRANSITION' });
    }
    plan.status = req.body.status;
    await plan.save();
    await auditLog('dental_plan_status', actorId(req), { patientId: String(plan.patientId), planId: String(plan._id), status: plan.status, ip: req.ip, userAgent: req.get('user-agent') });
    return res.json({ id: String(plan._id), status: plan.status });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// ─── Lab work tracker ───────────────────────────────────────────────────────
// authz: object
router.post('/lab-works', protect, validate(createDentalLabWorkSchema), authorizeObject(providerOwner), async (req, res) => {
  try {
    if (!(await requirePatient(req.body.patientId))) return res.status(404).json({ message: 'Patient not found' });
    res.set('Cache-Control', 'no-store');
    const me = actorId(req);
    const row = await DentalLabWork.create({
      patientId: req.body.patientId,
      providerId: req.body.providerId,
      recordedBy: me,
      workType: req.body.workType,
      teeth: req.body.teeth ?? [],
      labName: req.body.labName ?? '',
      costAmount: req.body.costAmount ?? 0,
    });
    await auditLog('dental_labwork_created', me, { patientId: String(req.body.patientId), providerId: String(req.body.providerId), labWorkId: String(row._id), ip: req.ip, userAgent: req.get('user-agent') });
    return res.status(201).json(row);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// authz: object
router.get('/lab-works', protect, authorize('records:read'), async (req, res) => {
  try {
    const patientId = req.query.patientId == null || req.query.patientId === '' ? null : String(req.query.patientId);
    if (!patientId || !OBJECT_ID.test(patientId)) return res.status(400).json({ message: 'patientId is required' });
    const status = req.query.status == null || req.query.status === '' ? null : String(req.query.status);
    if (status && !['sent', 'received', 'fitted'].includes(status)) return res.status(400).json({ message: 'Unknown status filter' });
    res.set('Cache-Control', 'no-store');
    const rows = await DentalLabWork.find({
      patientId, providerId: { $in: await myProviderIds(req) }, ...(status ? { status } : {}),
    }).sort({ createdAt: -1 }).limit(50).lean();
    return res.json({ total: rows.length, labWorks: rows });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// authz: object
router.patch('/lab-works/:id/status', protect, requireObjectId, validate(dentalLabStatusSchema), authorizeObject(providerOwnerOf(DentalLabWork)), async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const work = req.scoped;
    if (!LAB_TRANSITIONS[work.status].includes(req.body.status)) {
      return res.status(409).json({ message: `Cannot move lab work from ${work.status} to ${req.body.status}`, code: 'INVALID_TRANSITION' });
    }
    work.status = req.body.status;
    if (req.body.status === 'received') work.receivedAt = new Date();
    if (req.body.status === 'fitted') work.fittedAt = new Date();
    await work.save();
    await auditLog('dental_labwork_status', actorId(req), { patientId: String(work.patientId), labWorkId: String(work._id), status: work.status, ip: req.ip, userAgent: req.get('user-agent') });
    return res.json({ id: String(work._id), status: work.status });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// ─── Sterilisation log ──────────────────────────────────────────────────────
// authz: object
router.post('/sterilisation', protect, validate(createSterilisationSchema), authorizeObject(providerOwner), async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const me = actorId(req);
    const row = await SterilisationLog.create({
      providerId: req.body.providerId,
      recordedBy: me,
      method: req.body.method,
      temperatureC: req.body.temperatureC,
      durationMin: req.body.durationMin,
      indicator: req.body.indicator,
      machineId: req.body.machineId ?? '',
      loadContents: req.body.loadContents ?? '',
      operatedBy: req.body.operatedBy ?? '',
      date: req.body.date,
      notes: req.body.notes ?? '',
    });
    await auditLog('sterilisation_logged', me, { providerId: String(req.body.providerId), logId: String(row._id), indicator: req.body.indicator, ip: req.ip, userAgent: req.get('user-agent') });
    return res.status(201).json(row);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// authz: object
router.get('/sterilisation', protect, authorize('records:read'), async (req, res) => {
  try {
    const providerId = req.query.providerId == null || req.query.providerId === '' ? null : String(req.query.providerId);
    if (!providerId || !OBJECT_ID.test(providerId)) return res.status(400).json({ message: 'providerId is required' });
    const from = req.query.from == null || req.query.from === '' ? null : String(req.query.from);
    const to = req.query.to == null || req.query.to === '' ? null : String(req.query.to);
    if ((from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) || (to && !/^\d{4}-\d{2}-\d{2}$/.test(to))) {
      return res.status(400).json({ message: 'from/to must be YYYY-MM-DD' });
    }
    res.set('Cache-Control', 'no-store');
    const mine = await myProviderIds(req);
    if (!mine.map(String).includes(providerId)) return res.status(404).json({ message: 'Not found' });
    const rows = await SterilisationLog.find({
      providerId, ...(from || to ? { date: { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) } } : {}),
    }).sort({ date: -1 }).limit(100).lean();
    return res.json({ total: rows.length, logs: rows });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// ─── Patient's own dental records ───────────────────────────────────────────
// authz: object
router.get('/mine', protect, authorize('records:read:own'), async (req, res) => {
  try {
    const access = await resolveProfileAccess(req, req.query.personId);
    if (!access.ok) return res.status(404).json({ message: 'Profile not found' });
    res.set('Cache-Control', 'no-store');
    const me = actorId(req);
    // Allowlist, patient-facing: clinical content without the writer ids.
    // familyMemberId follows the summary/timeline rule — null matches today's
    // rows (the field does not exist on dental documents yet), a profile id
    // matches rows attributed to that member once bookings learn the linkage.
    const [charts, plans, labWorks] = await Promise.all([
      DentalChart.find({ patientId: me, familyMemberId: access.scope }).sort({ recordedAt: -1 }).limit(20).lean(),
      DentalTreatmentPlan.find({ patientId: me, familyMemberId: access.scope }).sort({ createdAt: -1 }).limit(20).lean(),
      DentalLabWork.find({ patientId: me, familyMemberId: access.scope }).sort({ createdAt: -1 }).limit(20).lean(),
    ]);
    return res.json({
      person: access.profile,
      charts: charts.map((c) => ({ id: String(c._id), providerId: String(c.providerId), teeth: c.teeth, images: c.images ?? [], recordedAt: c.recordedAt })),
      plans: plans.map((p) => ({
        id: String(p._id), providerId: String(p.providerId), title: p.title, stages: p.stages, status: p.status,
        estimateTotal: (p.stages ?? []).reduce((sum, s) => sum + (s.costAmount || 0), 0),
      })),
      labWorks: labWorks.map((w) => ({ id: String(w._id), providerId: String(w.providerId), workType: w.workType, teeth: w.teeth ?? [], status: w.status })),
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

export default router;
