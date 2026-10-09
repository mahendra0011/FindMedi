import express from 'express';
import Location from '../models/Location.js';
import WardType from '../models/WardType.js';
import ReasonCode from '../models/ReasonCode.js';
import PatientFlag from '../models/PatientFlag.js';
import { protect, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../config/logger.js';

// File 13 §13.6: location tree, ward types, reason codes, patient flags.
// Flags `blacklisted`/`deceased` are hard stops enforced at billing +
// appointment time (see billing.js / appointments.js guards).

const router = express.Router();
router.use(protect);

const actorId = (req) => req.user._id ?? req.user.id;
const tenant = (req) => ({ hospitalId: req.user.hospitalId });

// ─── Locations ──────────────────────────────────────────────────────────────
router.get('/locations', authorize('staff:view'), async (req, res) => {
  try {
    const rows = await Location.find({ ...tenant(req), active: true }).sort({ kind: 1, name: 1 }).limit(500).lean();
    // Nest into a tree client-side; server also returns parent map.
    return res.json({ locations: rows });
  } catch (err) {
    logger.error(`Locations error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/locations', authorize('staff:manage'), async (req, res) => {
  try {
    const row = await Location.create({ ...tenant(req), ...req.body });
    return res.status(201).json({ id: String(row._id) });
  } catch (err) {
    logger.error(`Location create error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Ward types ─────────────────────────────────────────────────────────────
router.get('/ward-types', authorize('staff:view'), async (req, res) => {
  try {
    const rows = await WardType.find({ ...tenant(req), active: true }).sort({ name: 1 }).lean();
    return res.json({ wardTypes: rows });
  } catch (err) {
    logger.error(`Ward types error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/ward-types', authorize('staff:manage'), async (req, res) => {
  try {
    const row = await WardType.create({ ...tenant(req), ...req.body });
    return res.status(201).json({ id: String(row._id) });
  } catch (err) {
    logger.error(`Ward type create error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Reason codes ───────────────────────────────────────────────────────────
router.get('/reason-codes', authorize('staff:view'), async (req, res) => {
  try {
    const { module } = req.query;
    const filter = { ...tenant(req), active: true };
    if (module) filter.module = module;
    const rows = await ReasonCode.find(filter).sort({ code: 1 }).limit(300).lean();
    return res.json({ reasonCodes: rows });
  } catch (err) {
    logger.error(`Reason codes error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/reason-codes', authorize('staff:manage'), async (req, res) => {
  try {
    const row = await ReasonCode.create({ ...tenant(req), ...req.body });
    return res.status(201).json({ id: String(row._id) });
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ message: 'Reason code already exists for module' });
    logger.error(`Reason code create error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Patient flags ──────────────────────────────────────────────────────────
router.get('/patient-flags/:patientId', authorize('staff:view'), async (req, res) => {
  try {
    // File 22 P0-2: accept a Patient id OR a User id (admissions, bills and
    // lab orders carry the User id). Same resolution as patientHardStop.
    const ids = [req.params.patientId];
    const { safeFirst } = await import('../lib/approvalWiring.js');
    const { default: Patient } = await import('../models/Patient.js');
    const linked = await safeFirst(Patient.findOne({ userId: req.params.patientId }).select('_id').lean());
    if (linked) ids.push(String(linked._id));
    const rows = await PatientFlag.find({
      ...tenant(req), patient: { $in: ids }, active: true,
    }).sort({ severity: -1 }).lean();
    return res.json({ flags: rows });
  } catch (err) {
    logger.error(`Flags read error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/patient-flags', authorize('staff:manage'), async (req, res) => {
  try {
    const { patient, kind, severity, note } = req.body || {};
    if (!patient || !kind) return res.status(400).json({ message: 'patient + kind required' });
    const row = await PatientFlag.create({
      ...tenant(req), patient, kind, severity: severity || 'warning',
      note: String(note || '').slice(0, 500), createdBy: actorId(req),
    });
    await auditLog('patient_flag_set', actorId(req), { patient, kind, ip: req.ip });
    return res.status(201).json({ id: String(row._id) });
  } catch (err) {
    logger.error(`Flag create error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/patient-flags/:id/clear', authorize('staff:manage'), async (req, res) => {
  try {
    const row = await PatientFlag.findByIdAndUpdate(req.params.id, { $set: { active: false } }, { new: true });
    if (!row) return res.status(404).json({ message: 'Not found' });
    await auditLog('patient_flag_cleared', actorId(req), { flagId: row._id, kind: row.kind, ip: req.ip });
    return res.json({ id: String(row._id), active: false });
  } catch (err) {
    logger.error(`Flag clear error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

/** Hard-stop helper: blacklisted/deceased blocks billing + booking.
 * Accepts a Patient id OR a User id (resolved via Patient.userId). */
export async function patientHardStop(hospitalId, patientOrUserId) {
  if (!patientOrUserId) return null;
  const { default: Patient } = await import('../models/Patient.js');
  const { safeFirst } = await import('../lib/approvalWiring.js');
  const direct = await safeFirst(PatientFlag.findOne({
    hospitalId, patient: patientOrUserId, kind: { $in: ['blacklisted', 'deceased'] }, active: true,
  }).lean());
  if (direct) return direct.kind;
  const linked = await safeFirst(Patient.findOne({ userId: patientOrUserId }).select('_id').lean());
  if (!linked) return null;
  const hit = await safeFirst(PatientFlag.findOne({
    hospitalId, patient: linked._id, kind: { $in: ['blacklisted', 'deceased'] }, active: true,
  }).lean());
  return hit ? hit.kind : null;
}

export default router;
