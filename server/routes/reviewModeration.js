import express from 'express';
import { z } from 'zod';
import Review from '../models/Review.js';
import { protect, adminOnly, superadminOnly } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { validate } from '../utils/validate.js';

const flagSchema = z.object({ reason: z.string().optional() });

const router = express.Router();

router.get('/', protect, adminOnly, async (req, res) => {
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

router.put('/:id/flag', protect, adminOnly, validate(flagSchema), async (req, res) => {
  try {
    const { reason } = req.body;
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { flagged: true, flagReason: reason || '', flaggedBy: req.user.name || req.user.id },
      { new: true }
    );
    if (!review) return res.status(404).json({ message: 'Review not found' });
    await auditLog('flag_review', req.user._id, { targetReviewId: req.params.id, reason, ip: req.ip, userAgent: req.get('user-agent') });
    res.json(review);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id/unflag', protect, superadminOnly, async (req, res) => {
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
