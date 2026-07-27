import express from 'express';
import Notification from '../models/Notification.js';
import Doctor from '../models/Doctor.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { notifyUser } from '../services/socketService.js';
import { validate, createNotificationSchema } from '../utils/validate.js';
import { paginatedResults } from '../utils/pagination.js';

const router = express.Router();

const getNotificationUserId = async (req) => {
  const role = req.user.role;
  const rawId = req.user._id.toString();
  if (role === 'hospital_admin') {
    return req.query.userId || null;
  }
  if (role === 'doctor') {
    const doctor = await Doctor.findOne({ user_id: rawId });
    return (doctor && doctor.user_id) ? doctor.user_id : rawId;
  }
  return rawId;
};

router.get('/', protect, async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    let filter = {};
    const effectiveUserId = await getNotificationUserId(req);
    if (effectiveUserId) filter.userId = effectiveUserId;
    const result = await paginatedResults(Notification, filter, { page, limit });
    res.json(result);
  } catch (err) { 
    next(err);
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

router.post('/', protect, adminOnly, validate(createNotificationSchema), async (req, res) => {
  try {
    const notification = await Notification.create(req.body);
    if (notification.userId) {
      notifyUser(notification.userId, notification);
    }
    res.status(201).json(notification);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id/read', protect, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json({ message: 'Not found' });
    const effectiveUserId = await getNotificationUserId(req);
    if (effectiveUserId && notification.userId !== effectiveUserId) {
      return res.status(403).json({ message: 'Not authorized to modify this notification' });
    }
    notification.read = true;
    await notification.save();
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
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json({ message: 'Not found' });
    const effectiveUserId = await getNotificationUserId(req);
    if (effectiveUserId && notification.userId !== effectiveUserId) {
      return res.status(403).json({ message: 'Not authorized to delete this notification' });
    }
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
