import express from 'express';
import Doctor from '../models/Doctor.js';
import Facility from '../models/Facility.js';
import User from '../models/User.js';
import { sanitizeDto } from '../utils/safeError.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { validate, updateClinicProfileSchema, createClinicStaffSchema, updateClinicStaffSchema, CLINIC_STAFF_ROLES } from '../utils/validate.js';
import { randomPassword } from '../utils/secureRandom.js';

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

router.put('/profile', protect, validate(updateClinicProfileSchema), async (req, res) => {
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

// AUTHZ gap (was UNCLASSIFIED, and it FAILED OPEN): with neither facilityId nor
// hospitalId on the account, `User.find({ facilityId: undefined, role: {...} })`
// does not match nothing — it matches every staff account on the platform that
// has no facility attached, handing their names, emails and phone numbers to any
// logged-in patient. The sibling POST /staff below already guards this exact
// case with a 403; the GET never did. `.select('-password')` does not help: the
// leak is identity, not the hash.
// authz: object
router.get('/staff', protect, async (req, res) => {
  try {
    const facilityId = req.user.facilityId || req.user.hospitalId;
    if (!facilityId) return res.status(403).json({ message: 'No facility linked to this account' });
    const staff = await User.find({ facilityId, role: { $in: ['nurse', 'technician', 'helper', 'accountant'] } }).select('-password').sort({ createdAt: -1 });
    res.json({ staff });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/staff', protect, adminOnly, validate(createClinicStaffSchema), async (req, res) => {
  try {
    const facilityId = req.user.facilityId || req.user.hospitalId;
    // AUTH-B-19: staff must be attached to a real facility, and the role can
    // only be one of CLINIC_STAFF_ROLES (schema-enum) — never superadmin /
    // hospital_admin, which are invite-only.
    if (!facilityId) return res.status(403).json({ message: 'No facility linked to this account' });
    const { name, email, phone, role } = req.body;
    if (!name || !email || !role) return res.status(400).json({ message: 'Name, email and role required' });
    if (!CLINIC_STAFF_ROLES.includes(role)) {
      return res.status(403).json({ message: 'This role cannot be created from a facility account' });
    }
    const tempPassword = randomPassword(12);
    const user = await User.create({
      name, email: email.toLowerCase(), password: tempPassword, mustResetPassword: true, role, phone: phone || '',
      facilityId, isVerified: true, status: 'active', approvalStatus: 'not_required',
    });
    // §5.3/§5.4: sanitizeDto strips password/tokenVersion/2FA secrets/__v —
    // `delete safe.password` alone left the rest of the auth internals on the wire.
    // The admin still gets the one-time plaintext separately.
    const safe = sanitizeDto(user);
    res.status(201).json({ user: safe, tempPassword, message: 'Share the temporary password securely; the user must change it on first login.' });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/staff/:id', protect, adminOnly, validate(updateClinicStaffSchema), async (req, res) => {
  try {
    const facilityId = req.user.facilityId || req.user.hospitalId;
    if (!facilityId) return res.status(403).json({ message: 'No facility linked to this account' });
    const { name, email, phone, role } = req.body;
    // AUTH-B-19: role escalation guard — a facility admin may not promote
    // anyone (including themselves) to a tenant/platform role.
    if (role && !CLINIC_STAFF_ROLES.includes(role)) {
      return res.status(403).json({ message: 'This role cannot be assigned from a facility account' });
    }
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, facilityId },
      { ...(name && { name }), ...(email && { email: email.toLowerCase() }), ...(phone !== undefined && { phone }), ...(role && { role }) },
      { new: true, select: '-password' }
    );
    if (!user) return res.status(404).json({ message: 'Staff not found' });
    // §5.3/§5.4: `select: '-password'` was the only filter — tokenVersion,
    // twoFactorSecret/backupCodes, driveTokens, __v still serialised out.
    res.json(sanitizeDto(user));
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/staff/:id', protect, adminOnly, async (req, res) => {
  try {
    const facilityId = req.user.facilityId || req.user.hospitalId;
    await User.findOneAndDelete({ _id: req.params.id, facilityId });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});
import ClinicProfile from '../models/ClinicProfile.js';
import { escapeRegex, capSearch } from '../utils/escapeRegex.js';

// ─── Public Clinic Discovery (no auth) ─────────────────────────────────────
router.get('/public', async (req, res) => {
  try {
    const { search, specialty, city } = req.query;
    const filter = { doctor_type: 'clinic', approved: true };
    if (search) filter.$or = [
      { name: new RegExp(escapeRegex(capSearch(search)), 'i') },
      { specialization: new RegExp(escapeRegex(capSearch(search)), 'i') },
    ];
    if (specialty && specialty !== 'All') filter.specialization = new RegExp(escapeRegex(capSearch(specialty)), 'i');
    if (city && city !== 'All') filter.location = new RegExp(escapeRegex(capSearch(city)), 'i');
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
