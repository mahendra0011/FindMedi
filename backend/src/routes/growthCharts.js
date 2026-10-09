import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import GrowthChart from '../models/GrowthChart.js';

const router = express.Router();
router.use(protect);

router.get('/patient/:patientId', async (req, res) => {
  try {
    const chart = await GrowthChart.findOne({ patientId: req.params.patientId, hospitalId: req.user.hospitalId }).lean();
    res.json({ chart });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/patient/:patientId', async (req, res) => {
  try {
    const { sex, birthDate, points } = req.body;
    const chart = await GrowthChart.findOneAndUpdate(
      { patientId: req.params.patientId, hospitalId: req.user.hospitalId },
      { $set: { sex, birthDate, points }, createdBy: req.user._id },
      { upsert: true, new: true },
    );
    res.json({ chart });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
