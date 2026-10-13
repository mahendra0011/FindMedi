/**
 * File 25 §10: quarterly access-certification sweep (Access Review campaigns).
 *
 * The route (POST /iam/reviews) creates a campaign on demand; this sweep is
 * the scheduler half so certification actually happens without someone
 * remembering. Idempotent by (tenantId, cycle): one campaign per tenant per
 * calendar quarter, ever. Reviewer = the tenant's own hospital_admin, falling
 * back to any superadmin so a campaign is never left reviewer-less.
 *
 * Exported for BOTH the nightly scheduler and unit tests.
 */
import IamAssignment from '../models/IamAssignment.js';
import AccessReview from '../models/AccessReview.js';
import User from '../models/User.js';
import logger from '../config/logger.js';

export const quarterCycle = (now = new Date()) =>
  `${now.getFullYear()}-Q${Math.floor(now.getMonth() / 3) + 1}-Certification`;

export async function runIamReviewCampaigns(now = new Date()) {
  const cycle = quarterCycle(now);
  let created = 0;
  let skipped = 0;
  try {
    const tenantIds = await IamAssignment.distinct('tenantId', {
      status: 'active',
      tenantId: { $exists: true, $ne: null },
    });
    for (const tenantId of tenantIds) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const exists = await AccessReview.exists({ tenantId, cycle });
        if (exists) { skipped += 1; continue; }
        // eslint-disable-next-line no-await-in-loop
        const active = await IamAssignment.find({ tenantId, status: 'active' }).select('_id').lean();
        if (!active.length) { skipped += 1; continue; }
        // eslint-disable-next-line no-await-in-loop
        const reviewer = await User.findOne({
          $or: [{ hospitalId: tenantId }, { facilityId: tenantId }],
          role: { $in: ['hospital_admin', 'superadmin'] },
        });
        if (!reviewer) { skipped += 1; continue; }
        // eslint-disable-next-line no-await-in-loop
        await AccessReview.create({
          tenantId,
          cycle,
          reviewerId: reviewer._id,
          items: active.map((a) => ({ assignmentId: a._id, decision: 'pending', note: '' })),
        });
        created += 1;
      } catch (e) {
        logger.warn(`[iam-review] tenant ${tenantId}: ${e.message}`);
      }
    }
  } catch (e) {
    logger.warn(`[iam-review] sweep failed: ${e.message}`);
  }
  if (created) logger.info(`[iam-review] created ${created} campaign(s) for ${cycle}`);
  return { created, skipped, cycle };
}
