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

router.get('/nearby', protect, roleOnly(['pharmacy_owner', 'hospital_admin', 'lab_owner']), async (req, res) => {
  const { lat, lng } = req.query;
  // Frontend `radius` aur backend `radiusKm` dono accept karo.
  const radiusKm = parseFloat(req.query.radiusKm ?? req.query.radius ?? 5) || 5;
  const nearby = await getNearbyDeliveryBoys(parseFloat(lat), parseFloat(lng), radiusKm);
  const ids = nearby.map((n) => n.member ?? n);
  const partners = await DeliveryPartner.find({ _id: { $in: ids }, status: 'approved', isAvailable: true });
  res.json(partners);
});

router.post('/assign', protect, roleOnly(['pharmacy_owner', 'hospital_admin', 'lab_owner', 'lab_receptionist', 'superadmin']), async (req, res) => {
  const { deliveryId, deliveryPartnerId } = req.body;
  const delivery = await PharmacyDelivery.findByIdAndUpdate(deliveryId, {
    deliveryPartnerId, status: 'Assigned', assignedAt: new Date(),
  }, { new: true });
  if (!delivery) return res.status(404).json({ message: 'Delivery task not found' });

  const partner = await DeliveryPartner.findByIdAndUpdate(deliveryPartnerId, { isAvailable: false }, { new: true });
  // Socket room `user:<userId>` hota hai (DeliveryPartner _id nahi) — warna rider ko alert nahi milta.
  if (partner?.userId) {
    getIO().to(`user:${partner.userId}`).emit('delivery:new_assignment', {
      deliveryId: delivery._id, delivery, serviceType: delivery.serviceType,
    });
  }
  emitDeliveryStatus(delivery.orderId, 'Assigned', { deliveryId: String(delivery._id) });
  res.json(delivery);
});

router.put('/deliveries/:id/status', protect, roleOnly(['delivery_boy']), async (req, res) => {
  const { status, otp } = req.body;
  const delivery = await PharmacyDelivery.findById(req.params.id);
  if (!delivery) return res.status(404).json({ message: 'Delivery not found' });

  // Delivery confirm karne se pehle customer OTP verify karo (jab task me OTP set ho).
  if (status === 'Delivered' && delivery.deliveryOtp) {
    if (!otp || String(otp).trim() !== String(delivery.deliveryOtp)) {
      return res.status(400).json({ message: 'Invalid delivery OTP' });
    }
    delivery.otpVerified = true;
  }

  delivery.status = status;
  if (status === 'Picked Up') delivery.pickedUpAt = new Date();
  if (status === 'Delivered') delivery.deliveredAt = new Date();
  await delivery.save();

  if (status === 'Delivered') {
    await DeliveryPartner.findByIdAndUpdate(delivery.deliveryPartnerId, {
      isAvailable: true, $inc: { totalDeliveries: 1 },
    });

    // Lab report courier complete — booking ko delivered mark karo + patient ko notify.
    if ((delivery.serviceType || 'pharmacy') !== 'pharmacy' && delivery.labBookingId) {
      const LabBooking = (await import('../models/LabBooking.js')).default;
      const updatedBooking = await LabBooking.findByIdAndUpdate(delivery.labBookingId, {
        reportStatus: 'Delivered',
        reportDeliveredAt: new Date(),
      }, { new: true }).catch(() => null);

      if (updatedBooking?.patientId) {
        try {
          const Notification = (await import('../models/Notification.js')).default;
          await Notification.create({
            userId: String(updatedBooking.patientId),
            title: 'Lab report delivered',
            message: `Your lab report for ${delivery.orderId} has been delivered. A digital copy is also available in your records.`,
            type: 'records',
          });
        } catch { /* notification optional */ }
      }
    }
  }

  // Real-time: task ke orderId room me status broadcast (pehle galti se task _id bhej rahe the).
  emitDeliveryStatus(delivery.orderId, status, { deliveryId: String(delivery._id) });
  try {
    const { getIO } = await import('../services/socketService.js');
    const io = getIO();
    if (io && delivery.deliveryPartnerId) {
      const partner = await DeliveryPartner.findById(delivery.deliveryPartnerId).select('userId').lean().catch(() => null);
      if (partner?.userId) io.to(`user:${partner.userId}`).emit('delivery:status', { status, deliveryId: String(delivery._id), orderId: delivery.orderId });
    }
  } catch {}
  res.json(delivery);
});

router.get('/my-deliveries', protect, roleOnly(['delivery_boy']), async (req, res) => {
  const partner = await DeliveryPartner.findOne({ userId: req.user._id });
  if (!partner) return res.json({ active: [], history: [] });
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const page = Math.max(Number(req.query.page) || 1, 1);
  const active = await PharmacyDelivery.find({
    deliveryPartnerId: partner._id, status: { $in: ['Assigned', 'Picked Up', 'Out for Delivery'] },
  })
    .populate('orderRef')
    .populate('labBookingId', 'bookingId patientName tests visitType reportUrl reportStatus');
  const history = await PharmacyDelivery.find({
    deliveryPartnerId: partner._id, status: { $in: ['Delivered', 'Failed'] },
  })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('orderRef')
    .populate('labBookingId', 'bookingId patientName tests visitType reportUrl reportStatus');
  res.json({ active, history, page, limit });
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

router.post('/upload-document', protect, async (req, res) => {
  try {
    const { documentType, documentUrl } = req.body;
    const partner = await DeliveryPartner.findOne({ userId: req.user._id });
    if (!partner) return res.status(404).json({ error: 'Delivery partner not found' });

    partner.documents = partner.documents || {};
    partner.documents[documentType] = {
      url: documentUrl || `/uploads/documents/${Date.now()}-${documentType}`,
      status: 'pending',
      uploadedAt: new Date()
    };
    await partner.save();
    res.json({ message: 'Document uploaded successfully', documents: partner.documents });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
