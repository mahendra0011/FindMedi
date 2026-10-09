// Export worker: drains findmedi-exports (bulk CSV generation).
// Job data: { type: 'users'|'revenue'|'bookings'|'facilities'|'audit', from?, to? }
// Returns: { filename, base64 } — polled via GET /api/export/jobs/:id.
// Mirrors the sync queries in src/routes/export.js (kept in sync by hand;
// if export.js changes, update processExport below).
// Validation errors are Unrecoverable (no pointless retries).

import logger from '../config/logger.js';
import { QUEUE_NAMES } from '../lib/queues.js';
import { toCsvFallback } from '../services/napiCsvService.js';

const MAX_EXPORT_ROWS = 20000;

let worker = null;

async function processExport(type, { from, to }, UnrecoverableError, jobData) {
  if (type === 'report') {
    // File 22 P2-36: async studio run (needs the full job payload).
    const { runId, hospitalId, reportKey, filters, columns, role } = jobData || {};
    if (!runId) throw new UnrecoverableError('report job missing runId');
    const { default: ReportRun } = await import('../models/ReportRun.js');
    const { REPORT_CATALOGUE } = await import('../models/ReportDefinition.js');
    const { runReport } = await import('../lib/reportRunner.js');
    await ReportRun.findByIdAndUpdate(runId, { $set: { status: 'running' } });
    try {
      const out = await runReport({ hospitalId, reportKey, filters, columns, role, catalog: REPORT_CATALOGUE });
      await ReportRun.findByIdAndUpdate(runId, {
        $set: {
          status: 'done', rowCount: out.rows.length, ms: out.ms,
          result: { columns: out.columns, rows: out.rows.slice(0, 500), truncated: out.rows.length > 500 },
        },
      });
      return { filename: `${reportKey}.json`, rows: out.rows.length, fields: out.columns };
    } catch (e) {
      await ReportRun.findByIdAndUpdate(runId, { $set: { status: 'failed', error: String(e.message || e).slice(0, 500) } });
      throw e;
    }
  }
  const [{ default: User }, { default: Billing }, { default: Appointment },
    { default: Hospital }, { default: AuditLog }] = await Promise.all([
    import('../models/User.js'),
    import('../models/Billing.js'),
    import('../models/Appointment.js'),
    import('../models/Hospital.js'),
    import('../models/AuditLog.js'),
  ]);
  const range = {};
  if (from || to) {
    if (from) range.$gte = new Date(from);
    if (to) range.$lte = new Date(to);
  }
  const hasRange = Object.keys(range).length > 0;

  switch (type) {
    case 'users': {
      const users = await User.find({}).select('-password').lean().limit(MAX_EXPORT_ROWS);
      return {
        filename: 'users.csv',
        rows: users.map((u) => ({ name: u.name, email: u.email, role: u.role, phone: u.phone, status: u.status, isVerified: u.isVerified, approvalStatus: u.approvalStatus, createdAt: u.createdAt })),
        fields: ['name', 'email', 'role', 'phone', 'status', 'isVerified', 'approvalStatus', 'createdAt'],
      };
    }
    case 'revenue': {
      const bills = await Billing.find(hasRange ? { createdAt: range } : {}).populate('patientId', 'name email').lean().limit(MAX_EXPORT_ROWS);
      return {
        filename: 'revenue.csv',
        rows: bills.map((b) => ({ id: b._id, patient: b.patientId?.name || '', email: b.patientId?.email || '', amount: b.amount, paid: b.paid, due: b.due, status: b.status, createdAt: b.createdAt })),
        fields: ['id', 'patient', 'email', 'amount', 'paid', 'due', 'status', 'createdAt'],
      };
    }
    case 'bookings': {
      const appointments = await Appointment.find(hasRange ? { createdAt: range } : {}).populate('patientId', 'name').populate('doctorId', 'name').lean().limit(MAX_EXPORT_ROWS);
      return {
        filename: 'bookings.csv',
        rows: appointments.map((a) => ({ id: a._id, patient: a.patientId?.name || '', doctor: a.doctorId?.name || '', date: a.date, time: a.timeSlot, status: a.status, type: a.type || 'appointment', createdAt: a.createdAt })),
        fields: ['id', 'patient', 'doctor', 'date', 'time', 'status', 'type', 'createdAt'],
      };
    }
    case 'facilities': {
      const hospitals = await Hospital.find({}).lean().limit(MAX_EXPORT_ROWS);
      return {
        filename: 'facilities.csv',
        rows: hospitals.map((h) => ({ id: h._id, name: h.name, type: 'hospital', email: h.email, phone: h.phone, city: h.city, status: h.status, plan: h.plan, createdAt: h.createdAt })),
        fields: ['id', 'name', 'type', 'email', 'phone', 'city', 'status', 'plan', 'createdAt'],
      };
    }
    case 'audit': {
      const logs = await AuditLog.find(hasRange ? { timestamp: range } : {}).populate('userId', 'name email').sort({ timestamp: -1 }).limit(5000).lean();
      return {
        filename: 'audit-logs.csv',
        rows: logs.map((l) => ({ action: l.action, user: l.userId?.name || '', email: l.userId?.email || '', details: JSON.stringify(l.details), ip: l.ip, timestamp: l.timestamp })),
        fields: ['action', 'user', 'email', 'details', 'ip', 'timestamp'],
      };
    }
    default:
      throw new UnrecoverableError(`unknown export type: ${type}`);
  }
}

export async function startExportWorker() {
  if (worker) return worker;
  if (!process.env.REDIS_URL) {
    logger.info('[workers] REDIS_URL unset — export worker not started.');
    return null;
  }
  try {
    const [{ Worker, UnrecoverableError }, { default: IORedis }] = await Promise.all([
      import('bullmq'),
      import('ioredis'),
    ]);
    const connection = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    connection.on('error', (err) => logger.warn(`[workers] export redis error: ${err.message}`));

    worker = new Worker(
      QUEUE_NAMES.exports,
      async (job) => {
        const { type, from, to } = job.data || {};
        if (!type) throw new UnrecoverableError('export job missing type');
        if (type === 'report') {
          // Report jobs return the ledger shape (no CSV base64 needed).
          return processExport(type, {}, UnrecoverableError, job.data);
        }
        const { filename, rows, fields } = await processExport(type, { from, to }, UnrecoverableError);
        const csv = toCsvFallback(rows, fields);
        return { filename, base64: Buffer.from(csv, 'utf8').toString('base64') };
      },
      { connection, concurrency: 2 }
    );
    worker.on('completed', (job) => logger.info(`[workers] export done (job ${job.id})`));
    worker.on('failed', (job, err) =>
      logger.warn(`[workers] export job ${job?.id} attempt ${job?.attemptsMade} failed: ${err.message}`)
    );
    worker.on('error', (err) => logger.warn(`[workers] export worker error: ${err.message}`));
    logger.info('[workers] export worker started (concurrency 2).');
    return worker;
  } catch (err) {
    logger.warn(`[workers] export worker not started: ${err.message}`);
    return null;
  }
}

/**
 * File 22 P2-36: inline report execution (no-Redis fail-soft path).
 * Same code as the worker, minus BullMQ — errors land in the ledger.
 */
export async function executeReportJob(payload) {
  class InlineUnrecoverable extends Error {}
  return processExport('report', {}, InlineUnrecoverable, payload);
}

export async function stopExportWorker() {  if (!worker) return;
  try { await worker.close(); } catch {}
  worker = null;
}
