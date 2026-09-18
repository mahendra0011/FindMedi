import express from 'express';
import { z } from 'zod';
import FamilyMember from '../models/FamilyMember.js';
import PatientAddress from '../models/PatientAddress.js';
import SavedFavorite from '../models/SavedFavorite.js';
import PreferredPharmacy from '../models/PreferredPharmacy.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../utils/validate.js';

const familySchema = z.object({}).passthrough();
const addressSchema = z.object({}).passthrough();
const favoriteSchema = z.object({ refType: z.string().optional(), refId: z.string().optional() }).passthrough();

const router = express.Router();

// ─── Family Members ────────────────────────────────────────────────────────
router.get('/family', protect, async (req, res) => {
  try {
    const members = await FamilyMember.find({ patientId: req.user._id, isActive: true }).sort({ createdAt: -1 });
    res.json({ members });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/family', protect, validate(familySchema), async (req, res) => {
  try {
    const member = await FamilyMember.create({ ...req.body, patientId: req.user._id });
    res.status(201).json(member);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/family/:id', protect, validate(familySchema), async (req, res) => {
  try {
    const member = await FamilyMember.findOne({ _id: req.params.id, patientId: req.user._id });
    if (!member) return res.status(404).json({ message: 'Family member not found' });
    Object.assign(member, req.body);
    await member.save();
    res.json(member);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/family/:id', protect, async (req, res) => {
  try {
    await FamilyMember.findOneAndDelete({ _id: req.params.id, patientId: req.user._id });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Addresses ─────────────────────────────────────────────────────────────
router.get('/addresses', protect, async (req, res) => {
  try {
    const addresses = await PatientAddress.find({ patientId: req.user._id }).sort({ isDefault: -1, createdAt: -1 });
    res.json({ addresses });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/addresses', protect, validate(addressSchema), async (req, res) => {
  try {
    if (req.body.isDefault) {
      await PatientAddress.updateMany({ patientId: req.user._id }, { isDefault: false });
    }
    const address = await PatientAddress.create({ ...req.body, patientId: req.user._id });
    res.status(201).json(address);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/addresses/:id', protect, validate(addressSchema), async (req, res) => {
  try {
    const addr = await PatientAddress.findOne({ _id: req.params.id, patientId: req.user._id });
    if (!addr) return res.status(404).json({ message: 'Address not found' });
    if (req.body.isDefault) {
      await PatientAddress.updateMany({ patientId: req.user._id }, { isDefault: false });
    }
    Object.assign(addr, req.body);
    await addr.save();
    res.json(addr);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/addresses/:id', protect, async (req, res) => {
  try {
    await PatientAddress.findOneAndDelete({ _id: req.params.id, patientId: req.user._id });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Saved Favorites ───────────────────────────────────────────────────────
router.get('/favorites', protect, async (req, res) => {
  try {
    const { type } = req.query;
    const filter = { patientId: req.user._id };
    if (type) filter.refType = type;
    const favorites = await SavedFavorite.find(filter).sort({ createdAt: -1 }).lean();

    // Enrich each favorite with full profile data from the referenced model
    const Doctor = (await import('../models/Doctor.js')).default;
    const Facility = (await import('../models/Facility.js')).default;

    // Full-card selects so the favorites page can reuse the listing-page cards
    const DOCTOR_SELECT = 'name specialization qualifications experience consultation_fees rating reviews_count patients available phone email location profile_photo bio languages areas_of_expertise education department doctor_type';
    const FACILITY_SELECT = 'name type slug email phone address city state pincode logo image description specialties status rating reviewsCount establishedYear totalDoctors accreditations hospitalType emergency24x7 bedAvailability ambulanceService workingHours nablNumber aerbNumber technicianName technicianRole technicianQualification technicianExperience amenities';

    const enriched = await Promise.all(favorites.map(async (fav) => {
      let profile = null;
      try {
        if (fav.refType === 'doctor') {
          profile = await Doctor.findById(fav.refId).select(DOCTOR_SELECT).lean();
        } else if (['hospital', 'clinic', 'lab', 'pharmacy'].includes(fav.refType)) {
          const fac = await Facility.findById(fav.refId).select(FACILITY_SELECT).lean();
          // Only attach if the facility type matches the saved refType (clinics stay clinics, etc.)
          if (fac) profile = fac;
        }
      } catch { profile = null; }
      return { ...fav, profile };
    }));

    res.json({ favorites: enriched });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/favorites', protect, validate(favoriteSchema), async (req, res) => {
  try {
    // Normalize legacy payloads: detail pages send targetId/targetType/name.
    const refType = req.body.refType || req.body.targetType;
    const refId = req.body.refId || req.body.targetId;
    const refName = req.body.refName || req.body.name;
    if (!refType || !refId) {
      return res.status(400).json({ message: 'refType and refId are required' });
    }
    const fav = await SavedFavorite.findOneAndUpdate(
      { patientId: req.user._id, refType, refId },
      { patientId: req.user._id, refType, refId, refName, notes: req.body.notes },
      { upsert: true, new: true },
    );
    res.status(201).json(fav);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/favorites/:id', protect, async (req, res) => {
  try {
    // Accept either the favorite _id (from the favorites page) or a refId
    // (detail pages only know the referenced entity's id).
    const { id } = req.params;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    if (isObjectId) {
      await SavedFavorite.findOneAndDelete({ _id: id, patientId: req.user._id });
    } else {
      await SavedFavorite.deleteMany({ refId: id, patientId: req.user._id });
    }
    res.json({ message: 'Removed from favorites' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/preferred-pharmacies', protect, async (req, res) => {
  try {
    const list = await PreferredPharmacy.find({ patientId: req.user._id }).sort({ priority: 1 });
    res.json({ pharmacies: list });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/preferred-pharmacies', protect, async (req, res) => {
  try {
    const { pharmacyId, name } = req.body;
    if (!pharmacyId || !name) return res.status(400).json({ message: 'pharmacyId and name are required' });
    const count = await PreferredPharmacy.countDocuments({ patientId: req.user._id });
    const pref = await PreferredPharmacy.create({ patientId: req.user._id, pharmacyId, name, priority: count + 1 });
    res.status(201).json(pref);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/preferred-pharmacies/reorder', protect, async (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) return res.status(400).json({ message: 'orderedIds array is required' });
    for (let i = 0; i < orderedIds.length; i++) {
      await PreferredPharmacy.findOneAndUpdate(
        { _id: orderedIds[i], patientId: req.user._id },
        { priority: i + 1 }
      );
    }
    const list = await PreferredPharmacy.find({ patientId: req.user._id }).sort({ priority: 1 });
    res.json({ pharmacies: list });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/preferred-pharmacies/:id', protect, async (req, res) => {
  try {
    const removed = await PreferredPharmacy.findOneAndDelete({ _id: req.params.id, patientId: req.user._id });
    if (!removed) return res.status(404).json({ message: 'Not found' });
    await PreferredPharmacy.updateMany(
      { patientId: req.user._id, priority: { $gt: removed.priority } },
      { $inc: { priority: -1 } }
    );
    res.json({ message: 'Removed' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
