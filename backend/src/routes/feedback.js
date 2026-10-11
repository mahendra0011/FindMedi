import express from 'express';
import { z } from 'zod';
import Feedback from '../models/Feedback.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../utils/validate.js';
import { auditLog } from '../middleware/audit.js';

// Checklist §2: NPS / patient-feedback survey. Anyone signed in (patient or
// staff) may submit their OWN feedback; the response/follow-up side is admin.
// Anonymous kiosk submissions ride `publicFeedbackLimiter`-less protect too —
// a kiosk must be logged in as a shared receptionist account, so a row always
// has a createdBy for abuse tracing even when patientId is null.

const router = express.Router();

const feedbackSchema = z.object({
  patientId: z.string().regex(/^[0-9a-f]{24}$/i).optional(),
  context: z.enum(['visit', 'pharmacy', 'lab', 'admission', 'teleconsult', 'other']).optional(),
  department: z.string().trim().max(120).optional(),
  npsScore: z.number().int().min(0).max(10).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().trim().max(2000).optional(),
}).strict().refine((b) => b.npsScore !== undefined || b.rating !== undefined, {
  message: 'npsScore (0-10) or rating (1-5) required',
});

// Submit feedback. A patient may attach their own id (or omit it to stay
// anonymous at the row level); a staff submitter cannot claim a patientId.
// authz: role
router.post('/', protect, validate(feedbackSchema), async (req, res) => {
  try {
    const isStaff = req.user.role !== 'patient';
    if (req.body.patientId && isStaff) {
      return res.status(403).json({ message: 'Staff may not submit on behalf of a patient' });
    }
    const row = await Feedback.create({
      hospitalId: req.user.hospitalId || undefined,
      patientId: req.body.patientId ?? (isStaff ? null : req.user._id),
      context: req.body.context || 'visit',
      department: req.body.department || '',
      npsScore: req.body.npsScore,
      rating: req.body.rating,
      comment: req.body.comment || '',
      createdBy: req.user._id,
    });
    await auditLog('feedback_submitted', req.user._id, { recordId: row._id, ip: req.ip });
    return res.status(201).json({ id: String(row._id) });
  } catch (err) { return res.status(400).json({ message: err.message }); }
});

// authz: self
router.get('/mine', protect, async (req, res) => {
  try {
    const rows = await Feedback.find({ patientId: req.user._id }).sort({ createdAt: -1 }).limit(50).lean();
    return res.json({ total: rows.length, feedback: rows });
  } catch (err) { return res.status(500).json({ message: err.message }); }
});

// Admin list + NPS score. Bands follow the standard: 9-10 promoter,
// 7-8 passive, 0-6 detractor; score is %promoters − %detractors.
// authz: role
router.get('/', protect, authorize('staff:manage'), async (req, res) => {
  try {
    const filter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if (req.query.status) filter.status = String(req.query.status);
    if (req.query.context) filter.context = String(req.query.context);
    const rows = await Feedback.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    const scored = rows.filter((r) => typeof r.npsScore === 'number');
    const promoters = scored.filter((r) => r.npsScore >= 9).length;
    const detractors = scored.filter((r) => r.npsScore <= 6).length;
    const nps = scored.length ? Math.round(((promoters - detractors) / scored.length) * 100) : null;
    return res.json({ total: rows.length, nps, promoters, detractors, passives: scored.length - promoters - detractors, feedback: rows });
  } catch (err) { return res.status(500).json({ message: err.message }); }
});

const respondSchema = z.object({
  note: z.string().trim().min(1).max(1000),
  status: z.enum(['in_review', 'resolved']),
}).strict();

// authz: role
router.put('/:id/respond', protect, authorize('staff:manage'), async (req, res) => {
  try {
    const row = await Feedback.findById(req.params.id);
    if (!row) return res.status(404).json({ message: 'Feedback not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && row.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    row.response = { by: req.user._id, at: new Date(), note: req.body.note };
    row.status = req.body.status;
    await row.save();
    await auditLog('feedback_responded', req.user._id, { recordId: row._id, ip: req.ip });
    return res.json({ id: String(row._id), status: row.status });
  } catch (err) { return res.status(400).json({ message: err.message }); }
});

export default router;
