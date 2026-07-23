import express from 'express';
import { z } from 'zod';
import NursingChart from '../models/NursingChart.js';
import Admission from '../models/Admission.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../utils/validate.js';

const nursingVitalsSchema = z.object({ patientId: z.string().min(1), patientName: z.string().optional(), admissionId: z.string().optional(), vitals: z.any() });
const nursingMarSchema = z.object({ patientId: z.string().min(1), patientName: z.string().optional(), admissionId: z.string().optional(), medicationAdmin: z.any() });
const nursingIOSchema = z.object({ patientId: z.string().min(1), patientName: z.string().optional(), admissionId: z.string().optional(), vitals: z.any().optional() });
const nursingWoundSchema = z.object({ patientId: z.string().min(1), patientName: z.string().optional(), admissionId: z.string().optional(), woundDressing: z.any().optional() });

const router = express.Router();

// Get nursing charts for patient/admission
router.get('/', protect, async (req, res) => {
  try {
    const { patientId, admissionId, chartType, shift, date } = req.query;
    const filter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
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
router.post('/vitals', protect, validate(nursingVitalsSchema), async (req, res) => {
  try {
    const { patientId, patientName, admissionId, vitals } = req.body;
    if (!patientId || !vitals) return res.status(400).json({ message: 'Patient and vitals required' });
    const chart = await NursingChart.create({
      patientId, patientName, admissionId, chartType: 'Vitals', vitals,
      hospitalId: req.user.hospitalId || undefined,
      shift: vitals.shift || 'Morning', recordedBy: req.user._id, recordedByName: req.user.name,
    });
    res.status(201).json(chart);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// Create MAR entry
router.post('/mar', protect, validate(nursingMarSchema), async (req, res) => {
  try {
    const { patientId, patientName, admissionId, medicationAdmin } = req.body;
    if (!patientId || !medicationAdmin) return res.status(400).json({ message: 'Patient and medication data required' });
    const chart = await NursingChart.create({
      patientId, patientName, admissionId, chartType: 'MAR', medicationAdmin,
      hospitalId: req.user.hospitalId || undefined,
      shift: medicationAdmin.shift || 'Morning', recordedBy: req.user._id, recordedByName: req.user.name,
    });
    res.status(201).json(chart);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// Create Input/Output chart entry
router.post('/io', protect, validate(nursingIOSchema), async (req, res) => {
  try {
    const { patientId, patientName, admissionId, vitals } = req.body;
    if (!patientId) return res.status(400).json({ message: 'Patient required' });
    const chart = await NursingChart.create({
      patientId, patientName, admissionId, chartType: 'InputOutput', vitals,
      hospitalId: req.user.hospitalId || undefined,
      shift: vitals?.shift || 'Morning', recordedBy: req.user._id, recordedByName: req.user.name,
    });
    res.status(201).json(chart);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// Create wound dressing entry
router.post('/wound-dressing', protect, validate(nursingWoundSchema), async (req, res) => {
  try {
    const { patientId, patientName, admissionId, woundDressing } = req.body;
    if (!patientId) return res.status(400).json({ message: 'Patient required' });
    const chart = await NursingChart.create({
      patientId, patientName, admissionId, chartType: 'WoundDressing', woundDressing,
      hospitalId: req.user.hospitalId || undefined,
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
    const filters = { admissionId };
    if (req.user.hospitalId && req.user.role !== 'superadmin') filters.hospitalId = req.user.hospitalId;
    const charts = await NursingChart.find({
      ...filters,
      date: { $gte: new Date(dateObj.setHours(0,0,0,0)), $lte: new Date(dateObj.setHours(23,59,59,999)) }
    }).sort({ shift: 1 });
    res.json({ charts });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Stats
router.get('/stats', protect, async (req, res) => {
  try {
    const hFilter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') hFilter.hospitalId = req.user.hospitalId;
    const vitalsCount = await NursingChart.countDocuments({ chartType: 'Vitals', ...hFilter });
    const marCount = await NursingChart.countDocuments({ chartType: 'MAR', ...hFilter });
    const ioCount = await NursingChart.countDocuments({ chartType: 'InputOutput', ...hFilter });
    const woundCount = await NursingChart.countDocuments({ chartType: 'WoundDressing', ...hFilter });
    res.json({ vitals: vitalsCount, mar: marCount, io: ioCount, woundDressing: woundCount });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;