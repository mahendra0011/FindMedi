import express from 'express';
import { protect } from '../middleware/auth.js';
import Partogram from '../models/Partogram.js';

const router = express.Router();
router.use(protect);

router.get('/patient/:patientId', async (req, res) => {
  try {
    const rows = await Partogram.find({ patientId: req.params.patientId, hospitalId: req.user.hospitalId }).lean();
    res.json({ partograms: rows });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/patient/:patientId', async (req, res) => {
  try {
    const row = await Partogram.create({
      hospitalId: req.user.hospitalId,
      patientId: req.params.patientId,
      ...req.body,
      createdBy: req.user._id,
    });
    res.status(201).json({ partogram: row });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/patient/:patientId/observation', async (req, res) => {
  try {
    const row = await Partogram.findOneAndUpdate(
      { patientId: req.params.patientId, hospitalId: req.user.hospitalId, deliveryTime: { $exists: false } },
      { $push: { points: { time: new Date(), ...req.body } } },
      { new: true },
    );
    res.json({ partogram: row });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/patient/:patientId/deliver', async (req, res) => {
  try {
    const row = await Partogram.findOneAndUpdate(
      { patientId: req.params.patientId, hospitalId: req.user.hospitalId, deliveryTime: { $exists: false } },
      { $set: { deliveryTime: new Date(), ...req.body } },
      { new: true },
    );
    res.json({ partogram: row });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
