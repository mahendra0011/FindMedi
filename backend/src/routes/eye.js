import express from 'express';
import Provider from '../models/Provider.js';
import EyeExam from '../models/EyeExam.js';
import OpticalJobCard from '../models/OpticalJobCard.js';
import EyeSurgeryLead from '../models/EyeSurgeryLead.js';
import User from '../models/User.js';
import { protect, authorize } from '../middleware/auth.js';
import { authorizeObject } from '../middleware/authorize.js';
import { auditLog } from '../middleware/audit.js';
import {
  validate, createEyeExamSchema, createOpticalJobSchema, opticalJobStatusSchema,
  createSurgeryLeadSchema, surgeryStageSchema,
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

// Forward-only pipelines (same policy as the dental trackers): timestamps are
// stamped by the transition, never accepted from the caller.
const JOB_TRANSITIONS = {
  booked: ['in_lab', 'cancelled'], in_lab: ['ready', 'cancelled'],
  ready: ['delivered', 'cancelled'], delivered: [], cancelled: [],
};
const JOB_STAMPS = { in_lab: 'inLabAt', ready: 'readyAt', delivered: 'deliveredAt' };
const LEAD_TRANSITIONS = {
  lead: ['pre_op', 'cancelled'], pre_op: ['scheduled', 'cancelled'],
  scheduled: ['completed', 'cancelled'], completed: ['follow_up'],
  follow_up: [], cancelled: [],
};

// Same ownership discipline as routes/dental.js: provider ownership proven
// through the parent, explicit protect first (req.user comes only from it).
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

// ─── Eye exams ──────────────────────────────────────────────────────────────
// authz: object
router.post('/exams', protect, validate(createEyeExamSchema), authorizeObject(providerOwner), async (req, res) => {
  try {
    if (!(await requirePatient(req.body.patientId))) return res.status(404).json({ message: 'Patient not found' });
    res.set('Cache-Control', 'no-store');
    const me = actorId(req);
    const row = await EyeExam.create({
      patientId: req.body.patientId,
      providerId: req.body.providerId,
      recordedBy: me,
      od: req.body.od ?? {},
      os: req.body.os ?? {},
      iopOd: req.body.iopOd,
      iopOs: req.body.iopOs,
      diagnosis: req.body.diagnosis ?? '',
      prescriptionIssued: req.body.prescriptionIssued ?? false,
      prescriptionType: req.body.prescriptionType ?? 'none',
      nextReviewDate: req.body.nextReviewDate,
    });
    await auditLog('eye_exam_created', me, { patientId: String(req.body.patientId), providerId: String(req.body.providerId), examId: String(row._id), ip: req.ip, userAgent: req.get('user-agent') });
    return res.status(201).json(row);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// authz: object
router.get('/exams', protect, authorize('records:read'), async (req, res) => {
  try {
    const patientId = req.query.patientId == null || req.query.patientId === '' ? null : String(req.query.patientId);
    if (!patientId || !OBJECT_ID.test(patientId)) return res.status(400).json({ message: 'patientId is required' });
    res.set('Cache-Control', 'no-store');
    const rows = await EyeExam.find({ patientId, providerId: { $in: await myProviderIds(req) } })
      .sort({ recordedAt: -1 }).limit(50).lean();
    return res.json({ total: rows.length, exams: rows });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// ─── Optical job cards ──────────────────────────────────────────────────────
// authz: object
router.post('/job-cards', protect, validate(createOpticalJobSchema), authorizeObject(providerOwner), async (req, res) => {
  try {
    if (!(await requirePatient(req.body.patientId))) return res.status(404).json({ message: 'Patient not found' });
    res.set('Cache-Control', 'no-store');
    const me = actorId(req);
    const row = await OpticalJobCard.create({
      patientId: req.body.patientId,
      providerId: req.body.providerId,
      recordedBy: me,
      frames: req.body.frames ?? '',
      lensOd: req.body.lensOd ?? {},
      lensOs: req.body.lensOs ?? {},
      lensMaterial: req.body.lensMaterial ?? '',
      coating: req.body.coating ?? '',
      priceAmount: req.body.priceAmount ?? 0,
    });
    await auditLog('optical_job_created', me, { patientId: String(req.body.patientId), providerId: String(req.body.providerId), jobId: String(row._id), ip: req.ip, userAgent: req.get('user-agent') });
    return res.status(201).json(row);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// authz: object
router.get('/job-cards', protect, authorize('records:read'), async (req, res) => {
  try {
    const patientId = req.query.patientId == null || req.query.patientId === '' ? null : String(req.query.patientId);
    if (!patientId || !OBJECT_ID.test(patientId)) return res.status(400).json({ message: 'patientId is required' });
    const status = req.query.status == null || req.query.status === '' ? null : String(req.query.status);
    if (status && !['booked', 'in_lab', 'ready', 'delivered', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Unknown status filter' });
    }
    res.set('Cache-Control', 'no-store');
    const rows = await OpticalJobCard.find({
      patientId, providerId: { $in: await myProviderIds(req) }, ...(status ? { status } : {}),
    }).sort({ createdAt: -1 }).limit(50).lean();
    return res.json({ total: rows.length, jobCards: rows });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// authz: object
router.patch('/job-cards/:id/status', protect, requireObjectId, validate(opticalJobStatusSchema), authorizeObject(providerOwnerOf(OpticalJobCard)), async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const job = req.scoped;
    if (!JOB_TRANSITIONS[job.status].includes(req.body.status)) {
      return res.status(409).json({ message: `Cannot move job from ${job.status} to ${req.body.status}`, code: 'INVALID_TRANSITION' });
    }
    job.status = req.body.status;
    const stamp = JOB_STAMPS[req.body.status];
    if (stamp) job[stamp] = new Date();
    await job.save();
    await auditLog('optical_job_status', actorId(req), { patientId: String(job.patientId), jobId: String(job._id), status: job.status, ip: req.ip, userAgent: req.get('user-agent') });
    return res.json({ id: String(job._id), status: job.status });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// ─── Surgery pipeline ───────────────────────────────────────────────────────
// authz: object
router.post('/surgery-leads', protect, validate(createSurgeryLeadSchema), authorizeObject(providerOwner), async (req, res) => {
  try {
    if (!(await requirePatient(req.body.patientId))) return res.status(404).json({ message: 'Patient not found' });
    res.set('Cache-Control', 'no-store');
    const me = actorId(req);
    const row = await EyeSurgeryLead.create({
      patientId: req.body.patientId,
      providerId: req.body.providerId,
      recordedBy: me,
      procedure: req.body.procedure,
      eye: req.body.eye,
      notes: req.body.notes ?? '',
    });
    await auditLog('eye_surgery_lead_created', me, { patientId: String(req.body.patientId), providerId: String(req.body.providerId), leadId: String(row._id), ip: req.ip, userAgent: req.get('user-agent') });
    return res.status(201).json(row);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// authz: object
router.get('/surgery-leads', protect, authorize('records:read'), async (req, res) => {
  try {
    const patientId = req.query.patientId == null || req.query.patientId === '' ? null : String(req.query.patientId);
    if (!patientId || !OBJECT_ID.test(patientId)) return res.status(400).json({ message: 'patientId is required' });
    const stage = req.query.stage == null || req.query.stage === '' ? null : String(req.query.stage);
    if (stage && !['lead', 'pre_op', 'scheduled', 'completed', 'follow_up', 'cancelled'].includes(stage)) {
      return res.status(400).json({ message: 'Unknown stage filter' });
    }
    res.set('Cache-Control', 'no-store');
    const rows = await EyeSurgeryLead.find({
      patientId, providerId: { $in: await myProviderIds(req) }, ...(stage ? { stage } : {}),
    }).sort({ createdAt: -1 }).limit(50).lean();
    return res.json({ total: rows.length, leads: rows });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// authz: object
router.patch('/surgery-leads/:id/stage', protect, requireObjectId, validate(surgeryStageSchema), authorizeObject(providerOwnerOf(EyeSurgeryLead)), async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const lead = req.scoped;
    if (!LEAD_TRANSITIONS[lead.stage].includes(req.body.stage)) {
      return res.status(409).json({ message: `Cannot move lead from ${lead.stage} to ${req.body.stage}`, code: 'INVALID_TRANSITION' });
    }
    lead.stage = req.body.stage;
    await lead.save();
    await auditLog('eye_surgery_stage', actorId(req), { patientId: String(lead.patientId), leadId: String(lead._id), stage: lead.stage, ip: req.ip, userAgent: req.get('user-agent') });
    return res.json({ id: String(lead._id), stage: lead.stage });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// ─── Patient's own eye records ──────────────────────────────────────────────
// authz: object
router.get('/mine', protect, authorize('records:read:own'), async (req, res) => {
  try {
    const access = await resolveProfileAccess(req, req.query.personId);
    if (!access.ok) return res.status(404).json({ message: 'Profile not found' });
    res.set('Cache-Control', 'no-store');
    const me = actorId(req);
    // Same familyMemberId rule as the other clinical modules: null matches
    // today's unattributed rows, a profile id matches attributed ones.
    const [exams, jobCards, leads] = await Promise.all([
      EyeExam.find({ patientId: me, familyMemberId: access.scope }).sort({ recordedAt: -1 }).limit(20).lean(),
      OpticalJobCard.find({ patientId: me, familyMemberId: access.scope }).sort({ createdAt: -1 }).limit(20).lean(),
      EyeSurgeryLead.find({ patientId: me, familyMemberId: access.scope }).sort({ createdAt: -1 }).limit(20).lean(),
    ]);
    return res.json({
      person: access.profile,
      exams: exams.map((e) => ({
        id: String(e._id), providerId: String(e.providerId), od: e.od ?? {}, os: e.os ?? {},
        diagnosis: e.diagnosis ?? '', prescriptionIssued: Boolean(e.prescriptionIssued),
        prescriptionType: e.prescriptionType ?? 'none', nextReviewDate: e.nextReviewDate ?? null,
        recordedAt: e.recordedAt,
      })),
      jobCards: jobCards.map((j) => ({
        id: String(j._id), providerId: String(j.providerId), frames: j.frames ?? '',
        status: j.status, priceAmount: j.priceAmount ?? 0,
      })),
      surgeryLeads: leads.map((l) => ({
        id: String(l._id), providerId: String(l.providerId), procedure: l.procedure, eye: l.eye, stage: l.stage,
      })),
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

export default router;
