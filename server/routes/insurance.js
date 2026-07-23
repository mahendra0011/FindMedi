import express from 'express';
import { z } from 'zod';
import Insurance from '../models/Insurance.js';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';
import { validate, createInsuranceSchema } from '../utils/validate.js';

const updateInsuranceSchema = z.object({}).passthrough();
const preAuthSchema = z.object({ preAuthStatus: z.string().optional(), preAuthAmount: z.number().optional(), preAuthExpiry: z.string().optional() });
const fileClaimSchema = z.object({ claimAmount: z.number().optional() });
const settleClaimSchema = z.object({ approvedAmount: z.number().optional() });

const router = express.Router();

const generateClaimId = async () => {
  const count = await Insurance.countDocuments();
  return `CLM-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
};

// ─── Create Insurance Claim ────────────────────────────────────────────────
router.post('/', protect, validate(createInsuranceSchema), async (req, res) => {
  try {
    const { patientId, patientName, insuranceProvider, policyNumber, insuranceId, tpaName, tpaContact, coverageType, diagnosis, treatmentPlan, estimatedCost, admissionId } = req.body;
    if (!patientId || !insuranceProvider || !policyNumber) {
      return res.status(400).json({ message: 'Patient, provider, and policy number required' });
    }
    const claimId = await generateClaimId();
    const claim = await Insurance.create({
      claimId, patientId, patientName, admissionId,
      insuranceProvider, policyNumber, insuranceId: insuranceId || '',
      tpaName: tpaName || '', tpaContact: tpaContact || '',
      coverageType: coverageType || 'Cashless',
      diagnosis: diagnosis || '', treatmentPlan: treatmentPlan || '',
      estimatedCost: estimatedCost || 0, hospitalId: req.user.hospitalId || undefined, createdBy: req.user._id,
    });
    res.status(201).json(claim);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── List Claims ──────────────────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const { status, search, patientId } = req.query;
    const filter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if (req.user.role === 'patient') {
      filter.patientId = req.user._id;
    } else if (patientId) {
      filter.patientId = patientId;
    }
    if (status && status !== 'All') filter.claimStatus = status;
    if (search) {
      filter.$or = [
        { claimId: new RegExp(search, 'i') },
        { patientName: new RegExp(search, 'i') },
        { insuranceProvider: new RegExp(search, 'i') },
        { policyNumber: new RegExp(search, 'i') },
      ];
    }
    const claims = await Insurance.find(filter).populate('patientId', 'name email phone').sort({ createdAt: -1 });
    res.json({ claims });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Get Single Claim ──────────────────────────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const claim = await Insurance.findById(req.params.id).populate('patientId', 'name email phone');
    if (!claim) return res.status(404).json({ message: 'Claim not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && claim.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(claim);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Update Claim ──────────────────────────────────────────────────────────
router.put('/:id', protect, validate(updateInsuranceSchema), async (req, res) => {
  try {
    const claim = await Insurance.findById(req.params.id);
    if (!claim) return res.status(404).json({ message: 'Claim not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && claim.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    Object.assign(claim, req.body);
    await claim.save();
    res.json(claim);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Pre-Authorization ─────────────────────────────────────────────────────
router.put('/:id/pre-auth', protect, validate(preAuthSchema), async (req, res) => {
  try {
    const { preAuthStatus, preAuthAmount, preAuthExpiry } = req.body;
    const claim = await Insurance.findById(req.params.id);
    if (!claim) return res.status(404).json({ message: 'Claim not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && claim.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    claim.preAuthStatus = preAuthStatus;
    claim.preAuthAmount = preAuthAmount;
    claim.preAuthExpiry = preAuthExpiry;
    claim.preAuthDate = new Date();
    await claim.save();
    // Notify patient
    await Notification.create({
      title: `Pre-Authorization ${preAuthStatus}`,
      message: `Your ${claim.insuranceProvider} claim pre-auth is ${preAuthStatus}. Amount: ₹${preAuthAmount || 0}`,
      type: 'billing', userId: claim.patientId.toString(),
    });
    res.json(claim);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── File Claim ────────────────────────────────────────────────────────────
router.put('/:id/file-claim', protect, validate(fileClaimSchema), async (req, res) => {
  try {
    const { claimAmount } = req.body;
    const claim = await Insurance.findById(req.params.id);
    if (!claim) return res.status(404).json({ message: 'Claim not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && claim.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    claim.claimStatus = 'Filed';
    claim.claimAmount = claimAmount;
    claim.claimDate = new Date();
    await claim.save();
    res.json(claim);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Settle Claim ──────────────────────────────────────────────────────────
router.put('/:id/settle', protect, validate(settleClaimSchema), async (req, res) => {
  try {
    const { approvedAmount } = req.body;
    const claim = await Insurance.findById(req.params.id);
    if (!claim) return res.status(404).json({ message: 'Claim not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && claim.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    claim.claimStatus = 'Settled';
    claim.approvedAmount = approvedAmount;
    claim.settlementDate = new Date();
    await claim.save();
    await Notification.create({
      title: 'Claim Settled',
      message: `Your ${claim.insuranceProvider} claim of ₹${approvedAmount || 0} has been settled.`,
      type: 'billing', userId: claim.patientId.toString(),
    });
    res.json(claim);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Stats ─────────────────────────────────────────────────────────────────
router.get('/stats/main', protect, async (req, res) => {
  try {
    const filter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if (req.user.role === 'patient') filter.patientId = req.user._id;
    const total = await Insurance.countDocuments(filter);
    const pending = await Insurance.countDocuments({ ...filter, preAuthStatus: 'Pending' });
    const approved = await Insurance.countDocuments({ ...filter, preAuthStatus: 'Approved' });
    const filed = await Insurance.countDocuments({ ...filter, claimStatus: 'Filed' });
    const settled = await Insurance.countDocuments({ ...filter, claimStatus: 'Settled' });
    const cashless = await Insurance.countDocuments({ ...filter, coverageType: 'Cashless' });
    res.json({ total, pending, approved, filed, settled, cashless });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;