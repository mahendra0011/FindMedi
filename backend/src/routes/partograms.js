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
    // Server pins identity + tenant AFTER the spread: forged hospitalId,
    // patientId or status in the body can never win on a labour chart.
    const { hospitalId: _dropH, patientId: _dropP, status: _dropS, ...body } = req.body || {};
    const row = await Partogram.create({
      ...body,
      hospitalId: req.user.hospitalId,
      patientId: req.params.patientId,
      createdBy: req.user._id,
    });
    res.status(201).json({ partogram: row });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/patient/:patientId/observation', async (req, res) => {
  try {
    // Observation timestamp is server-set; body time must not backdate vitals.
    const { time: _dropT, hospitalId: _dropH, patientId: _dropP, ...body } = req.body || {};
    const row = await Partogram.findOneAndUpdate(
      { patientId: req.params.patientId, hospitalId: req.user.hospitalId, deliveryTime: { $exists: false } },
      { $push: { points: { ...body, time: new Date() } } },
      { new: true },
    );
    res.json({ partogram: row });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/patient/:patientId/deliver', async (req, res) => {
  try {
    // deliveryTime is the server-recorded event; only clinical notes ride
    // along from the body — never identity, tenant or status.
    const { deliveryTime: _dropD, hospitalId: _dropH, patientId: _dropP, status: _dropS, ...notes } = req.body || {};
    const row = await Partogram.findOneAndUpdate(
      { patientId: req.params.patientId, hospitalId: req.user.hospitalId, deliveryTime: { $exists: false } },
      { $set: { ...notes, deliveryTime: new Date() } },
      { new: true },
    );
    res.json({ partogram: row });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
