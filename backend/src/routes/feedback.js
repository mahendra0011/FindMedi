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
  refModel: z.enum(['Appointment', 'Admission', 'PharmacyOrder', 'LabOrder', 'Teleconsult', 'Other']).optional(),
  refId: z.string().trim().max(100).optional(),
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
    const patientId = req.body.patientId ?? (isStaff ? null : req.user._id);
    const refId = req.body.refId ? String(req.body.refId).trim() : '';

    if (refId && patientId) {
      const existing = await Feedback.findOne({
        patientId,
        context: req.body.context || 'visit',
        refId,
      }).lean();
      if (existing) {
        return res.status(409).json({
          message: 'Feedback already submitted for this visit/order',
          code: 'FEEDBACK_DUPLICATE',
          id: String(existing._id),
        });
      }
    }

    const row = await Feedback.create({
      hospitalId: req.user.hospitalId || undefined,
      patientId,
      context: req.body.context || 'visit',
      department: req.body.department || '',
      npsScore: req.body.npsScore,
      rating: req.body.rating,
      comment: req.body.comment || '',
      refModel: req.body.refModel || '',
      refId,
      createdBy: req.user._id,
    });
    await auditLog('feedback_submitted', req.user._id, { recordId: row._id, ip: req.ip });

    // Detractor alert: score <= 6 notifies patient relations / hospital admin
    if (typeof req.body.npsScore === 'number' && req.body.npsScore <= 6 && req.user.hospitalId) {
      try {
        const { createNotification } = await import('../services/notificationService.js');
        const User = (await import('../models/User.js')).default;
        const managers = await User.find({
          hospitalId: req.user.hospitalId,
          role: { $in: ['patient_relations', 'quality_officer', 'hospital_admin'] },
        }).select('_id').limit(5).lean();
        for (const m of managers) {
          await createNotification({
            userId: String(m._id),
            type: 'system',
            priority: 'high',
            title: `NPS Detractor Alert (${req.body.npsScore}/10)`,
            message: `Detractor feedback received in ${req.body.department || req.body.context || 'general'}: "${(req.body.comment || 'No comment').slice(0, 100)}"`,
            details: { feedbackId: String(row._id), score: req.body.npsScore },
            actor: 'feedbackSystem',
          }).catch(() => null);
        }
      } catch { /* non-fatal notification */ }
    }

    return res.status(201).json({ id: String(row._id) });
  } catch (err) { return res.status(400).json({ message: err.message }); }
});

// authz: self
router.get('/mine', protect, async (req, res) => {
  try {
    const filter = { patientId: req.user._id };
    if (req.query.refId) filter.refId = String(req.query.refId);
    if (req.query.context) filter.context = String(req.query.context);
    const rows = await Feedback.find(filter).sort({ createdAt: -1 }).limit(50).lean();
    return res.json({ total: rows.length, hasSubmitted: rows.length > 0, feedback: rows });
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

// Aggregate summary endpoint for UI metrics (Section C1 requirement)
router.get('/summary', protect, authorize('staff:manage'), async (req, res) => {
  try {
    const filter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if (req.query.dept) filter.department = String(req.query.dept);
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
    }
    const rows = await Feedback.find(filter).lean();
    const scored = rows.filter((r) => typeof r.npsScore === 'number');
    const rated = rows.filter((r) => typeof r.rating === 'number');
    const promoters = scored.filter((r) => r.npsScore >= 9).length;
    const detractors = scored.filter((r) => r.npsScore <= 6).length;
    const passives = scored.length - promoters - detractors;
    const nps = scored.length ? Math.round(((promoters - detractors) / scored.length) * 100) : null;
    const avgRating = rated.length ? Math.round((rated.reduce((acc, r) => acc + r.rating, 0) / rated.length) * 10) / 10 : null;

    // Grouping by department
    const byDepartment = {};
    for (const r of rows) {
      const d = r.department || 'General';
      if (!byDepartment[d]) byDepartment[d] = { count: 0, sumRating: 0, ratedCount: 0 };
      byDepartment[d].count += 1;
      if (r.rating) {
        byDepartment[d].sumRating += r.rating;
        byDepartment[d].ratedCount += 1;
      }
    }

    return res.json({
      totalResponses: rows.length,
      nps,
      promoters,
      detractors,
      passives,
      avgCsat: avgRating,
      byDepartment,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
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
