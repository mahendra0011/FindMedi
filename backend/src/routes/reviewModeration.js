import express from 'express';
import { z } from 'zod';
import Review from '../models/Review.js';
import { protect, superadminOnly, requireRole } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { validate } from '../utils/validate.js';
import { ensureModerationItem } from '../lib/moderationActions.js';

const flagSchema = z.object({ reason: z.string().optional() });

const router = express.Router();

// 8.md 5: the moderation queue is a FIRST-LINE job, so it must be reachable
// without the superadmin key - but only by superadmin, the tenant admin whose
// patients wrote the review, and the ops moderator. Removing a review outright
// (DELETE) stays superadmin: it is irreversible.
router.get('/', protect, requireRole(['superadmin', 'hospital_admin', 'moderator']), async (req, res) => {
  try {
    const { flagged, search } = req.query;
    const filter = {};
    if (flagged === 'true') filter.flagged = true;

    if (search) {
      filter.$or = [
        { doctorName: { $regex: search, $options: 'i' } },
        { patientName: { $regex: search, $options: 'i' } },
        { comment: { $regex: search, $options: 'i' } },
      ];
    }

    const reviews = await Review.find(filter).sort({ createdAt: -1 }).limit(100);
    res.json(reviews);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id/flag', protect, requireRole(['superadmin', 'hospital_admin', 'moderator']), validate(flagSchema), async (req, res) => {
  try {
    const { reason } = req.body;
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { flagged: true, flagReason: reason || '', flaggedBy: req.user.name || req.user.id },
      { new: true }
    );
    if (!review) return res.status(404).json({ message: 'Review not found' });
    // 8.md §5: a flag is a REPORT — it belongs in the moderation queue (one
    // OPEN row per review, severity from the reason), not only on the review
    // row, so the queue's SLA clock and action log pick it up.
    try {
      await ensureModerationItem({
        targetType: 'review',
        targetId: review._id,
        category: 'other',
        reason: reason || 'Reported by reviewer',
        source: 'user_report',
        reporterId: req.user._id,
        subjectUserId: review.patientId ?? null,
        note: reason || '',
      });
    } catch (_queueErr) {
      // Fail-soft: the flag itself already took effect on the review row.
    }
    await auditLog('flag_review', req.user._id, { targetReviewId: req.params.id, reason, ip: req.ip, userAgent: req.get('user-agent') });
    res.json(review);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id/unflag', protect, requireRole(['superadmin', 'moderator']), async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { flagged: false, flagReason: '', flaggedBy: '' },
      { new: true }
    );
    if (!review) return res.status(404).json({ message: 'Review not found' });
    await auditLog('unflag_review', req.user._id, { targetReviewId: req.params.id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json(review);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/:id', protect, superadminOnly, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    await Review.findByIdAndDelete(req.params.id);
    await auditLog('delete_review', req.user._id, { targetReviewId: req.params.id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json({ message: 'Review deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
