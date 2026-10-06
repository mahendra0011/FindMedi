import express from 'express';
import { z } from 'zod';
import Triage from '../models/Triage.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { validate, createTriageSchema, triageVitalsSchema } from '../utils/validate.js';
import { generateEmergencyId, generateMLCNumber } from '../utils/idGenerator.js';
import { escapeRegex, capSearch } from '../utils/escapeRegex.js';

// P3 + P1 #6: explicit allowlist matching pickBody() in the PUT handler —
// unknown keys are stripped by zod, so the schema itself enforces the same
// list the handler picks (defense in depth). Values are now TYPE-checked
// against the model: enums mirror models/Triage.js, text fields are bounded,
// and vitals uses the shared number|string shape (the form submits strings).
const triageUpdateSchema = z.object({
  patientName: z.string().trim().min(1).max(200).optional(),
  age: z.union([z.number().int().nonnegative().max(150), z.string().max(10)]).optional(),
  gender: z.string().trim().max(40).optional(),
  phone: z.string().trim().max(30).optional(),
  arrivalMode: z.enum(['Walk-in', 'Ambulance', 'Police', 'Referral']).optional(),
  broughtBy: z.string().trim().max(200).optional(),
  chiefComplaint: z.string().trim().min(1).max(1000).optional(),
  triageLevel: z.enum(['P1-Immediate', 'P2-Urgent', 'P3-Less Urgent', 'P4-Non Urgent', 'P5-Deceased']).optional(),
  triageNotes: z.string().max(4000).optional(),
  vitals: triageVitalsSchema.optional(),
  referredTo: z.string().trim().max(200).optional(),
  referredReason: z.string().trim().max(1000).optional(),
  // The UI's Discharge button IS this endpoint (TriagePage dischargeMut) —
  // there is no dedicated status route, so the old comment ("status has a
  // dedicated endpoint") was wrong and zod's strip silently ate the action:
  // the request returned 200 having changed nothing. adminOnly + the model's
  // own enum keep it as tight as the dedicated route the comment assumed.
  status: z.enum(['In Treatment', 'Admitted', 'Referred', 'Discharged', 'DOD']).optional(),
  dischargedAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'dischargedAt must be a valid date').optional(),
});
const triageAssignSchema = z.object({ doctorId: z.string().optional(), doctorName: z.string().optional() });
// P1-5: strict shape matching models/Triage.js `mlc.type`. Zod strips unknown
// keys, so a client cannot smuggle privileged fields into the subdoc.
const mlcTypeSchema = z.object({
  caseType: z.string().max(160).optional(),
  policeStation: z.string().max(240).optional(),
  policeOfficer: z.string().max(240).optional(),
  officerPhone: z.string().max(30).optional(),
  firNumber: z.string().max(120).optional(),
  notes: z.string().max(4000).optional(),
  reportedAt: z.string().optional(),
});
const triageMlcSchema = z.object({ type: mlcTypeSchema.optional() });
const triageNoteSchema = z.object({ text: z.string().min(1) });

const router = express.Router();

