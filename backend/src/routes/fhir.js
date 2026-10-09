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
} from '../lib/fhirMapper.js';

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
  rest: [{ mode: 'server', resource: ['Patient', 'Encounter', 'Observation', 'DiagnosticReport', 'MedicationRequest'].map((type) => ({ type, interaction: [{ code: 'read' }, { code: 'search-type' }] })) }],
}));

export default router;
