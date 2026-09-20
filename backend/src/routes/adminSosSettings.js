import express from 'express';
import { protect } from '../middleware/auth.js';
import SOSVehicleSettings from '../models/SOSVehicleSettings.js';
import logger from '../config/logger.js';

const router = express.Router();

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'superadmin') return res.status(403).json({ message: 'Access denied' });
  next();
};

router.get('/sos-vehicle-settings', protect, adminOnly, async (req, res) => {
  try {
    let s = await SOSVehicleSettings.findOne().lean();
    if (!s) s = await SOSVehicleSettings.create({});
    res.json(s);
  } catch (err) {
    logger.error(`GET sos-vehicle-settings error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

router.put('/sos-vehicle-settings', protect, adminOnly, async (req, res) => {
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
