import express from 'express';
import nodeCrypto from 'crypto';
import Rule from '../models/Rule.js';
import RuleFiring from '../models/RuleFiring.js';
import WorkTask from '../models/WorkTask.js';
import { protect, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { DATASETS, datasetNames } from '../lib/datasets.js';
import { ruleMatches, get } from '../lib/ruleEngine.js';
import logger from '../config/logger.js';

// File 13 §13.3 (WorkTask) + §13.5 (rules: CRUD, test-fire, backtest, sweep).
// Rule actions: alert | task | webhook-log. Dedup by hash(rule+entity+day).

const router = express.Router();
router.use(protect);

const actorId = (req) => req.user._id ?? req.user.id;
const tenantFilter = (req) => (req.user.role === 'superadmin' && !req.user.hospitalId
  ? {} : { hospitalId: req.user.hospitalId });

router.get('/datasets', authorize('staff:manage'), (req, res) => res.json({ datasets: datasetNames() }));

// ─── Rules ──────────────────────────────────────────────────────────────────
router.get('/rules', authorize('staff:manage'), async (req, res) => {
  try {
    const rows = await Rule.find(tenantFilter(req)).sort({ key: 1 }).limit(200).lean();
    return res.json({ rules: rows });
  } catch (err) {
    logger.error(`Rules list error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/rules', authorize('staff:manage'), async (req, res) => {
  try {
    const { key, name, dataset, groups, actions, cooldownMinutes, schedule } = req.body || {};
    if (!key || !dataset || !DATASETS[dataset]) {
      return res.status(400).json({ message: 'key + whitelisted dataset required' });
    }
    const row = await Rule.create({
      hospitalId: req.user.hospitalId, key, name: name || key, dataset,
      groups: groups || [], actions: actions || { type: 'alert', severity: 'warning' },
      cooldownMinutes: cooldownMinutes ?? 1440, schedule: schedule || '15m',
      createdBy: actorId(req),
    });
    return res.status(201).json({ id: String(row._id) });
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ message: 'Rule key already exists' });
    logger.error(`Rule create error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// File 22 P0-10: seed the dataset-migratable clinical rules (idempotent by
// key). Manual triggers (code-blue/lab-panic/MTP buttons) are NOT dataset
// rules — they flow through raiseAlert() with the same rule keys instead.
router.post('/rules/seed-clinical', authorize('staff:manage'), async (req, res) => {
  try {
    const seeds = [
      {
        key: 'lab-critical-values',
        name: 'Critical lab values → page ordering doctor',
        dataset: 'lab_critical',
        groups: [[{ field: 'status', op: '=', value: 'Ordered' }]],
        actions: { type: 'task', severity: 'critical', roleQueue: 'doctor', priority: 'P0' },
        cooldownMinutes: 60,
      },
      {
        key: 'unpaid-ar-spike',
        name: 'Unpaid bills piling up',
        dataset: 'bills_unpaid',
        groups: [[{ field: 'status', op: '=', value: 'Overdue' }]],
        actions: { type: 'alert', severity: 'warning' },
        cooldownMinutes: 1440,
      },
    ];
    // Placeholder keys so the manual-trigger ledger never dangles: firing
    // rows reference these when a human presses the button.
    const placeholders = [
      { key: 'code-blue', name: 'Code blue (manual trigger)', dataset: 'ops_snapshot', groups: [], enabled: false, actions: { type: 'alert', severity: 'critical' } },
      { key: 'lab-panic', name: 'Lab panic (manual trigger)', dataset: 'ops_snapshot', groups: [], enabled: false, actions: { type: 'alert', severity: 'critical' } },
      { key: 'mtp', name: 'MTP activation (manual trigger)', dataset: 'ops_snapshot', groups: [], enabled: false, actions: { type: 'alert', severity: 'critical' } },
    ];
    const created = [];
    for (const s of [...seeds, ...placeholders]) {
      const exists = await Rule.findOne({ hospitalId: req.user.hospitalId, key: s.key });
      if (!exists) {
        // eslint-disable-next-line no-await-in-loop
        await Rule.create({ hospitalId: req.user.hospitalId, ...s, createdBy: actorId(req) });
        created.push(s.key);
      }
    }
    await auditLog('clinical_rules_seeded', actorId(req), { created, ip: req.ip });
    return res.status(201).json({ created });
  } catch (err) {
    logger.error(`Seed clinical rules error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.patch('/rules/:id', authorize('staff:manage'), async (req, res) => {
  try {
    const row = await Rule.findByIdAndUpdate(req.params.id,
      { $set: { ...req.body, hospitalId: undefined } }, { new: true });
    if (!row) return res.status(404).json({ message: 'Not found' });
    await auditLog('rule_updated', actorId(req), { ruleId: row._id, key: row.key, ip: req.ip });
    return res.json({ id: String(row._id), enabled: row.enabled });
  } catch (err) {
    logger.error(`Rule patch error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

function dedupHash(ruleId, row) {
  const idPart = row?._id ? String(row._id) : JSON.stringify(row).slice(0, 120);
  return nodeCrypto.createHash('sha256')
    .update(`${ruleId}:${idPart}:${new Date().toISOString().slice(0, 10)}`).digest('hex').slice(0, 32);
}

async function executeActions(rule, row, hospitalId) {
  const a = rule.actions || { type: 'alert' };
  const entityRef = { model: String(rule.dataset), id: row?._id || null };
  const hash = dedupHash(rule._id, row);
  const since = new Date(Date.now() - (rule.cooldownMinutes || 1440) * 60000);
  const dup = await RuleFiring.findOne({ ruleId: rule._id, dedupHash: hash, firedAt: { $gte: since } });
  if (dup) {
    await RuleFiring.create({
      hospitalId, ruleId: rule._id, dedupHash: `${hash}-suppressed`, entityRef, status: 'suppressed',
    }).catch(() => {});
    return { action: a.type, result: 'suppressed' };
  }
  await RuleFiring.create({ hospitalId, ruleId: rule._id, dedupHash: hash, entityRef, status: 'fired' });
  const label = `${rule.name}: ${row?.invoiceId || row?.patientName || row?.patient || row?._id || ''}`;
  if (a.type === 'task') {
    await WorkTask.create({
      hospitalId, title: label.slice(0, 200), detail: `Rule ${rule.key} fired`,
      entityRef, roleQueue: a.roleQueue || '', priority: a.priority || 'P1', tags: ['rule', rule.key],
    });
    // Tasks for critical rules also raise the realtime alert (same doorway).
    if (a.severity === 'critical') {
      const { raiseAlert } = await import('../lib/alerts.js');
      await raiseAlert({ hospitalId, severity: 'critical', message: label, entityRef, ruleKey: rule.key });
    }
    return { action: 'task', result: 'created' };
  }
  if (a.type === 'webhook-log') {
    const { default: IntegrationMessage } = await import('../models/IntegrationMessage.js').catch(() => ({}));
    if (IntegrationMessage?.create) {
      await IntegrationMessage.create({
        hospitalId, direction: 'out', integrationKey: a.integrationKey || 'rule-webhook',
        payload: { rule: rule.key, row }, status: 'queued',
      }).catch(() => {});
    }
    return { action: 'webhook-log', result: 'queued' };
  }
  // File 22 P0-10: all rule alerts go through the single doorway (persist +
  // `dashboard:alert` socket push, never one without the other).
  const { raiseAlert } = await import('../lib/alerts.js');
  await raiseAlert({
    hospitalId, severity: a.severity || 'warning', message: label, entityRef, ruleKey: rule.key,
  });
  return { action: 'alert', result: 'raised' };
}

// Test-fire: evaluate against live dataset WITHOUT side effects.
router.post('/rules/:id/test', authorize('staff:manage'), async (req, res) => {
  try {
    const rule = await Rule.findById(req.params.id).lean();
    if (!rule) return res.status(404).json({ message: 'Not found' });
    const rows = await DATASETS[rule.dataset].fetch(req.user.hospitalId);
    const matched = rows.filter((r) => ruleMatches(rule, r)).slice(0, 20);
    return res.json({ scanned: rows.length, matched: matched.length, sample: matched.slice(0, 5) });
  } catch (err) {
    logger.error(`Rule test error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// Backtest: evaluate over the trailing N days (bounded samples for honesty).
router.post('/rules/backtest', authorize('staff:manage'), async (req, res) => {
  try {
    const { dataset, groups, limit } = req.body || {};
    if (!dataset || !DATASETS[dataset]) return res.status(400).json({ message: 'whitelisted dataset required' });
    const rows = await DATASETS[dataset].fetch(req.user.hospitalId);
    const rule = { groups: groups || [] };
    const matched = rows.filter((r) => ruleMatches(rule, r));
    return res.json({ scanned: rows.length, wouldFire: matched.length, sample: matched.slice(0, Number(limit) || 10) });
  } catch (err) {
    logger.error(`Rule backtest error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// Sweep core (exported for workers/scheduler.js): fire enabled rules once.
export async function sweepRulesTenant(hospitalId) {
  const rules = await Rule.find({ hospitalId, enabled: true }).limit(100).lean();
  let fired = 0;
  const results = [];
  for (const rule of rules) {
    if (!DATASETS[rule.dataset]) continue;
    try {
      const rows = await DATASETS[rule.dataset].fetch(hospitalId);
      const matched = rows.filter((r) => ruleMatches(rule, r)).slice(0, 25);
      for (const row of matched) {
        const r = await executeActions(rule, row, hospitalId);
        if (r.result !== 'suppressed') fired += 1;
      }
      results.push({ key: rule.key, matched: matched.length });
    } catch (e) {
      results.push({ key: rule.key, error: e.message });
    }
  }
  return { fired, results };
}

// Sweep: fire all enabled rules due on schedule (cron calls this).
router.post('/rules/sweep', authorize('staff:manage'), async (req, res) => {
  try {
    return res.json(await sweepRulesTenant(req.user.hospitalId));
  } catch (err) {
    logger.error(`Rules sweep error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── WorkTask board ─────────────────────────────────────────────────────────
router.get('/tasks', authorize('staff:manage'), async (req, res) => {
  try {
    const { status, mine } = req.query;
    const filter = tenantFilter(req);
    if (status) filter.status = status;
    if (mine === '1') {
      filter.$or = [{ assignee: actorId(req) }, { roleQueue: req.user.role }];
    }
    const rows = await WorkTask.find(filter).sort({ priority: 1, dueAt: 1 }).limit(300).lean();
    return res.json({ tasks: rows });
  } catch (err) {
    logger.error(`WorkTask list error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/tasks', authorize('staff:manage'), async (req, res) => {
  try {
    const row = await WorkTask.create({
      hospitalId: req.user.hospitalId, ...req.body, createdBy: actorId(req),
    });
    return res.status(201).json({ id: String(row._id) });
  } catch (err) {
    logger.error(`WorkTask create error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.patch('/tasks/:id', authorize('staff:manage'), async (req, res) => {
  try {
    const allowed = ['title', 'detail', 'assignee', 'roleQueue', 'priority', 'status', 'dueAt', 'tags'];
    const set = Object.fromEntries(Object.entries(req.body || {}).filter(([k]) => allowed.includes(k)));
    const row = await WorkTask.findByIdAndUpdate(req.params.id, { $set: set }, { new: true });
    if (!row) return res.status(404).json({ message: 'Not found' });
    return res.json({ id: String(row._id), status: row.status });
  } catch (err) {
    logger.error(`WorkTask patch error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/tasks/:id/activity', authorize('staff:manage'), async (req, res) => {
  try {
    if (!req.body?.text) return res.status(400).json({ message: 'text required' });
    const row = await WorkTask.findByIdAndUpdate(req.params.id, {
      $push: { activity: { by: actorId(req), at: new Date(), text: String(req.body.text).slice(0, 1000) } },
    }, { new: true });
    if (!row) return res.status(404).json({ message: 'Not found' });
    return res.json({ id: String(row._id) });
  } catch (err) {
    logger.error(`WorkTask activity error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

export { ruleMatches, get };
