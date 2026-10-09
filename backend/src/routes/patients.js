import { escapeRegex, capSearch } from '../utils/escapeRegex.js';
import express from 'express';
import Patient from '../models/Patient.js';
import { protect } from '../middleware/auth.js';
import { validate, createPatientSchema, updatePatientSchema } from '../utils/validate.js';
import { auditLog } from '../middleware/audit.js';
import { paginatedResults } from '../utils/pagination.js';
import { requireBreakGlass } from '../middleware/requireBreakGlass.js';

// File 23 §3.3/§4.3: platform operators see MASKED identity by default.
// Full identity needs a BreakGlassGrant (per-subject, time-boxed, audited).
const PLATFORM_DIRECTORY_ROLES = new Set([
  'superadmin', 'platform_admin', 'support_l1', 'support_l2', 'dpo',
  'security_admin', 'clinical_safety', 'analyst', 'auditor',
]);

const maskName = (v) => {
  const parts = String(v || '').split(' ').filter(Boolean);
  if (!parts.length) return '***';
  return parts.length > 1 ? `${parts[0]} ${parts[1][0]}***` : `${parts[0][0]}***`;
};
const maskPhone = (v) => {
  const s = String(v || '');
  return s.length > 4 ? `${s.slice(0, 2)}******${s.slice(-2)}` : '******';
};
const maskEmail = (v) => {
  const s = String(v || '');
  const at = s.indexOf('@');
  return at > 0 ? `${s[0]}***${s.slice(at)}` : '***';
};
const maskTail4 = (v) => {
  const s = String(v || '');
  return s.length > 4 ? `•••${s.slice(-4)}` : '•••';
};
const maskPatient = (p) => ({
  ...(typeof p.toObject === 'function' ? p.toObject() : p),
  name: maskName(p.name),
  phone: maskPhone(p.phone),
  email: maskEmail(p.email),
  address: '[masked]',
  uhid: maskTail4(p.uhid),
});

// Single-subject doc routes: platform roles pass only with a grant.
const requirePatientGrant = (req, res, next) => {
  if (PLATFORM_DIRECTORY_ROLES.has(req.user?.role)) return requireBreakGlass('patient')(req, res, next);
  return next();
};

const router = express.Router();

/**
 * DLB-17: object-level authorization for the patient directory.
 *
 * The old checks were two fail-open one-liners:
 *   - `if (req.user.hospitalId && role !== 'superadmin') filter.hospitalId = ...`
 *     => every account WITHOUT a hospital (rider, lawyer, assistant, technician,
 *        nurse, even a doctor with no hospital link) listed the ENTIRE patient
 *     directory of every hospital on the platform.
 *   - `if (role === 'patient' && p._id !== req.user._id)` compared the Patient
 *     document id against the USER id, so a patient could never read their own row.
 *
 * Rules now: superadmin sees all; a patient sees only their own row; hospital /
 * facility staff see only their own tenant; anyone else is refused.
 */
const PATIENT_STAFF_ROLES = [
  'hospital_admin', 'doctor', 'clinic_doctor', 'nurse', 'lab_owner', 'lab_receptionist',
  'lab_technician', 'pathologist', 'pharmacy_owner', 'pharmacist', 'receptionist',
  'accountant', 'counsellor', 'psychiatrist', 'dietitian', 'physiotherapist', 'radiologist',
  // 7.md 3: clinical + facility roles that run care episodes (tenant-scoped
  // to their own facility by the check below). Retail/marketplace roles stay
  // out — an equipment vendor has no care relationship to list patients by.
  'dentist', 'dental_clinic_admin', 'optician', 'phlebotomist',
  'home_nursing_admin', 'dialysis_admin', 'fertility_admin', 'maternity_admin',
  'rehab_admin', 'govt_facility_staff',
  // File 09 §8.2: front-desk patient search (tenant-scoped by the check below).
  'receptionist',
  // Doc 12 §3: clinic front-desk + nurse need the same directory search.
  'clinic_receptionist', 'clinic_nurse',
];

const canReadPatientList = (req) => {
  // File 23 §3.3: platform directory is masked by default (no grant can
  // cover a whole list — grants are single-subject).
  if (PLATFORM_DIRECTORY_ROLES.has(req.user.role)) return { ok: true, masked: true };
  if (req.user.role === 'patient') return { ok: true, ownOnly: true };
  if (PATIENT_STAFF_ROLES.includes(req.user.role)) {
    const scope = req.user.hospitalId || req.user.facilityId;
    if (scope) return { ok: true, scope: String(scope) };
  }
  return { ok: false };
};

const canAccessPatientDoc = (req, patient) => {
  if (!patient) return false;
  // File 23 §5.3: platform roles pass only with an approved grant, attached
  // as req.breakGlass by requirePatientGrant before this check runs.
  if (PLATFORM_DIRECTORY_ROLES.has(req.user.role)) return Boolean(req.breakGlass);
  if (req.user.role === 'patient') {
    // The Patient row carries the owning User id in `userId`.
    return Boolean(patient.userId && String(patient.userId) === String(req.user._id || req.user.id));
  }
  if (PATIENT_STAFF_ROLES.includes(req.user.role)) {
    const scope = req.user.hospitalId || req.user.facilityId;
    if (!scope || !patient.hospitalId) return false;
    return String(patient.hospitalId) === String(scope);
  }
  return false;
};

