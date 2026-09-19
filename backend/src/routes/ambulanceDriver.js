import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import Ambulance from '../models/Ambulance.js';
import EmergencyRequest from '../models/EmergencyRequest.js';
import { getIO } from '../services/socketService.js';
import { syncHospitalAmbulanceFlag } from '../services/emergencyDispatchService.js';

const router = express.Router();
router.use(protect, restrictTo('ambulance'));

// Attach req.ambulance
router.use(async (req, res, next) => {
  const amb = await Ambulance.findOne({ userId: req.user._id })
    .populate('hospitalId', 'name address phone location emergencySupport status');
  if (!amb) return res.status(404).json({ message: 'Aapke account se koi ambulance linked nahi' });
  req.ambulance = amb;
  next();
});

// GET /api/ambulance/me
router.get('/me', (req, res) => res.json({ success: true, ambulance: req.ambulance }));

// PUT /api/ambulance/me/online { online, lat, lng }
router.put('/me/online', async (req, res) => {
  const { online, lat, lng } = req.body;
  const amb = req.ambulance;
  if (online) {
    if (lat == null || lng == null) return res.status(400).json({ message: 'GPS location chahiye' });
    if (amb.hospitalId?.status !== 'approved') return res.status(403).json({ message: 'Hospital approved nahi hai' });
    amb.currentLocation = { type: 'Point', coordinates: [Number(lng), Number(lat)], updatedAt: new Date() };
    amb.lastPingAt = new Date();
  } else if (amb.isOnDuty) {
    return res.status(409).json({ message: 'Active job ke dauran offline nahi ho sakte' });
  }
  amb.isOnline = !!online;
  await amb.save();
  await syncHospitalAmbulanceFlag(amb.hospitalId._id || amb.hospitalId);
  res.json({ success: true, isOnline: amb.isOnline });
});

// PUT /api/ambulance/me/location { lat, lng } (every 5-10s)
router.put('/me/location', async (req, res) => {
  const { lat, lng } = req.body;
  if (typeof lat !== 'number' || typeof lng !== 'number') return res.status(400).json({ message: 'lat/lng number chahiye' });
  await Ambulance.updateOne({ _id: req.ambulance._id }, {
    'currentLocation.coordinates': [lng, lat],
    'currentLocation.updatedAt': new Date(),
    lastPingAt: new Date(),
  });
  if (req.ambulance.currentEmergencyId || req.ambulance.isOnDuty) {
    const job = await EmergencyRequest.findOne({
      assignedProviderId: req.ambulance._id, status: { $in: ['assigned', 'en_route'] },
    }).select('_id');
    if (job) getIO()?.to(`emergency:${job._id}`).emit('emergency_provider_location_update', {
      requestId: String(job._id), lat, lng, timestamp: Date.now(),
    });
  }
  res.json({ success: true });
});

// GET /api/ambulance/me/active-job
router.get('/me/active-job', async (req, res) => {
  const job = await EmergencyRequest.findOne({
    assignedProviderId: req.ambulance._id, assignedProviderType: 'ambulance',
    status: { $in: ['assigned', 'en_route'] },
  }).populate('selectedHospitalId', 'name address phone location').lean();
  res.json({ success: true, job });
});

export default router;
