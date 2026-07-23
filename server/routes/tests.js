import express from 'express';
import Test from '../models/Test.js';
import { protect, scopeToHospital } from '../middleware/auth.js';
import { validate, createTestSchema } from '../utils/validate.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { category, department, popular, hospitalId, search } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (department) filter.department = department;
    if (popular === 'true') filter.popular = true;
    if (hospitalId) filter.hospitalId = hospitalId;
    if (search) filter.name = new RegExp(search, 'i');
    const tests = await Test.find(filter).sort({ name: 1 });
    res.json({ tests });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/stats', async (req, res) => {
  try {
    const filter = {};
    if (req.query.hospitalId) filter.hospitalId = req.query.hospitalId;
    const total = await Test.countDocuments(filter);
    const popular = await Test.countDocuments({ ...filter, popular: true });
    const homeCollection = await Test.countDocuments({ ...filter, homeCollection: true });
    const prescriptionReq = await Test.countDocuments({ ...filter, prescriptionReq: true });
    const categories = await Test.distinct('category', filter);
    res.json({ total, popular, homeCollection, prescriptionReq, categories: categories.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', protect, scopeToHospital, validate(createTestSchema), async (req, res) => {
  try {
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin' && req.user.role !== 'clinic_doctor') {
      return res.status(403).json({ message: 'Admin or clinic doctor access required' });
    }
    const data = { ...req.body, hospitalId: req.hospitalId };
    if (!data.discount) data.discount = Math.round((1 - data.price / data.mrp) * 100);
    const test = await Test.create(data);
    res.status(201).json(test);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id', protect, scopeToHospital, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin' && req.user.role !== 'clinic_doctor') {
      return res.status(403).json({ message: 'Admin or clinic doctor access required' });
    }
    const test = await Test.findOne({ _id: req.params.id, hospitalId: req.hospitalId });
    if (!test) return res.status(404).json({ message: 'Test not found' });
    const body = { ...req.body };
    if (body.price && body.mrp) body.discount = Math.round((1 - body.price / body.mrp) * 100);
    const updated = await Test.findByIdAndUpdate(req.params.id, body, { new: true });
    res.json(updated);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/:id', protect, scopeToHospital, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin' && req.user.role !== 'clinic_doctor') {
      return res.status(403).json({ message: 'Admin or clinic doctor access required' });
    }
    const test = await Test.findOne({ _id: req.params.id, hospitalId: req.hospitalId });
    if (!test) return res.status(404).json({ message: 'Test not found' });
    await Test.findByIdAndDelete(req.params.id);
    res.json({ message: 'Test removed' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
