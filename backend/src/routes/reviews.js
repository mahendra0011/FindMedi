import express from 'express';
import { z } from 'zod';
import Review from '../models/Review.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate, createReviewSchema } from '../utils/validate.js';
import { paginatedResults } from '../utils/pagination.js';
import { auditLog } from '../middleware/audit.js';
import { reviewWriteLimiter } from '../middleware/rateLimit.js';
import { sendServerError } from '../utils/safeError.js';
import { applyTenantScope } from '../utils/tenantScope.js';
import logger from '../config/logger.js';

const replySchema = z.object({ reply: z.string().min(1, 'Reply text is required').max(2000) });

const router = express.Router();

/**
 * REV-B-01 (a) attribution, (b) tenant-scoped moderation, (d) bounded public list.
 *
 * The module previously had all four defects at once:
 *   - `POST /` stored `{...req.body}` with no author, so reviews were anonymous,
 *     spam-able, and un-actionable afterwards;
 *   - `PUT /:id/reply` had NO hospital scoping, so a doctor at hospital A could
 *     publish an official-sounding reply on hospital B's review;
 *   - `DELETE /:id` compared hospitalId only when BOTH sides had one (the
 *     fail-open shape) — any admin could delete another tenant's review;
 *   - `GET /` was fully public, unpaginated, and returned the whole table with
 *     patient names and hospital ids.
 */
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.doctorId) filter.doctorId = req.query.doctorId;
    if (req.query.hospitalId) filter.hospitalId = req.query.hospitalId;
    if (req.query.minRating) filter.rating = { $gte: Number(req.query.minRating) || 1 };

    // REV-B-01 (d): the list is public BY DESIGN (it is the reputation
    // catalogue), but it is paginated and capped — an unbounded public find({})
    // is both a data-volume problem and a scraping surface. The projection also
    // omits the author's id and the internal flag fields.
    const result = await paginatedResults(Review, filter, {
      page: req.query.page || 1,
      limit: req.query.limit || 20,
      sort: { createdAt: -1 },
      select: 'doctorId doctorName rating comment date reply repliedAt createdAt',
    });

    res.json({
      reviews: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });
  } catch (err) {
    logger.error(`review list error: ${err.message}`);
    sendServerError(res, err, 'Could not load reviews');
  }
});

router.post('/', protect, authorize('reviews:write', 'reviews:write:own'), reviewWriteLimiter, validate(createReviewSchema), async (req, res) => {
  try {
    // REV-B-01 (a): the author and the tenant come from the SESSION, never the
    // body. Previously `hospitalId: req.user.hospitalId` was set but NO author was
    // recorded at all, so an anonymous bot could post unlimited reviews and a
    // doctor's average rating became whatever the loudest poster chose.
    const doctorId = String(req.body.doctorId);
    const patientId = req.user._id;

    // One review per patient per doctor — enforced by a unique index as well, so
    // two tabs racing cannot produce two reviews either.
    const existing = await Review.findOne({ doctorId, patientId });
    if (existing) {
      return res.status(409).json({
        message: 'You have already reviewed this doctor.',
        reviewId: existing._id,
      });
    }

    const review = await Review.create({
      doctorId,
      doctorName: req.body.doctorName,
      // The patient NAME is display data, not identity: taking it from the session
      // stops a client from attributing a review to somebody else's name.
      patientName: req.user.name || req.body.patientName || 'Patient',
      patientId,
      rating: req.body.rating,
      comment: req.body.comment || '',
      date: req.body.date,
      hospitalId: req.user.hospitalId || undefined,
    });

    await auditLog('create_review', req.user._id, {
      reviewId: review._id,
      doctorId,
      rating: review.rating,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(201).json(review);
  } catch (err) {
    // 11000 = the unique (doctorId, patientId) index lost a race.
    if (err?.code === 11000) {
      return res.status(409).json({ message: 'You have already reviewed this doctor.' });
    }
    logger.error(`review create error: ${err.message}`);
    sendServerError(res, err, 'Could not submit the review');
  }
});

router.put('/:id/reply', protect, authorize('reviews:write'), reviewWriteLimiter, validate(replySchema), async (req, res) => {
  try {
    const { reply } = req.body;

    // REV-B-01 (b): moderation is tenant-scoped, fail closed. Previously any role
    // holding `reviews:write` could reply on ANY tenant's review — a doctor at
    // hospital A answering publicly on a complaint about hospital B.
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });

    if (req.user.role !== 'superadmin') {
      const scope = applyTenantScope(req, {}, { fields: ['hospitalId'], allowSharedRowsForNonStaff: false });
      if (!scope.ok) return res.status(403).json({ message: scope.message });
      const callerHospital = req.user.hospitalId || req.user.facilityId;
      const reviewHospital = review.hospitalId;
      // Both sides must have a tenant AND they must match. A review with no
      // hospitalId is NOT moderated by an arbitrary hospital admin.
      if (!callerHospital || !reviewHospital || String(callerHospital) !== String(reviewHospital)) {
        logger.warn(
          'REV-B-01: cross-tenant reply denied user=' + req.user.id
          + ' review=' + req.params.id
          + ' reviewHospital=' + reviewHospital
          + ' callerHospital=' + callerHospital
        );
        return res.status(404).json({ message: 'Review not found' });
      }
    }

    const updated = await Review.findByIdAndUpdate(
      req.params.id,
      { reply, repliedAt: new Date(), repliedBy: req.user._id },
      { new: true }
    );
    await auditLog('reply_review', req.user._id, { reviewId: updated._id });
    res.json(updated);
  } catch (err) {
    logger.error(`review reply error: ${err.message}`);
    sendServerError(res, err, 'Could not reply to the review');
  }
});

router.delete('/:id', protect, authorize('reviews:write'), async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });

    // REV-B-01 (c): fail CLOSED. The old check was
    //   role !== 'superadmin' && req.user.hospitalId && review.hospitalId && ...
    // which is false — i.e. ALLOWED — whenever the caller or the review had no
    // hospitalId. Both sides must be present AND equal.
    if (req.user.role !== 'superadmin') {
      const callerHospital = req.user.hospitalId || req.user.facilityId;
      const reviewHospital = review.hospitalId;
      if (!callerHospital || !reviewHospital || String(callerHospital) !== String(reviewHospital)) {
        logger.warn('REV-B-01: cross-tenant delete denied user=' + req.user.id + ' review=' + req.params.id);
        return res.status(404).json({ message: 'Review not found' });
      }
    }

    await Review.findByIdAndDelete(req.params.id);
    await auditLog('delete_review', req.user._id, {
      reviewId: req.params.id,
      doctorId: review.doctorId,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    res.json({ message: 'Deleted' });
  } catch (err) {
    logger.error(`review delete error: ${err.message}`);
    sendServerError(res, err, 'Could not delete the review');
  }
});

export default router;
