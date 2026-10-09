import express from 'express';
import WorkflowDefinition from '../models/WorkflowDefinition.js';
import WorkflowInstance from '../models/WorkflowInstance.js';
import DashboardAlert from '../models/DashboardAlert.js';
import { protect, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { validateDefinition, guardPasses } from '../lib/workflowEngine.js';
import { roleHasPermission } from '../config/permissions.js';
import logger from '../config/logger.js';

// File 13 §13.1: workflow definitions (versioned), instances (pinned
// version, optimistic concurrency), SLA sweep with escalation.

const router = express.Router();
router.use(protect);

const actorId = (req) => req.user._id ?? req.user.id;
const OBJECT_ID = /^[0-9a-f]{24}$/i;
const tenantFilter = (req) => (req.user.role === 'superadmin' && !req.user.hospitalId
  ? {} : { hospitalId: req.user.hospitalId });

// ─── Definitions ────────────────────────────────────────────────────────────
router.get('/definitions', authorize('staff:manage'), async (req, res) => {
  try {
    const { entity } = req.query;
    const filter = { ...tenantFilter(req) };
    if (entity) filter.entityModel = entity;
    const rows = await WorkflowDefinition.find(filter).sort({ key: 1, version: -1 }).limit(200).lean();
    return res.json({ definitions: rows });
  } catch (err) {
    logger.error(`WF definitions error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/definitions', authorize('staff:manage'), async (req, res) => {
  try {
    const { key, name, entityModel, states, transitions } = req.body || {};
    if (!key || !name) return res.status(400).json({ message: 'key + name required' });
    const errors = validateDefinition({ states: states || [], transitions: transitions || [] });
    if (errors.length) return res.status(400).json({ message: 'Invalid graph', errors });
    const latest = await WorkflowDefinition.findOne({ hospitalId: req.user.hospitalId, key }).sort({ version: -1 }).lean();
    const row = await WorkflowDefinition.create({
      hospitalId: req.user.hospitalId, key, name, entityModel: entityModel || '',
      version: (latest?.version || 0) + 1, status: 'Draft',
      states: states || [], transitions: transitions || [], createdBy: actorId(req),
    });
    return res.status(201).json({ id: String(row._id), version: row.version });
  } catch (err) {
    logger.error(`WF create error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/definitions/:id/validate', authorize('staff:manage'), async (req, res) => {
  try {
    const row = await WorkflowDefinition.findById(req.params.id).lean();
    if (!row) return res.status(404).json({ message: 'Not found' });
    return res.json({ errors: validateDefinition(row) });
  } catch (err) {
    logger.error(`WF validate error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/definitions/:id/publish', authorize('staff:manage'), async (req, res) => {
  try {
    const row = await WorkflowDefinition.findById(req.params.id);
    if (!row || row.status !== 'Draft') return res.status(404).json({ message: 'Draft not found' });
    const errors = validateDefinition(row);
    if (errors.length) return res.status(400).json({ message: 'Invalid graph', errors });
    row.status = 'Published';
    await row.save();
    await auditLog('workflow_published', actorId(req), { defId: row._id, key: row.key, ip: req.ip });
    return res.json({ id: String(row._id), version: row.version, status: row.status });
  } catch (err) {
    logger.error(`WF publish error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Instances ──────────────────────────────────────────────────────────────
router.post('/instances', authorize('staff:manage'), async (req, res) => {
  try {
    const { defKey, entityRef } = req.body || {};
    const def = await WorkflowDefinition.findOne({
      ...tenantFilter(req), key: defKey, status: 'Published',
    }).sort({ version: -1 });
    if (!def) return res.status(404).json({ message: 'Published definition not found' });
    const start = (def.states || []).find((s) => s.type === 'start');
    const now = new Date();
    const inst = await WorkflowInstance.create({
      hospitalId: req.user.hospitalId, defKey, defVersion: def.version,
      entityRef: entityRef || {}, state: start ? start.id : ((def.states || [])[0] || {}).id,
      activeStates: start ? [start.id] : [],
      history: [], status: 'Active', createdBy: actorId(req),
    });
    const stateDoc = (def.states || []).find((s) => s.id === inst.state);
    if (stateDoc?.slaMinutes) {
      inst.timers.push({ state: inst.state, dueAt: new Date(now.getTime() + stateDoc.slaMinutes * 60000) });
      await inst.save();
    }
    return res.status(201).json({ id: String(inst._id), state: inst.state });
  } catch (err) {
    logger.error(`WF instance error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.get('/instances/:id', authorize('staff:manage'), async (req, res) => {
  try {
    const inst = await WorkflowInstance.findById(req.params.id).lean();
    if (!inst) return res.status(404).json({ message: 'Not found' });
    const def = await WorkflowDefinition.findOne({
      hospitalId: inst.hospitalId, key: inst.defKey, version: inst.defVersion,
    }).lean();
    return res.json({ instance: inst, definition: def });
  } catch (err) {
    logger.error(`WF instance read error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/instances/:id/events', authorize('staff:manage'), async (req, res) => {
  try {
    const { event, note, version } = req.body || {};
    if (!event) return res.status(400).json({ message: 'event required' });
    const inst = await WorkflowInstance.findById(req.params.id);
    if (!inst || inst.status !== 'Active') return res.status(404).json({ message: 'Active instance not found' });
    if (version != null && Number(version) !== inst.version) {
      return res.status(409).json({ message: 'Concurrent update — reload and retry' });
    }
    const def = await WorkflowDefinition.findOne({
      hospitalId: inst.hospitalId, key: inst.defKey, version: inst.defVersion,
    }).lean();
    if (!def) return res.status(410).json({ message: 'Definition version retired' });
    const { fireTransition } = await import('../lib/workflowEngine.js');
    const hasPermission = (p) => roleHasPermission(req.user.role, p);
    let out;
    try {
      out = fireTransition(def, inst, event, req.user, hasPermission);
    } catch (e) {
      return res.status(e.code === 'GUARD_DENIED' ? 403 : 409).json({ message: e.message, code: e.code });
    }
    const from = inst.state;
    inst.state = out.to;
    if (out.activeStates) inst.activeStates = out.activeStates;
    inst.history.push({ from, to: out.to, event, by: actorId(req), at: new Date(), note: String(note || '').slice(0, 500) });
    const endStates = new Set((def.states || []).filter((s) => s.type === 'end').map((s) => s.id));
    if (endStates.has(out.to) && (!out.remaining || out.remaining.length === 0)) inst.status = 'Done';
    inst.version += 1;
    const cur = (def.states || []).find((s) => s.id === out.to);
    if (cur?.slaMinutes) {
      inst.timers.push({ state: out.to, dueAt: new Date(Date.now() + cur.slaMinutes * 60000) });
    }
    await inst.save();
    await auditLog('workflow_event', actorId(req), { instanceId: inst._id, event, from, to: out.to, ip: req.ip });
    return res.json({ id: String(inst._id), state: inst.state, status: inst.status });
  } catch (err) {
    logger.error(`WF event error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/instances/:id/cancel', authorize('staff:manage'), async (req, res) => {
  try {
    const inst = await WorkflowInstance.findById(req.params.id);
    if (!inst || inst.status !== 'Active') return res.status(404).json({ message: 'Active instance not found' });
    if (!req.body?.reason) return res.status(400).json({ message: 'Cancel reason required' });
    inst.status = 'Cancelled';
    inst.cancelReason = String(req.body.reason).slice(0, 500);
    await inst.save();
    await auditLog('workflow_cancelled', actorId(req), { instanceId: inst._id, reason: inst.cancelReason, ip: req.ip });
    return res.json({ id: String(inst._id), status: inst.status });
  } catch (err) {
    logger.error(`WF cancel error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// Inbox: instances with SLA timers due (pending actions), newest first.
router.get('/inbox', authorize('staff:manage'), async (req, res) => {
  try {
    const filter = { ...tenantFilter(req), status: 'Active', 'timers.dueAt': { $lte: new Date() } };
    const rows = await WorkflowInstance.find(filter).sort({ updatedAt: -1 }).limit(100).lean();
    return res.json({ inbox: rows });
  } catch (err) {
    logger.error(`WF inbox error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// SLA sweep: mark escalated + raise dashboard alerts (cron/BullMQ calls this).
router.post('/sweep', authorize('staff:manage'), async (req, res) => {
  try {
    const now = new Date();
    const due = await WorkflowInstance.find({
      ...tenantFilter(req), status: 'Active',
      timers: { $elemMatch: { dueAt: { $lte: now }, escalatedAt: null } },
    }).limit(200);
    let escalated = 0;
    for (const inst of due) {
      const timer = inst.timers.find((t) => t.dueAt <= now && !t.escalatedAt);
      if (!timer) continue;
      timer.escalatedAt = now;
      await inst.save();
      await DashboardAlert.create({
        hospitalId: inst.hospitalId, type: 'other', severity: 'warning',
        entityRef: { model: 'WorkflowInstance', id: inst._id },
        message: `Workflow ${inst.defKey} stuck in ${timer.state} past SLA`,
        status: 'open',
      }).catch(() => {});
      escalated += 1;
    }
    return res.json({ escalated });
  } catch (err) {
    logger.error(`WF sweep error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
export { guardPasses };
