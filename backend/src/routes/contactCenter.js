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

// Provider webhook (Exotel-style): shared secret in header, raw-ish JSON.
router.post('/telephony/webhook', async (req, res) => {
  try {
    const secret = req.get('x-provider-secret') || '';
    if (!process.env.TELEPHONY_WEBHOOK_SECRET || secret !== process.env.TELEPHONY_WEBHOOK_SECRET) {
      return res.status(401).json({ message: 'Bad secret' });
    }
    const { hospitalId, phone, externalId, event, durationSec, recordingUrl } = req.body || {};
    if (!hospitalId || !phone) return res.status(400).json({ message: 'hospitalId + phone required' });
    if (event === 'ring') {
      await CallQueue.create({ hospitalId, phone, externalId: externalId || '' });
    } else {
      await Interaction.create({
        hospitalId, channel: 'call', direction: 'in', phone,
        durationSec: Number(durationSec) || 0, recordingUrl: recordingUrl || '',
        externalId: externalId || '',
      });
      if (event === 'missed') {
        await CallQueue.findOneAndUpdate(
          { hospitalId, externalId: externalId || '' },
          { $set: { status: 'missed' } },
        );
      }
    }
    return res.json({ ok: true });
  } catch (err) {
    logger.error(`Telephony webhook error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.use(protect);

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
