import { sendServerError } from '../utils/safeError.js';
import express from 'express';
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
    } catch {
      // Fall through to fallback
    }
  }
  return toCsvFallback(data, fields);
};


const router = express.Router();

// Identified user, financial and booking exports are disabled until the DPO
// artifact workflow can guarantee de-identification, protected delivery and purge.
const EXPORT_ROW_CAP = 10000;

const clampExportRows = (rows) => ({
  rows: rows.slice(0, EXPORT_ROW_CAP),
  truncated: rows.length > EXPORT_ROW_CAP,
  available: rows.length,
});

const recordExport = async (req, kind, result, fields) => {
  const { auditLogRequired } = await import('../middleware/audit.js');
  await auditLogRequired('bulk_export', req.user._id, {
    kind,
    rowsReturned: result.rows.length,
    rowsAvailable: result.available,
    truncated: result.truncated,
    columns: fields,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
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

router.post('/jobs', protect, superadminOnly, requireStepUp('export:full', { requireEnrolled: true }), async (req, res) => {
  try {
    const { type, from, to } = req.body || {};
    if (!EXPORT_JOB_TYPES.includes(type)) {
      return res.status(400).json({ message: `type must be one of: ${EXPORT_JOB_TYPES.join(', ')}` });
    }
    if (type === 'users') {
      return res.status(503).json({ message: 'Identified user export is disabled until the DPO-protected artifact workflow is available' });
    }
    if (['revenue', 'bookings'].includes(type)) {
      return res.status(503).json({ message: 'Identified financial/booking exports are disabled until the DPO-protected de-identification and artifact workflow is available' });
    }
    const { auditLogRequired } = await import('../middleware/audit.js');
    await auditLogRequired('bulk_export_job_requested', req.user._id, { type, from, to, ip: req.ip, userAgent: req.get('user-agent') });
    const { enqueueExport } = await import('../lib/queues.js');
    const r = await enqueueExport({ type, from, to });
    if (r.queued) return res.status(202).json({ jobId: r.jobId, state: 'queued', type });
    return res.status(503).json({ message: 'Export queue unavailable (REDIS_URL unset) — use the sync GET endpoints instead.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/jobs/:id', protect, superadminOnly, requireStepUp('export:full', { requireEnrolled: true }), async (req, res) => {
  try {
    const { getJobState, QUEUE_NAMES } = await import('../lib/queues.js');
    const s = await getJobState(QUEUE_NAMES.exports, req.params.id);
    if (!s) return res.status(503).json({ message: 'Queue unavailable' });
    if (s.state === 'completed' && s.result) {
      const { auditLogRequired } = await import('../middleware/audit.js');
      await auditLogRequired('bulk_export_job_downloaded', req.user._id, { jobId: req.params.id, ip: req.ip, userAgent: req.get('user-agent') });
    }
    res.json(s);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/users', protect, superadminOnly, requireStepUp('export:full', { requireEnrolled: true }), async (_req, res) => {
  return res.status(503).json({ message: 'Identified user export is disabled until the DPO-protected artifact workflow is available' });
});

router.get('/revenue', protect, superadminOnly, requireStepUp('export:full', { requireEnrolled: true }), async (_req, res) => {
  return res.status(503).json({ message: 'Identified revenue export is disabled until the DPO-protected de-identification and artifact workflow is available' });
});

router.get('/bookings', protect, superadminOnly, requireStepUp('export:full', { requireEnrolled: true }), async (_req, res) => {
  return res.status(503).json({ message: 'Identified booking export is disabled until the DPO-protected de-identification and artifact workflow is available' });
});

router.get('/facilities', protect, superadminOnly, requireStepUp('export:full', { requireEnrolled: true }), async (req, res) => {
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

router.get('/audit', protect, superadminOnly, requireStepUp('export:full', { requireEnrolled: true }), async (req, res) => {
  try {
    const filter = {};
    if (req.query.from || req.query.to) {
      filter.timestamp = {};
      if (req.query.from) filter.timestamp.$gte = new Date(req.query.from);
      if (req.query.to) filter.timestamp.$lte = new Date(req.query.to);
    }
    const logs = await AuditLog.find(filter).sort({ timestamp: -1 }).limit(EXPORT_ROW_CAP).lean();
    const FIELDS = ['actorId', 'action', 'details', 'ip', 'timestamp'];
    const all = logs.map(l => ({ actorId: String(l.userId || ''), action: l.action, details: JSON.stringify(l.details), ip: l.ip, timestamp: l.timestamp }));
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
