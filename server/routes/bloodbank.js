import express from 'express';
import { z } from 'zod';
import { BloodUnit, BloodRequest } from '../models/BloodBank.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { validate, createBloodUnitSchema, createBloodRequestSchema } from '../utils/validate.js';

const bloodIssueSchema = z.object({ unitIds: z.array(z.string()).optional() });
const bloodTransfuseSchema = z.object({ endTime: z.string().optional(), vitals: z.any().optional() });
const bloodStartTransfusionSchema = z.object({ startTime: z.string().optional(), nurseName: z.string().optional(), preBp: z.string().optional(), prePulse: z.number().optional(), preTemp: z.number().optional() });
const bloodReactionSchema = z.object({ reactionType: z.string().optional(), severity: z.string().optional(), symptoms: z.string().optional(), actionTaken: z.string().optional(), stopped: z.boolean().optional() });
const bloodCrossmatchSchema = z.object({ unitIds: z.array(z.string()).optional(), crossMatchResult: z.string().optional(), technician: z.string().optional(), patientGroup: z.string().optional(), donorUnitId: z.string().optional() });

const router = express.Router();

const genUnitId = async () => { const c = await BloodUnit.countDocuments(); return `BLD-${new Date().getFullYear()}-${String(c+1).padStart(5,'0')}`; };
const genReqId = async () => { const c = await BloodRequest.countDocuments(); return `BRQ-${new Date().getFullYear()}-${String(c+1).padStart(5,'0')}`; };

