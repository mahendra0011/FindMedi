import express from 'express';
import { protect } from '../middleware/auth.js';
import { platformAdminOnly } from '../middleware/authorize.js';
import SOSVehicleSettings from '../models/SOSVehicleSettings.js';
import logger from '../config/logger.js';

const router = express.Router();

// AUTHZ-B-04: this module was already superadmin-gated (via a hand-rolled local
// `adminOnly`), but it is the canonical example of a PLATFORM-WIDE setting: the
// SOS dispatch radius/retry policy changes dispatch behaviour for every tenant.
// It now uses the shared `platformAdminOnly` middleware so the rule is one
// auditable definition instead of a copy that can drift.

router.get('/sos-vehicle-settings', protect, platformAdminOnly, async (req, res) => {
  try {
    let s = await SOSVehicleSettings.findOne().lean();
    if (!s) s = await SOSVehicleSettings.create({});
    res.json(s);
  } catch (err) {
    logger.error(`GET sos-vehicle-settings error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

router.put('/sos-vehicle-settings', protect, platformAdminOnly, async (req, res) => {
  try {
    const { radiusSteps, windowSeconds, maxRetriesPerRadius, retryPauseSeconds, includeAmbulanceInAutoVehicleMode } = req.body;
    let s = await SOSVehicleSettings.findOne();
    if (!s) s = new SOSVehicleSettings();
    if (Array.isArray(radiusSteps) && radiusSteps.length) s.radiusSteps = radiusSteps.map(Number).filter(Boolean);
    if (windowSeconds !== undefined) s.windowSeconds = Number(windowSeconds);
    if (maxRetriesPerRadius !== undefined) s.maxRetriesPerRadius = Number(maxRetriesPerRadius);
    if (retryPauseSeconds !== undefined) s.retryPauseSeconds = Number(retryPauseSeconds);
    if (includeAmbulanceInAutoVehicleMode !== undefined) s.includeAmbulanceInAutoVehicleMode = !!includeAmbulanceInAutoVehicleMode;
    await s.save();
    res.json(s);
  } catch (err) {
    logger.error(`PUT sos-vehicle-settings error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

export default router;
