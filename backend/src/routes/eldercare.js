import express from 'express';
import ElderResident from '../models/ElderResident.js';
import { protect, authorize } from '../middleware/auth.js';
import {
  validate,
  createElderResidentSchema,
  addElderMedicationSchema,
  logElderAdministrationSchema,
} from '../utils/validate.js';
import { bookingLimiter } from '../middleware/rateLimit.js';
import { idempotencyGuard } from '../middleware/idempotency.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../config/logger.js';

// Elder-care home: resident roster + Medication Administration Record.
// Tenant-scoped everywhere; administrations bounded to the latest 500 rows
// per resident ($slice on push) so multi-year stays never bloat a document.

const router = express.Router();
router.use(protect);

const actorId = (req) => req.user._id ?? req.user.id;
const tenantFilter = (req) => (req.user.role === 'superadmin' && !req.user.hospitalId
  ? {} : { hospitalId: req.user.hospitalId });

const OBJECT_ID = /^[0-9a-f]{24}$/i;
const requireObjectId = (req, res, next) => (
  OBJECT_ID.test(String(req.params.id))
    ? next()
    : res.status(404).json({ message: 'Not found' })
);

const dayKey = (d) => new Date(d).toISOString().slice(0, 10);

// authz: role
router.get('/residents', authorize('records:read', 'nursing:read'), async (req, res) => {
  try {
    const filter = { ...tenantFilter(req) };
    if (req.query.status) filter.status = req.query.status;
    const rows = await ElderResident.find(filter)
      .select('-administrations')
      .sort({ room: 1, bed: 1, name: 1 })
      .limit(200)
      .lean();
    return res.json({ residents: rows });
  } catch (err) {
    logger.error(`Elder residents error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: role
router.post('/residents', authorize('records:write', 'nursing:write'), bookingLimiter, idempotencyGuard({ prefix: 'elder-resident' }), validate(createElderResidentSchema), async (req, res) => {
  try {
    const row = await ElderResident.create({ ...req.body, ...tenantFilter(req), status: 'active' });
    await auditLog('elder_resident_created', actorId(req), { residentId: row._id, ip: req.ip });
    return res.status(201).json({ resident: row });
  } catch (err) {
    logger.error(`Elder resident create error: ${err.message}`);
    return res.status(400).json({ message: err.message });
  }
});

// authz: role
router.get('/residents/:id', authorize('records:read', 'nursing:read'), requireObjectId, async (req, res) => {
  try {
    const row = await ElderResident.findOne({ _id: req.params.id, ...tenantFilter(req) }).lean();
    if (!row) return res.status(404).json({ message: 'Not found' });
    return res.json({ resident: row });
  } catch (err) {
    logger.error(`Elder resident get error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: role
router.post('/residents/:id/medications', authorize('records:write', 'nursing:write'), requireObjectId, bookingLimiter, idempotencyGuard({ prefix: 'elder-medication' }), validate(addElderMedicationSchema), async (req, res) => {
  try {
    const row = await ElderResident.findOneAndUpdate(
      { _id: req.params.id, ...tenantFilter(req), status: 'active' },
      { $push: { medications: { ...req.body, active: true } } },
      { new: true, runValidators: true },
    );
    if (!row) return res.status(404).json({ message: 'Not found' });
    await auditLog('elder_medication_added', actorId(req), {
      residentId: row._id, medicationId: req.body.medicationId, ip: req.ip,
    });
    return res.status(201).json({ resident: row });
  } catch (err) {
    logger.error(`Elder medication error: ${err.message}`);
    return res.status(400).json({ message: err.message });
  }
});

// authz: role
router.post('/residents/:id/administrations', authorize('records:write', 'nursing:write'), requireObjectId, bookingLimiter, idempotencyGuard({ prefix: 'elder-mar' }), validate(logElderAdministrationSchema), async (req, res) => {
  try {
    const row = await ElderResident.findOne({ _id: req.params.id, ...tenantFilter(req) });
    if (!row) return res.status(404).json({ message: 'Not found' });
    const med = (row.medications || []).find((m) => String(m.medicationId) === String(req.body.medicationId) && m.active !== false);
    if (!med) {
      return res.status(409).json({ message: 'Medication is not on the active chart', code: 'MED_NOT_CHARTED' });
    }
    // No double-logging the same dose: one administration per medication per
    // calendar day (a retried POST replays instead of duplicating).
    const day = dayKey(req.body.scheduledFor);
    const dupe = (row.administrations || []).some(
      (a) => String(a.medicationId) === String(req.body.medicationId) && dayKey(a.scheduledFor) === day,
    );
    if (dupe) {
      return res.status(409).json({ message: 'Dose already logged for this day', code: 'DOSE_ALREADY_LOGGED' });
    }
    await ElderResident.updateOne(
      { _id: row._id },
      {
        $push: {
          administrations: {
            $each: [{
              medicationId: req.body.medicationId,
              scheduledFor: new Date(req.body.scheduledFor),
              givenAt: req.body.status === 'given' ? new Date() : null,
              status: req.body.status,
              givenBy: actorId(req),
              note: (req.body.note || '').slice(0, 500),
            }],
            $slice: -500,
          },
        },
      },
    );
    await auditLog('elder_dose_logged', actorId(req), {
      residentId: row._id, medicationId: req.body.medicationId, status: req.body.status, ip: req.ip,
    });
    const fresh = await ElderResident.findById(row._id).lean();
    return res.status(201).json({ resident: fresh });
  } catch (err) {
    logger.error(`Elder administration error: ${err.message}`);
    return res.status(400).json({ message: err.message });
  }
});

// authz: role
router.get('/residents/:id/due', authorize('records:read', 'nursing:read'), requireObjectId, async (req, res) => {
  try {
    const row = await ElderResident.findOne({ _id: req.params.id, ...tenantFilter(req) }).lean();
    if (!row) return res.status(404).json({ message: 'Not found' });
    const today = dayKey(new Date());
    const loggedToday = new Set(
      (row.administrations || [])
        .filter((a) => dayKey(a.scheduledFor) === today)
        .map((a) => String(a.medicationId)),
    );
    const due = (row.medications || [])
      .filter((m) => m.active !== false)
      .filter((m) => !loggedToday.has(String(m.medicationId)))
      .map((m) => ({ medicationId: m.medicationId, name: m.name, dose: m.dose, times: m.times || [] }));
    return res.json({ residentId: String(row._id), date: today, due });
  } catch (err) {
    logger.error(`Elder due error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
