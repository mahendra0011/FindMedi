import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import ClinicBranch from '../models/ClinicBranch.js';
import { auditLog } from '../middleware/audit.js';

const router = express.Router();
router.use(protect);

router.get('/', async (req, res) => {
  try {
    const rows = await ClinicBranch.find({ hospitalId: req.user.hospitalId })
      .populate('manager', 'name email')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ branches: rows });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const row = await ClinicBranch.findOne({ _id: req.params.id, hospitalId: req.user.hospitalId })
      .populate('manager', 'name email')
      .lean();
    if (!row) return res.status(404).json({ message: 'Branch not found' });
    res.json({ branch: row });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', authorize('staff:manage', 'hospital:manage'), async (req, res) => {
  try {
    const row = await ClinicBranch.create({ ...req.body, hospitalId: req.user.hospitalId });
    await auditLog('clinic.branch.create', req.user._id, { branchId: row._id, name: row.name });
    res.status(201).json({ branch: row });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id', authorize('staff:manage'), async (req, res) => {
  try {
    const row = await ClinicBranch.findOneAndUpdate(
      { _id: req.params.id, hospitalId: req.user.hospitalId },
      { $set: req.body },
      { new: true },
    );
    if (!row) return res.status(404).json({ message: 'Branch not found' });
    await auditLog('clinic.branch.update', req.user._id, { branchId: row._id });
    res.json({ branch: row });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.patch('/:id/active', authorize('staff:manage'), async (req, res) => {
  try {
    const row = await ClinicBranch.findOne({ _id: req.params.id, hospitalId: req.user.hospitalId });
    if (!row) return res.status(404).json({ message: 'Branch not found' });
    row.active = typeof req.body.active === 'boolean' ? req.body.active : !row.active;
    await row.save();
    await auditLog('clinic.branch.toggle', req.user._id, { branchId: row._id, active: row.active });
    res.json({ branch: row });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/:id', authorize('staff:manage'), async (req, res) => {
  try {
    const del = await ClinicBranch.deleteOne({ _id: req.params.id, hospitalId: req.user.hospitalId });
    if (!del.deletedCount) return res.status(404).json({ message: 'Branch not found' });
    await auditLog('clinic.branch.delete', req.user._id, { branchId: req.params.id });
    res.json({ deleted: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
