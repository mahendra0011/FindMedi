import express from 'express';
import { BloodUnit, BloodRequest } from '../models/BloodBank.js';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';

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

router.post('/units', protect, async (req, res) => {
  try {
    const unitId = await genUnitId();
    const unit = await BloodUnit.create({ ...req.body, unitId, hospitalId: req.user.hospitalId || undefined });
    res.status(201).json(unit);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.post('/requests', protect, async (req, res) => {
  try {
    const { patientId, patientName, bloodGroup, unitsRequired, reason, priority } = req.body;
    if (!patientId || !bloodGroup) return res.status(400).json({ message: 'Patient and blood group required' });
    const requestId = await genReqId();
    const request = await BloodRequest.create({ requestId, patientId, patientName, doctorId: req.user._id, doctorName: req.user.name, bloodGroup, unitsRequired: unitsRequired || 1, reason, priority: priority || 'Routine', hospitalId: req.user.hospitalId || undefined, createdBy: req.user._id });
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

router.put('/requests/:id/issue', protect, async (req, res) => {
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

router.put('/requests/:id/transfuse', protect, async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && request.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    request.status = 'Completed';
    request.transfusionEndedAt = new Date();
    request.reaction = req.body.reaction;
    request.reactionNotes = req.body.reactionNotes;
    await request.save();
    res.json(request);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Crossmatch Blood ───────────────────────────────────────────────────────
router.put('/requests/:id/crossmatch', protect, async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && request.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { unitIds, crossMatchResult } = req.body;
    
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
    const pending = await BloodRequest.countDocuments({ status: { $in: ['Pending','Crossmatching'] }, ...hFilter });
    const issued = await BloodRequest.countDocuments({ status: 'Issued', ...hFilter });
    const groups = await BloodUnit.aggregate([{ $match: { status: 'Available', ...hFilter } }, { $group: { _id: '$bloodGroup', count: { $sum: 1 } } }]);
    res.json({ total, available, expired, pending, issued, groups });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;