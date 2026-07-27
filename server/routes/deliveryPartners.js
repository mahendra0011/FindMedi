import express from 'express';
import DeliveryPartner from '../models/DeliveryPartner.js';
import PharmacyDelivery from '../models/PharmacyDelivery.js';
import { protect, roleOnly } from '../middleware/auth.js';
import { getNearbyDeliveryBoys } from '../config/redis.js';
import { getIO, emitDeliveryStatus } from '../services/socketService.js';

const router = express.Router();

router.post('/register', protect, async (req, res) => {
  try {
    const existing = await DeliveryPartner.findOne({ userId: req.user._id });
    if (existing) return res.status(400).json({ message: 'Already registered as delivery partner' });
    const partner = await DeliveryPartner.create({ ...req.body, userId: req.user._id, status: 'pending' });
    res.status(201).json(partner);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id/verify', protect, roleOnly(['hospital_admin', 'superadmin', 'pharmacy_owner']), async (req, res) => {
  const { action, reason } = req.body;
  const partner = await DeliveryPartner.findByIdAndUpdate(req.params.id, {
    status: action === 'approve' ? 'approved' : 'rejected',
    rejectionReason: action === 'reject' ? reason : undefined,
  }, { new: true });
  if (!partner) return res.status(404).json({ message: 'Not found' });
  getIO().to(`user:${partner.userId}`).emit('notification', {
    title: action === 'approve' ? 'You are approved!' : 'Registration rejected',
    message: action === 'approve' ? 'You can start accepting deliveries now.' : reason,
  });
  res.json(partner);
});

router.get('/nearby', protect, roleOnly(['pharmacy_owner', 'hospital_admin']), async (req, res) => {
  const { lat, lng, radiusKm = 5 } = req.query;
  const nearby = await getNearbyDeliveryBoys(parseFloat(lat), parseFloat(lng), parseFloat(radiusKm));
  const ids = nearby.map((n) => n.member ?? n);
  const partners = await DeliveryPartner.find({ _id: { $in: ids }, status: 'approved', isAvailable: true });
  res.json(partners);
});

router.post('/assign', protect, roleOnly(['pharmacy_owner', 'hospital_admin']), async (req, res) => {
  const { deliveryId, deliveryPartnerId } = req.body;
  const delivery = await PharmacyDelivery.findByIdAndUpdate(deliveryId, {
    deliveryPartnerId, status: 'Assigned', assignedAt: new Date(),
  }, { new: true });
  await DeliveryPartner.findByIdAndUpdate(deliveryPartnerId, { isAvailable: false });
  getIO().to(`user:${deliveryPartnerId}`).emit('delivery:new_assignment', { deliveryId, delivery });
  emitDeliveryStatus(deliveryId, 'Assigned');
  res.json(delivery);
});

router.put('/deliveries/:id/status', protect, roleOnly(['delivery_boy']), async (req, res) => {
  const { status } = req.body;
  const update = { status };
  if (status === 'Picked Up') update.pickedUpAt = new Date();
  if (status === 'Delivered') update.deliveredAt = new Date();
  const delivery = await PharmacyDelivery.findByIdAndUpdate(req.params.id, update, { new: true });
  if (status === 'Delivered') {
    await DeliveryPartner.findByIdAndUpdate(delivery.deliveryPartnerId, {
      isAvailable: true, $inc: { totalDeliveries: 1 },
    });
  }
  emitDeliveryStatus(req.params.id, status);
  res.json(delivery);
});

router.get('/my-deliveries', protect, roleOnly(['delivery_boy']), async (req, res) => {
  const partner = await DeliveryPartner.findOne({ userId: req.user._id });
  const active = await PharmacyDelivery.find({
    deliveryPartnerId: partner._id, status: { $in: ['Assigned', 'Picked Up', 'Out for Delivery'] },
  }).populate('orderRef');
  const history = await PharmacyDelivery.find({
    deliveryPartnerId: partner._id, status: { $in: ['Delivered', 'Failed'] },
  }).sort({ createdAt: -1 }).limit(50);
  res.json({ active, history });
});

router.get('/profile/me', protect, async (req, res) => {
  const partner = await DeliveryPartner.findOne({ userId: req.user.id });
  if (!partner) return res.status(404).json({ message: 'Profile not found' });
  res.json(partner);
});

router.get('/profile/:userId', protect, async (req, res) => {
  const partner = await DeliveryPartner.findOne({ userId: req.params.userId });
  if (!partner) return res.status(404).json({ message: 'Delivery partner not found' });
  res.json(partner);
});

router.put('/profile/:id', protect, async (req, res) => {
  let partner = await DeliveryPartner.findById(req.params.id);
  if (!partner) partner = await DeliveryPartner.findOne({ userId: req.params.id });
  if (!partner) return res.status(404).json({ message: 'Delivery partner not found' });
  Object.assign(partner, req.body);
  await partner.save();
  res.json(partner);
});

export default router;
