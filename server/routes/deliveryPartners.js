import express from 'express';
import User from '../models/User.js';
import DeliveryPartner from '../models/DeliveryPartner.js';
import PharmacyDelivery from '../models/PharmacyDelivery.js';
import PharmacyOrder from '../models/PharmacyOrder.js';
import Notification from '../models/Notification.js';
import { protect, requireRole } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { getNearbyDeliveryBoys } from '../config/redis.js';
import { upload } from '../middleware/upload.js';
import { getIO, emitDeliveryStatus, notifyUsers } from '../services/socketService.js';

const router = express.Router();

const notifyAdmins = async ({ title, message }) => {
  const admins = await User.find({ role: 'admin', status: 'active' }).select('_id');
  if (!admins.length) return;
  await Notification.insertMany(
    admins.map(admin => ({ title, message, type: 'system', userId: admin._id }))
  );
  notifyUsers(admins.map(a => a._id), { title, message, type: 'system' });
};

router.post('/register', async (req, res) => {
  try {
    const {
      name, phone, email, dob, gender, address, city, pincode,
      vehicleType, vehicleNumber,
      bankDetails, workZone, availability, emergencyContact,
    } = req.body;

    if (!name || !phone || !vehicleType) {
      return res.status(400).json({ message: 'Name, phone, and vehicle type are required' });
    }

    const lowerEmail = email?.toLowerCase();
    if (lowerEmail) {
      const existing = await User.findOne({ email: lowerEmail });
      if (existing) return res.status(400).json({ message: 'Email already in use' });
    }

    const defaultPassword = phone.slice(-8) + '@dp';
    const user = await User.create({
      name,
      email: lowerEmail || `${phone}@delivery.medicore.app`,
      password: defaultPassword,
      role: 'delivery_boy',
      phone,
      gender: gender || '',
      dateOfBirth: dob || undefined,
      address: address || '',
      isVerified: !lowerEmail,
      status: 'active',
      approvalStatus: 'pending',
      vehicleType: vehicleType || 'bike',
      vehicleNumber: vehicleNumber || '',
      currentLocation: { lat: null, lng: null },
      isOnline: false,
      deliveryZone: Array.isArray(workZone) ? workZone : [],
      workingHours: { availability: availability || 'flexible', startTime: '', endTime: '' },
      emergencyContact: emergencyContact || { name: '', phone: '' },
    });

    const partner = await DeliveryPartner.create({
      userId: user._id,
      name, phone,
      email: lowerEmail || '',
      dob: dob || undefined,
      gender: gender || '',
      address: address || '',
      city: city || '',
      pincode: pincode || '',
      vehicleType: vehicleType || 'bike',
      vehicleNumber: vehicleNumber || '',
      bankDetails: bankDetails || { accountNo: '', ifsc: '', holderName: '', upiId: '' },
      workZone: Array.isArray(workZone) ? workZone : [],
      availability: availability || 'flexible',
      emergencyContact: emergencyContact || { name: '', phone: '' },
      status: 'pending',
      isOnline: false,
      isAvailable: false,
    });

    await notifyAdmins({
      title: 'New Delivery Partner Registration',
      message: `${name} (${phone}) registered and needs approval.`,
    });

    await auditLog('delivery_partner_register', user._id, {
      partnerId: partner._id, ip: req.ip, userAgent: req.get('user-agent'),
    });

    res.status(201).json({
      message: 'Registration submitted for verification',
      partnerId: partner._id,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get('/profile/me', protect, async (req, res) => {
  try {
    const partner = await DeliveryPartner.findOne({ userId: req.user.id });
    if (!partner) return res.status(404).json({ message: 'Profile not found' });
    const docFields = ['aadharDoc', 'panDoc', 'drivingLicenseDoc', 'vehicleRcDoc', 'insuranceDoc', 'photo'];
    const docs = {};
    docFields.forEach(f => { if (partner[f]) docs[f] = partner[f]; });
    res.json({ ...partner.toObject(), docs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/profile/:userId', protect, async (req, res) => {
  try {
    const partner = await DeliveryPartner.findOne({ userId: req.params.userId });
    if (!partner) return res.status(404).json({ message: 'Delivery partner not found' });
    const docFields = ['aadharDoc', 'panDoc', 'drivingLicenseDoc', 'vehicleRcDoc', 'insuranceDoc', 'photo'];
    const docs = {};
    docFields.forEach(f => { if (partner[f]) docs[f] = partner[f]; });
    res.json({ ...partner.toObject(), docs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/profile/:id', protect, async (req, res) => {
  try {
    let partner = await DeliveryPartner.findById(req.params.id);
    if (!partner) partner = await DeliveryPartner.findOne({ userId: req.params.id });
    if (!partner) return res.status(404).json({ message: 'Delivery partner not found' });

    Object.assign(partner, req.body);
    await partner.save();

    if (req.body.isOnline !== undefined) {
      await User.findByIdAndUpdate(partner.userId, { isOnline: req.body.isOnline });
    }

    await auditLog('delivery_partner_update', req.user._id, {
      partnerId: partner._id, changes: Object.keys(req.body),
      ip: req.ip, userAgent: req.get('user-agent'),
    });

    res.json(partner);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post('/upload-doc/:id', protect, upload('document', { types: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] }), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const { field } = req.body;
    const allowedFields = ['aadharDoc', 'panDoc', 'drivingLicenseDoc', 'vehicleRcDoc', 'insuranceDoc', 'photo'];
    if (!allowedFields.includes(field)) {
      return res.status(400).json({ message: 'Invalid document field' });
    }

    const fileUrl = `/uploads/documents/${req.file.filename}`;
    const partner = await DeliveryPartner.findByIdAndUpdate(req.params.id, { [field]: fileUrl }, { new: true });
    if (!partner) return res.status(404).json({ message: 'Delivery partner not found' });

    res.json({ message: 'Document uploaded', url: fileUrl });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id/verify', protect, requireRole(['superadmin', 'admin']), async (req, res) => {
  try {
    const { action, reason } = req.body;
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Action must be "approve" or "reject"' });
    }

    const partner = await DeliveryPartner.findById(req.params.id);
    if (!partner) return res.status(404).json({ message: 'Not found' });

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    partner.status = newStatus;
    if (action === 'reject') partner.rejectionReason = reason || '';
    await partner.save();

    await User.findByIdAndUpdate(partner.userId, {
      approvalStatus: newStatus,
      ...(action === 'approve' ? { status: 'active' } : {}),
    });

    getIO().to(`user:${partner.userId}`).emit('notification', {
      title: action === 'approve' ? 'Account Approved' : 'Registration Rejected',
      message: action === 'approve'
        ? 'Your delivery partner account has been approved. You can now start accepting deliveries.'
        : (reason || 'Your application was not approved.'),
      type: action === 'approve' ? 'success' : 'error',
    });

    await auditLog(`delivery_partner_${action}`, req.user._id, {
      partnerId: partner._id, partnerName: partner.name, reason: reason || '',
      ip: req.ip, userAgent: req.get('user-agent'),
    });

    res.json({ message: `Delivery partner ${action}d`, partner });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get('/my-deliveries', protect, requireRole(['delivery_boy']), async (req, res) => {
  try {
    const partner = await DeliveryPartner.findOne({ userId: req.user.id });
    if (!partner) return res.status(404).json({ message: 'Delivery partner not found' });

    const active = await PharmacyDelivery.find({
      deliveryPartnerId: partner._id,
      status: { $in: ['Assigned', 'Picked Up', 'Out for Delivery'] },
    }).populate('orderRef');

    const history = await PharmacyDelivery.find({
      deliveryPartnerId: partner._id,
      status: { $in: ['Delivered', 'Failed', 'Cancelled'] },
    }).sort({ createdAt: -1 }).limit(50);

    res.json({ active, history });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/deliveries/:id/status', protect, requireRole(['delivery_boy']), async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Assigned', 'Picked Up', 'Out for Delivery', 'Delivered', 'Failed', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const delivery = await PharmacyDelivery.findById(req.params.id);
    if (!delivery) return res.status(404).json({ message: 'Delivery not found' });

    const update = { status };
    if (status === 'Picked Up') update.pickedUpAt = new Date();
    if (status === 'Delivered') update.deliveredAt = new Date();
    if (status === 'Assigned') update.assignedAt = new Date();

    Object.assign(delivery, update);
    await delivery.save();

    if (status === 'Delivered') {
      await PharmacyOrder.findByIdAndUpdate(delivery.orderRef, { status: 'Delivered' });
      await DeliveryPartner.findByIdAndUpdate(delivery.deliveryPartnerId, {
        isAvailable: true, $inc: { totalDeliveries: 1 },
      });
    }

    emitDeliveryStatus(delivery.orderId, status);
    res.json(delivery);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post('/assign', protect, requireRole(['pharmacy_owner', 'admin']), async (req, res) => {
  try {
    const { deliveryId, deliveryPartnerId } = req.body;
    const delivery = await PharmacyDelivery.findByIdAndUpdate(deliveryId, {
      deliveryPartnerId, status: 'Assigned', assignedAt: new Date(),
    }, { new: true });
    if (!delivery) return res.status(404).json({ message: 'Delivery not found' });

    await DeliveryPartner.findByIdAndUpdate(deliveryPartnerId, { isAvailable: false });
    getIO().to(`user:${deliveryPartnerId}`).emit('delivery:new_assignment', { deliveryId, delivery });
    emitDeliveryStatus(delivery.orderId || deliveryId, 'Assigned');
    res.json(delivery);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get('/nearby', protect, requireRole(['pharmacy_owner', 'admin', 'superadmin']), async (req, res) => {
  try {
    const { lat, lng, radiusKm = 5 } = req.query;
    if (!lat || !lng) return res.status(400).json({ message: 'Latitude and longitude required' });

    const nearby = await getNearbyDeliveryBoys(parseFloat(lat), parseFloat(lng), parseFloat(radiusKm));
    const ids = nearby.map((n) => n.member ?? n);
    const partners = await DeliveryPartner.find({
      _id: { $in: ids },
      status: 'approved',
      isAvailable: true,
    });
    res.json(partners);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/all', protect, async (req, res) => {
  try {
    const filter = {};
    if (!['superadmin', 'admin'].includes(req.user.role)) {
      filter.status = { $ne: 'rejected' };
    }
    const partners = await DeliveryPartner.find(filter).sort({ createdAt: -1 });
    res.json(partners);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/pending', protect, requireRole(['superadmin', 'admin']), async (req, res) => {
  try {
    const partners = await DeliveryPartner.find({ status: 'pending' }).sort({ createdAt: -1 });
    res.json(partners);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
