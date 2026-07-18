import express from 'express';
import Category from '../models/Category.js';
import { protect, superadminOnly } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, superadminOnly, async (req, res) => {
  try {
    const { type, search } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (search) filter.name = new RegExp(search, 'i');
    const categories = await Category.find(filter).sort({ type: 1, displayOrder: 1 });
    res.json({ categories });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', protect, superadminOnly, async (req, res) => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json(category);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id', protect, superadminOnly, async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json(category);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/:id', protect, superadminOnly, async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/merge', protect, superadminOnly, async (req, res) => {
  try {
    const { sourceIds, targetId } = req.body;
    await Category.updateMany({ _id: { $in: sourceIds, $ne: targetId } }, { parent: targetId, isActive: false });
    res.json({ message: 'Merged successfully' });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

export default router;