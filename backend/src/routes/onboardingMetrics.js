/**
 * 2.md 13 — `GET /api/onboarding-metrics`: the join-funnel dashboard payload.
 *
 *   visit -> start -> submit -> approved, drop-off per wizard step, average
 *   review time (submittedAt -> decidedAt), rejection-reason histogram,
 *   doc-resubmission rate and the share of applications whose profile is
 *   >= 80% complete (2.md 7).
 *
 * Guard chain: `protect` + `superadminOnly` on the definition line — the same
 * shape `opsHealth.js` and `commission.js` use. The numbers are aggregated and
 * contain no PII, but "where applicants abandon the wizard" plus the rejection
 * reasons behind them is platform intelligence an attacker would pay for, so
 * it is not public (8.md 10: role-based dashboards).
 *
 * `Cache-Control: no-store` like every other private route that carries data
 * worth re-reading: a shared cache holding a superadmin's metrics snapshot is
 * a cache that will serve it to somebody else.
 */
import express from 'express';
import { protect, superadminOnly } from '../middleware/auth.js';
import { buildOnboardingMetrics } from '../services/onboardingMetricsService.js';
import logger from '../config/logger.js';
import { sendServerError } from '../utils/safeError.js';

const router = express.Router();

// authz: role
//
// The funnel itself. Read-only aggregation: nothing here writes, so there is
// no step-up or dual-approval obligation (8.md 13 covers state CHANGING acts).
router.get('/', protect, superadminOnly, async (_req, res) => {
  try {
    const metrics = await buildOnboardingMetrics();
    res.set('Cache-Control', 'no-store');
    return res.status(200).json(metrics);
  } catch (err) {
    logger.error(`onboarding metrics failed: ${err.message}`);
    return sendServerError(res, err, 'Could not build onboarding metrics');
  }
});

export default router;
