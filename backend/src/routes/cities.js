import express from 'express';
import City from '../models/City.js';
import { protect, superadminOnly } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.active === 'true') filter.isActive = true;
    if (req.query.onboarding === 'true') filter.isOnboarding = true;
    if (req.query.search) filter.name = new RegExp(req.query.search, 'i');
    const cities = await City.find(filter).sort({ displayOrder: 1, name: 1 });
    res.json({ cities });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', protect, superadminOnly, async (req, res) => {
  try {
    const city = await City.create(req.body);
    await auditLog('create_city', req.user._id, { cityName: city.name, ip: req.ip, userAgent: req.get('user-agent') });
    res.status(201).json(city);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id', protect, superadminOnly, async (req, res) => {
  try {
    const city = await City.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!city) return res.status(404).json({ message: 'City not found' });
    await auditLog('update_city', req.user._id, { cityName: city.name, ip: req.ip, userAgent: req.get('user-agent') });
    res.json(city);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/:id', protect, superadminOnly, async (req, res) => {
  try {
    await City.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
