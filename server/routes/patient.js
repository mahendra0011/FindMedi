import express from 'express';
import FamilyMember from '../models/FamilyMember.js';
import PatientAddress from '../models/PatientAddress.js';
import SavedFavorite from '../models/SavedFavorite.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// ─── Family Members ────────────────────────────────────────────────────────
router.get('/family', protect, async (req, res) => {
  try {
    const members = await FamilyMember.find({ patientId: req.user._id, isActive: true }).sort({ createdAt: -1 });
    res.json({ members });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/family', protect, async (req, res) => {
  try {
    const member = await FamilyMember.create({ ...req.body, patientId: req.user._id });
    res.status(201).json(member);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/family/:id', protect, async (req, res) => {
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

router.post('/addresses', protect, async (req, res) => {
  try {
    if (req.body.isDefault) {
      await PatientAddress.updateMany({ patientId: req.user._id }, { isDefault: false });
    }
    const address = await PatientAddress.create({ ...req.body, patientId: req.user._id });
    res.status(201).json(address);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/addresses/:id', protect, async (req, res) => {
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
    const favorites = await SavedFavorite.find(filter).sort({ createdAt: -1 });
    res.json({ favorites });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/favorites', protect, async (req, res) => {
  try {
    const fav = await SavedFavorite.findOneAndUpdate(
      { patientId: req.user._id, refType: req.body.refType, refId: req.body.refId },
      { ...req.body, patientId: req.user._id },
      { upsert: true, new: true },
    );
    res.status(201).json(fav);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/favorites/:id', protect, async (req, res) => {
  try {
    await SavedFavorite.findOneAndDelete({ _id: req.params.id, patientId: req.user._id });
    res.json({ message: 'Removed from favorites' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
