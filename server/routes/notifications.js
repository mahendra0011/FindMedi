import express from 'express';
import Notification from '../models/Notification.js';
import Doctor from '../models/Doctor.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

const getNotificationUserId = async (req) => {
  const role = req.user.role;
  const rawId = req.user._id.toString();
  if (role === 'admin') {
    return req.query.userId || null;
  }
  if (role === 'doctor') {
    const doctor = await Doctor.findOne({ user_id: rawId });
    return (doctor && doctor.user_id) ? doctor.user_id : rawId;
  }
  return rawId;
};

router.get('/', protect, async (req, res) => {
  try {
    let filter = {};
    const effectiveUserId = await getNotificationUserId(req);
    if (effectiveUserId) filter.userId = effectiveUserId;
    const notifications = await Notification.find(filter).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) { 
    console.error('[notifications GET] error:', err);
    res.status(500).json({ message: err.message }); 
  }
});

router.get('/unread-count', protect, async (req, res) => {
  try {
    let filter = { read: false };
    const effectiveUserId = await getNotificationUserId(req);
    if (effectiveUserId) filter.userId = effectiveUserId;
    const count = await Notification.countDocuments(filter);
    res.json({ count });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/mark-all-read', protect, async (req, res) => {
  try {
    let filter = { read: false };
    const effectiveUserId = await getNotificationUserId(req);
    if (effectiveUserId) filter.userId = effectiveUserId;
    await Notification.updateMany(filter, { read: true });
    res.json({ message: 'All notifications marked as read' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', protect, async (req, res) => {
  try {
    const notification = await Notification.create(req.body);
    res.status(201).json(notification);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id/read', protect, async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(req.params.id, { read: true }, { new: true });
    res.json(notification);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/clear-all', protect, async (req, res) => {
  try {
    let filter = {};
    const effectiveUserId = await getNotificationUserId(req);
    if (effectiveUserId) filter.userId = effectiveUserId;
    await Notification.deleteMany(filter);
    res.json({ message: 'All notifications cleared' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
