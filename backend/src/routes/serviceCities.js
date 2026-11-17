import express from 'express';
import ServiceCity from '../models/ServiceCity.js';
import { protect, requireRole } from '../middleware/auth.js';
import { evaluateCityLaunchGate } from '../lib/cityLaunchGate.js';
import logger from '../config/logger.js';

const router = express.Router();

// ─── GET /api/service-cities ───────────────────────────────────────────────
// Get active service cities (public for dropdowns & registration)
router.get('/', async (req, res) => {
  try {
    const { all } = req.query;
    const query = all === 'true' ? {} : { isActive: true };

    const cities = await ServiceCity.find(query).sort({ name: 1 }).lean();

    res.json({
      success: true,
      count: cities.length,
      cities,
    });
  } catch (err) {
    logger.error(`Error fetching service cities: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch service cities' });
  }
});

// ─── POST /api/service-cities ──────────────────────────────────────────────
// AUTHZ-B-04: the service-city list gates which cities the whole platform can be
// used in — a platform-wide operation. It was `restrictTo('superadmin', 'admin')`,
// and `'admin'` is not a real role in the permission matrix, so the effective rule
// was "any role whose name happens to be 'admin'". Replaced with an explicit
// role gate: superadmin plus the ops `city_manager` who owns launch/pause
// (8.md 4). Still platform-wide - a hospital_admin must not decide where the
// platform operates.
router.post('/', protect, requireRole(['superadmin', 'city_manager']), async (req, res) => {
  try {
    const { name, state, centerLat, centerLng, isActive } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'City name is required' });
    }

    const existing = await ServiceCity.findOne({ name: new RegExp(`^${name.trim()}$`, 'i') });
    if (existing) {
      return res.status(400).json({ message: 'Service city already exists' });
    }

    const city = await ServiceCity.create({
      name: name.trim(),
      state: state ? state.trim() : '',
      centerLat: centerLat !== undefined ? Number(centerLat) : 23.1815,
      centerLng: centerLng !== undefined ? Number(centerLng) : 79.9864,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    res.status(201).json({
      success: true,
      message: `City ${city.name} added successfully`,
      city,
    });
  } catch (err) {
    logger.error(`Error adding service city: ${err.message}`);
    res.status(500).json({ message: 'Failed to add service city' });
  }
});

// ─── PUT /api/service-cities/:id ───────────────────────────────────────────
// Admin: Update service city (same gate as create: superadmin or city_manager)
router.put('/:id', protect, requireRole(['superadmin', 'city_manager']), async (req, res) => {
  try {
    const { name, state, centerLat, centerLng, isActive } = req.body;

    const city = await ServiceCity.findById(req.params.id);
    if (!city) {
      return res.status(404).json({ message: 'Service city not found' });
    }

    if (name) city.name = name.trim();
    if (state !== undefined) city.state = state.trim();
    if (centerLat !== undefined) city.centerLat = Number(centerLat);
    if (centerLng !== undefined) city.centerLng = Number(centerLng);
    if (isActive !== undefined) city.isActive = Boolean(isActive);

    await city.save();

    res.json({
      success: true,
      message: 'Service city updated',
      city,
    });
  } catch (err) {
    logger.error(`Error updating service city: ${err.message}`);
    res.status(500).json({ message: 'Failed to update service city' });
  }
});

// ─── GET /api/service-cities/:id/gate ─────────────────────────────
// 16.md A§6.3: the decision endpoint for expanding beyond the first city.
// It never enables anything by itself — it returns live density/utilization/
// repeat/support/payout metrics with pass/fail per criterion.
router.get('/:id/gate', protect, requireRole(['superadmin', 'city_manager']), async (req, res) => {
  try {
    const city = await ServiceCity.findById(req.params.id).lean();
    if (!city) {
      return res.status(404).json({ message: 'Service city not found' });
    }
    const evaluation = await evaluateCityLaunchGate(city);
    res.json({ success: true, gate: evaluation });
  } catch (err) {
    logger.error(`Error evaluating city gate: ${err.message}`);
    res.status(500).json({ message: 'Failed to evaluate city launch gate' });
  }
});

// ─── PUT /api/service-cities/:id/gate ─────────────────────────────
// Superadmin/city_manager sets launch thresholds; a null may come here with
// `clear: true` to also be persisted.
router.put('/:id/gate', protect, requireRole(['superadmin', 'city_manager']), async (req, res) => {
  try {
    const city = await ServiceCity.findById(req.params.id);
    if (!city) {
      return res.status(404).json({ message: 'Service city not found' });
    }
    const { minProviders, minFillRatePct, minRepeatPct, maxOpenTickets, maxPayoutFailPct, lastGateReview, clear } = req.body || {};
    if (clear === true) {
      city.launchGate = undefined;
      await city.save();
      return res.json({ success: true, gate: null });
    }
    city.launchGate = {
      minProviders: minProviders !== undefined ? Number(minProviders) : city.launchGate?.minProviders,
      minFillRatePct: minFillRatePct !== undefined ? Number(minFillRatePct) : city.launchGate?.minFillRatePct,
      minRepeatPct: minRepeatPct !== undefined ? Number(minRepeatPct) : city.launchGate?.minRepeatPct,
      maxOpenTickets: maxOpenTickets !== undefined ? Number(maxOpenTickets) : city.launchGate?.maxOpenTickets,
      maxPayoutFailPct: maxPayoutFailPct !== undefined ? Number(maxPayoutFailPct) : city.launchGate?.maxPayoutFailPct,
      lastGateReview: lastGateReview ? new Date(lastGateReview) : city.launchGate?.lastGateReview,
    };
    await city.save();
    res.json({ success: true, gate: city.launchGate });
  } catch (err) {
    logger.error(`Error updating city gate: ${err.message}`);
    res.status(500).json({ message: 'Failed to update city launch gate' });
  }
});

export default router;
