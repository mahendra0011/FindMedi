import express from 'express';
import { requireMetricsToken } from '../middleware/metricsAuth.js';
import { registry } from '../lib/metrics.js';

const router = express.Router();

// INF-M-02: Prometheus scrape surface. Mounted at the app root (NOT under
// /api) so it carries no CSRF obligation and stays out of the API rate bucket.
// `requireMetricsToken` is a bearer-token gate rather than session `protect`
// (Prometheus scrapes without a login); the `require` prefix is what the authz
// classifier keys on, so this records as role-gated, not public.
router.get('/metrics', requireMetricsToken, async (req, res) => {
  try {
    res.set('Content-Type', registry.contentType);
    res.send(await registry.metrics());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
