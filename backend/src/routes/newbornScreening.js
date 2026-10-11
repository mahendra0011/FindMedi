import express from 'express';
import { z } from 'zod';
import { protect } from '../middleware/auth.js';
import NewbornScreening from '../models/NewbornScreening.js';
import { BilirubinReading, PhototherapySession } from '../models/BilirubinReading.js';
import { auditLog } from '../middleware/audit.js';
import { validate } from '../utils/validate.js';

const router = express.Router();
router.use(protect);

const PANEL = [
  'TSH', 'G6PD', 'PKU', 'Galactosemia', 'Hemoglobinopathy', 'Biotinidase', 'CAH', 'Hearing'
];

/** Patients read ONLY their own child's records; staff read within hospital. */
const assertPatientAccess = (req, patientId) => {
  if (req.user.role === 'patient') return String(req.user._id) === String(patientId);
  return true;
};

router.get('/patient/:patientId', async (req, res) => {
  try {
    const rows = await NewbornScreening.find({ patientId: req.params.patientId, hospitalId: req.user.hospitalId }).lean();
    res.json({ screenings: rows });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/patient/:patientId', async (req, res) => {
  try {
    const tests = PANEL.map((name) => ({ name, result: '', normal: true, flagged: false }));
    const row = await NewbornScreening.create({
      hospitalId: req.user.hospitalId,
      patientId: req.params.patientId,
      ...req.body,
      tests,
      createdBy: req.user._id,
    });
    res.status(201).json({ screening: row });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/patient/:patientId/result', async (req, res) => {
  try {
    const { testName, result, flagged } = req.body;
    const row = await NewbornScreening.findOneAndUpdate(
      { patientId: req.params.patientId, hospitalId: req.user.hospitalId, 'tests.name': testName },
      { $set: { 'tests.$.result': result, 'tests.$.flagged': flagged, 'tests.$.normal': !flagged } },
      { new: true },
    );
    if (row) {
      const anyFlagged = row.tests.some((t) => t.flagged);
      row.status = anyFlagged ? 'flagged' : 'done';
      await row.save();
    }
    res.json({ screening: row });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Checklist §2: NICU bilirubin chart + phototherapy ──────────────────────
const bilirubinSchema = z.object({
  ageHours: z.number().min(0).max(720),
  totalMgDl: z.number().min(0).max(40),
  directMgDl: z.number().min(0).max(30).optional(),
  method: z.enum(['serum', 'transcutaneous']).optional(),
  phototherapyOn: z.boolean().optional(),
  notes: z.string().trim().max(500).optional(),
}).strict();

// authz: object
router.post('/patient/:patientId/bilirubin', validate(bilirubinSchema), async (req, res) => {
  try {
    if (!assertPatientAccess(req, req.params.patientId)) return res.status(403).json({ message: 'Access denied' });
    const row = await BilirubinReading.create({
      hospitalId: req.user.hospitalId,
      patientId: req.params.patientId,
      ageHours: req.body.ageHours,
      totalMgDl: req.body.totalMgDl,
      directMgDl: req.body.directMgDl,
      method: req.body.method || 'serum',
      phototherapyOn: req.body.phototherapyOn || false,
      notes: req.body.notes || '',
      recordedBy: req.user._id,
    });
    await auditLog('bilirubin_recorded', req.user._id, { recordId: row._id, patientId: String(req.params.patientId), ip: req.ip });
    return res.status(201).json({ reading: row });
  } catch (err) { return res.status(500).json({ message: err.message }); }
});

// authz: object
router.get('/patient/:patientId/bilirubin', async (req, res) => {
  try {
    if (!assertPatientAccess(req, req.params.patientId)) return res.status(403).json({ message: 'Access denied' });
    const readings = await BilirubinReading.find({ patientId: req.params.patientId, hospitalId: req.user.hospitalId })
      .sort({ ageHours: 1 }).limit(500).lean();
    const sessions = await PhototherapySession.find({ patientId: req.params.patientId, hospitalId: req.user.hospitalId })
      .sort({ startedAt: 1 }).limit(50).lean();
    return res.json({ readings, phototherapy: sessions });
  } catch (err) { return res.status(500).json({ message: err.message }); }
});

const photoSchema = z.object({
  indication: z.string().trim().max(500).optional(),
  device: z.string().trim().max(200).optional(),
  eyeProtection: z.boolean().optional(),
}).strict();

// authz: object
router.post('/patient/:patientId/phototherapy/start', validate(photoSchema), async (req, res) => {
  try {
    if (!assertPatientAccess(req, req.params.patientId)) return res.status(403).json({ message: 'Access denied' });
    const open = await PhototherapySession.findOne({ patientId: req.params.patientId, endedAt: null }).lean();
    if (open) return res.status(409).json({ message: 'A phototherapy session is already running', code: 'SESSION_OPEN' });
    const row = await PhototherapySession.create({
      hospitalId: req.user.hospitalId,
      patientId: req.params.patientId,
      indication: req.body.indication || '',
      device: req.body.device || '',
      eyeProtection: req.body.eyeProtection ?? true,
      recordedBy: req.user._id,
    });
    await auditLog('phototherapy_started', req.user._id, { recordId: row._id, patientId: String(req.params.patientId), ip: req.ip });
    return res.status(201).json({ session: row });
  } catch (err) { return res.status(500).json({ message: err.message }); }
});

const stopPhotoSchema = z.object({
  complications: z.string().trim().max(500).optional(),
  escalated: z.boolean().optional(),
}).strict();

// authz: object
router.put('/phototherapy/:id/stop', validate(stopPhotoSchema), async (req, res) => {
  try {
    const row = await PhototherapySession.findById(req.params.id);
    if (!row) return res.status(404).json({ message: 'Session not found' });
    if (!assertPatientAccess(req, row.patientId)) return res.status(403).json({ message: 'Access denied' });
    if (row.endedAt) return res.status(409).json({ message: 'Session already ended' });
    row.endedAt = new Date();
    if (req.body.complications) row.complications = req.body.complications;
    if (req.body.escalated !== undefined) row.escalated = req.body.escalated;
    await row.save();
    await auditLog('phototherapy_stopped', req.user._id, { recordId: row._id, patientId: String(row.patientId), ip: req.ip });
    return res.json({ session: row });
  } catch (err) { return res.status(500).json({ message: err.message }); }
});

export default router;
