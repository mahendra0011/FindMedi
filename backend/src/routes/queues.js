import express from 'express';
import crypto from 'node:crypto';
import Queue, { PRIORITY_WEIGHT } from '../models/Queue.js';
import QueueTicket from '../models/QueueTicket.js';
import PatientMovement from '../models/PatientMovement.js';
import { protect, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../config/logger.js';

// File 15 §15.1/15.2/15.4: unified queue engine (atomic call-next, ETA,
// recall/no-show, transfer, journey links), signed display tokens (no PHI:
// numbers + rooms only), and ADT movement requests.

const router = express.Router();

const actorId = (req) => req.user._id ?? req.user.id;
const OBJECT_ID = /^[0-9a-f]{24}$/i;
const displaySecret = () => process.env.DISPLAY_TOKEN_SECRET || process.env.JWT_SECRET || 'dev-only-display-secret';

const signDisplayToken = (hospitalId, queueIds, ttlHours = 720) => {
  const payload = { h: String(hospitalId), q: queueIds.map(String), exp: Date.now() + ttlHours * 3600e3 };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', displaySecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
};
const verifyDisplayToken = (token) => {
  try {
    const [body, sig] = String(token || '').split('.');
    if (!body || !sig) return null;
    const expect = crypto.createHmac('sha256', displaySecret()).update(body).digest('base64url');
    const a = Buffer.from(expect);
    const b = Buffer.from(sig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
};

const emitQueue = async (queueId, event, data) => {
  try {
    const { getIO } = await import('../services/socketService.js');
    getIO()?.to(`queue:${queueId}`)?.emit(event, data);
  } catch { /* realtime best-effort */ }
};

const queueScope = (req, q) => {
  if (req.user?.role === 'superadmin') return true;
  const t = req.user?.hospitalId;
  return t && String(q.hospitalId) === String(t);
};

// ─── Queues ─────────────────────────────────────────────────────────────────
// authz: role
router.post('/', protect, authorize('staff:manage'), async (req, res) => {
  try {
    if (!['hospital_admin', 'superadmin'].includes(req.user?.role)) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const { type, resourceId, name, prefix, slaMinutes } = req.body || {};
    if (!['OPD', 'LAB', 'RAD', 'PHARM', 'BILL', 'ER'].includes(type) || !name) {
      return res.status(400).json({ message: 'type + name required' });
    }
    const q = await Queue.create({
      hospitalId: req.user.hospitalId, type, resourceId: resourceId || '',
      name, prefix: (prefix || 'A').slice(0, 4), slaMinutes: slaMinutes || 30,
    });
    return res.status(201).json({ id: String(q._id) });
  } catch (err) {
    logger.error(`Queue create error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: role (tenant filter below; superadmin sees all)
router.get('/', protect, async (req, res) => {
  try {
    const filter = req.user.role === 'superadmin' && !req.user.hospitalId
      ? {} : { hospitalId: req.user.hospitalId };
    const rows = await Queue.find(filter).limit(200).lean();
    return res.json({ queues: rows });
  } catch (err) {
    logger.error(`Queues error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Tickets ────────────────────────────────────────────────────────────────
// authz: role
router.post('/:id/tickets', protect, authorize('appointments:write'), async (req, res) => {
  try {
    const q = await Queue.findById(req.params.id);
    if (!q || !q.active) return res.status(404).json({ message: 'Queue not found' });
    if (!queueScope(req, q)) return res.status(403).json({ message: 'Access denied' });
    const { patientId, encounterId, priority, createdVia } = req.body || {};
    const seq = (q.seq || 0) + 1;
    q.seq = seq;
    await q.save();
    const t = await QueueTicket.create({
      queueId: q._id, hospitalId: q.hospitalId, number: seq,
      display: `${q.prefix}-${String(seq).padStart(3, '0')}`,
      patientId: patientId || null, encounterId: encounterId || null,
      priority: priority || 'Walkin', createdVia: createdVia || 'reception',
      createdBy: actorId(req),
    });
    await emitQueue(String(q._id), 'queue:updated', { queueId: String(q._id) });
    return res.status(201).json({ id: String(t._id), display: t.display, number: t.number });
  } catch (err) {
    logger.error(`Ticket error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// Atomic call-next: priority weight, then arrival. Two counters can never
// take the same ticket (findOneAndUpdate on status=Waiting).
// authz: role (counter ops; tenant enforced per queue below)
router.post('/:id/call-next', protect, authorize('appointments:write'), async (req, res) => {
  try {
    const q = await Queue.findById(req.params.id);
    if (!q || !q.active) return res.status(404).json({ message: 'Queue not found' });
    if (!queueScope(req, q)) return res.status(403).json({ message: 'Access denied' });
    const { counterId } = req.body || {};
    const weights = Object.keys(PRIORITY_WEIGHT);
    let next = null;
    for (const p of weights) {
      // eslint-disable-next-line no-await-in-loop
      next = await QueueTicket.findOneAndUpdate(
        { queueId: q._id, status: 'Waiting', priority: p },
        { $set: { status: 'Called', calledAt: new Date(), counterId: counterId || '' } },
        { new: true },
      );
      if (next) break;
    }
    if (!next) return res.status(404).json({ message: 'No waiting tickets' });
    await emitQueue(String(q._id), 'ticket:called', {
      display: next.display, counterId: next.counterId, queueId: String(q._id),
    });
    return res.json({ id: String(next._id), display: next.display, counterId: next.counterId });
  } catch (err) {
    logger.error(`Call-next error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

const ticketTransition = async (req, res, from, to, extra = {}) => {
  const t = await QueueTicket.findOne({ _id: req.params.ticketId, status: { $in: Array.isArray(from) ? from : [from] } });
  if (!t) return res.status(404).json({ message: 'Ticket not in a changeable state' });
  const q = await Queue.findById(t.queueId).select('hospitalId');
  if (!q || !queueScope(req, q)) return res.status(403).json({ message: 'Access denied' });
  Object.assign(t, extra, { status: to });
  await t.save();
  // File 22 P0-3: visit start opens the OPD Encounter (idempotent per ticket).
  if (to === 'InService' && t.patientId && !t.encounterId) {
    try {
      const { ensureEncounter } = await import('../lib/encounter.js');
      const enc = await ensureEncounter({
        hospitalId: q.hospitalId, patientId: t.patientId, type: 'OPD',
        createdBy: req.user._id ?? req.user.id,
      });
      t.encounterId = enc._id;
      await t.save();
    } catch (e) {
      logger.warn(`ticket encounter auto-create failed: ${e.message}`);
    }
  }
  await emitQueue(String(t.queueId), 'queue:updated', { queueId: String(t.queueId) });
  return res.json({ id: String(t._id), status: t.status });
};

// authz: role (counter ops; tenant enforced per ticket below)
router.put('/tickets/:ticketId/recall', protect, authorize('appointments:write'), async (req, res) => {
  try {
    const t = await QueueTicket.findById(req.params.ticketId);
    if (!t || t.status !== 'Called') return res.status(404).json({ message: 'Called ticket not found' });
    const q = await Queue.findById(t.queueId).select('hospitalId');
    if (!q || !queueScope(req, q)) return res.status(403).json({ message: 'Access denied' });
    t.recallCount += 1;
    if (t.recallCount >= 2) {
      t.status = 'NoShow';
      await t.save();
      await emitQueue(String(t.queueId), 'queue:updated', { queueId: String(t.queueId) });
      return res.json({ id: String(t._id), status: t.status, note: 'auto NoShow after 2 recalls' });
    }
    t.calledAt = new Date();
    await t.save();
    await emitQueue(String(t.queueId), 'ticket:called', { display: t.display, recall: t.recallCount, queueId: String(t.queueId) });
    return res.json({ id: String(t._id), status: t.status, recallCount: t.recallCount });
  } catch (err) {
    logger.error(`Recall error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: role (counter ops; tenant enforced per ticket inside)
router.put('/tickets/:ticketId/start', protect, authorize('appointments:write'), (req, res) => ticketTransition(req, res, 'Called', 'InService', { startedAt: new Date() }));
router.put('/tickets/:ticketId/done', protect, authorize('appointments:write'), (req, res) => ticketTransition(req, res, ['Called', 'InService'], 'Done', { completedAt: new Date() }));
router.put('/tickets/:ticketId/skip', protect, authorize('appointments:write'), (req, res) => ticketTransition(req, res, 'Waiting', 'Skipped', {}));

// authz: role (tenant enforced per ticket + destination below)
router.put('/tickets/:ticketId/transfer', protect, authorize('appointments:write'), async (req, res) => {
  try {
    const { toQueueId } = req.body || {};
    const t = await QueueTicket.findOne({ _id: req.params.ticketId, status: { $in: ['Waiting', 'Skipped'] } });
    if (!t || !OBJECT_ID.test(String(toQueueId || ''))) return res.status(404).json({ message: 'Ticket or queue not found' });
    const dest = await Queue.findById(toQueueId);
    if (!dest || String(dest.hospitalId) !== String(t.hospitalId)) {
      return res.status(400).json({ message: 'Destination queue must be in the same hospital' });
    }
    t.status = 'Transferred';
    t.nextQueueId = dest._id;
    await t.save();
    const seq = (dest.seq || 0) + 1;
    dest.seq = seq;
    await dest.save();
    const nt = await QueueTicket.create({
      queueId: dest._id, hospitalId: dest.hospitalId, number: seq,
      display: `${dest.prefix}-${String(seq).padStart(3, '0')}`,
      patientId: t.patientId, encounterId: t.encounterId, priority: t.priority,
      createdVia: 'reception', createdBy: actorId(req),
    });
    await emitQueue(String(dest._id), 'queue:updated', { queueId: String(dest._id) });
    return res.json({ id: String(nt._id), display: nt.display });
  } catch (err) {
    logger.error(`Transfer error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// Board: now-serving + waiting + ETA range (rolling median service time).
// authz: object (queue tenant scope enforced below)
router.get('/:id/board', protect, async (req, res) => {
  try {
    const q = await Queue.findById(req.params.id);
    if (!q) return res.status(404).json({ message: 'Queue not found' });
    if (!queueScope(req, q)) return res.status(403).json({ message: 'Access denied' });
    const [serving, waiting] = await Promise.all([
      QueueTicket.find({ queueId: q._id, status: { $in: ['Called', 'InService'] } })
        .select('display status counterId calledAt').limit(10).lean(),
      QueueTicket.find({ queueId: q._id, status: 'Waiting' })
        .select('display priority arrivedAt number').sort({ number: 1 }).limit(50).lean(),
    ]);
    const recent = await QueueTicket.find({
      queueId: q._id, status: 'Done', startedAt: { $ne: null }, completedAt: { $ne: null },
    }).sort({ completedAt: -1 }).limit(30).select('startedAt completedAt').lean();
    const secs = recent.map((r) => (new Date(r.completedAt) - new Date(r.startedAt)) / 1000).filter((s) => s > 0).sort((a, b) => a - b);
    const median = secs.length ? secs[Math.floor(secs.length / 2)] : (q.avgServiceSec || 600);
    const perMin = Math.max(1, Math.round(median / 60));
    return res.json({
      serving, waiting,
      etaRangeMin: [perMin * Math.max(0, waiting.length - 1), perMin * waiting.length + perMin],
      slaMinutes: q.slaMinutes,
    });
  } catch (err) {
    logger.error(`Board error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// Fairness metrics for the dashboard.
// authz: object (queue tenant scope enforced below)
router.get('/:id/metrics', protect, async (req, res) => {
  try {
    const q = await Queue.findById(req.params.id);
    if (!q) return res.status(404).json({ message: 'Queue not found' });
    if (!queueScope(req, q)) return res.status(403).json({ message: 'Access denied' });
    const done = await QueueTicket.find({ queueId: q._id, status: 'Done', arrivedAt: { $exists: true } })
      .select('arrivedAt startedAt').limit(500).lean();
    const waits = done.filter((t) => t.startedAt).map((t) => (new Date(t.startedAt) - new Date(t.arrivedAt)) / 60000).sort((a, b) => a - b);
    const avg = waits.length ? waits.reduce((s, w) => s + w, 0) / waits.length : 0;
    const p90 = waits.length ? waits[Math.min(waits.length - 1, Math.floor(waits.length * 0.9))] : 0;
    const [abandoned, slaBreach] = await Promise.all([
      QueueTicket.countDocuments({ queueId: q._id, status: 'NoShow' }),
      QueueTicket.countDocuments({ queueId: q._id, status: 'Waiting' }),
    ]);
    return res.json({
      avgWaitMin: +avg.toFixed(1), p90WaitMin: +p90.toFixed(1),
      abandoned, waitingNow: slaBreach,
    });
  } catch (err) {
    logger.error(`Metrics error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Signed display tokens (no login; numbers + rooms only) ─────────────────
// authz: role
router.post('/display-tokens', protect, authorize('staff:manage'), async (req, res) => {
  try {
    if (!['hospital_admin', 'superadmin'].includes(req.user?.role)) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const { queueIds, ttlHours } = req.body || {};
    if (!Array.isArray(queueIds) || !queueIds.length) return res.status(400).json({ message: 'queueIds[] required' });
    const token = signDisplayToken(req.user.hospitalId, queueIds, Math.min(720, Number(ttlHours) || 720));
    await auditLog('display_token_issued', actorId(req), { queues: queueIds.length, ip: req.ip });
    return res.status(201).json({ token });
  } catch (err) {
    logger.error(`Display token error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: public (HMAC display token; numbers + rooms only, never PHI)
router.get('/display/queues', async (req, res) => {
  try {
    const payload = verifyDisplayToken(req.query?.token);
    if (!payload) return res.status(401).json({ message: 'Invalid display token' });
    const rows = await Queue.find({ _id: { $in: payload.q }, hospitalId: payload.h }).select('name prefix type').lean();
    const boards = await Promise.all(rows.map(async (q) => {
      const serving = await QueueTicket.find({ queueId: q._id, status: { $in: ['Called', 'InService'] } })
        .select('display counterId').limit(5).lean();
      const waiting = await QueueTicket.find({ queueId: q._id, status: 'Waiting' })
        .select('display number').sort({ number: 1 }).limit(8).lean();
      return { queue: { id: q._id, name: q.name, type: q.type }, serving, waiting };
    }));
    return res.json({ boards });
  } catch (err) {
    logger.error(`Display error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Patient movement (ADT + internal transport) ────────────────────────────
// authz: role (porter/nurse/doctor/admin request; tenant stamped from session)
const MOVE_ROLES = ['hospital_admin', 'superadmin', 'doctor', 'clinic_doctor', 'nurse', 'receptionist'];
// authz: role (allowlisted clinical/support roles; tenant stamped from session)
router.post('/movements', protect, async (req, res) => {
  if (!MOVE_ROLES.includes(req.user?.role)) return res.status(403).json({ message: 'Movement request access required' });
  try {
    const { encounterId, admissionId, patientId, to, reason, transportMode, escort, handover } = req.body || {};
    if (!to || !patientId) return res.status(400).json({ message: 'to + patientId required' });
    const m = await PatientMovement.create({
      hospitalId: req.user.hospitalId, encounterId: encounterId || null,
      admissionId: admissionId || null, patientId, to,
      reason: String(reason || '').slice(0, 500),
      transportMode: transportMode || 'wheelchair', escort: escort || 'porter',
      handover: handover || {}, requestedBy: actorId(req),
    });
    await auditLog('movement_requested', actorId(req), { movementId: m._id, to, ip: req.ip });
    return res.status(201).json({ id: String(m._id), status: m.status });
  } catch (err) {
    logger.error(`Movement error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

const MOVE_FLOW = { Requested: ['Assigned', 'Cancelled'], Assigned: ['PickedUp', 'Cancelled'], PickedUp: ['Delivered', 'Cancelled'], Delivered: ['Returned'], Returned: [], Cancelled: [] };

// authz: role (tenant enforced per movement below)
router.put('/movements/:id/:action', protect, async (req, res) => {
  try {
    const map = { assign: 'Assigned', pickup: 'PickedUp', deliver: 'Delivered', return: 'Returned', cancel: 'Cancelled' };
    const target = map[req.params.action];
    if (!target) return res.status(400).json({ message: 'Invalid action' });
    const row = await PatientMovement.findById(req.params.id);
    if (!row) return res.status(404).json({ message: 'Not found' });
    if (req.user.role !== 'superadmin' && req.user.hospitalId
      && String(row.hospitalId || '') !== String(req.user.hospitalId)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (!MOVE_FLOW[row.status].includes(target)) {
      return res.status(409).json({ message: `Cannot move from ${row.status} to ${target}` });
    }
    row.status = target;
    const stamp = { Assigned: 'assignedAt', PickedUp: 'pickedAt', Delivered: 'deliveredAt' }[target];
    if (stamp) row.timestamps[stamp] = new Date();
    await row.save();
    return res.json({ id: String(row._id), status: row.status });
  } catch (err) {
    logger.error(`Movement action error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: role (tenant filter below; superadmin sees all)
router.get('/movements', protect, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = req.user.role === 'superadmin' && !req.user.hospitalId ? {} : { hospitalId: req.user.hospitalId };
    if (status) filter.status = status;
    const rows = await PatientMovement.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    return res.json({ movements: rows });
  } catch (err) {
    logger.error(`Movements error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
