import express from 'express';
import Physiotherapy from '../models/Physiotherapy.js';
import Billing from '../models/Billing.js';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

const genId = async () => { const c = await Physiotherapy.countDocuments(); return `PHY-${new Date().getFullYear()}-${String(c+1).padStart(5,'0')}`; };

router.post('/referrals', protect, async (req, res) => {
  try {
    const { patientId, patientName, diagnosis, treatmentPlan } = req.body;
    if (!patientId) return res.status(400).json({ message: 'Patient required' });
    const referralId = await genId();
    const r = await Physiotherapy.create({ 
      referralId, patientId, patientName, diagnosis, treatmentPlan,
      doctorId: req.user._id, doctorName: req.user.name, hospitalId: req.user.hospitalId || undefined, createdBy: req.user._id 
    });
    res.status(201).json(r);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/referrals', protect, async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if (status && status !== 'All') filter.status = status;
    if (search) filter.$or = [{ referralId: new RegExp(search,'i') }, { patientName: new RegExp(search,'i') }];
    const data = await Physiotherapy.find(filter).sort({ createdAt: -1 });
    res.json({ referrals: data });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/referrals/:id/assess', protect, async (req, res) => {
  try {
    const r = await Physiotherapy.findById(req.params.id);
    if (!r) return res.status(404).json({ message: 'Not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && r.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    r.initialAssessment = req.body;
    r.status = 'In Progress';
    r.treatmentPlan = req.body.treatmentPlan;
    await r.save();
    res.json(r);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.post('/referrals/:id/session', protect, async (req, res) => {
  try {
    const r = await Physiotherapy.findById(req.params.id);
    if (!r) return res.status(404).json({ message: 'Not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && r.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const s = req.body;
    s.sessionNumber = (r.sessions?.length || 0) + 1;
    s.date = new Date();
    s.therapistName = req.user.name;
    r.sessions.push(s);
    await r.save();
    res.json(r);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// Mid-review endpoint
router.put('/referrals/:id/mid-review', protect, async (req, res) => {
  try {
    const { notes, response, progress } = req.body;
    const r = await Physiotherapy.findById(req.params.id);
    if (!r) return res.status(404).json({ message: 'Not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && r.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    r.status = 'Mid Review';
    r.midReviewNotes = notes || '';
    r.midReviewResponse = response || '';
    r.progress = progress || r.progress || 50;
    
    await r.save();
    res.json(r);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// Create billing for physiotherapy session
router.post('/referrals/:id/create-billing', protect, async (req, res) => {
  try {
    const referral = await Physiotherapy.findById(req.params.id);
    if (!referral) return res.status(404).json({ message: 'Referral not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && referral.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { amount, description, sessionType } = req.body;
    
    const invoiceId = `INV-${new Date().getFullYear()}-${String(await Billing.countDocuments() + 1).padStart(5, '0')}`;
    
    const billing = await Billing.create({
      invoiceId,
      patient: referral.patientName,
      patientId: referral.patientId,
      service: description || 'Physiotherapy Session',
      amount: amount || 500,
      source: 'physio',
      status: 'Pending',
      date: new Date().toISOString().split('T')[0],
      physioReferralId: referral._id,
    });
    
    // Notify billing department
    await Notification.create({
      title: 'New Physiotherapy Bill',
      message: `Physiotherapy billing created for ${referral.patientName}`,
      type: 'billing',
      userId: req.user._id.toString(),
    });
    
    res.status(201).json(billing);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/referrals/:id/complete', protect, async (req, res) => {
  try {
    const r = await Physiotherapy.findById(req.params.id);
    if (!r) return res.status(404).json({ message: 'Not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && r.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    r.status = 'Completed';
    r.dischargePlan = req.body;
    await r.save();
    res.json(r);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// Get single referral
router.get('/referrals/:id', protect, async (req, res) => {
  try {
    const referral = await Physiotherapy.findById(req.params.id).populate('patientId', 'name email phone');
    if (!referral) return res.status(404).json({ message: 'Referral not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && referral.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(referral);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/stats', protect, async (req, res) => {
  const hFilter = {};
  if (req.user.hospitalId && req.user.role !== 'superadmin') hFilter.hospitalId = req.user.hospitalId;
  const active = await Physiotherapy.countDocuments({ ...hFilter, status: { $in: ['Referred','In Progress','Mid Review'] } });
  const completed = await Physiotherapy.countDocuments({ ...hFilter, status: 'Completed' });
  const total = await Physiotherapy.countDocuments(hFilter);
  res.json({ active, completed, total });
});

export default router;