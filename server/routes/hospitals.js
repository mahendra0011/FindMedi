import express from 'express';
import Hospital from '../models/Hospital.js';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import { protect, superadminOnly, hospitalAdminOnly } from '../middleware/auth.js';
import { validate, registerHospitalSchema } from '../utils/validate.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../config/logger.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { search, city, specialty, status } = req.query;
    const filter = {};

    if (status && req.headers.authorization) {
      try {
        const jwt = (await import('jsonwebtoken')).default;
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('role status isVerified');
        if (user && user.role === 'superadmin' && user.status !== 'blocked' && user.isVerified) {
          filter.status = status;
        } else {
          filter.status = 'approved';
        }
      } catch { filter.status = 'approved'; }
    } else {
      filter.status = 'approved';
    }

    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { city: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
      ];
    }
    if (city) filter.city = new RegExp(city, 'i');
    if (specialty) filter.specialties = new RegExp(specialty, 'i');

    const hospitals = await Hospital.find(filter).sort({ createdAt: -1 });
    res.json(hospitals);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/pending', protect, superadminOnly, async (req, res) => {
  try {
    const hospitals = await Hospital.find({ status: 'pending' }).sort({ createdAt: -1 });
    res.json(hospitals);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    let hospital;
    try {
      hospital = await Hospital.findById(req.params.id);
    } catch (castErr) {
      return res.status(404).json({ message: 'Hospital not found' });
    }
    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });
    let doctors = [];
    try {
      doctors = await Doctor.find({ hospitalId: req.params.id, approved: true }).sort({ specialization: 1 });
    } catch (castErr) {
      doctors = [];
    }
    res.json({ hospital, doctors });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/register', validate(registerHospitalSchema), async (req, res) => {
  try {
    const { name, email, phone, address, city, state, licenseNumber, description, specialties, establishedYear, hospitalType, bedAvailability, emergency24x7, ambulanceService, accreditations, workingHours, insuranceAccepted, logo, image, paymentModes, location, adminName, adminEmail, adminPhone } = req.body;

    if (!name || !email || !phone || !address || !licenseNumber || !adminName || !adminEmail || !adminPhone) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    const existingHospital = await Hospital.findOne({ email: email.toLowerCase() });
    if (existingHospital) return res.status(400).json({ message: 'A hospital with this email already exists' });

    const existingUser = await User.findOne({ email: adminEmail.toLowerCase() });
    if (existingUser) return res.status(400).json({ message: 'A user with this admin email already exists' });

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();

    const hospital = await Hospital.create({
      name, email: email.toLowerCase(), phone, address, city, state, licenseNumber, slug,
      description: description || '', specialties: specialties || [],
      establishedYear, hospitalType, bedAvailability, emergency24x7, ambulanceService,
      accreditations: accreditations || [], workingHours, insuranceAccepted: insuranceAccepted || [],
      paymentModes: paymentModes || [], logo: logo || '', image: image || '',
      location: location || undefined,
      status: 'pending',
    });

    const tempPassword = Math.random().toString(36).slice(-10);
    const admin = await User.create({
      name: adminName,
      email: adminEmail.toLowerCase(),
      password: tempPassword,
      role: 'admin',
      phone: adminPhone || '',
      hospitalId: hospital._id,
      isVerified: false,
      status: 'active',
      approvalStatus: 'not_required',
    });

    try {
      const { sendHostNotificationEmail } = await import('../services/notificationService.js');
      await sendHostNotificationEmail({
        subject: 'MediCore Hospital Registration',
        text: `Hospital "${name}" registered by ${adminName} (${adminEmail}).\n\nTemporary password: ${tempPassword}\n\nAdmin can login with this password and will be prompted to change it.`,
      });
    } catch {
      logger.warn('Could not send notification email for hospital registration');
    }

    res.status(201).json({
      message: 'Hospital registered successfully. Awaiting superadmin approval.',
      hospitalId: hospital._id,
      adminEmail: adminEmail.toLowerCase(),
      tempPassword,
    });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id/approve', protect, superadminOnly, async (req, res) => {
  try {
    const hospital = await Hospital.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true });
    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });
    await User.updateMany({ hospitalId: req.params.id }, { status: 'active', isVerified: true });
    await auditLog('approve_hospital', req.user._id, { targetHospitalId: req.params.id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json({ message: 'Hospital approved', hospital });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id/reject', protect, superadminOnly, async (req, res) => {
  try {
    const { reason } = req.body;
    const hospital = await Hospital.findByIdAndUpdate(req.params.id, { status: 'rejected', rejectionReason: reason || '' }, { new: true });
    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });
    await auditLog('reject_hospital', req.user._id, { targetHospitalId: req.params.id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json({ message: 'Hospital rejected', hospital });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id/suspend', protect, superadminOnly, async (req, res) => {
  try {
    const hospital = await Hospital.findByIdAndUpdate(req.params.id, { status: 'suspended' }, { new: true });
    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });
    await auditLog('suspend_hospital', req.user._id, { targetHospitalId: req.params.id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json({ message: 'Hospital suspended', hospital });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/:id', protect, superadminOnly, async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });

    const hospitalId = hospital._id;

    await Doctor.deleteMany({ hospitalId });
    await User.deleteMany({ hospitalId, role: 'admin' });
    await Hospital.findByIdAndDelete(req.params.id);
    await auditLog('delete_hospital', req.user._id, { targetHospitalId: req.params.id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json({ message: 'Hospital and related records deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id', protect, hospitalAdminOnly, async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });
    if (hospital._id.toString() !== req.user.hospitalId.toString() && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Not your hospital' });
    }
    const allowedFields = ['name', 'address', 'city', 'state', 'pincode', 'phone', 'email', 'logo', 'description', 'specialties', 'licenseNumber', 'website', 'establishedYear', 'hospitalType', 'accreditations', 'emergency24x7', 'bedAvailability', 'ambulanceService', 'image', 'workingHours', 'insuranceAccepted', 'paymentModes', 'amenities', 'socialLinks', 'location'];
    const update = {};
    allowedFields.forEach(f => { if (req.body[f] !== undefined) update[f] = req.body[f]; });
    const updated = await Hospital.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json(updated);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/admin/mine', protect, hospitalAdminOnly, async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.user.hospitalId);
    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });
    res.json(hospital);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