// ─── Get Patients ───────────────────────────────────────────────────────────
router.get('/', protect, async (req, res) => {  try {
    const { page, limit, search, status } = req.query;
    const access = canReadPatientList(req);
    if (!access.ok) {
      return res.status(403).json({ message: 'Not authorized to list patients' });
    }
    const filter = {};
    if (access.ownOnly) {
      filter.userId = req.user._id;
    } else if (access.scope) {
      filter.hospitalId = access.scope;
    }
    if (search) {
      filter.$or = [
        { name: new RegExp(escapeRegex(capSearch(search)), 'i') },
        { disease: new RegExp(escapeRegex(capSearch(search)), 'i') },
        { doctor: new RegExp(escapeRegex(capSearch(search)), 'i') },
        { uhid: new RegExp(escapeRegex(capSearch(search)), 'i') },
      ];
    }
    if (status) filter.status = status;
    const result = await paginatedResults(Patient, filter, { page, limit });
    if (access.masked && Array.isArray(result.data)) result.data = result.data.map(maskPatient);
    else if (access.masked && Array.isArray(result.results)) result.results = result.results.map(maskPatient);
    else {
      // File 13 §13.6: field-level mask for phone/email when the role is
      // outside the clinical allowlist (e.g. accountant, pharmacist).
      const { applyFieldMaskMany } = await import('../lib/fieldMask.js');
      if (Array.isArray(result.data)) result.data = applyFieldMaskMany('Patient', result.data, req.user.role);
      else if (Array.isArray(result.results)) result.results = applyFieldMaskMany('Patient', result.results, req.user.role);
    }
    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// File 22 P1-12: duplicate detection (same phone, or same name+dob/phone
// prefix) + merge tool + ABHA linkage. Declared BEFORE /:id so the literal
// paths are not swallowed as ids.
router.get('/duplicates', protect, async (req, res) => {
  try {
    const access = canReadPatientList(req);
    if (!access.ok) return res.status(403).json({ message: 'Not authorized to list patients' });
    const base = {};
    if (access.scope) base.hospitalId = access.scope;
    const rows = await Patient.find({ ...base, mergedInto: null }).select('_id name phone dateOfBirth uhid').limit(2000).lean();
    const byPhone = {};
    for (const p of rows) {
      const ph = String(p.phone || '').replace(/\D/g, '').slice(-10);
      if (ph.length < 10) continue;
      byPhone[ph] = byPhone[ph] || [];
      byPhone[ph].push(p);
    }
    const groups = Object.values(byPhone).filter((g) => g.length > 1)
      .map((g) => ({ key: `phone:${String(g[0].phone).slice(-10)}`, patients: g }));
    return res.json({ groups });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Merge duplicate INTO :id (survivor). Re-points clinical/financial refs,
// moves flags, marks the duplicate merged (never deleted — audit trail).
// authz: role (front-desk leads; survivor must be unmerged).
router.post('/:id/merge', protect, async (req, res) => {
  try {
    const access = canReadPatientList(req);
    if (!access.ok) return res.status(403).json({ message: 'Not authorized' });
    const { duplicateId } = req.body || {};
    if (!duplicateId || String(duplicateId) === String(req.params.id)) {
      return res.status(400).json({ message: 'duplicateId (≠ survivor) required' });
    }
    const [survivor, dup] = await Promise.all([
      Patient.findById(req.params.id), Patient.findById(duplicateId),
    ]);
    if (!survivor || !dup) return res.status(404).json({ message: 'Patient not found' });
    if (survivor.mergedInto || dup.mergedInto) {
      return res.status(409).json({ message: 'One side is already merged' });
    }
    if (String(survivor.hospitalId) !== String(dup.hospitalId)) {
      return res.status(409).json({ message: 'Cross-hospital merge forbidden' });
    }
    const { default: Appointment } = await import('../models/Appointment.js');
    const { default: Billing } = await import('../models/Billing.js');
    const { default: LabOrder } = await import('../models/LabOrder.js');
    const { default: PharmacyOrder } = await import('../models/PharmacyOrder.js');
    const { default: Encounter } = await import('../models/Encounter.js');
    const { default: PatientFlag } = await import('../models/PatientFlag.js');
    await Promise.all([
      Appointment.updateMany(
        { $or: [{ patientRecordId: dup._id }, { patientId: dup.userId || dup._id }] },
        { $set: { patientRecordId: survivor._id } },
      ).catch(() => null),
      Billing.updateMany({ patientId: dup.userId || dup._id }, { $set: { patientId: survivor.userId || survivor._id } }).catch(() => null),
      LabOrder.updateMany({ patientId: dup.userId || dup._id }, { $set: { patientId: survivor.userId || survivor._id } }).catch(() => null),
      PharmacyOrder.updateMany({ patientId: dup.userId || dup._id }, { $set: { patientId: survivor.userId || survivor._id } }).catch(() => null),
      Encounter.updateMany({ patientId: dup.userId || dup._id }, { $set: { patientId: survivor.userId || survivor._id } }).catch(() => null),
      PatientFlag.updateMany({ patient: dup._id }, { $set: { patient: survivor._id } }).catch(() => null),
    ]);
    dup.mergedInto = survivor._id;
    dup.mergedAt = new Date();
    dup.mergedBy = req.user._id;
    await dup.save();
    await auditLog('patient_merged', req.user._id, { survivor: survivor._id, duplicate: dup._id, ip: req.ip });
    return res.json({ id: String(survivor._id), merged: String(dup._id) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ABHA address linkage (verification happens when ABDM credentials exist;
// until then the address is stored Unverified — never claimed as verified).
router.post('/:id/abha', protect, async (req, res) => {
  try {
    const p = await Patient.findById(req.params.id);
    if (!p) return res.status(404).json({ message: 'Patient not found' });
    if (!canAccessPatientDoc(req, p)) return res.status(403).json({ message: 'Access denied' });
    const { abhaAddress } = req.body || {};
    if (!abhaAddress || !/^[a-zA-Z0-9._-]{3,}@[a-zA-Z]{2,}$/.test(String(abhaAddress))) {
      return res.status(400).json({ message: 'Valid ABHA address required (user@sbx)' });
    }
    p.abhaAddress = String(abhaAddress);
    p.abhaStatus = 'Unverified';
    await p.save();
    await auditLog('abha_linked', req.user._id, { recordId: p._id, ip: req.ip });
    return res.json({ id: String(p._id), abhaAddress: p.abhaAddress, abhaStatus: p.abhaStatus });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/:id', protect, requirePatientGrant, async (req, res) => {
  try {
    const p = await Patient.findById(req.params.id);
    if (!p) return res.status(404).json({ message: 'Patient not found' });
    if (!canAccessPatientDoc(req, p)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(p);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', protect, validate(createPatientSchema), async (req, res) => {
  try {
    // DLB-17: the tenant is the caller's own. `req.body.hospitalId` used to win,
    // so any account could file a patient into ANOTHER hospital's directory.
    const targetHospitalId = req.user.hospitalId || req.user.facilityId || undefined;
    if (!targetHospitalId && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'No hospital scope for this account' });
    }
    // File 22 P0-2: re-registering a blacklisted/deceased identity is blocked.
    // (Brand-new identities have no flags yet, so only linked re-registrations
    // can trip this — checked before the row exists.)
    if (req.body.userId) {
      const { patientHardStop } = await import('./masters.js');
      const { safeFirst } = await import('../lib/approvalWiring.js');
      const stop = await safeFirst(patientHardStop(targetHospitalId, req.body.userId));
      if (stop) return res.status(409).json({ message: `Registration blocked: patient is ${stop}`, code: 'PATIENT_HARD_STOP' });
    }
    const p = await Patient.create({ ...req.body, hospitalId: targetHospitalId });
    await auditLog('create_patient', req.user._id, { recordId: p._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.status(201).json(p);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id', protect, requirePatientGrant, validate(updatePatientSchema), async (req, res) => {
  try {
    const p = await Patient.findById(req.params.id);
    if (!p) return res.status(404).json({ message: 'Patient not found' });
    if (!canAccessPatientDoc(req, p)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    // AUTH-030: allowlisted fields only — uhid/status/tenant linkage immutable here.
    const { pickBody } = await import('../utils/pick.js');
    Object.assign(p, pickBody(req.body, ['name', 'age', 'gender', 'disease', 'doctor', 'phone', 'email', 'address', 'bloodGroup', 'dateOfBirth', 'parentName', 'birthPlace', 'birthRecord', 'deathRecord', 'infectiousDisease']));
    await p.save();
    await auditLog('update_patient', req.user._id, { recordId: p._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json(p);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/:id', protect, requirePatientGrant, async (req, res) => {
  try {
    const p = await Patient.findById(req.params.id);
    if (!p) return res.status(404).json({ message: 'Patient not found' });
    if (!canAccessPatientDoc(req, p)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    await Patient.findByIdAndDelete(req.params.id);
    await auditLog('delete_patient', req.user._id, { recordId: req.params.id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json({ message: 'Patient removed' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Patient Card Data ───────────────────────────────────────────────────────
router.get('/:id/card', protect, requirePatientGrant, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    if (!canAccessPatientDoc(req, patient)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const cardData = {
      patientName: patient.name,
      uhid: patient.uhid,
      age: patient.age,
      gender: patient.gender,
      bloodGroup: patient.bloodGroup,
      phone: patient.phone,
      email: patient.email,
      address: patient.address,
      disease: patient.disease,
      doctor: patient.doctor,
      admitted: patient.admitted,
      status: patient.status,
      allergies: patient.adverseReactions || [],
      generatedAt: new Date(),
    };

    res.json(cardData);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
