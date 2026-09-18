import express from 'express';
import FeaturedListing from '../models/FeaturedListing.js';
import { protect, superadminOnly } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';

const router = express.Router();

router.get('/', protect, superadminOnly, async (req, res) => {
  try {
    const filter = {};
    if (req.query.placement) filter.placement = req.query.placement;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    const listings = await FeaturedListing.find(filter).sort({ startDate: -1 });
    res.json({ listings });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', protect, superadminOnly, async (req, res) => {
  try {
    const listing = await FeaturedListing.create({ ...req.body, createdBy: req.user._id });
    await auditLog('create_featured_listing', req.user._id, { facilityId: listing.facilityId, ip: req.ip, userAgent: req.get('user-agent') });
    res.status(201).json(listing);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id', protect, superadminOnly, async (req, res) => {
  try {
    const listing = await FeaturedListing.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!listing) return res.status(404).json({ message: 'Listing not found' });
    res.json(listing);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/:id', protect, superadminOnly, async (req, res) => {
  try {
    await FeaturedListing.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