router.post('/', protect, adminOnly, validate(createTriageSchema), async (req, res) => {
  try {
    const { patientName, age, gender, phone, arrivalMode, broughtBy, chiefComplaint, triageLevel, triageNotes, vitals, isMLCO, patientId } = req.body;
    if (!patientName || !chiefComplaint || !triageLevel) {
      return res.status(400).json({ message: 'Patient name, chief complaint, and triage level required' });
    }
    const emergencyId = generateEmergencyId();
    const entry = await Triage.create({
      emergencyId, patientName, age, gender, phone, patientId,
      hospitalId: req.user.hospitalId || undefined,
      arrivalMode: arrivalMode || 'Walk-in', broughtBy: broughtBy || '',
      chiefComplaint, triageLevel, triageNotes: triageNotes || '',
      triagedBy: req.user._id, triagedAt: new Date(),
      vitals: vitals || {}, isMLCO: isMLCO || false, createdBy: req.user._id,
    });
    if (['P1-Immediate', 'P2-Urgent'].includes(triageLevel)) {
      const doctors = await User.find({ role: 'doctor', status: 'active' }).select('_id');
      await Notification.insertMany(doctors.map(doc => ({
        title: `🚨 ${triageLevel} Emergency`, message: `${patientName} - ${chiefComplaint}`,
        type: 'emergency', userId: doc._id.toString(),
      })));
    }
    res.status(201).json(entry);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/', protect, async (req, res) => {
  try {
    const { status, triageLevel, search } = req.query;
    const filter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if (status && status !== 'All') filter.status = status;
    if (triageLevel && triageLevel !== 'All') filter.triageLevel = triageLevel;
    if (search) {
      filter.$or = [
        { emergencyId: new RegExp(escapeRegex(capSearch(search)), 'i') },
        { patientName: new RegExp(escapeRegex(capSearch(search)), 'i') },
        { chiefComplaint: new RegExp(escapeRegex(capSearch(search)), 'i') },
        { mlcNumber: new RegExp(escapeRegex(capSearch(search)), 'i') },
      ];
    }
    const entries = await Triage.find(filter).populate('triagedBy', 'name').sort({ createdAt: -1 });
    res.json({ entries });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const entry = await Triage.findById(req.params.id).populate('triagedBy', 'name').populate('assignedDoctor', 'name');
    if (!entry) return res.status(404).json({ message: 'Entry not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && entry.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(entry);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id', protect, adminOnly, validate(triageUpdateSchema), async (req, res) => {
  try {
    const entry = await Triage.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Entry not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && entry.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    // AUTH-030: allowlisted fields only — assign/mlc/notes have dedicated
    // endpoints; status/dischargedAt are here because the Discharge button
    // sends them to THIS route (see triageUpdateSchema).
    const { pickBody } = await import('../utils/pick.js');
    Object.assign(entry, pickBody(req.body, ['patientName', 'age', 'gender', 'phone', 'arrivalMode', 'broughtBy', 'chiefComplaint', 'triageLevel', 'triageNotes', 'vitals', 'referredTo', 'referredReason', 'status', 'dischargedAt']));
    await entry.save();
    res.json(entry);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id/assign', protect, adminOnly, validate(triageAssignSchema), async (req, res) => {
  try {
    const { doctorId, doctorName } = req.body;
    const entry = await Triage.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Entry not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && entry.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    entry.assignedDoctor = doctorId;
    entry.assignedDoctorName = doctorName;
    await entry.save();
    if (!entry) return res.status(404).json({ message: 'Entry not found' });
    res.json(entry);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id/mlc', protect, adminOnly, validate(triageMlcSchema), async (req, res) => {
  try {
    const entry = await Triage.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Entry not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && entry.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const mlcNumber = entry.mlcNumber || generateMLCNumber();
    entry.isMLCO = true; entry.mlcNumber = mlcNumber;
    // P1-5: reportedAt lives INSIDE mlc.type (see the model) and is stamped
    // server-side; only the validated type shape from the client is accepted.
    entry.mlc = { type: { ...req.body.type, reportedAt: new Date() } };
    await entry.save();
    res.json(entry);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.post('/:id/notes', protect, adminOnly, validate(triageNoteSchema), async (req, res) => {
  try {
    const entry = await Triage.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Entry not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && entry.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    entry.treatmentNotes.push({ text: req.body.text, doctorName: req.user.name, timestamp: new Date() });
    await entry.save();
    res.json(entry);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/stats/main', protect, async (req, res) => {
  try {
    const hFilter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') hFilter.hospitalId = req.user.hospitalId;
    const total = await Triage.countDocuments(hFilter);
    const immediate = await Triage.countDocuments({ ...hFilter, triageLevel: 'P1-Immediate', status: { $ne: 'Discharged' } });
    const urgent = await Triage.countDocuments({ ...hFilter, triageLevel: 'P2-Urgent', status: { $ne: 'Discharged' } });
    const lessUrgent = await Triage.countDocuments({ ...hFilter, triageLevel: 'P3-Less Urgent', status: { $ne: 'Discharged' } });
    const active = await Triage.countDocuments({ ...hFilter, status: 'In Treatment' });
    const today = await Triage.countDocuments({ ...hFilter, createdAt: { $gte: new Date().setHours(0,0,0,0) } });
    const mlc = await Triage.countDocuments({ ...hFilter, isMLCO: true });
    res.json({ total, immediate, urgent, lessUrgent, active, today, mlc });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;