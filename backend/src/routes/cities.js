import express from 'express';
import City from '../models/City.js';
import { protect, superadminOnly, requireRole } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { escapeRegex, capSearch } from '../utils/escapeRegex.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.active === 'true') filter.isActive = true;
    if (req.query.onboarding === 'true') filter.isOnboarding = true;
    if (req.query.search) filter.name = new RegExp(escapeRegex(capSearch(req.query.search)), 'i');
    const cities = await City.find(filter).sort({ displayOrder: 1, name: 1 });
    res.json({ cities });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// 8.md 4: the city launch/pause console is the city_manager's (public read is
// anonymous above). Deleting a city stays superadmin: it silently strands every
// service mapped to it.
router.post('/', protect, requireRole(['superadmin', 'city_manager']), async (req, res) => {
  try {
    const city = await City.create(req.body);
    await auditLog('create_city', req.user._id, { cityName: city.name, ip: req.ip, userAgent: req.get('user-agent') });
    res.status(201).json(city);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id', protect, requireRole(['superadmin', 'city_manager']), async (req, res) => {
  try {
    const { pickBody } = await import('../utils/pick.js');
    const city = await City.findByIdAndUpdate(req.params.id,
      pickBody(req.body, ['name', 'state', 'isActive', 'isOnboarding', 'onboardingDate', 'displayOrder']), { new: true });
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
