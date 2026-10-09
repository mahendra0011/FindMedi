import express from 'express';
import Interaction from '../models/Interaction.js';
import CallQueue from '../models/CallQueue.js';
import AgentSession from '../models/AgentSession.js';
import OutboundCampaign from '../models/OutboundCampaign.js';
import WorkTask from '../models/WorkTask.js';
import { protect, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../config/logger.js';

// File 18 §18.1: interactions timeline, telephony queue, agent presence,
// wallboard, provider webhook receiver (shared-secret), consent-gated
// campaigns, disposition → ticket auto-creation.

const router = express.Router();

const actorId = (req) => req.user._id ?? req.user.id;
const tenant = (req) => ({ hospitalId: req.user.hospitalId });

// Provider webhook (Exotel-style).
// File 22 P1-27: HMAC-SHA256 over the RAW body (x-provider-signature) with
// x-provider-timestamp (300s tolerance) — replays of a captured payload die
// on freshness. Legacy exact-secret header still accepted with a warn log
// (migration path, not the steady state).
router.post('/telephony/webhook', async (req, res) => {
  try {
    const configured = process.env.TELEPHONY_WEBHOOK_SECRET || '';
    if (!configured) return res.status(503).json({ message: 'Telephony receiver not configured' });
    const raw = req.body instanceof Buffer ? req.body : Buffer.from(JSON.stringify(req.body || {}));
    const sig = req.get('x-provider-signature') || '';
    const ts = Number(req.get('x-provider-timestamp') || 0);
    let authed = false;
    if (sig) {
      const { default: nodeCrypto } = await import('node:crypto');
      const expected = nodeCrypto.createHmac('sha256', configured).update(raw).digest('hex');
      const a = Buffer.from(expected);
      const b = Buffer.from(String(sig));
      const fresh = ts > 0 && Math.abs(Date.now() / 1000 - ts) <= 300;
      authed = a.length === b.length && nodeCrypto.timingSafeEqual(a, b) && fresh;
      if (sig && !fresh) return res.status(401).json({ message: 'Stale timestamp', code: 'STALE_TIMESTAMP' });
    } else {
      // Legacy fallback: exact secret match (no replay protection — migrate).
      authed = req.get('x-provider-secret') === configured;
      if (authed) logger.warn('[telephony] legacy secret auth used — migrate provider to HMAC');
    }
    if (!authed) return res.status(401).json({ message: 'Bad signature' });
    const payload = req.body instanceof Buffer ? JSON.parse(raw.toString() || '{}') : (req.body || {});
    const { hospitalId, phone, externalId, event, durationSec, recordingUrl } = payload;
    if (!hospitalId || !phone) return res.status(400).json({ message: 'hospitalId + phone required' });
    const { default: DndEntry } = await import('../models/DndEntry.js');
    const { safeFirst } = await import('../lib/approvalWiring.js');
    const dnd = await safeFirst(DndEntry.findOne({ hospitalId, phone: String(phone) }).lean());
    // Calling hours 09:00–21:00 IST (env-overridable); after-hours rings
    // become callbacks instead of live queue entries.
    const startH = Number(process.env.CALLING_HOURS_START ?? 9);
    const endH = Number(process.env.CALLING_HOURS_END ?? 21);
    const istH = Number(new Date(Date.now() + 5.5 * 3600 * 1000).getUTCHours());
    const afterHours = istH < startH || istH >= endH;
    if (event === 'ring') {
      await CallQueue.create({
        hospitalId, phone, externalId: externalId || '',
        priority: afterHours ? 'callback' : 'normal', dndHit: Boolean(dnd),
      });
    } else {
      await Interaction.create({
        hospitalId, channel: 'call', direction: 'in', phone,
        durationSec: Number(durationSec) || 0, recordingUrl: recordingUrl || '',
        externalId: externalId || '', dndHit: Boolean(dnd), afterHours,
      });
      if (event === 'missed') {
        await CallQueue.findOneAndUpdate(
          { hospitalId, externalId: externalId || '' },
          { $set: { status: 'missed' } },
        );
      }
    }
    return res.json({ ok: true, dnd: Boolean(dnd), afterHours });
  } catch (err) {
    logger.error(`Telephony webhook error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.use(protect);

// ─── DND registry ───────────────────────────────────────────────────────────
router.get('/dnd', authorize('staff:view'), async (req, res) => {
  try {
    const { default: DndEntry } = await import('../models/DndEntry.js');
    const filter = tenant(req);
    if (req.query.phone) filter.phone = String(req.query.phone);
    const rows = await DndEntry.find(filter).sort({ createdAt: -1 }).limit(300).lean();
    return res.json({ dnd: rows });
  } catch (err) {
    logger.error(`DND list error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/dnd', authorize('staff:view'), async (req, res) => {
  try {
    const { default: DndEntry } = await import('../models/DndEntry.js');
    const { phone, channel, reason } = req.body || {};
    if (!phone) return res.status(400).json({ message: 'phone required' });
    const row = await DndEntry.findOneAndUpdate(
      { hospitalId: req.user.hospitalId, phone: String(phone) },
      {
        $set: {
          channel: channel || 'all', reason: String(reason || '').slice(0, 200),
          createdBy: actorId(req),
        },
      },
      { upsert: true, new: true },
    );
    await auditLog('dnd_added', actorId(req), { phone, ip: req.ip });
    return res.status(201).json({ id: String(row._id) });
  } catch (err) {
    logger.error(`DND add error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.delete('/dnd/:id', authorize('staff:view'), async (req, res) => {
  try {
    const { default: DndEntry } = await import('../models/DndEntry.js');
    await DndEntry.findOneAndDelete({ _id: req.params.id, ...tenant(req) });
    return res.json({ deleted: true });
  } catch (err) {
    logger.error(`DND delete error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Screen-pop: incoming-call lookup (identity + dues + flags) ────────────
router.get('/screen-pop', authorize('staff:view'), async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ message: 'phone required' });
    const digits = String(phone).replace(/\D/g, '').slice(-10);
    const { default: Patient } = await import('../models/Patient.js');
    const { default: Billing } = await import('../models/Billing.js');
    const { safeFirst } = await import('../lib/approvalWiring.js');
    const patient = await safeFirst(Patient.findOne({
      ...tenant(req), phone: { $regex: `${digits}$` },
    }).select('name phone uhid').lean());
    let dues = 0;
    let flags = [];
    if (patient) {
      const bills = await safeFirst(Billing.find({ hospitalId: req.user.hospitalId, patientId: patient.userId || patient._id })
        .select('balance').limit(50).lean()) || [];
      dues = bills.reduce((s, b) => s + (Number(b.balance) || 0), 0);
      const { default: PatientFlag } = await import('../models/PatientFlag.js');
      flags = await safeFirst(PatientFlag.find({ hospitalId: req.user.hospitalId, patient: patient._id, active: true })
        .select('kind severity').lean()) || [];
    }
    const { default: DndEntry } = await import('../models/DndEntry.js');
    const dnd = await safeFirst(DndEntry.findOne({ hospitalId: req.user.hospitalId, phone: String(phone) }).lean());
    return res.json({ patient, dues, flags, dnd: Boolean(dnd) });
  } catch (err) {
    logger.error(`Screen-pop error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// Scheduler hook: purge recordings older than retention (default 90 days).
export async function purgeOldRecordings() {
  let days = 90;
  try {
    const { default: SystemSetting } = await import('../models/SystemSetting.js');
    const row = await SystemSetting.findOne({ key: 'callcenter.recordingRetentionDays' }).lean();
    if (row) days = Number(row.value) || 90;
  } catch { /* default stands */ }
  const cutoff = new Date(Date.now() - days * 86400 * 1000);
  const out = await Interaction.updateMany(
    { recordingUrl: { $ne: '' }, createdAt: { $lte: cutoff } },
    { $set: { recordingUrl: '' } },
  );
  return { purged: out.modifiedCount || 0, days };
}

router.get('/interactions', authorize('staff:view'), async (req, res) => {
  try {
    const { phone, channel } = req.query;
    const filter = tenant(req);
    if (phone) filter.phone = String(phone);
    if (channel) filter.channel = channel;
    const rows = await Interaction.find(filter).sort({ at: -1 }).limit(200).lean();
    return res.json({ interactions: rows });
  } catch (err) {
    logger.error(`Interactions error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/interactions', authorize('staff:view'), async (req, res) => {
  try {
    const { disposition, notes, createTicket } = req.body || {};
    const row = await Interaction.create({
      ...tenant(req), ...req.body, agent: actorId(req),
    });
    // Disposition → ticket: missed-call callbacks and complaints auto-queue.
    if (createTicket || ['callback', 'complaint'].includes(String(disposition || '').toLowerCase())) {
      const task = await WorkTask.create({
        ...tenant(req),
        title: `Follow up ${row.channel} ${row.phone}`.slice(0, 200),
        detail: String(notes || disposition || '').slice(0, 1000),
        entityRef: { model: 'Interaction', id: row._id },
        roleQueue: 'receptionist', priority: 'P1', tags: ['contact-center'],
        createdBy: actorId(req),
      });
      row.createdTicket = task._id;
      await row.save();
    }
    return res.status(201).json({ id: String(row._id), ticket: row.createdTicket || null });
  } catch (err) {
    logger.error(`Interaction create error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.patch('/interactions/:id/dispose', authorize('staff:view'), async (req, res) => {
  try {
    const row = await Interaction.findByIdAndUpdate(req.params.id, {
      $set: {
        disposition: String(req.body?.disposition || '').slice(0, 120),
        notes: String(req.body?.notes || '').slice(0, 2000),
        agent: actorId(req),
      },
    }, { new: true });
    if (!row) return res.status(404).json({ message: 'Not found' });
    return res.json({ id: String(row._id) });
  } catch (err) {
    logger.error(`Dispose error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Queue ──────────────────────────────────────────────────────────────────
router.get('/queue', authorize('staff:view'), async (req, res) => {
  try {
    const rows = await CallQueue.find({ ...tenant(req), status: { $in: ['waiting', 'assigned'] } })
      .sort({ priority: -1, createdAt: 1 }).limit(100).lean();
    return res.json({ queue: rows });
  } catch (err) {
    logger.error(`Call queue error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/queue/:id/assign', authorize('staff:view'), async (req, res) => {
  try {
    const row = await CallQueue.findByIdAndUpdate(req.params.id, {
      $set: { status: 'assigned', assignedAgent: actorId(req) },
    }, { new: true });
    if (!row) return res.status(404).json({ message: 'Not found' });
    await AgentSession.findOneAndUpdate(
      { ...tenant(req), agent: actorId(req), logoutAt: null },
      { $set: { status: 'on-call' } },
    );
    return res.json({ id: String(row._id), status: row.status });
  } catch (err) {
    logger.error(`Queue assign error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/queue/:id/done', authorize('staff:view'), async (req, res) => {
  try {
    const row = await CallQueue.findByIdAndUpdate(req.params.id, {
      $set: { status: req.body?.missed ? 'missed' : 'done' },
    }, { new: true });
    if (!row) return res.status(404).json({ message: 'Not found' });
    return res.json({ id: String(row._id), status: row.status });
  } catch (err) {
    logger.error(`Queue done error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Agents + wallboard ─────────────────────────────────────────────────────
router.post('/agents/session', authorize('staff:view'), async (req, res) => {
  try {
    const { status } = req.body || {};
    if (status === 'offline') {
      await AgentSession.findOneAndUpdate(
        { ...tenant(req), agent: actorId(req), logoutAt: null },
        { $set: { status: 'offline', logoutAt: new Date() } },
      );
      return res.json({ status: 'offline' });
    }
    const row = await AgentSession.findOneAndUpdate(
      { ...tenant(req), agent: actorId(req), logoutAt: null },
      { $set: { status: status || 'available' } },
      { upsert: true, new: true },
    );
    return res.json({ id: String(row._id), status: row.status });
  } catch (err) {
    logger.error(`Agent session error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.get('/wallboard', authorize('staff:view'), async (req, res) => {
  try {
    const [waiting, onCall, agents, today] = await Promise.all([
      CallQueue.countDocuments({ ...tenant(req), status: 'waiting' }),
      AgentSession.countDocuments({ ...tenant(req), status: 'on-call', logoutAt: null }),
      AgentSession.countDocuments({ ...tenant(req), logoutAt: null }),
      Interaction.countDocuments({
        ...tenant(req), at: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      }),
    ]);
    return res.json({ waiting, onCall, agentsOnline: agents, today });
  } catch (err) {
    logger.error(`Wallboard error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Campaigns (consent-gated) ──────────────────────────────────────────────
router.get('/campaigns', authorize('staff:manage'), async (req, res) => {
  try {
    const rows = await OutboundCampaign.find(tenant(req)).sort({ createdAt: -1 }).limit(100).lean();
    return res.json({ campaigns: rows });
  } catch (err) {
    logger.error(`Campaigns error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/campaigns', authorize('staff:manage'), async (req, res) => {
  try {
    if (!req.body?.consentChecked) {
      return res.status(400).json({ message: 'Consent check confirmation required before any outbound campaign' });
    }
    const row = await OutboundCampaign.create({
      ...tenant(req), ...req.body, createdBy: actorId(req),
    });
    await auditLog('campaign_created', actorId(req), { campaignId: row._id, ip: req.ip });
    return res.status(201).json({ id: String(row._id) });
  } catch (err) {
    logger.error(`Campaign create error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/campaigns/:id/state', authorize('staff:manage'), async (req, res) => {
  try {
    const { state } = req.body || {};
    if (!['running', 'paused', 'done'].includes(state)) return res.status(400).json({ message: 'Bad state' });
    const row = await OutboundCampaign.findByIdAndUpdate(req.params.id, { $set: { status: state } }, { new: true });
    if (!row) return res.status(404).json({ message: 'Not found' });
    return res.json({ id: String(row._id), status: row.status });
  } catch (err) {
    logger.error(`Campaign state error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
