import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import ClinicPackage from '../models/ClinicPackage.js';

const router = express.Router();
router.use(protect);

router.get('/', async (req, res) => {
  try {
    const rows = await ClinicPackage.find({ hospitalId: req.user.hospitalId }).lean();
    res.json({ packages: rows });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', restrictTo('hospital_admin', 'superadmin', 'clinic_admin'), async (req, res) => {
  try {
    const row = await ClinicPackage.create({ ...req.body, hospitalId: req.user.hospitalId, createdBy: req.user._id });
    res.status(201).json({ package: row });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id', restrictTo('hospital_admin', 'superadmin', 'clinic_admin'), async (req, res) => {
  try {
    // hospitalId/createdBy can never move via PUT (the filter is scoped, but
    // $set would rewrite the field itself). Price stays admin-settable.
    const { hospitalId: _dropH, createdBy: _dropC, ...set } = req.body || {};
    const row = await ClinicPackage.findOneAndUpdate(
      { _id: req.params.id, hospitalId: req.user.hospitalId },
      { $set: set },
      { new: true },
    );
    res.json({ package: row });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/:id', restrictTo('hospital_admin', 'superadmin', 'clinic_admin'), async (req, res) => {
  try {
    await ClinicPackage.deleteOne({ _id: req.params.id, hospitalId: req.user.hospitalId });
    res.json({ deleted: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
