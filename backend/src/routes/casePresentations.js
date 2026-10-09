import express from 'express';
import CasePresentation from '../models/CasePresentation.js';
import { protect } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../config/logger.js';

// Doc 11 P2: case presentations (tumour board / M&M / teaching).
// De-identified rows; the linked encounter carries identity under its own gates.

const router = express.Router();
router.use(protect);

const actorId = (req) => req.user._id ?? req.user.id;
const CLINICAL = ['doctor', 'clinic_doctor', 'hospital_admin', 'superadmin'];
const clinicalOnly = (req, res, next) => (
  CLINICAL.includes(req.user?.role) ? next() : res.status(403).json({ message: 'Clinical access required' })
);
const tenantFilter = (req) => (req.user.role === 'superadmin' && !req.user.hospitalId
  ? {} : { hospitalId: req.user.hospitalId });

router.get('/', clinicalOnly, async (req, res) => {
  try {
    const { kind, status } = req.query;
    const filter = { ...tenantFilter(req) };
    if (kind) filter.kind = kind;
    if (status) filter.status = status;
    const rows = await CasePresentation.find(filter).sort({ updatedAt: -1 }).limit(200).lean();
    return res.json({ cases: rows });
  } catch (err) {
    logger.error(`Cases error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/', clinicalOnly, async (req, res) => {
  try {
    const { encounterId, kind, title, summary, questions } = req.body || {};
    if (!title) return res.status(400).json({ message: 'title required' });
    const row = await CasePresentation.create({
      hospitalId: req.user.hospitalId, encounterId: encounterId || null,
      kind: kind || 'Teaching', title: String(title).slice(0, 200),
      summary: String(summary || '').slice(0, 5000),
      questions: Array.isArray(questions) ? questions.slice(0, 20) : [],
      presentedBy: actorId(req),
    });
    await auditLog('case_created', actorId(req), { caseId: row._id, kind: row.kind, ip: req.ip });
    return res.status(201).json({ id: String(row._id) });
  } catch (err) {
    logger.error(`Case create error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.put('/:id/present', clinicalOnly, async (req, res) => {
  try {
    const { discussion, decision } = req.body || {};
    const row = await CasePresentation.findById(req.params.id);
    if (!row) return res.status(404).json({ message: 'Not found' });
    row.discussion = String(discussion || '').slice(0, 5000);
    row.decision = String(decision || '').slice(0, 2000);
    row.status = 'Presented';
    row.presentedAt = new Date();
    await row.save();
    return res.json({ id: String(row._id), status: row.status });
  } catch (err) {
    logger.error(`Case present error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
