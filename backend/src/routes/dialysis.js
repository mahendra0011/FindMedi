import express from 'express';
import Provider from '../models/Provider.js';
import DialysisSession from '../models/DialysisSession.js';
import DialysisWaterQuality from '../models/DialysisWaterQuality.js';
import User from '../models/User.js';
import { protect, authorize } from '../middleware/auth.js';
import { authorizeObject } from '../middleware/authorize.js';
import { auditLog } from '../middleware/audit.js';
import { validate, createDialysisSessionSchema, createDialysisWaterQualitySchema } from '../utils/validate.js';
import { resolveProfileAccess } from '../services/profileAccess.js';

const router = express.Router();

const OBJECT_ID = /^[0-9a-f]{24}$/i;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

const actorId = (req) => req.user._id ?? req.user.id;

// Same ownership discipline as routes/dental.js and routes/eye.js: provider
// ownership proven through the parent, explicit protect first.
const providerOwner = {
  model: Provider,
  idFrom: (req) => req.body.providerId,
  ownerField: 'ownerUserId',
  actorRoles: [],
  write: true,
};

const myProviderIds = async (req) => {
  const rows = await Provider.find({ ownerUserId: actorId(req) }).select('_id').lean();
  return rows.map((r) => r._id);
};

const requirePatient = async (patientId) => {
  const user = await User.findById(patientId).select('_id').lean();
  return Boolean(user);
};

const dateRange = (from, to) => {
  if ((from && !ISO_DAY.test(from)) || (to && !ISO_DAY.test(to))) return { error: 'from/to must be YYYY-MM-DD' };
  if (from && to && to < from) return { error: 'to must not precede from' };
  if (!from && !to) return { filter: {} };
  return { filter: { date: { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) } } };
};

// ─── Dialysis sessions ──────────────────────────────────────────────────────
// authz: object
router.post('/sessions', protect, validate(createDialysisSessionSchema), authorizeObject(providerOwner), async (req, res) => {
  try {
    if (!(await requirePatient(req.body.patientId))) return res.status(404).json({ message: 'Patient not found' });
    res.set('Cache-Control', 'no-store');
    const me = actorId(req);
    const row = await DialysisSession.create({
      patientId: req.body.patientId,
      providerId: req.body.providerId,
      recordedBy: me,
      machineId: req.body.machineId ?? '',
      date: req.body.date,
      preWeightKg: req.body.preWeightKg,
      postWeightKg: req.body.postWeightKg,
      preSystolic: req.body.preSystolic,
      preDiastolic: req.body.preDiastolic,
      postSystolic: req.body.postSystolic,
      postDiastolic: req.body.postDiastolic,
      ufLitres: req.body.ufLitres,
      durationMin: req.body.durationMin,
      isolation: req.body.isolation ?? 'none',
      complications: req.body.complications ?? '',
      notes: req.body.notes ?? '',
    });
    await auditLog('dialysis_session_created', me, { patientId: String(req.body.patientId), providerId: String(req.body.providerId), sessionId: String(row._id), ip: req.ip, userAgent: req.get('user-agent') });
    return res.status(201).json(row);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// authz: object
router.get('/sessions', protect, authorize('records:read'), async (req, res) => {
  try {
    const patientId = req.query.patientId == null || req.query.patientId === '' ? null : String(req.query.patientId);
    if (!patientId || !OBJECT_ID.test(patientId)) return res.status(400).json({ message: 'patientId is required' });
    const from = req.query.from == null || req.query.from === '' ? null : String(req.query.from);
    const to = req.query.to == null || req.query.to === '' ? null : String(req.query.to);
    const { error, filter: dateFilter } = dateRange(from, to);
    if (error) return res.status(400).json({ message: error });
    res.set('Cache-Control', 'no-store');
    const rows = await DialysisSession.find({ patientId, providerId: { $in: await myProviderIds(req) }, ...dateFilter })
      .sort({ date: -1 }).limit(100).lean();
    return res.json({ total: rows.length, sessions: rows });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// ─── Water-quality logs ─────────────────────────────────────────────────────
// authz: object
router.post('/water-quality', protect, validate(createDialysisWaterQualitySchema), authorizeObject(providerOwner), async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const me = actorId(req);
    const row = await DialysisWaterQuality.create({
      providerId: req.body.providerId,
      recordedBy: me,
      date: req.body.date,
      freeChlorinePpm: req.body.freeChlorinePpm,
      tdsPpm: req.body.tdsPpm,
      bacterialCountCfuMl: req.body.bacterialCountCfuMl,
      pass: req.body.pass,
      notes: req.body.notes ?? '',
    });
    await auditLog('dialysis_water_logged', me, { providerId: String(req.body.providerId), logId: String(row._id), pass: req.body.pass, ip: req.ip, userAgent: req.get('user-agent') });
    return res.status(201).json(row);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// authz: object
router.get('/water-quality', protect, authorize('records:read'), async (req, res) => {
  try {
    const providerId = req.query.providerId == null || req.query.providerId === '' ? null : String(req.query.providerId);
    if (!providerId || !OBJECT_ID.test(providerId)) return res.status(400).json({ message: 'providerId is required' });
    const from = req.query.from == null || req.query.from === '' ? null : String(req.query.from);
    const to = req.query.to == null || req.query.to === '' ? null : String(req.query.to);
    const { error, filter: dateFilter } = dateRange(from, to);
    if (error) return res.status(400).json({ message: error });
    res.set('Cache-Control', 'no-store');
    const mine = await myProviderIds(req);
    if (!mine.map(String).includes(providerId)) return res.status(404).json({ message: 'Not found' });
    const rows = await DialysisWaterQuality.find({ providerId, ...dateFilter }).sort({ date: -1 }).limit(100).lean();
    return res.json({ total: rows.length, logs: rows });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// ─── Patient's own dialysis sessions ────────────────────────────────────────
// authz: object
router.get('/mine', protect, authorize('records:read:own'), async (req, res) => {
  try {
    const access = await resolveProfileAccess(req, req.query.personId);
    if (!access.ok) return res.status(404).json({ message: 'Profile not found' });
    res.set('Cache-Control', 'no-store');
    const me = actorId(req);
    const rows = await DialysisSession.find({ patientId: me, familyMemberId: access.scope })
      .sort({ date: -1 }).limit(50).lean();
    return res.json({
      person: access.profile,
      sessions: rows.map((s) => ({
        id: String(s._id), providerId: String(s.providerId), machineId: s.machineId ?? '', date: s.date,
        preWeightKg: s.preWeightKg, postWeightKg: s.postWeightKg, ufLitres: s.ufLitres ?? null,
        isolation: s.isolation ?? 'none',
      })),
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

export default router;
