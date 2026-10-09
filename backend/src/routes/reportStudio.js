import express from 'express';
import ExcelJS from 'exceljs';
import SavedView from '../models/SavedView.js';
import ReportSchedule from '../models/ReportSchedule.js';
import ReportRun from '../models/ReportRun.js';
import { REPORT_CATALOGUE } from '../models/ReportDefinition.js';
import { protect, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { DATASETS } from '../lib/datasets.js';
import { ruleMatches } from '../lib/ruleEngine.js';
import logger from '../config/logger.js';

// File 17 §17.1: curated catalogue, saved views, whitelisted runs + exports,
// schedules (workers/scheduler.js executes due ones). Complements the legacy
// /api/reports center — this studio only queries DATASETS, never ad-hoc.

const router = express.Router();
router.use(protect);

const actorId = (req) => req.user._id ?? req.user.id;
const MAX_ROWS = 5000;

function catalogueFor(role) {
  return REPORT_CATALOGUE.map((r) => ({
    ...r,
    allowed: !r.roles.length || r.roles.includes(role) || ['superadmin', 'hospital_admin'].includes(role),
  }));
}

router.get('/catalogue', authorize('staff:view'), async (req, res) => {
  try {
    return res.json({ reports: catalogueFor(req.user.role) });
  } catch (err) {
    logger.error(`Catalogue error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

function checkAccess(reportKey, role) {
  const def = REPORT_CATALOGUE.find((r) => r.key === reportKey);
  if (!def) return { ok: false, message: 'Unknown report' };
  if (def.roles.length && !def.roles.includes(role) && !['superadmin', 'hospital_admin'].includes(role)) {
    return { ok: false, message: 'Not authorized for this report' };
  }
  return { ok: true, def };
}

async function runReport({ hospitalId, reportKey, filters, columns }) {
  const started = Date.now();
  const def = REPORT_CATALOGUE.find((r) => r.key === reportKey);
  if (!def || !DATASETS[def.dataset]) throw new Error('Unknown report/dataset');
  const rows = await DATASETS[def.dataset].fetch(hospitalId);
  const rule = { groups: filters?.groups || [] };
  const filtered = (rule.groups.length ? rows.filter((r) => ruleMatches(rule, r)) : rows).slice(0, MAX_ROWS);
  const cols = (columns?.length ? columns : DATASETS[def.dataset].fields);
  const projected = filtered.map((r) => Object.fromEntries(cols.map((c) => [c, r[c] ?? ''])));
  return { rows: projected, columns: cols, scanned: rows.length, ms: Date.now() - started };
}

router.post('/:key/run', authorize('staff:view'), async (req, res) => {
  try {
    const access = checkAccess(req.params.key, req.user.role);
    if (!access.ok) return res.status(403).json({ message: access.message });
    let filters = req.body?.filters;
    let columns = req.body?.columns;
    if (req.body?.savedViewId) {
      const view = await SavedView.findById(req.body.savedViewId).lean();
      if (view && view.reportKey === req.params.key) {
        filters = view.filters;
        columns = view.columns;
      }
    }
    const out = await runReport({ hospitalId: req.user.hospitalId, reportKey: req.params.key, filters, columns });
    await ReportRun.create({
      hospitalId: req.user.hospitalId, reportKey: req.params.key, by: actorId(req),
      format: 'json', rowCount: out.rows.length, ms: out.ms,
    }).catch(() => {});
    return res.json(out);
  } catch (err) {
    logger.error(`Report run error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/:key/export', authorize('staff:view'), async (req, res) => {
  try {
    const access = checkAccess(req.params.key, req.user.role);
    if (!access.ok) return res.status(403).json({ message: access.message });
    const format = req.body?.format === 'csv' ? 'csv' : 'xlsx';
    const out = await runReport({
      hospitalId: req.user.hospitalId, reportKey: req.params.key,
      filters: req.body?.filters, columns: req.body?.columns,
    });
    await ReportRun.create({
      hospitalId: req.user.hospitalId, reportKey: req.params.key, by: actorId(req),
      format, rowCount: out.rows.length, ms: out.ms,
    }).catch(() => {});
    if (format === 'csv') {
      const head = out.columns.join(',');
      const lines = out.rows.map((r) => out.columns.map((c) => JSON.stringify(r[c] ?? '')).join(','));
      res.set('Content-Type', 'text/csv');
      res.set('Content-Disposition', `attachment; filename="${req.params.key}.csv"`);
      return res.send([head, ...lines].join('\n'));
    }
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(req.params.key.slice(0, 28));
    ws.addRow(out.columns);
    for (const r of out.rows) ws.addRow(out.columns.map((c) => r[c] ?? ''));
    const buf = await wb.xlsx.writeBuffer();
    res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.set('Content-Disposition', `attachment; filename="${req.params.key}.xlsx"`);
    return res.send(Buffer.from(buf));
  } catch (err) {
    logger.error(`Report export error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Saved views ────────────────────────────────────────────────────────────
router.get('/views', authorize('staff:view'), async (req, res) => {
  try {
    const rows = await SavedView.find({ hospitalId: req.user.hospitalId }).sort({ name: 1 }).limit(100).lean();
    return res.json({ views: rows });
  } catch (err) {
    logger.error(`Views error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/views', authorize('staff:view'), async (req, res) => {
  try {
    const row = await SavedView.create({
      hospitalId: req.user.hospitalId, owner: actorId(req), ...req.body,
    });
    return res.status(201).json({ id: String(row._id) });
  } catch (err) {
    logger.error(`View create error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Schedules ──────────────────────────────────────────────────────────────
router.get('/schedules', authorize('staff:manage'), async (req, res) => {
  try {
    const rows = await ReportSchedule.find({ hospitalId: req.user.hospitalId }).lean();
    return res.json({ schedules: rows });
  } catch (err) {
    logger.error(`Schedules error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/schedules', authorize('staff:manage'), async (req, res) => {
  try {
    const { cron } = req.body || {};
    // Validate cron shape server-side (5-field) so a bad schedule can't wedge the worker.
    const { default: cronLib } = await import('node-cron');
    if (!cron || !cronLib.validate(cron)) return res.status(400).json({ message: 'Valid cron expression required' });
    const row = await ReportSchedule.create({ hospitalId: req.user.hospitalId, ...req.body });
    await auditLog('report_scheduled', actorId(req), { reportKey: row.reportKey, cron, ip: req.ip });
    return res.status(201).json({ id: String(row._id) });
  } catch (err) {
    logger.error(`Schedule create error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.delete('/schedules/:id', authorize('staff:manage'), async (req, res) => {
  try {
    await ReportSchedule.findByIdAndDelete(req.params.id);
    return res.json({ deleted: true });
  } catch (err) {
    logger.error(`Schedule delete error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// Scheduler hook: run one due schedule (also used by workers/scheduler.js).
export async function runScheduleOnce(schedule) {
  const out = await runReport({
    hospitalId: schedule.hospitalId, reportKey: schedule.reportKey,
    filters: null, columns: null,
  });
  await ReportRun.create({
    hospitalId: schedule.hospitalId, reportKey: schedule.reportKey,
    by: null, format: schedule.format || 'xlsx', rowCount: out.rows.length, ms: out.ms,
  }).catch(() => {});
  schedule.lastRunAt = new Date();
  await schedule.save().catch(() => {});
  return { rows: out.rows.length };
}

export { runReport };
export default router;
