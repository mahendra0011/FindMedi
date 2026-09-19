import express from 'express';
import ServiceCity from '../models/ServiceCity.js';
import { protect, restrictTo } from '../middleware/auth.js';
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
// Admin: Add a new service city
router.post('/', protect, restrictTo('superadmin', 'admin'), async (req, res) => {
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
// Admin: Update service city
router.put('/:id', protect, restrictTo('superadmin', 'admin'), async (req, res) => {
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

export default router;
