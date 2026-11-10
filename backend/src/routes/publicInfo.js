import express from 'express';
import { getISTDateString } from '../utils/dateUtils.js';
import { seasonalAlertsForMonth } from '../lib/seasonalAlerts.js';

const router = express.Router();

// Public, non-personalized information only. These are seasonal reminders,
// not live outbreak or air-quality measurements.
router.get('/seasonal-alerts', (req, res) => {
  const month = Number(getISTDateString().slice(5, 7));
  res.set('Cache-Control', 'public, max-age=3600');
  return res.json({
    month,
    alerts: seasonalAlertsForMonth(month),
    generatedAt: new Date().toISOString(),
    liveData: false,
  });
});

export default router;
