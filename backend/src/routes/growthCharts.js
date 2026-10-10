import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import GrowthChart from '../models/GrowthChart.js';
import { whoPercentile, classifyGrowth } from '../lib/growthCharts.js';

const router = express.Router();
router.use(protect);

router.get('/patient/:patientId', async (req, res) => {
  try {
    const chart = await GrowthChart.findOne({ patientId: req.params.patientId, hospitalId: req.user.hospitalId }).lean();
    if (chart) {
      chart.points = chart.points.map((p) => {
        const ageMonths = (new Date(p.date) - new Date(chart.birthDate)) / (30.44 * 86400000);
        const percentileWt = whoPercentile(chart.sex, ageMonths, p.weightKg, 'weight');
        const percentileHt = whoPercentile(chart.sex, ageMonths, p.heightCm, 'height');
        const bmi = p.heightCm ? p.weightKg / ((p.heightCm / 100) ** 2) : null;
        const percentileBmi = bmi ? whoPercentile(chart.sex, ageMonths, bmi, 'bmi') : null;
        return { ...p, ageMonths, percentileWt, percentileHt, bmi, percentileBmi };
      });
    }
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
