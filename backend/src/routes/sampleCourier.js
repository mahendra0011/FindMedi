import express from 'express';
import { randomInt } from 'node:crypto';
import PharmacyDelivery from '../models/PharmacyDelivery.js';
import DeliveryPartner from '../models/DeliveryPartner.js';
import LabBooking from '../models/LabBooking.js';
import { protect, requireRole } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { applyTenantScope } from '../utils/tenantScope.js';
import { validate, createSampleCourierSchema, sampleCourierStatusSchema } from '../utils/validate.js';
import { getIO } from '../services/socketService.js';
import logger from '../config/logger.js';

// Spec 2.4: home sample pickup / sample courier completes the diagnostics loop.
// The transport document is the SAME PharmacyDelivery fleet row (`serviceType`
// already includes 'lab_sample', OTP + proof + tracking fields exist) - this
// router only adds the sample-specific lifecycle: create -> assign -> pickup
// -> delivered, with OTP handoff and proof-of-handover.
const router = express.Router();
router.use(protect);

const OBJECT_ID = /^[0-9a-f]{24}$/i;
const requireObjectId = (req, res, next) => (
  OBJECT_ID.test(String(req.params.id))
    ? next()
    : res.status(404).json({ message: 'Not found' })
);

const actorId = (req) => req.user._id ?? req.user.id;
const STAFF_ROLES = [
  'lab_owner', 'lab_receptionist', 'lab_technician', 'pharmacy_owner',
  'hospital_admin', 'superadmin',
];

const TRANSITIONS = {
  'Pending Assignment': ['Assigned'],
  'Assigned': ['Picked Up', 'Cancelled'],
  'Picked Up': ['Out for Delivery', 'Cancelled'],
  'Out for Delivery': ['Delivered', 'Failed'],
  'Delivered': [],
  'Failed': [],
  'Cancelled': [],
};
const canTransition = (from, to) => (TRANSITIONS[from] || []).includes(to);

// authz: role
router.post('/', requireRole(STAFF_ROLES), validate(createSampleCourierSchema), async (req, res) => {
  try {
    const body = req.body;
    const otp = String(randomInt(100000, 1000000));
    const task = await PharmacyDelivery.create({
      serviceType: 'lab_sample',
      orderId: body.orderId || `SAMPLE-${Date.now()}`,
      labBookingId: body.labBookingId,
      labOrderId: body.labOrderId,
      pickupName: body.pickupName || 'Diagnostic Lab',
      pickupAddress: body.pickupAddress,
      pickupLocation: body.pickupLocation,
      dropAddress: body.dropAddress,
      dropLocation: body.dropLocation,
      patientName: body.patientName,
      patientPhone: body.patientPhone,
      deliveryFee: body.deliveryFee || 0,
      notes: body.notes,
      estimatedTime: body.estimatedTime,
      deliveryOtp: otp,
      status: 'Pending Assignment',
      hospitalId: req.user.hospitalId || undefined,
      facilityId: req.user.facilityId || req.user.hospitalId || undefined,
    });
    await auditLog('create_sample_courier', actorId(req), {
      recordId: task._id, ip: req.ip, userAgent: req.get('user-agent'),
    });
    // OTP is part of the task contract at pickup; return it only to the
    // authenticated creator so it can be printed/annotated on the kit.
    return res.status(201).json({ task, handoverOtp: otp });
  } catch (err) {
    logger.error(`Sample courier create error: ${err.message}`);
    return res.status(400).json({ message: err.message });
  }
});

// authz: role
router.get('/', requireRole([...STAFF_ROLES, 'delivery_boy']), async (req, res) => {
  try {
    const filter = { serviceType: 'lab_sample' };
    if (req.user.role === 'delivery_boy') {
      const partner = await DeliveryPartner.findOne({ userId: actorId(req) }).select('_id').lean();
      if (!partner) return res.json({ tasks: [] });
      filter.deliveryPartnerId = partner._id;
    } else {
      const scope = applyTenantScope(req, filter, { fields: ['facilityId'] });
      if (!scope.ok) return res.status(403).json({ message: scope.message });
    }
    if (req.query.status) filter.status = req.query.status;
    const tasks = await PharmacyDelivery.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    return res.json({ tasks });
  } catch (err) {
    logger.error(`Sample courier list error: ${err.message}`);
    return res.status(500).json({ message: 'Failed to fetch sample courier tasks' });
  }
});

