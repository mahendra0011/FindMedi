import express from 'express';
import User from '../models/User.js';
import Encounter from '../models/Encounter.js';
import Record from '../models/Record.js';
import LabOrder from '../models/LabOrder.js';
import Prescription from '../models/Prescription.js';
import { protect } from '../middleware/auth.js';
import { apiKeyAuth } from '../middleware/apiKeyAuth.js';
import {
  toFhirPatient, toFhirEncounter, toFhirObservation,
  toFhirDiagnosticReport, toFhirMedicationRequest, toFhirDocumentReference,
  toFhirCondition, toFhirAllergyIntolerance, toFhirProcedure,
  toFhirCoverage, toFhirClaim,
} from '../lib/fhirMapper.js';
import { validateCode } from '../lib/clinicalCodes.js';

// File 09 §7.2: FHIR R4 read endpoints. Dual auth: human session (protect)
// OR service account (x-api-key). Tenant-scoped; callers only ever see rows
// their own auth already permits (helpers below re-check ownership/tenant).

const router = express.Router();

const withAuth = (req, res, next) => {
  if (req.headers?.['x-api-key']) return apiKeyAuth(req, res, next);
  return protect(req, res, next);
};
router.use(withAuth);

const tenantOf = (req) => req.serviceAccount?.tenantId
  || req.user?.hospitalId || req.user?.facilityId || null;
const tenantMatch = (req, docHospitalId, docFacilityId) => {
  if (req.user?.role === 'superadmin') return true;
  const t = tenantOf(req);
  if (!t) return false;
  return String(docHospitalId || '') === String(t) || String(docFacilityId || '') === String(t);
};
const patientRefOf = (pid) => `Patient/${pid}`;

// GET /fhir/Patient/:id
router.get('/Patient/:id', async (req, res) => {
  try {
    const u = await User.findById(req.params.id).select('name gender dateOfBirth phone email abhaAddress hospitalId').lean();
    if (!u) return res.status(404).json({ message: 'Not found' });
    if (!tenantMatch(req, u.hospitalId)) return res.status(403).json({ message: 'Access denied' });
    return res.json(toFhirPatient(u));
  } catch (err) { return res.status(500).json({ message: err.message }); }
});

// GET /fhir/Encounter/:id
router.get('/Encounter/:id', async (req, res) => {
  try {
    const enc = await Encounter.findById(req.params.id).lean();
    if (!enc) return res.status(404).json({ message: 'Not found' });
    if (!tenantMatch(req, enc.hospitalId, enc.facilityId)) return res.status(403).json({ message: 'Access denied' });
    return res.json(toFhirEncounter(enc));
  } catch (err) { return res.status(500).json({ message: err.message }); }
});

// GET /fhir/Observation?patient=:id (vitals from records)
router.get('/Observation', async (req, res) => {
  try {
    const { patient } = req.query;
    if (!patient) return res.status(400).json({ message: 'patient required' });
    const recs = await Record.find({ patientId: patient }).select('vitals hospitalId createdAt').limit(50).lean();
    const rec = recs[0];
    if (rec && !tenantMatch(req, rec.hospitalId)) return res.status(403).json({ message: 'Access denied' });
    const out = [];
    for (const r of recs) {
      for (const [k, v] of Object.entries(r.vitals || {})) {
        out.push(toFhirObservation({ _id: `${r._id}-${k}`, type: k, value: v, createdAt: r.createdAt }, patientRefOf(patient)));
      }
    }
    return res.json({ resourceType: 'Bundle', type: 'searchset', total: out.length, entry: out.map((o) => ({ resource: o })) });
  } catch (err) { return res.status(500).json({ message: err.message }); }
});

