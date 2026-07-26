import express from 'express';
import { z } from 'zod';
import MentalHealth from '../models/MentalHealth.js';
import Billing from '../models/Billing.js';
import Notification from '../models/Notification.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { validate, createMentalHealthReferralSchema } from '../utils/validate.js';
import { generateOrderId, generateInvoiceId } from '../utils/idGenerator.js';

const mhAssessmentSchema = z.object({}).passthrough();
const mhSessionSchema = z.object({}).passthrough();
const mhMedicationSchema = z.object({}).passthrough();
const mhFamilySchema = z.object({ familyMemberName: z.string().optional(), relationship: z.string().optional(), involvementType: z.string().optional(), notes: z.string().optional(), contactNumber: z.string().optional() });
const mhConsentSchema = z.object({ consentType: z.string().optional(), documentUrl: z.string().optional(), expiryDate: z.string().optional(), notes: z.string().optional() });
const mhBillingSchema = z.object({ amount: z.number().optional(), description: z.string().optional(), sessionType: z.string().optional() });

const router = express.Router();

router.post('/referrals', protect, validate(createMentalHealthReferralSchema), async (req, res) => {
  try {
    const { patientId, patientName, referralSource, referrerName } = req.body;
    if (!patientId) return res.status(400).json({ message: 'Patient required' });
    const referralId = generateOrderId('MH');
    const r = await MentalHealth.create({ referralId, patientId, patientName, referralSource: referralSource || 'Doctor', referrerName: referrerName || req.user.name, hospitalId: req.user.hospitalId || undefined, createdBy: req.user._id });
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
    const data = await MentalHealth.find(filter).sort({ createdAt: -1 });
    res.json({ referrals: data });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/referrals/:id/assessment', protect, validate(mhAssessmentSchema), async (req, res) => {
  try {
    const r = await MentalHealth.findById(req.params.id);
    if (!r) return res.status(404).json({ message: 'Not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && r.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    r.assessment = req.body;
    r.treatmentPlan = req.body.treatmentPlan;
    r.treatmentType = req.body.treatmentType;
    r.status = 'Active';
    await r.save();
    res.json(r);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.post('/referrals/:id/session', protect, validate(mhSessionSchema), async (req, res) => {
  try {
    const r = await MentalHealth.findById(req.params.id);
    if (!r) return res.status(404).json({ message: 'Not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && r.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    r.sessions.push({ ...req.body, date: new Date(), conductedBy: req.user.name });
    await r.save();
    res.json(r);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Medication Management ───────────────────────────────────────────────────
router.put('/referrals/:id/medication', protect, adminOnly, validate(mhMedicationSchema), async (req, res) => {
  try {
    const r = await MentalHealth.findById(req.params.id);
    if (!r) return res.status(404).json({ message: 'Not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && r.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const med = req.body;
    med.prescribedBy = req.user.name;
    med.prescribedAt = new Date();
    r.medications.push(med);
    await r.save();
    res.json(r);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// Family Involvement Tracking
router.post('/referrals/:id/family', protect, validate(mhFamilySchema), async (req, res) => {
  try {
    const { familyMemberName, relationship, involvementType, notes, contactNumber } = req.body;
    const r = await MentalHealth.findById(req.params.id);
    if (!r) return res.status(404).json({ message: 'Not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && r.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
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
router.post('/referrals/:id/consent', protect, validate(mhConsentSchema), async (req, res) => {
  try {
    const { consentType, documentUrl, expiryDate, notes } = req.body;
    const r = await MentalHealth.findById(req.params.id);
    if (!r) return res.status(404).json({ message: 'Not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && r.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
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
router.post('/referrals/:id/create-billing', protect, adminOnly, validate(mhBillingSchema), async (req, res) => {
  try {
    const referral = await MentalHealth.findById(req.params.id);
    if (!referral) return res.status(404).json({ message: 'Referral not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && referral.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { amount, description, sessionType } = req.body;
    
    const invoiceId = generateInvoiceId('mentalhealth');
    
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
  const hFilter = {};
  if (req.user.hospitalId && req.user.role !== 'superadmin') hFilter.hospitalId = req.user.hospitalId;
  const active = await MentalHealth.countDocuments({ ...hFilter, status: 'Active' });
  const total = await MentalHealth.countDocuments(hFilter);
  res.json({ active, total });
});

export default router;