// authz: role
router.put('/:id/assign', requireObjectId, requireRole(STAFF_ROLES), async (req, res) => {
  try {
    const { deliveryPartnerId } = req.body || {};
    if (!OBJECT_ID.test(String(deliveryPartnerId || ''))) {
      return res.status(400).json({ message: 'deliveryPartnerId is required' });
    }
    const task = await PharmacyDelivery.findOne({ _id: req.params.id, serviceType: 'lab_sample' });
    if (!task) return res.status(404).json({ message: 'Sample courier task not found' });
    if (!canTransition(task.status, 'Assigned')) {
      return res.status(409).json({ message: `Cannot assign a ${task.status} task` });
    }
    const partner = await DeliveryPartner.findOne({ _id: deliveryPartnerId, status: 'approved' });
    if (!partner) return res.status(404).json({ message: 'Approved delivery partner not found' });

    task.deliveryPartnerId = partner._id;
    task.status = 'Assigned';
    task.assignedAt = new Date();
    await task.save();
    await DeliveryPartner.findByIdAndUpdate(partner._id, { isAvailable: false });

    if (partner.userId) {
      getIO().to(`user:${partner.userId}`).emit('delivery:new_assignment', {
        deliveryId: task._id, delivery: task, serviceType: task.serviceType,
      });
    }
    await auditLog('assign_sample_courier', actorId(req), {
      recordId: task._id, partnerId: partner._id, ip: req.ip,
    });
    return res.json(task);
  } catch (err) {
    logger.error(`Sample courier assign error: ${err.message}`);
    return res.status(500).json({ message: 'Failed to assign sample courier' });
  }
});

// authz: role
router.put('/:id/status', requireObjectId, requireRole(['delivery_boy']), validate(sampleCourierStatusSchema), async (req, res) => {
  try {
    const { status, otp, proofPhoto } = req.body;
    const task = await PharmacyDelivery.findOne({ _id: req.params.id, serviceType: 'lab_sample' });
    if (!task) return res.status(404).json({ message: 'Sample courier task not found' });

    const partner = await DeliveryPartner.findOne({ userId: actorId(req) }).select('_id').lean();
    if (!partner || String(task.deliveryPartnerId || '') !== String(partner._id)) {
      return res.status(403).json({ message: 'Task is not assigned to you' });
    }
    if (!canTransition(task.status, status)) {
      return res.status(409).json({ message: `Invalid status transition from ${task.status} to ${status}` });
    }
    if (status === 'Delivered' && task.deliveryOtp) {
      if (!otp || String(otp).trim() !== String(task.deliveryOtp)) {
        return res.status(400).json({ message: 'Invalid handover OTP' });
      }
      task.otpVerified = true;
    }
    if (status === 'Delivered' && !proofPhoto && !task.deliveryProofPhoto) {
      return res.status(400).json({ message: 'Handover proof photo required' });
    }
    if (proofPhoto) task.deliveryProofPhoto = proofPhoto;
    task.status = status;
    if (status === 'Picked Up') task.pickedUpAt = new Date();
    if (status === 'Delivered') task.deliveredAt = new Date();
    if (req.body.tracking) {
      task.trackingHistory.push({
        lat: req.body.tracking.lat, lng: req.body.tracking.lng, timestamp: new Date(),
      });
    }
    await task.save();

    if (status === 'Delivered' || status === 'Failed' || status === 'Cancelled') {
      await DeliveryPartner.findByIdAndUpdate(partner._id, {
        isAvailable: true,
        ...(status === 'Delivered' ? { $inc: { totalDeliveries: 1 } } : {}),
      });
    }
    if (status === 'Delivered' && task.labBookingId) {
      await LabBooking.findByIdAndUpdate(task.labBookingId, { status: 'Sample Collected' });
    }
    await auditLog('sample_courier_status', actorId(req), {
      recordId: task._id, status, ip: req.ip,
    });
    return res.json(task);
  } catch (err) {
    logger.error(`Sample courier status error: ${err.message}`);
    return res.status(500).json({ message: 'Failed to update sample courier status' });
  }
});

export default router;
