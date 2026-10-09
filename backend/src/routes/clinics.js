import express from 'express';
import Doctor from '../models/Doctor.js';
import Facility from '../models/Facility.js';
import User from '../models/User.js';
import { sanitizeDto } from '../utils/safeError.js';
import { auditLog } from '../middleware/audit.js';

const auditLogSafe = (...args) => auditLog(...args).catch(() => {});
import { protect, adminOnly, authorize } from '../middleware/auth.js';
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

// Doc 12 §3: clinic-as-business overview (visits, collection, outstanding,
// repeat %, no-show %). Numbers come from the same ledger as billing.
router.get('/overview', protect, authorize('billing:read'), async (req, res) => {
  try {
    const { from, to } = req.query;
    const hf = req.user.facilityId || req.user.hospitalId
      ? { hospitalId: req.user.facilityId || req.user.hospitalId } : {};
    const range = {};
    if (from || to) {
      range.createdAt = {};
      if (from) range.createdAt.$gte = new Date(from);
      if (to) range.createdAt.$lte = new Date(to);
    }
    const { default: Billing } = await import('../models/Billing.js');
    const { default: Appointment } = await import('../models/Appointment.js');
    const [visits, completed, noShow, money, repeat] = await Promise.all([
      Appointment.countDocuments({ ...hf, ...range }),
      Appointment.countDocuments({ ...hf, ...range, status: 'Completed' }),
      Appointment.countDocuments({ ...hf, ...range, status: 'No Show' }),
      Billing.aggregate([
        { $match: { ...hf, ...(range.createdAt ? { createdAt: range.createdAt } : {}) } },
        { $group: { _id: null, billed: { $sum: '$amount' }, collected: { $sum: '$paid' }, outstanding: { $sum: '$balance' } } },
      ]),
      Appointment.aggregate([
        { $match: { ...hf } },
        { $group: { _id: '$patientId', n: { $sum: 1 } } },
        { $group: { _id: null, repeat: { $sum: { $cond: [{ $gt: ['$n', 1] }, 1, 0] } }, total: { $sum: 1 } } },
      ]),
    ]);
    return res.json({
      visits, completed, noShow,
      noShowPct: visits ? +(noShow * 100 / visits).toFixed(1) : 0,
      billed: money[0]?.billed || 0, collected: money[0]?.collected || 0,
      outstanding: money[0]?.outstanding || 0,
      repeatPct: repeat[0]?.total ? +(repeat[0].repeat * 100 / repeat[0].total).toFixed(1) : 0,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Doc 12 §7: server-side clinic dashboard aggregate (fixes C2 client
// truncation). One call: KPIs + queue + roster + recalls + money.
router.get('/dashboard', async (req, res) => {
  try {
    const allowed = ['clinic_admin', 'clinic_doctor', 'clinic_receptionist', 'clinic_accountant', 'hospital_admin', 'superadmin'];
    if (!allowed.includes(req.user?.role)) return res.status(403).json({ message: 'Clinic access required' });
    const { from, to } = req.query;
    const hf = req.user.facilityId || req.user.hospitalId ? { hospitalId: req.user.facilityId || req.user.hospitalId } : {};
    const range = {};
    if (from || to) {
      range.createdAt = {};
      if (from) range.createdAt.$gte = new Date(from);
      if (to) range.createdAt.$lte = new Date(to);
    }
    const { default: Appointment } = await import('../models/Appointment.js');
    const { default: Billing } = await import('../models/Billing.js');
    const { default: Token } = await import('../models/Token.js');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const data = {};
    const errors = {};
    const tile = async (key, fn) => {
      try { data[key] = await fn(); }
      catch (e) { errors[key] = e.message || 'failed'; data[key] = null; }
    };
    await tile('visits', async () => {
      const [total, completed, noShow] = await Promise.all([
        Appointment.countDocuments({ ...hf, ...range }),
        Appointment.countDocuments({ ...hf, ...range, status: 'Completed' }),
        Appointment.countDocuments({ ...hf, ...range, status: 'No Show' }),
      ]);
      return { total, completed, noShow, noShowPct: total ? +(noShow * 100 / total).toFixed(1) : 0 };
    });
    await tile('money', async () => {
      const r = await Billing.aggregate([
        { $match: { ...hf, ...(range.createdAt ? { createdAt: range.createdAt } : {}) } },
        { $group: { _id: null, billed: { $sum: '$amount' }, collected: { $sum: '$paid' }, outstanding: { $sum: '$balance' } } },
      ]);
      return { billed: r[0]?.billed || 0, collected: r[0]?.collected || 0, outstanding: r[0]?.outstanding || 0 };
    });
    await tile('doctors', () => Doctor.find({ ...hf }).select('name specialization').lean());
    await tile('queue', async () => {
      // Shared reception, per-doctor queues: tokens of this clinic's doctors.
      const docs = await Doctor.find({ ...hf }).select('_id').lean();
      const ids = docs.map((d) => d._id);
      if (!ids.length) return [];
      return Token.find({ status: 'Waiting', doctorId: { $in: ids }, createdAt: { $gte: today } })
        .select('tokenNumber queuePosition doctorId patientName priority')
        .sort({ queuePosition: 1 }).limit(30).lean();
    });
    res.json({ data, errors, at: new Date() });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Doc 12 §5: multi-doctor support — doctors of this clinic (shared reception).
router.get('/doctors', async (req, res) => {
  try {
    const allowed = ['clinic_admin', 'clinic_doctor', 'clinic_receptionist', 'hospital_admin', 'superadmin'];
    if (!allowed.includes(req.user?.role)) return res.status(403).json({ message: 'Clinic access required' });
    const hf = req.user.facilityId || req.user.hospitalId ? { hospitalId: req.user.facilityId || req.user.hospitalId } : {};
    const doctors = await Doctor.find({ ...hf }).select('name specialization experience rating available').lean();
    return res.json({ doctors });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Doc 12 §3: module toggles (dental/eye/ayush/physio) gating detail sections.
router.put('/modules', protect, async (req, res) => {
  try {
    const { default: ClinicProfile } = await import('../models/ClinicProfile.js');
    const allowed = ['dental', 'eye', 'ayush', 'physio'];
    const modules = {};
    for (const k of allowed) {
      if (req.body?.modules && typeof req.body.modules[k] === 'boolean') modules[`modules.${k}`] = req.body.modules[k];
    }
    if (!Object.keys(modules).length) return res.status(400).json({ message: 'modules.{dental,eye,ayush,physio} booleans required' });
    const profile = await ClinicProfile.findOneAndUpdate(
      { doctorId: req.user.doctorProfileId || req.user._id },
      { $set: modules },
      { new: true, upsert: true },
    );
    return res.json({ modules: profile.modules });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Doc 12 §3: camps hosted (Campaign rows linked by facility + outcomes).
router.get('/camps', protect, authorize('billing:read'), async (req, res) => {
  try {
    const { default: Campaign } = await import('../models/Campaign.js');
    const facilityId = req.user.facilityId || req.user.hospitalId;
    const filter = facilityId ? { facilityId } : {};
    const rows = await Campaign.find(filter).sort({ date: -1 }).limit(100).lean();
    return res.json({ camps: rows });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Doc 12 §3: staff invite — real User login + Staff HR row together.
// The temp credential is returned ONCE (owner relays it); mustResetPassword
// forces a change at first login via /set-password.
const CLINIC_STAFF_INVITE_ROLES = [
  'clinic_receptionist', 'clinic_nurse', 'clinic_accountant', 'clinic_pharmacist',
];
router.post('/staff/invite', async (req, res) => {
  try {
    if (!['clinic_admin', 'hospital_admin', 'superadmin'].includes(req.user?.role)) {
      return res.status(403).json({ message: 'Clinic admin access required' });
    }
    const { name, email, phone, role } = req.body || {};
    if (!name || !email || !CLINIC_STAFF_INVITE_ROLES.includes(role)) {
      return res.status(400).json({ message: 'name + email + clinic staff role required' });
    }
    const { default: Staff } = await import('../models/Staff.js');
    const exists = await User.findOne({ email: String(email).toLowerCase() });
    if (exists) return res.status(409).json({ message: 'Email already registered' });
    const tempPassword = randomPassword(12);
    const user = await User.create({
      name, email: String(email).toLowerCase(), phone: phone || '',
      password: tempPassword, role,
      hospitalId: req.user.hospitalId || undefined,
      facilityId: req.user.facilityId || undefined,
      mustResetPassword: true,
    });
    await Staff.create({
      employeeId: `CLN-${Date.now().toString(36).toUpperCase()}`,
      userId: user._id, name, role: 'Receptionist',
      hospitalId: req.user.hospitalId || undefined,
      joinDate: new Date(),
    }).catch(() => {});
    await auditLogSafe('clinic_staff_invited', req.user._id, { userId: user._id, role, ip: req.ip });
    return res.status(201).json({ id: String(user._id), role, tempPassword });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// Doc 12 §3: today's roster — doctors with slots + tokens waiting.
router.get('/roster/today', protect, authorize('appointments:read'), async (req, res) => {
  try {
    const hf = req.user.facilityId || req.user.hospitalId
      ? { hospitalId: req.user.facilityId || req.user.hospitalId } : {};
    const { default: Token } = await import('../models/Token.js');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const waiting = await Token.aggregate([
      { $match: { status: 'Waiting', createdAt: { $gte: today }, ...hf } },
      { $group: { _id: '$doctorId', waiting: { $sum: 1 }, next: { $min: '$queuePosition' } } },
    ]);
    const doctors = await Doctor.find({ ...hf }).select('name specialization').lean();
    return res.json({
      roster: doctors.map((d) => ({
        ...d,
        waiting: (waiting.find((w) => String(w._id) === String(d._id)) || {}).waiting || 0,
      })),
    });
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
import { specialtyCondition } from '../lib/taxonomy.js';

// ─── Public Clinic Discovery (no auth) ─────────────────────────────────────
router.get('/public', async (req, res) => {
  try {
    const { search, specialty, city } = req.query;
    const filter = { doctor_type: 'clinic', approved: true };
    if (search) filter.$or = [
      { name: new RegExp(escapeRegex(capSearch(search)), 'i') },
      { specialization: new RegExp(escapeRegex(capSearch(search)), 'i') },
    ];
    if (specialty && specialty !== 'All') {
      const condition = specialtyCondition(specialty);
      if (condition) filter.$and = [...(filter.$and || []), condition];
    }
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
