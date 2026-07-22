import express from 'express';
import Doctor from '../models/Doctor.js';
import Facility from '../models/Facility.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/profile', protect, async (req, res) => {
  try {
    const facilityId = req.user.facilityId || req.user.hospitalId;
    const facility = await Facility.findById(facilityId);
    if (!facility || facility.type !== 'clinic') return res.status(404).json({ message: 'Clinic not found' });
    const doctor = await Doctor.findOne({ user_id: req.user._id.toString() });
    res.json({ facility, doctor });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/profile', protect, async (req, res) => {
  try {
    const facilityId = req.user.facilityId || req.user.hospitalId;
    const facility = await Facility.findById(facilityId);
    if (!facility || facility.type !== 'clinic') return res.status(404).json({ message: 'Clinic not found' });
    const allowed = ['name', 'address', 'city', 'state', 'phone', 'logo', 'description', 'specialties', 'image', 'details'];
    const update = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) update[f] = req.body[f]; });
    const updated = await Facility.findByIdAndUpdate(facilityId, update, { new: true });
    res.json(updated);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/staff', protect, async (req, res) => {
  try {
    const facilityId = req.user.facilityId || req.user.hospitalId;
    const staff = await User.find({ facilityId, role: { $in: ['nurse', 'technician', 'helper', 'accountant'] } }).select('-password').sort({ createdAt: -1 });
    res.json({ staff });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/staff', protect, async (req, res) => {
  try {
    const facilityId = req.user.facilityId || req.user.hospitalId;
    const { name, email, phone, role } = req.body;
    if (!name || !email || !role) return res.status(400).json({ message: 'Name, email and role required' });
    const tempPassword = Math.random().toString(36).slice(-10);
    const user = await User.create({
      name, email: email.toLowerCase(), password: tempPassword, role, phone: phone || '',
      facilityId, isVerified: true, status: 'active', approvalStatus: 'not_required',
    });
    res.status(201).json(user);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/staff/:id', protect, async (req, res) => {
  try {
    const facilityId = req.user.facilityId || req.user.hospitalId;
    await User.findOneAndDelete({ _id: req.params.id, facilityId });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});
import ClinicProfile from '../models/ClinicProfile.js';

// ─── Public Clinic Discovery (no auth) ─────────────────────────────────────
router.get('/public', async (req, res) => {
  try {
    const { search, specialty, city } = req.query;
    const filter = { doctor_type: 'clinic', approved: true };
    if (search) filter.$or = [
      { name: new RegExp(search, 'i') },
      { specialization: new RegExp(search, 'i') },
    ];
    if (specialty && specialty !== 'All') filter.specialization = new RegExp(specialty, 'i');
    if (city && city !== 'All') filter.location = new RegExp(city, 'i');
    let doctors = await Doctor.find(filter).populate('facilityId').sort({ rating: -1 }).lean();
    const doctorIds = doctors.map(d => d._id);
    if (doctorIds.length) {
      const profiles = await ClinicProfile.find({ doctorId: { $in: doctorIds } }).lean();
      const profileMap = Object.fromEntries(profiles.map(p => [p.doctorId.toString(), p]));
      doctors = doctors.map(d => ({ ...d, clinicProfile: profileMap[d._id.toString()] || null }));
    }
    res.json({ doctors });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/public/:id', async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id).populate('facilityId').lean();
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    const clinicProfile = await ClinicProfile.findOne({ doctorId: doctor._id }).lean();
    res.json({ doctor, clinicProfile });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
