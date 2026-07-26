import express from 'express';
import jwt from 'jsonwebtoken';
import Facility from '../models/Facility.js';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import { protect, superadminOnly } from '../middleware/auth.js';
import { validate, registerFacilitySchema, updateFacilitySchema } from '../utils/validate.js';
import { auditLog } from '../middleware/audit.js';
import License from '../models/License.js';
import logger from '../config/logger.js';
import { sendEmail } from '../services/notificationService.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { search, city, type, status } = req.query;
    const filter = {};
    if (type && type !== 'All') filter.type = type;

    if (status && req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('role status isVerified');
        if (user && user.role === 'superadmin' && user.status !== 'blocked' && user.isVerified) {
          filter.status = status;
        } else filter.status = 'approved';
      } catch { filter.status = 'approved'; }
    } else filter.status = 'approved';

    if (search) filter.$or = [
      { name: new RegExp(search, 'i') },
      { city: new RegExp(search, 'i') },
      { description: new RegExp(search, 'i') },
    ];
    if (city) filter.city = new RegExp(city, 'i');

    const facilities = await Facility.find(filter).sort({ createdAt: -1 });
    res.json(facilities);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/pending', protect, superadminOnly, async (req, res) => {
  try {
    const { type } = req.query;
    const filter = { status: 'pending' };
    if (type && type !== 'All') filter.type = type;
    const facilities = await Facility.find(filter).sort({ createdAt: -1 });
    res.json(facilities);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/mine', protect, async (req, res) => {
  try {
    const id = req.user.facilityId || req.user.hospitalId;
    if (!id) return res.status(404).json({ message: 'No facility linked' });
    const facility = await Facility.findById(id);
    if (!facility) return res.status(404).json({ message: 'Facility not found' });
    res.json(facility);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/facilities/settings — get facility settings
router.get('/settings', protect, async (req, res) => {
  try {
    const id = req.user.facilityId;
    if (!id) return res.status(404).json({ message: 'No facility linked' });
    const facility = await Facility.findById(id).select('settings');
    if (!facility) return res.status(404).json({ message: 'Facility not found' });
    res.json(facility.settings || { autoConfirmAppointment: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/facilities/settings — update facility settings
router.put('/settings', protect, async (req, res) => {
  try {
    const id = req.user.facilityId;
    if (!id) return res.status(404).json({ message: 'No facility linked' });
    const { autoConfirmAppointment } = req.body;
    const facility = await Facility.findByIdAndUpdate(
      id,
      { 'settings.autoConfirmAppointment': autoConfirmAppointment },
      { new: true }
    ).select('settings');
    if (!facility) return res.status(404).json({ message: 'Facility not found' });
    res.json(facility.settings);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    let facility;
    try { facility = await Facility.findById(req.params.id); }
    catch { return res.status(404).json({ message: 'Facility not found' }); }
    if (!facility) return res.status(404).json({ message: 'Facility not found' });
    let doctors = [];
    try { doctors = await Doctor.find({ facilityId: req.params.id, approved: true }).sort({ specialization: 1 }); }
    catch { doctors = []; }
    res.json({ facility, doctors });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/register', validate(registerFacilitySchema), async (req, res) => {
  try {
    const { account, facility: facilityData, doctors: doctorsData, services: servicesData, specialist: specialistData } = req.body;
    const { type, name, email, phone, address, city, state, licenseNumber, description, establishedYear, logo, image, nablNumber, aerbNumber, workingHours, pathologistName, pathologistQualification, radiologistName, radiologistQualification, cardiologistName, cardiologistQualification, technicianName, technicianRole, technicianQualification, technicianExperience, timing, amenities, socialLinks, details, location } = facilityData || req.body;
    const adminName = account?.name || req.body.adminName;
    const adminEmail = account?.email || req.body.adminEmail;
    const adminPhone = account?.phone || req.body.adminPhone;
    const adminPassword = account?.password;
    const doctorsList = doctorsData || req.body.doctors;
    if (!type || !name || !email || !phone || !address || !licenseNumber || !adminName || !adminEmail || !adminPhone) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }
    const existing = await Facility.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ message: `A ${type} with this email already exists` });
    const existingUser = await User.findOne({ email: adminEmail.toLowerCase() });
    if (existingUser) return res.status(400).json({ message: 'A user with this admin email already exists' });

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();
    const facility = await Facility.create({
      type, name, email: email.toLowerCase(), phone, address, city, state, licenseNumber, slug,
      description: description || '', establishedYear, logo: logo || '', image: image || '',
      nablNumber: nablNumber || '', aerbNumber: aerbNumber || '', workingHours: workingHours || '',
      pathologistName: pathologistName || '', pathologistQualification: pathologistQualification || '',
      radiologistName: radiologistName || '', radiologistQualification: radiologistQualification || '',
      cardiologistName: cardiologistName || '', cardiologistQualification: cardiologistQualification || '',
      technicianName: technicianName || '', technicianRole: technicianRole || '',
      technicianQualification: technicianQualification || '', technicianExperience: technicianExperience || '',
      timing: timing || {}, amenities: amenities || {}, socialLinks: socialLinks || {},
      location: location || undefined,
      status: 'pending', details: details || {},
    });

    const finalPassword = adminPassword || Math.random().toString(36).slice(-10);
    const roleMap = { hospital: 'admin', clinic: 'clinic_doctor', lab: 'lab_receptionist', pharmacy: 'pharmacist' };
    const newUser = await User.create({
      name: adminName, email: adminEmail.toLowerCase(), password: finalPassword,
      role: roleMap[type] || 'admin', phone: adminPhone || '',
      facilityId: facility._id, facilityType: type,
      isVerified: false, status: 'active', approvalStatus: 'not_required',
    });

    try {
      await License.create({
        facilityId: facility._id,
        facilityType: type,
        licenseNumber: licenseNumber || '',
        issuedDate: new Date(),
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        status: 'active',
      });
    } catch (licenseErr) {
      logger.error('License creation failed:', licenseErr.message);
    }
    await auditLog('register_facility', null, { facilityId: facility._id, type, name });

    try {
      await sendEmail({
        to: adminEmail,
        subject: `MediCore - ${type} registration received`,
        html: `<h2>Registration Received</h2><p>Dear ${adminName},</p><p>Your ${type} <strong>${name}</strong> has been registered on MediCore. Our team will review and approve it within 24-48 hours.</p><p>You will receive a notification once approved.</p>`,
      });
    } catch (emailErr) {
      logger.error('Facility registration confirmation email failed:', emailErr.message);
    }

    res.status(201).json({ message: `${type} registered successfully. Awaiting approval.`, facilityId: facility._id });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id/approve', protect, superadminOnly, async (req, res) => {
  try {
    const facility = await Facility.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true });
    if (!facility) return res.status(404).json({ message: 'Facility not found' });
    await User.updateMany({ facilityId: req.params.id }, { status: 'active', isVerified: true });
    await auditLog('approve_facility', req.user._id, { facilityId: facility._id, type: facility.type, name: facility.name });
    res.json({ message: `${facility.type} approved`, facility });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id/reject', protect, superadminOnly, async (req, res) => {
  try {
    const { reason } = req.body;
    const facility = await Facility.findByIdAndUpdate(req.params.id, { status: 'rejected', rejectionReason: reason || '' }, { new: true });
    if (!facility) return res.status(404).json({ message: 'Facility not found' });
    await auditLog('reject_facility', req.user._id, { facilityId: facility._id, type: facility.type, name: facility.name, reason: reason || '' });
    res.json({ message: `${facility.type} rejected`, facility });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id/suspend', protect, superadminOnly, async (req, res) => {
  try {
    const facility = await Facility.findByIdAndUpdate(req.params.id, { status: 'suspended' }, { new: true });
    if (!facility) return res.status(404).json({ message: 'Facility not found' });
    await auditLog('suspend_facility', req.user._id, { facilityId: facility._id, type: facility.type, name: facility.name });
    res.json({ message: `${facility.type} suspended`, facility });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id', protect, validate(updateFacilitySchema), async (req, res) => {
  try {
    const facility = await Facility.findById(req.params.id);
    if (!facility) return res.status(404).json({ message: 'Facility not found' });
    const userFacilityId = (req.user.facilityId || req.user.hospitalId)?.toString();
    if (facility._id.toString() !== userFacilityId && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const allowedFields = ['name', 'email', 'address', 'city', 'state', 'pincode', 'phone', 'logo', 'image', 'description', 'specialties', 'details',
      'establishedYear', 'accreditations', 'licenseNumber', 'workingHours',
      'nablNumber', 'aerbNumber',
      'pathologistName', 'pathologistQualification',
      'radiologistName', 'radiologistQualification',
      'cardiologistName', 'cardiologistQualification',
      'technicianName', 'technicianRole', 'technicianQualification', 'technicianExperience',
      'timing', 'amenities', 'socialLinks', 'location'
    ];
    const update = {};
    allowedFields.forEach(f => { if (req.body[f] !== undefined) update[f] = req.body[f]; });
    const updated = await Facility.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json(updated);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

export default router;
