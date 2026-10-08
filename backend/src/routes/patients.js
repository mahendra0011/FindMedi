import { escapeRegex, capSearch } from '../utils/escapeRegex.js';
import express from 'express';
import Patient from '../models/Patient.js';
import { protect } from '../middleware/auth.js';
import { validate, createPatientSchema, updatePatientSchema } from '../utils/validate.js';
import { auditLog } from '../middleware/audit.js';
import { paginatedResults } from '../utils/pagination.js';

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
];

const canReadPatientList = (req) => {
  if (req.user.role === 'superadmin') return { ok: true };
  if (req.user.role === 'patient') return { ok: true, ownOnly: true };
  if (PATIENT_STAFF_ROLES.includes(req.user.role)) {
    const scope = req.user.hospitalId || req.user.facilityId;
    if (scope) return { ok: true, scope: String(scope) };
  }
  return { ok: false };
};

const canAccessPatientDoc = (req, patient) => {
  if (!patient) return false;
  if (req.user.role === 'superadmin') return true;
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
router.get('/', protect, async (req, res) => {
  try {
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
    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/:id', protect, async (req, res) => {
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
    const p = await Patient.create({ ...req.body, hospitalId: targetHospitalId });
    await auditLog('create_patient', req.user._id, { recordId: p._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.status(201).json(p);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id', protect, validate(updatePatientSchema), async (req, res) => {
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

router.delete('/:id', protect, async (req, res) => {
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
router.get('/:id/card', protect, async (req, res) => {
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
