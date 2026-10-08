import express from 'express';
import Provider from '../models/Provider.js';
import QualityChecklist from '../models/QualityChecklist.js';
import { protect, authorize } from '../middleware/auth.js';
import { authorizeObject } from '../middleware/authorize.js';
import { auditLog } from '../middleware/audit.js';
import { validate, createQualityChecklistSchema } from '../utils/validate.js';
import { scoreChecklist } from '../lib/qualityScore.js';

const router = express.Router();

const OBJECT_ID = /^[0-9a-f]{24}$/i;
const requireObjectId = (req, res, next) => (
  OBJECT_ID.test(String(req.params.id))
    ? next()
    : res.status(404).json({ message: 'Not found' })
);

const actorId = (req) => req.user._id ?? req.user.id;

const withScore = (row) => ({ ...row, ...scoreChecklist(row.items ?? []) });

// ─── Quality checklists (7.md §3.41) ────────────────────────────────────────
// Compliance snapshots: POST writes an immutable assessment, GET reads history
// with derived scores. No PATCH/DELETE — a correction is a new assessment,
// which is exactly what an auditor wants to see. Same ownership discipline
// as the clinical verticals (authorizeObject through the parent provider).
// authz: object
router.post('/', protect, validate(createQualityChecklistSchema), authorizeObject({
  model: Provider,
  idFrom: (req) => req.body.providerId,
  ownerField: 'ownerUserId',
  actorRoles: [],
  write: true,
}), async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const me = actorId(req);
    const row = await QualityChecklist.create({
      providerId: req.body.providerId,
      recordedBy: me,
      checklistType: req.body.checklistType,
      title: req.body.title ?? '',
      items: (req.body.items ?? []).map((i) => ({
        code: i.code, label: i.label, status: i.status,
        evidence: i.evidence ?? '', remarks: i.remarks ?? '',
      })),
    });
    await auditLog('quality_checklist_created', me, { providerId: String(req.body.providerId), checklistId: String(row._id), checklistType: req.body.checklistType, ip: req.ip, userAgent: req.get('user-agent') });
    return res.status(201).json(withScore(row.toObject ? row.toObject() : row));
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// authz: object
router.get('/', protect, authorize('reports:read'), async (req, res) => {
  try {
    const providerId = req.query.providerId == null || req.query.providerId === '' ? null : String(req.query.providerId);
    if (!providerId || !OBJECT_ID.test(providerId)) return res.status(400).json({ message: 'providerId is required' });
    const checklistType = req.query.checklistType == null || req.query.checklistType === '' ? null : String(req.query.checklistType);
    if (checklistType && !['nabh', 'kayakalp', 'fire_safety', 'bmw', 'infection_control', 'other'].includes(checklistType)) {
      return res.status(400).json({ message: 'Unknown checklist type' });
    }
    res.set('Cache-Control', 'no-store');
    const mine = await Provider.find({ ownerUserId: actorId(req) }).select('_id').lean();
    if (!mine.map((p) => String(p._id)).includes(providerId)) return res.status(404).json({ message: 'Not found' });
    const rows = await QualityChecklist.find({ providerId, ...(checklistType ? { checklistType } : {}) })
      .sort({ conductedAt: -1 }).limit(50).lean();
    return res.json({ total: rows.length, checklists: rows.map(withScore) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// authz: object
router.get('/:id', protect, requireObjectId, authorize('reports:read'), async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const row = await QualityChecklist.findById(req.params.id).lean();
    if (!row) return res.status(404).json({ message: 'Not found' });
    const mine = await Provider.find({ ownerUserId: actorId(req) }).select('_id').lean();
    if (!mine.map((p) => String(p._id)).includes(String(row.providerId))) {
      return res.status(404).json({ message: 'Not found' });
    }
    return res.json(withScore(row));
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

export default router;
