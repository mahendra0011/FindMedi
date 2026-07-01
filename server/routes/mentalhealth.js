import express from 'express';
import MentalHealth from '../models/MentalHealth.js';
import Billing from '../models/Billing.js';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

const genId = async () => { const c = await MentalHealth.countDocuments(); return `MH-${new Date().getFullYear()}-${String(c+1).padStart(5,'0')}`; };

router.post('/referrals', protect, async (req, res) => {
  try {
    const { patientId, patientName, referralSource, referrerName } = req.body;
    if (!patientId) return res.status(400).json({ message: 'Patient required' });
    const referralId = await genId();
    const r = await MentalHealth.create({ referralId, patientId, patientName, referralSource: referralSource || 'Doctor', referrerName: referrerName || req.user.name, createdBy: req.user._id });
    res.status(201).json(r);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/referrals', protect, async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};
    if (status && status !== 'All') filter.status = status;
    if (search) filter.$or = [{ referralId: new RegExp(search,'i') }, { patientName: new RegExp(search,'i') }];
    const data = await MentalHealth.find(filter).sort({ createdAt: -1 });
    res.json({ referrals: data });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/referrals/:id/assessment', protect, async (req, res) => {
  try {
    const r = await MentalHealth.findByIdAndUpdate(req.params.id, { assessment: req.body, treatmentPlan: req.body.treatmentPlan, treatmentType: req.body.treatmentType, status: 'Active' }, { new: true });
    if (!r) return res.status(404).json({ message: 'Not found' });
    res.json(r);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.post('/referrals/:id/session', protect, async (req, res) => {
  try {
    const r = await MentalHealth.findById(req.params.id);
    if (!r) return res.status(404).json({ message: 'Not found' });
    r.sessions.push({ ...req.body, date: new Date(), conductedBy: req.user.name });
    await r.save();
    res.json(r);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Medication Management ───────────────────────────────────────────────────
router.put('/referrals/:id/medication', protect, async (req, res) => {
  try {
    const r = await MentalHealth.findById(req.params.id);
    if (!r) return res.status(404).json({ message: 'Not found' });
    const med = req.body;
    med.prescribedBy = req.user.name;
    med.prescribedAt = new Date();
    r.medications.push(med);
    await r.save();
    res.json(r);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// Family Involvement Tracking
router.post('/referrals/:id/family', protect, async (req, res) => {
  try {
    const { familyMemberName, relationship, involvementType, notes, contactNumber } = req.body;
    const r = await MentalHealth.findById(req.params.id);
    if (!r) return res.status(404).json({ message: 'Not found' });
    
    r.familyInvolvement.push({
      familyMemberName,
      relationship,
      involvementType: involvementType || 'Support',
      notes: notes || '',
      contactNumber: contactNumber || '',
      addedBy: req.user.name,
      addedAt: new Date()
    });
    
    await r.save();
    res.json(r);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// Consent Document Upload
router.post('/referrals/:id/consent', protect, async (req, res) => {
  try {
    const { consentType, documentUrl, expiryDate, notes } = req.body;
    const r = await MentalHealth.findById(req.params.id);
    if (!r) return res.status(404).json({ message: 'Not found' });
    
    r.consents.push({
      consentType: consentType || 'Treatment Consent',
      documentUrl: documentUrl || '',
      signedBy: req.user.name,
      signedAt: new Date(),
      expiryDate: expiryDate || null,
      notes: notes || '',
      status: 'Active'
    });
    
    await r.save();
    res.json(r);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// Create billing for mental health session
router.post('/referrals/:id/create-billing', protect, async (req, res) => {
  try {
    const referral = await MentalHealth.findById(req.params.id);
    if (!referral) return res.status(404).json({ message: 'Referral not found' });
    
    const { amount, description, sessionType } = req.body;
    
    const invoiceId = `INV-${new Date().getFullYear()}-${String(await Billing.countDocuments() + 1).padStart(5, '0')}`;
    
    const billing = await Billing.create({
      invoiceId,
      patient: referral.patientName,
      patientId: referral.patientId,
      service: description || 'Mental Health Session',
      amount: amount || 800,
      source: 'mentalhealth',
      status: 'Pending',
      date: new Date().toISOString().split('T')[0],
    });
    
    await Notification.create({
      title: 'New Mental Health Bill',
      message: `Mental health billing created for ${referral.patientName}`,
      type: 'billing',
      userId: req.user._id.toString(),
    });
    
    res.status(201).json(billing);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/stats', protect, async (req, res) => {
  const active = await MentalHealth.countDocuments({ status: 'Active' });
  const total = await MentalHealth.countDocuments();
  res.json({ active, total });
});

export default router;