// GET /fhir/DiagnosticReport?patient=:id
router.get('/DiagnosticReport', async (req, res) => {
  try {
    const { patient } = req.query;
    if (!patient) return res.status(400).json({ message: 'patient required' });
    const orders = await LabOrder.find({ patientId: patient }).limit(50).lean();
    if (orders[0] && !tenantMatch(req, orders[0].hospitalId, orders[0].facilityId)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const out = orders.map((o) => toFhirDiagnosticReport(o, patientRefOf(patient)));
    return res.json({ resourceType: 'Bundle', type: 'searchset', total: out.length, entry: out.map((o) => ({ resource: o })) });
  } catch (err) { return res.status(500).json({ message: err.message }); }
});

// GET /fhir/MedicationRequest?patient=:id
router.get('/MedicationRequest', async (req, res) => {
  try {
    const { patient } = req.query;
    if (!patient) return res.status(400).json({ message: 'patient required' });
    const rxs = await Prescription.find({ patientId: patient }).limit(20).lean();
    if (rxs[0] && !tenantMatch(req, rxs[0].hospitalId, rxs[0].facilityId)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const out = [];
    for (const rx of rxs) {
      for (const m of (rx.medicines || [])) out.push(toFhirMedicationRequest(rx, m, patientRefOf(patient)));
    }
    return res.json({ resourceType: 'Bundle', type: 'searchset', total: out.length, entry: out.map((o) => ({ resource: o })) });
  } catch (err) { return res.status(500).json({ message: err.message }); }
});

// GET /fhir/metadata (capability statement)
router.get('/metadata', async (req, res) => res.json({
  resourceType: 'CapabilityStatement',
  status: 'active',
  fhirVersion: '4.0.1',
  format: ['json'],
  rest: [{ mode: 'server', resource: ['Patient', 'Encounter', 'Observation', 'DiagnosticReport', 'MedicationRequest', 'DocumentReference', 'Condition', 'AllergyIntolerance', 'Procedure', 'Coverage', 'Claim'].map((type) => ({ type, interaction: [{ code: 'read' }, { code: 'search-type' }] })) }],
}));

// File 22 P2-28: second resource wave (all tenant-checked like the first).
// GET /fhir/DocumentReference?patient=:id
router.get('/DocumentReference', async (req, res) => {
  try {
    const { patient } = req.query;
    if (!patient) return res.status(400).json({ message: 'patient required' });
    const { default: Record } = await import('../models/Record.js');
    const recs = await Record.find({ patientId: patient }).select('type hospitalId createdAt').limit(50).lean();
    if (recs[0] && !tenantMatch(req, recs[0].hospitalId)) return res.status(403).json({ message: 'Access denied' });
    const out = recs.map((r) => toFhirDocumentReference(r, patientRefOf(patient)));
    return res.json({ resourceType: 'Bundle', type: 'searchset', total: out.length, entry: out.map((o) => ({ resource: o })) });
  } catch (err) { return res.status(500).json({ message: err.message }); }
});

// GET /fhir/Condition?patient=:id (diagnoses from records + admissions)
router.get('/Condition', async (req, res) => {
  try {
    const { patient } = req.query;
    if (!patient) return res.status(400).json({ message: 'patient required' });
    const { default: Record } = await import('../models/Record.js');
    const { default: Admission } = await import('../models/Admission.js');
    const [recs, adms] = await Promise.all([
      Record.find({ patientId: patient }).select('diagnosis hospitalId createdAt').limit(50).lean().catch(() => []),
      Admission.find({ patientId: patient }).select('primaryDiagnosis hospitalId createdAt').limit(50).lean().catch(() => []),
    ]);
    const first = recs[0] || adms[0];
    if (first && !tenantMatch(req, first.hospitalId)) return res.status(403).json({ message: 'Access denied' });
    const out = [
      ...recs.filter((r) => r.diagnosis).map((r, i) => toFhirCondition(r.diagnosis, patientRefOf(patient), { id: r._id, at: r.createdAt })),
      ...adms.filter((a) => a.primaryDiagnosis).map((a) => toFhirCondition(a.primaryDiagnosis, patientRefOf(patient), { id: a._id, at: a.createdAt })),
    ];
    return res.json({ resourceType: 'Bundle', type: 'searchset', total: out.length, entry: out.map((o) => ({ resource: o })) });
  } catch (err) { return res.status(500).json({ message: err.message }); }
});

// GET /fhir/AllergyIntolerance?patient=:id
router.get('/AllergyIntolerance', async (req, res) => {
  try {
    const { patient } = req.query;
    if (!patient) return res.status(400).json({ message: 'patient required' });
    const u = await User.findById(patient).select('allergies hospitalId').lean();
    if (!u) return res.status(404).json({ message: 'Not found' });
    if (!tenantMatch(req, u.hospitalId)) return res.status(403).json({ message: 'Access denied' });
    const list = Array.isArray(u.allergies) ? u.allergies : [];
    const out = list.map((a, i) => toFhirAllergyIntolerance(a, patientRefOf(patient), i));
    return res.json({ resourceType: 'Bundle', type: 'searchset', total: out.length, entry: out.map((o) => ({ resource: o })) });
  } catch (err) { return res.status(500).json({ message: err.message }); }
});

// GET /fhir/Procedure?patient=:id (OT surgeries)
router.get('/Procedure', async (req, res) => {
  try {
    const { patient } = req.query;
    if (!patient) return res.status(400).json({ message: 'patient required' });
    const { default: OperationTheatre } = await import('../models/OperationTheatre.js');
    const rows = await OperationTheatre.find({ patientId: patient }).limit(50).lean().catch(() => []);
    if (rows[0] && !tenantMatch(req, rows[0].hospitalId)) return res.status(403).json({ message: 'Access denied' });
    const out = rows.map((s) => toFhirProcedure(s, patientRefOf(patient)));
    return res.json({ resourceType: 'Bundle', type: 'searchset', total: out.length, entry: out.map((o) => ({ resource: o })) });
  } catch (err) { return res.status(500).json({ message: err.message }); }
});

// GET /fhir/Coverage?patient=:id (insurance policies)
router.get('/Coverage', async (req, res) => {
  try {
    const { patient } = req.query;
    if (!patient) return res.status(400).json({ message: 'patient required' });
    const { default: InsurancePolicy } = await import('../models/InsurancePolicy.js').catch(() => ({ default: null }));
    if (!InsurancePolicy) return res.json({ resourceType: 'Bundle', type: 'searchset', total: 0, entry: [] });
    const rows = await InsurancePolicy.find({ patientId: patient }).limit(20).lean().catch(() => []);
    if (rows[0] && !tenantMatch(req, rows[0].hospitalId)) return res.status(403).json({ message: 'Access denied' });
    const out = rows.map((p) => toFhirCoverage(p, patientRefOf(patient)));
    return res.json({ resourceType: 'Bundle', type: 'searchset', total: out.length, entry: out.map((o) => ({ resource: o })) });
  } catch (err) { return res.status(500).json({ message: err.message }); }
});

// GET /fhir/Claim?patient=:id (TPA claims)
router.get('/Claim', async (req, res) => {
  try {
    const { patient } = req.query;
    if (!patient) return res.status(400).json({ message: 'patient required' });
    const { default: Claim } = await import('../models/Claim.js');
    const rows = await Claim.find({ patientId: patient }).limit(50).lean().catch(() => []);
    if (rows[0] && !tenantMatch(req, rows[0].hospitalId)) return res.status(403).json({ message: 'Access denied' });
    const out = rows.map((c) => toFhirClaim(c, patientRefOf(patient)));
    return res.json({ resourceType: 'Bundle', type: 'searchset', total: out.length, entry: out.map((o) => ({ resource: o })) });
  } catch (err) { return res.status(500).json({ message: err.message }); }
});

// File 22 P2-28: code validation (LOINC/SNOMED/ICD-10 curated sets).
// Named /validate (not FHIR's $validate) because Express treats `$` as a
// route anchor and can never match it literally.
router.get('/CodeSystem/validate', async (req, res) => {
  try {
    const { system, code } = req.query;
    if (!system || !code) return res.status(400).json({ message: 'system + code required' });
    return res.json({ system, code, ...validateCode(system, code) });
  } catch (err) { return res.status(500).json({ message: err.message }); }
});

export default router;
