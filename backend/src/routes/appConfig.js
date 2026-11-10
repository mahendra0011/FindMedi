import express from 'express';

const router = express.Router();

// Mobile min-version / force-update (doc 15). Env-backed so ops can bump
// without a redeploy: APP_MIN_VERSION, APP_LATEST_VERSION, APP_FORCE_UPDATE.
router.get('/version', (_req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  res.json({
    minVersion: process.env.APP_MIN_VERSION || '1.0.0',
    latestVersion: process.env.APP_LATEST_VERSION || '1.0.0',
    forceUpdate: process.env.APP_FORCE_UPDATE === 'true',
    storeUrl: process.env.APP_STORE_URL || null,
  });
});

export default router;
