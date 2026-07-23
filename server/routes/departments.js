import express from 'express';
import Department from '../models/Department.js';
import { protect, scopeToHospital, superadminOnly } from '../middleware/auth.js';
import { validate, createDepartmentSchema, updateDepartmentSchema } from '../utils/validate.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { hospitalId } = req.query;
    const filter = {};
    if (hospitalId) filter.hospitalId = hospitalId;
    const departments = await Department.find(filter).sort({ createdAt: -1 });
    res.json(departments);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', protect, scopeToHospital, validate(createDepartmentSchema), async (req, res) => {
  try {
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const data = { ...req.body, hospitalId: req.hospitalId };
    const dept = await Department.create(data);
    res.status(201).json(dept);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id', protect, scopeToHospital, validate(updateDepartmentSchema), async (req, res) => {
  try {
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const dept = await Department.findOne({ _id: req.params.id, hospitalId: req.hospitalId });
    if (!dept) return res.status(404).json({ message: 'Department not found' });
    const updated = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/:id', protect, scopeToHospital, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const dept = await Department.findOne({ _id: req.params.id, hospitalId: req.hospitalId });
    if (!dept) return res.status(404).json({ message: 'Department not found' });
    await Department.findByIdAndDelete(req.params.id);
    res.json({ message: 'Department removed' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
