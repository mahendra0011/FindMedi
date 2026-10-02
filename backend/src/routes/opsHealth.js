/**
 * ADM-M-05 - `GET /api/ops-health`: the superadmin dashboard's freshness /
 * health widget payload.
 *
 * Sibling of `/healthz/pipelines` (DP-B-05) by design: that endpoint is
 * unauthenticated and monitoring-facing, this one is authenticated and
 * HUMAN-facing - it aggregates Kafka lag, DLQ depth, Mongo/Redis reachability,
 * BullMQ depths, pipeline freshness and the in-app error rate into one
 * snapshot the overview page can render. Same contract as the probe: report,
 * never gate - a degraded widget must still return 200 with `degraded: true`,
 * because its whole purpose is to render while things are broken.
 *
 * Guard chain: `protect` + `superadminOnly`. None of this is patient data, but
 * topology (which brokers lag, how deep the dead-letter queues are) is
 * reconnaissance an attacker would pay for, so it is not public.
 */
import express from 'express';
import { protect, superadminOnly } from '../middleware/auth.js';
import { getOpsHealth } from '../services/opsHealthService.js';
import logger from '../config/logger.js';
import { sendServerError } from '../utils/safeError.js';

const router = express.Router();

router.get('/', protect, superadminOnly, async (_req, res) => {
  try {
    const health = await getOpsHealth();
    // Snapshot of diagnosis, not a probe: always 200, `degraded` carries the
    // signal (the /healthz/pipelines precedent - a 503 here would take the
    // dashboard down exactly when an operator needs to look at it).
    res.set('Cache-Control', 'no-store');
    res.status(200).json(health);
  } catch (err) {
    // getOpsHealth() is fail-soft by contract; this is the belt-and-braces
    // path - same safe envelope as the audit routes, no probe internals out.
    logger.error(`ops health snapshot failed: ${err.message}`);
    sendServerError(res, err, 'Could not collect ops health');
  }
});

export default router;
