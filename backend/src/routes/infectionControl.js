import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import HaiEvent, { AntibioticReview, NeedleStick } from '../models/InfectionControl.js';

// File 22 P1-23: infection control - HAI surveillance, antibiotic stewardship,
// needle-stick + PEP. Isolation sync reads the Bed model directly.

const router = express.Router();
router.use(protect);

const tenantFilter = (req) => (req.user.role === 'superadmin' && !req.user.hospitalId
  ? {} : { hospitalId: req.user.hospitalId });

// HAI surveillance
router.post('/hai', authorize('records:write'), async (req, res) => {
  try {
    const row = await HaiEvent.create({ ...tenantFilter(req), ...req.body, reportedBy: req.user._id });
    await auditLog('hai_event_created', req.user._id, { id: row._id, type: row.infectionType });
    return res.status(201).json({ event: row });
  } catch (err) { return res.status(400).json({ message: err.message }); }
});

router.get('/hai', authorize('records:read'), async (req, res) => {
  try {
    const { status, from, to } = req.query;
    const f = { ...tenantFilter(req) };
    if (status) f.status = status;
    if (from || to) {
      f.onsetDate = {};
      if (from) f.onsetDate.$gte = new Date(from);
      if (to) f.onsetDate.$lte = new Date(to);
    }
    const rows = await HaiEvent.find(f).sort({ onsetDate: -1 }).limit(200).lean();
    return res.json({ events: rows });
  } catch (err) { return res.status(500).json({ message: err.message }); }
});

router.patch('/hai/:id', authorize('records:write'), async (req, res) => {
  try {
    const row = await HaiEvent.findOneAndUpdate(
      { _id: req.params.id, ...tenantFilter(req) }, { $set: req.body }, { new: true },
    );
    if (!row) return res.status(404).json({ message: 'Not found' });
    return res.json({ event: row });
  } catch (err) { return res.status(400).json({ message: err.message }); }
});

// HAI rate per 1000 patient-days (surveillance KPI).
router.get('/hai/rate', authorize('records:read'), async (req, res) => {
  try {
    const f = { ...tenantFilter(req), status: 'confirmed' };
    if (req.query.from) f.onsetDate = { $gte: new Date(req.query.from) };
    const count = await HaiEvent.countDocuments(f);
    const { default: Admission } = await import('../models/Admission.js');
    const admit = await Admission.countDocuments({
      ...tenantFilter(req),
      ...(req.query.from ? { admissionDate: { $gte: new Date(req.query.from) } } : {}),
    });
    const patientDays = admit * 4 || 1;
    return res.json({ confirmed: count, patientDays, rate: +((count / patientDays) * 1000).toFixed(2) });
  } catch (err) { return res.status(500).json({ message: err.message }); }
});

// Antibiotic stewardship
router.post('/antibiotics', authorize('records:write'), async (req, res) => {
  try {
    const row = await AntibioticReview.create({ ...tenantFilter(req), ...req.body });
    return res.status(201).json({ review: row });
  } catch (err) { return res.status(400).json({ message: err.message }); }
});

router.get('/antibiotics', authorize('records:read'), async (req, res) => {
  try {
    const f = { ...tenantFilter(req) };
    if (req.query.approvalStatus) f.approvalStatus = req.query.approvalStatus;
    const rows = await AntibioticReview.find(f).sort({ startDate: -1 }).limit(200).lean();
    return res.json({ reviews: rows });
  } catch (err) { return res.status(500).json({ message: err.message }); }
});

router.patch('/antibiotics/:id', authorize('records:write'), async (req, res) => {
  try {
    const row = await AntibioticReview.findOneAndUpdate(
      { _id: req.params.id, ...tenantFilter(req) }, { $set: req.body }, { new: true },
    );
    if (!row) return res.status(404).json({ message: 'Not found' });
    return res.json({ review: row });
  } catch (err) { return res.status(400).json({ message: err.message }); }
});

// Needle-stick + PEP
router.post('/needle-stick', authorize('records:write'), async (req, res) => {
  try {
    const row = await NeedleStick.create({ ...tenantFilter(req), ...req.body, reportedTo: req.user._id });
    await auditLog('needlestick_reported', req.user._id, { id: row._id, staff: String(row.staffId) });
    return res.status(201).json({ injury: row });
  } catch (err) { return res.status(400).json({ message: err.message }); }
});

router.get('/needle-stick', authorize('records:read'), async (req, res) => {
  try {
    const f = { ...tenantFilter(req) };
    if (req.query.outcome) f.outcome = req.query.outcome;
    const rows = await NeedleStick.find(f).sort({ injuryDate: -1 }).limit(200).lean();
    return res.json({ injuries: rows });
  } catch (err) { return res.status(500).json({ message: err.message }); }
});

router.patch('/needle-stick/:id', authorize('records:write'), async (req, res) => {
  try {
    const row = await NeedleStick.findOneAndUpdate(
      { _id: req.params.id, ...tenantFilter(req) }, { $set: req.body }, { new: true },
    );
    if (!row) return res.status(404).json({ message: 'Not found' });
    return res.json({ injury: row });
  } catch (err) { return res.status(400).json({ message: err.message }); }
});

// Isolation sync: beds flagged for isolation
router.get('/isolation-beds', authorize('records:read'), async (req, res) => {
  try {
    const { default: Bed } = await import('../models/Bed.js');
    const beds = await Bed.find({
      ...tenantFilter(req),
      status: { $in: ['Occupied', 'Isolation'] },
      $or: [{ isolation: true }, { notes: /isolat/i }],
    }).lean();
    return res.json({ beds });
  } catch (err) { return res.status(500).json({ message: err.message }); }
});

export default router;
