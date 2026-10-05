import { sendServerError } from '../utils/safeError.js';
import express from 'express';
import User from '../models/User.js';
import Billing from '../models/Billing.js';
import Appointment from '../models/Appointment.js';
import Hospital from '../models/Hospital.js';
import { getISTDateString } from '../utils/dateUtils.js';
import AuditLog from '../models/AuditLog.js';
import { protect, superadminOnly } from '../middleware/auth.js';
// AUTHZ-M-03 (F7): bulk exports are the data-exfil path - a stolen session
// token must not be enough to pull them.
import { requireStepUp } from '../middleware/stepUpAuth.js';
import { toCsvNative, toCsvFallback, NATIVE_CSV_AVAILABLE } from '../services/napiCsvService.js';

const toCSV = (data, fields) => {
  if (NATIVE_CSV_AVAILABLE) {
    try {
      return toCsvNative(data, fields);
    } catch (e) {
      // Fall through to fallback
    }
  }
  return toCsvFallback(data, fields);
};


const router = express.Router();

// DLB-13: bulk exports were superadmin-gated (correct) but UNBOUNDED and
// UNAUDITED. `User.find({})` / `Billing.find({})` streamed the entire
// collection into memory and returned it as a CSV attachment, so a single request
// was simultaneously a full-database exfiltration and an availability problem on
// a PHI dataset.
//
// The response is now bounded, counted and recorded: a hard row cap, a `truncated`
// flag when the cap bit, and an audit row per export naming WHAT was exported —
// which is also the record a data-protection review needs.
const EXPORT_ROW_CAP = 10000;

const clampExportRows = (rows) => ({
  rows: rows.slice(0, EXPORT_ROW_CAP),
  truncated: rows.length > EXPORT_ROW_CAP,
  available: rows.length,
});

const recordExport = async (req, kind, result, fields) => {
  const { auditLog } = await import('../middleware/audit.js');
  await auditLog('bulk_export', req.user._id, {
    kind,
    rowsReturned: result.rows.length,
    rowsAvailable: result.available,
    truncated: result.truncated,
    columns: fields,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  }).catch(() => {});
  // An export that silently truncates reads as "that was everything". Say so.
  if (result.truncated) {
    // eslint-disable-next-line no-console
    console.warn(`[export] ${kind}: returned ${result.rows.length} of ${result.available} rows (cap ${EXPORT_ROW_CAP}) for ${req.user.id}`);
  }
  return result;
};

// ──────────────────────────────────────────────
// Async export jobs (BullMQ) — POST returns 202 + jobId, poll GET for result.
// Sync GET routes below stay untouched (backward compatible).
// ──────────────────────────────────────────────
const EXPORT_JOB_TYPES = ['users', 'revenue', 'bookings', 'facilities', 'audit'];

