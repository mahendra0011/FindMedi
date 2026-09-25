import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import Ambulance from '../models/Ambulance.js';
import EmergencyRequest from '../models/EmergencyRequest.js';
import { getIO } from '../services/socketService.js';
import { syncHospitalAmbulanceFlag } from '../services/emergencyDispatchService.js';
import { upsertProviderLocationCache, removeProviderFromCache } from '../lib/h3Cache.js';

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

// PUT /api/ambulance/me/settings — §8 ops master (tier, equipment, tariff, radius).
router.put('/me/settings', async (req, res) => {
  try {
    const s = req.body?.settings;
    if (!s || typeof s !== 'object') return res.status(400).json({ message: 'settings object chahiye' });
    const amb = req.ambulance;
    const next = { ...(amb.settings?.toObject?.() || amb.settings || {}) };
    if (['BLS', 'ALS', 'PTV', 'NICU'].includes(s.lifeSupportTier)) {
      next.lifeSupportTier = s.lifeSupportTier;
      amb.ambulanceType = s.lifeSupportTier === 'PTV' ? 'PATIENT_TRANSPORT' : s.lifeSupportTier;
    }
    for (const k of ['oxygenOk', 'aedOk', 'suctionOk', 'spineBoardOk', 'emtOnBoard', 'erAutoAlert']) {
      if (typeof s[k] === 'boolean') next[k] = s[k];
    }
    for (const k of ['baseDispatchFee', 'perKmRate', 'oxygenFee', 'maxRadiusKm']) {
      if (s[k] !== undefined && Number(s[k]) >= 0) next[k] = Number(s[k]);
    }
    amb.settings = next;
    await amb.save();
    res.json({ success: true, settings: amb.settings });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Settings save nahi hui' });
  }
});

// PUT /api/ambulance/me/online { online, lat, lng, accuracy }
router.put('/me/online', async (req, res) => {
  const { online, lat, lng, accuracy } = req.body;
  const amb = req.ambulance;
  if (online) {
    if (lat == null || lng == null) return res.status(400).json({ message: 'GPS location chahiye' });
    if (amb.hospitalId?.status !== 'approved') return res.status(403).json({ message: 'Hospital approved nahi hai' });
    amb.currentLocation = { type: 'Point', coordinates: [Number(lng), Number(lat)], accuracy: accuracy != null ? Number(accuracy) : null, updatedAt: new Date() };
    amb.lastPingAt = new Date();
    // File 02 — keep Redis H3 hex cache in sync (SOS fast-path reads it first)
    upsertProviderLocationCache({
      providerId: req.user._id,
      providerType: 'ambulance',
      lat: Number(lat),
      lng: Number(lng),
    }).catch(() => {});
  } else if (amb.isOnDuty) {
    return res.status(409).json({ message: 'Active job ke dauran offline nahi ho sakte' });
  } else {
    removeProviderFromCache({ providerId: req.user._id, providerType: 'ambulance' }).catch(() => {});
  }
  amb.isOnline = !!online;
  await amb.save();
  await syncHospitalAmbulanceFlag(amb.hospitalId._id || amb.hospitalId);
  res.json({ success: true, isOnline: amb.isOnline });
});

// PUT /api/ambulance/me/location { lat, lng, accuracy } (every 5-10s)
router.put('/me/location', async (req, res) => {
  const { lat, lng, accuracy } = req.body;
  if (typeof lat !== 'number' || typeof lng !== 'number') return res.status(400).json({ message: 'lat/lng number chahiye' });
  const locUpdate = {
    'currentLocation.coordinates': [lng, lat],
    'currentLocation.updatedAt': new Date(),
    lastPingAt: new Date(),
  };
  if (accuracy != null) locUpdate['currentLocation.accuracy'] = Number(accuracy);
  await Ambulance.updateOne({ _id: req.ambulance._id }, locUpdate);
  // File 02 — heartbeat keeps H3 hex cache fresh (TTL 5 min)
  upsertProviderLocationCache({
    providerId: req.user._id,
    providerType: 'ambulance',
    lat: Number(lat),
    lng: Number(lng),
  }).catch(() => {});
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

// GET /api/ambulance/me/stats — today's jobs, total completed, avg response
router.get('/me/stats', async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const [todayCount, monthCount, totalCompleted, avgAgg] = await Promise.all([
      EmergencyRequest.countDocuments({ assignedProviderId: req.ambulance._id, createdAt: { $gte: startOfDay } }),
      EmergencyRequest.countDocuments({ assignedProviderId: req.ambulance._id, createdAt: { $gte: startOfMonth } }),
      EmergencyRequest.countDocuments({ assignedProviderId: req.ambulance._id, status: 'completed' }),
      EmergencyRequest.aggregate([
        { $match: { assignedProviderId: req.ambulance._id, status: 'completed', assignedAt: { $exists: true } } },
        { $project: { responseMin: { $divide: [{ $subtract: ['$assignedAt', '$createdAt'] }, 60000] } } },
        { $group: { _id: null, avg: { $avg: '$responseMin' } } },
      ]),
    ]);
    res.json({
      success: true,
      todayCount,
      monthCount,
      totalCompleted,
      avgResponseMin: avgAgg[0] ? Math.round(avgAgg[0].avg) : 0,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/ambulance/me/recent-jobs — last 5 assigned jobs
router.get('/me/recent-jobs', async (req, res) => {
  try {
    const jobs = await EmergencyRequest.find({ assignedProviderId: req.ambulance._id })
      .sort({ createdAt: -1 }).limit(5).lean();
    res.json({ success: true, jobs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/ambulance/me/jobs — paginated job history
router.get('/me/jobs', async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const [jobs, total] = await Promise.all([
      EmergencyRequest.find({ assignedProviderId: req.ambulance._id })
        .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      EmergencyRequest.countDocuments({ assignedProviderId: req.ambulance._id }),
    ]);
    res.json({ success: true, jobs, total, page });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
