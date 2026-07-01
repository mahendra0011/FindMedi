import express from 'express';
import NursingChart from '../models/NursingChart.js';
import Admission from '../models/Admission.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Get nursing charts for patient/admission
router.get('/', protect, async (req, res) => {
  try {
    const { patientId, admissionId, chartType, shift, date } = req.query;
    const filter = {};
    if (patientId) filter.patientId = patientId;
    if (admissionId) filter.admissionId = admissionId;
    if (chartType && chartType !== 'All') filter.chartType = chartType;
    if (shift && shift !== 'All') filter.shift = shift;
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59);
      filter.date = { $gte: startDate, $lte: endDate };
    }
    const charts = await NursingChart.find(filter).sort({ createdAt: -1 });
    res.json({ charts });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Create vitals chart entry
router.post('/vitals', protect, async (req, res) => {
  try {
    const { patientId, patientName, admissionId, vitals } = req.body;
    if (!patientId || !vitals) return res.status(400).json({ message: 'Patient and vitals required' });
    const chart = await NursingChart.create({
      patientId, patientName, admissionId, chartType: 'Vitals', vitals,
      shift: vitals.shift || 'Morning', recordedBy: req.user._id, recordedByName: req.user.name,
    });
    res.status(201).json(chart);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// Create MAR entry
router.post('/mar', protect, async (req, res) => {
  try {
    const { patientId, patientName, admissionId, medicationAdmin } = req.body;
    if (!patientId || !medicationAdmin) return res.status(400).json({ message: 'Patient and medication data required' });
    const chart = await NursingChart.create({
      patientId, patientName, admissionId, chartType: 'MAR', medicationAdmin,
      shift: medicationAdmin.shift || 'Morning', recordedBy: req.user._id, recordedByName: req.user.name,
    });
    res.status(201).json(chart);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// Create Input/Output chart entry
router.post('/io', protect, async (req, res) => {
  try {
    const { patientId, patientName, admissionId, vitals } = req.body;
    if (!patientId) return res.status(400).json({ message: 'Patient required' });
    const chart = await NursingChart.create({
      patientId, patientName, admissionId, chartType: 'InputOutput', vitals,
      shift: vitals?.shift || 'Morning', recordedBy: req.user._id, recordedByName: req.user.name,
    });
    res.status(201).json(chart);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// Create wound dressing entry
router.post('/wound-dressing', protect, async (req, res) => {
  try {
    const { patientId, patientName, admissionId, woundDressing } = req.body;
    if (!patientId) return res.status(400).json({ message: 'Patient required' });
    const chart = await NursingChart.create({
      patientId, patientName, admissionId, chartType: 'WoundDressing', woundDressing,
      shift: woundDressing?.shift || 'Morning', recordedBy: req.user._id, recordedByName: req.user.name,
    });
    res.status(201).json(chart);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// Get daily shift charts
router.get('/shift/:admissionId/:date', protect, async (req, res) => {
  try {
    const { admissionId, date } = req.params;
    const dateObj = new Date(date);
    const charts = await NursingChart.find({
      admissionId,
      date: { $gte: new Date(dateObj.setHours(0,0,0,0)), $lte: new Date(dateObj.setHours(23,59,59,999)) }
    }).sort({ shift: 1 });
    res.json({ charts });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Stats
router.get('/stats', protect, async (req, res) => {
  try {
    const vitalsCount = await NursingChart.countDocuments({ chartType: 'Vitals' });
    const marCount = await NursingChart.countDocuments({ chartType: 'MAR' });
    const ioCount = await NursingChart.countDocuments({ chartType: 'InputOutput' });
    const woundCount = await NursingChart.countDocuments({ chartType: 'WoundDressing' });
    res.json({ vitals: vitalsCount, mar: marCount, io: ioCount, woundDressing: woundCount });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;