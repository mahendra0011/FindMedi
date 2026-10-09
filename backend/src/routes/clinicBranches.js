import express from 'express';
import { protect } from '../middleware/auth.js';
import ClinicPackage from '../models/ClinicPackage.js';

const router = express.Router();
router.use(protect);

router.get('/', async (req, res) => {
  try {
    const rows = await ClinicPackage.find({ hospitalId: req.user.hospitalId }).lean();
    res.json({ packages: rows });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const row = await ClinicPackage.create({ ...req.body, hospitalId: req.user.hospitalId, createdBy: req.user._id });
    res.status(201).json({ package: row });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const row = await ClinicPackage.findOneAndUpdate(
      { _id: req.params.id, hospitalId: req.user.hospitalId },
      { $set: req.body },
      { new: true },
    );
    res.json({ package: row });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await ClinicPackage.deleteOne({ _id: req.params.id, hospitalId: req.user.hospitalId });
    res.json({ deleted: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