router.post('/jobs', protect, superadminOnly, requireStepUp('export:full'), async (req, res) => {
  try {
    const { type, from, to } = req.body || {};
    if (!EXPORT_JOB_TYPES.includes(type)) {
      return res.status(400).json({ message: `type must be one of: ${EXPORT_JOB_TYPES.join(', ')}` });
    }
    const { enqueueExport } = await import('../lib/queues.js');
    const r = await enqueueExport({ type, from, to });
    if (r.queued) return res.status(202).json({ jobId: r.jobId, state: 'queued', type });
    return res.status(503).json({ message: 'Export queue unavailable (REDIS_URL unset) — use the sync GET endpoints instead.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/jobs/:id', protect, superadminOnly, async (req, res) => {
  try {
    const { getJobState, QUEUE_NAMES } = await import('../lib/queues.js');
    const s = await getJobState(QUEUE_NAMES.exports, req.params.id);
    if (!s) return res.status(503).json({ message: 'Queue unavailable' });
    res.json(s);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/users', protect, superadminOnly, requireStepUp('export:full'), async (req, res) => {
  try {
    const users = await User.find({}).select('-password').lean();
    const FIELDS = ['name', 'email', 'role', 'phone', 'status', 'isVerified', 'approvalStatus', 'createdAt'];
    const { rows, truncated } = clampExportRows(users);
    await recordExport(req, 'users', { rows, truncated, available: users.length }, FIELDS);
    const csv = toCSV(rows, FIELDS);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('X-Export-Truncated', String(truncated));
    res.setHeader('X-Export-Rows', String(rows.length));
    res.setHeader('Content-Disposition', `attachment; filename="users-${getISTDateString()}.csv"`);
    res.send(csv);
  } catch (err) { sendServerError(res, err, 'Could not export users'); }
});

router.get('/revenue', protect, superadminOnly, requireStepUp('export:full'), async (req, res) => {
  try {
    const filter = {};
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
    }
    const bills = await Billing.find(filter).populate('patientId', 'name email').lean();
    const FIELDS = ['id', 'patient', 'email', 'amount', 'paid', 'due', 'status', 'createdAt'];
    const all = bills.map(b => ({ id: b._id, patient: b.patientId?.name || '', email: b.patientId?.email || '', amount: b.amount, paid: b.paid, due: b.due, status: b.status, createdAt: b.createdAt }));
    const { rows, truncated } = clampExportRows(all);
    await recordExport(req, 'revenue', { rows, truncated, available: all.length }, FIELDS);
    const csv = toCSV(rows, FIELDS);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('X-Export-Truncated', String(truncated));
    res.setHeader('X-Export-Rows', String(rows.length));
    res.setHeader('Content-Disposition', `attachment; filename="revenue-${getISTDateString()}.csv"`);
    res.send(csv);
  } catch (err) { sendServerError(res, err, 'Could not export revenue'); }
});

router.get('/bookings', protect, superadminOnly, requireStepUp('export:full'), async (req, res) => {
  try {
    const filter = {};
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
    }
    const appointments = await Appointment.find(filter).populate('patientId', 'name').populate('doctorId', 'name').lean();
    const FIELDS = ['id', 'patient', 'doctor', 'date', 'time', 'status', 'type', 'createdAt'];
    const all = appointments.map(a => ({ id: a._id, patient: a.patientId?.name || '', doctor: a.doctorId?.name || '', date: a.date, time: a.timeSlot, status: a.status, type: a.type || 'appointment', createdAt: a.createdAt }));
    const { rows, truncated } = clampExportRows(all);
    await recordExport(req, 'bookings', { rows, truncated, available: all.length }, FIELDS);
    const csv = toCSV(rows, FIELDS);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('X-Export-Truncated', String(truncated));
    res.setHeader('X-Export-Rows', String(rows.length));
    res.setHeader('Content-Disposition', `attachment; filename="bookings-${getISTDateString()}.csv"`);
    res.send(csv);
  } catch (err) { sendServerError(res, err, 'Could not export bookings'); }
});

router.get('/facilities', protect, superadminOnly, requireStepUp('export:full'), async (req, res) => {
  try {
    const hospitals = await Hospital.find({}).lean();
    const FIELDS = ['id', 'name', 'type', 'email', 'phone', 'city', 'status', 'plan', 'createdAt'];
    const all = hospitals.map(h => ({ id: h._id, name: h.name, type: 'hospital', email: h.email, phone: h.phone, city: h.city, status: h.status, plan: h.plan, createdAt: h.createdAt }));
    const { rows, truncated } = clampExportRows(all);
    await recordExport(req, 'facilities', { rows, truncated, available: all.length }, FIELDS);
    const csv = toCSV(rows, FIELDS);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('X-Export-Truncated', String(truncated));
    res.setHeader('X-Export-Rows', String(rows.length));
    res.setHeader('Content-Disposition', `attachment; filename="facilities-${getISTDateString()}.csv"`);
    res.send(csv);
  } catch (err) { sendServerError(res, err, 'Could not export facilities'); }
});

router.get('/audit', protect, superadminOnly, requireStepUp('export:full'), async (req, res) => {
  try {
    const filter = {};
    if (req.query.from || req.query.to) {
      filter.timestamp = {};
      if (req.query.from) filter.timestamp.$gte = new Date(req.query.from);
      if (req.query.to) filter.timestamp.$lte = new Date(req.query.to);
    }
    const logs = await AuditLog.find(filter).populate('userId', 'name email').sort({ timestamp: -1 }).limit(EXPORT_ROW_CAP).lean();
    const FIELDS = ['action', 'user', 'email', 'details', 'ip', 'timestamp'];
    const all = logs.map(l => ({ action: l.action, user: l.userId?.name || '', email: l.userId?.email || '', details: JSON.stringify(l.details), ip: l.ip, timestamp: l.timestamp }));
    const { rows, truncated } = clampExportRows(all);
    await recordExport(req, 'audit', { rows, truncated, available: all.length }, FIELDS);
    const csv = toCSV(rows, FIELDS);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('X-Export-Truncated', String(truncated));
    res.setHeader('X-Export-Rows', String(rows.length));
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${getISTDateString()}.csv"`);
    res.send(csv);
  } catch (err) { sendServerError(res, err, 'Could not export the audit log'); }
});
export default router;