router.get('/units', protect, async (req, res) => {
  try {
    const { bloodGroup, status } = req.query;
    const filter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if (bloodGroup && bloodGroup !== 'All') filter.bloodGroup = bloodGroup;
    if (status && status !== 'All') filter.status = status;
    const units = await BloodUnit.find(filter).sort({ createdAt: -1 });
    res.json({ units });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/units', protect, adminOnly, validate(createBloodUnitSchema), async (req, res) => {
  try {
    const unitId = await genUnitId();
    const unit = await BloodUnit.create({ ...req.body, unitId, hospitalId: req.user.hospitalId || undefined });
    res.status(201).json(unit);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.post('/requests', protect, validate(createBloodRequestSchema), async (req, res) => {
  try {
    const { patientId, patientName, bloodGroup, unitsRequired, reason, priority } = req.body;
    if (!patientId || !bloodGroup) return res.status(400).json({ message: 'Patient and blood group required' });
    const requestId = await genReqId();
    const request = await BloodRequest.create({ requestId, patientId, patientName, doctorId: req.user.doctorProfileId || req.user._id, doctorName: req.user.name, bloodGroup, unitsRequired: unitsRequired || 1, reason, priority: priority || 'Routine', hospitalId: req.user.hospitalId || undefined, createdBy: req.user._id });
    res.status(201).json(request);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/requests', protect, async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if (status && status !== 'All') filter.status = status;
    if (search) filter.$or = [{ requestId: new RegExp(search,'i') }, { patientName: new RegExp(search,'i') }, { bloodGroup: new RegExp(search,'i') }];
    const requests = await BloodRequest.find(filter).populate('patientId','name').sort({ createdAt: -1 });
    res.json({ requests });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/requests/:id/issue', protect, adminOnly, validate(bloodIssueSchema), async (req, res) => {
  try {
    const { unitIds } = req.body;
    const request = await BloodRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && request.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    request.status = 'Issued';
    request.issuedUnits = unitIds || [];
    await request.save();
    if (unitIds) {
      await BloodUnit.updateMany({ _id: { $in: unitIds } }, { status: 'Issued', issuedTo: request.patientName, issuedAt: new Date(), issuedBy: req.user.name, requestId: request._id });
    }
    res.json(request);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/requests/:id/transfuse', protect, adminOnly, validate(bloodTransfuseSchema), async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && request.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    request.status = 'Completed';
    request.transfusionEndedAt = req.body.endTime ? new Date(req.body.endTime) : new Date();
    request.transfusionCompleteTime = request.transfusionEndedAt;
    if (req.body.vitals) request.reactionNotes = req.body.vitals;
    await request.save();
    res.json(request);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Start Transfusion ──────────────────────────────────────────────────────
router.put('/requests/:id/start-transfusion', protect, adminOnly, validate(bloodStartTransfusionSchema), async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && request.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    request.status = 'Transfusing';
    request.transfusionStartedAt = req.body.startTime ? new Date(req.body.startTime) : new Date();
    request.transfusionNurse = req.body.nurseName || '';
    request.preTransfusionVitals = {
      bp: req.body.preBp || '',
      hr: req.body.prePulse ? Number(req.body.prePulse) : undefined,
      temp: req.body.preTemp ? Number(req.body.preTemp) : undefined,
    };
    await request.save();
    res.json(request);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Report Transfusion Reaction ─────────────────────────────────────────────
router.put('/requests/:id/reaction', protect, adminOnly, validate(bloodReactionSchema), async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && request.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    request.reaction = true;
    request.reactionReported = true;
    request.reactionType = req.body.reactionType || 'Other';
    request.reactionSeverity = req.body.severity || 'Mild';
    request.reactionSymptoms = req.body.symptoms || '';
    request.reactionActionTaken = req.body.actionTaken || '';
    request.reactionStopped = req.body.stopped || false;
    request.status = 'Reaction';
    await request.save();
    res.json(request);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Crossmatch Blood ───────────────────────────────────────────────────────
router.put('/requests/:id/crossmatch', protect, adminOnly, validate(bloodCrossmatchSchema), async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && request.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { unitIds, crossMatchResult, technician, patientGroup, donorUnitId } = req.body;
    
    // Compatibility validation
    if (unitIds && unitIds.length > 0) {
      const units = await BloodUnit.find({ _id: { $in: unitIds } });
      const incompatibleUnits = units.filter(u => {
        const patientGroup = request.bloodGroup;
        const unitGroup = u.bloodGroup;
        const compatibility = {
          'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
          'O+': ['O+', 'A+', 'B+', 'AB+'],
          'A-': ['A-', 'A+', 'AB-', 'AB+'],
          'A+': ['A+', 'AB+'],
          'B-': ['B-', 'B+', 'AB-', 'AB+'],
          'B+': ['B+', 'AB+'],
          'AB-': ['AB-', 'AB+'],
          'AB+': ['AB+'],
        };
        return !compatibility[unitGroup]?.includes(patientGroup);
      });
      if (incompatibleUnits.length > 0) {
        return res.status(400).json({ message: `Incompatible blood units detected: ${incompatibleUnits.map(u => u.unitId).join(', ')}` });
      }
    }
    
    request.status = 'Crossmatching';
    request.crossMatchResult = crossMatchResult || 'Compatible';
    request.crossMatchTechnician = technician || '';
    request.patientBloodGroup = patientGroup || request.bloodGroup;
    if (unitIds) request.issuedUnits = unitIds;
    await request.save();
    
    if (unitIds) {
      await BloodUnit.updateMany({ _id: { $in: unitIds } }, { crossMatchPatient: request.patientName, crossMatchResult: crossMatchResult || 'Compatible' });
    }
    res.json(request);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/stats', protect, async (req, res) => {
  try {
    const hFilter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') hFilter.hospitalId = req.user.hospitalId;
    const total = await BloodUnit.countDocuments(hFilter);
    const available = await BloodUnit.countDocuments({ status: 'Available', ...hFilter });
    const expired = await BloodUnit.countDocuments({ status: 'Expired', ...hFilter });
    const crossMatching = await BloodRequest.countDocuments({ status: 'Crossmatching', ...hFilter });
    const pending = await BloodRequest.countDocuments({ status: { $in: ['Pending','Crossmatching'] }, ...hFilter });
    const issued = await BloodRequest.countDocuments({ status: 'Issued', ...hFilter });
    const groups = await BloodUnit.aggregate([{ $match: { status: 'Available', ...hFilter } }, { $group: { _id: '$bloodGroup', count: { $sum: 1 } } }]);
    res.json({ total, available, expired, crossMatching, pending, issued, groups });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;