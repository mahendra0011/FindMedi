import express from 'express';
import Dispute from '../models/Dispute.js';
import { protect, superadminOnly } from '../middleware/auth.js';

const router = express.Router();

const generateDisputeId = async () => {
  const count = await Dispute.countDocuments();
  return `DSP-${String(count + 1).padStart(4, '0')}`;
};

router.get('/', protect, superadminOnly, async (req, res) => {
  try {
    const { status, priority, againstType, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (againstType) filter.againstType = againstType;
    if (search) filter.$or = [
      { disputeId: new RegExp(search, 'i') },
      { raisedByName: new RegExp(search, 'i') },
      { againstName: new RegExp(search, 'i') },
    ];
    const disputes = await Dispute.find(filter).populate('raisedBy', 'name email').sort({ createdAt: -1 });
    res.json({ disputes });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id/status', protect, superadminOnly, async (req, res) => {
  try {
    const { status, resolution } = req.body;
    const update = { status };
    if (resolution) update.resolution = resolution;
    if (status === 'Resolved' || status === 'Dismissed') { update.resolvedAt = new Date(); update.resolvedBy = req.user._id; }
    const dispute = await Dispute.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!dispute) return res.status(404).json({ message: 'Dispute not found' });
    res.json(dispute);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id/assign', protect, superadminOnly, async (req, res) => {
  try {
    const dispute = await Dispute.findByIdAndUpdate(req.params.id, { assignedTo: req.body.assignedTo, status: 'In Review' }, { new: true });
    if (!dispute) return res.status(404).json({ message: 'Dispute not found' });
    res.json(dispute);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/stats', protect, superadminOnly, async (req, res) => {
  try {
    const total = await Dispute.countDocuments();
    const open = await Dispute.countDocuments({ status: 'Open' });
    const inReview = await Dispute.countDocuments({ status: 'In Review' });
    const critical = await Dispute.countDocuments({ priority: 'Critical', status: { $ne: 'Resolved' } });
    res.json({ total, open, inReview, resolved: await Dispute.countDocuments({ status: 'Resolved' }), dismissed: await Dispute.countDocuments({ status: 'Dismissed' }), critical });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;