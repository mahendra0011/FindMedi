import express from 'express';
import nodeCrypto from 'crypto';
import HubIntegration from '../models/HubIntegration.js';
import MappingProfile from '../models/MappingProfile.js';
import IntegrationMessage from '../models/IntegrationMessage.js';
import WebhookSubscription from '../models/WebhookSubscription.js';
import WebhookDelivery from '../models/WebhookDelivery.js';
import { protect, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../config/logger.js';

// File 18 §18.2/§18.3: hub board (integrations + message inspector + mapping
// profiles) and outbound webhook subscriptions with HMAC-signed deliveries,
// attempts ledger and scheduler-driven retries.

const router = express.Router();
router.use(protect);

const actorId = (req) => req.user._id ?? req.user.id;
const tenant = (req) => ({ hospitalId: req.user.hospitalId });

// ─── Integrations ───────────────────────────────────────────────────────────
router.get('/', authorize('staff:manage'), async (req, res) => {
  try {
    const rows = await HubIntegration.find(tenant(req)).sort({ key: 1 }).lean();
    return res.json({ integrations: rows });
  } catch (err) {
    logger.error(`Hub list error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/', authorize('staff:manage'), async (req, res) => {
  try {
    const row = await HubIntegration.findOneAndUpdate(
      { hospitalId: req.user.hospitalId, key: req.body?.key },
      { $set: { ...req.body, hospitalId: req.user.hospitalId } },
      { upsert: true, new: true },
    );
    await auditLog('hub_integration_saved', actorId(req), { key: row.key, ip: req.ip });
    return res.status(201).json({ id: String(row._id) });
  } catch (err) {
    logger.error(`Hub save error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.get('/messages', authorize('staff:manage'), async (req, res) => {
  try {
    const { status, direction, key } = req.query;
    const filter = tenant(req);
    if (status) filter.status = status;
    if (direction) filter.direction = direction;
    if (key) filter.integrationKey = key;
    const rows = await IntegrationMessage.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    return res.json({ messages: rows });
  } catch (err) {
    logger.error(`Hub messages error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/messages/:id/retry', authorize('staff:manage'), async (req, res) => {
  try {
    const row = await IntegrationMessage.findByIdAndUpdate(req.params.id,
      { $set: { status: 'queued', error: '' } }, { new: true });
    if (!row) return res.status(404).json({ message: 'Not found' });
    await auditLog('hub_message_retry', actorId(req), { messageId: row._id, ip: req.ip });
    return res.json({ id: String(row._id), status: row.status });
  } catch (err) {
    logger.error(`Hub retry error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Mapping profiles ───────────────────────────────────────────────────────
router.get('/mappings', authorize('staff:manage'), async (req, res) => {
  try {
    const rows = await MappingProfile.find(tenant(req)).lean();
    return res.json({ mappings: rows });
  } catch (err) {
    logger.error(`Mappings error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/mappings', authorize('staff:manage'), async (req, res) => {
  try {
    const { integrationKey, domain, mappings } = req.body || {};
    if (!integrationKey || !domain) return res.status(400).json({ message: 'integrationKey + domain required' });
    const row = await MappingProfile.findOneAndUpdate(
      { hospitalId: req.user.hospitalId, integrationKey, domain },
      { $set: { mappings: mappings || {}, updatedBy: actorId(req) } },
      { upsert: true, new: true },
    );
    return res.json({ id: String(row._id) });
  } catch (err) {
    logger.error(`Mapping save error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

/** Resolve an external code through the mapping profile (null = unmapped). */
export async function mapExternalCode(hospitalId, integrationKey, domain, externalCode) {
  const profile = await MappingProfile.findOne({ hospitalId, integrationKey, domain }).lean();
  return profile?.mappings?.[externalCode] ?? null;
}

// ─── Outbound webhook subscriptions ─────────────────────────────────────────
// File 22 P1-26: signed deliveries with timestamp + replay protection.
// Signature = HMAC-SHA256(secret, "<unix-seconds>.<body>"), sent as
// X-Findmedi-Signature with X-Findmedi-Timestamp. Receivers reject bodies
// older than 5 minutes or with a seen (sub, timestamp) pair — replays of a
// captured payload fail the freshness check even with a valid signature.
function signPayload(secret, timestamp, body) {
  return nodeCrypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
}

/**
 * File 22 P1-26: receiver-side verification contract (timestamp freshness +
 * constant-time compare). Exported for unit tests AND for any future inbound
 * receiver — one definition, every checker.
 */
export function verifyWebhookPayload(secret, timestamp, body, signature, toleranceSec = 300) {
  if (!secret || !signature) return { ok: false, reason: 'missing' };
  const ts = Number(timestamp);
  if (!ts || Math.abs(Date.now() / 1000 - ts) > toleranceSec) return { ok: false, reason: 'stale' };
  const expected = signPayload(secret, String(timestamp), body);
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  if (a.length !== b.length) return { ok: false, reason: 'mismatch' };
  return nodeCrypto.timingSafeEqual(a, b) ? { ok: true } : { ok: false, reason: 'mismatch' };
}

export async function deliverWebhook(delivery) {
  const sub = await WebhookSubscription.findById(delivery.subId).lean();
  if (!sub || !sub.active) {
    delivery.status = 'failed';
    delivery.lastError = 'subscription inactive';
    await delivery.save();
    return delivery;
  }
  const timestamp = Math.floor(Date.now() / 1000);
  const body = JSON.stringify({ event: delivery.event, payload: delivery.payload, sentAt: timestamp });
  const signature = signPayload(sub.secret, timestamp, body);
  delivery.attempts += 1;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const resp = await fetch(sub.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Findmedi-Signature': signature,
        'X-Findmedi-Timestamp': String(timestamp),
      },
      body, signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    delivery.status = 'delivered';
    delivery.lastError = '';
  } catch (e) {
    delivery.lastError = String(e.message || e).slice(0, 300);
    if (delivery.attempts >= 5) {
      delivery.status = 'failed';
    } else {
      // Exponential backoff with jitter: 5m, 20m, 45m, 80m (±20%).
      const baseMin = 5 * delivery.attempts * delivery.attempts;
      const jitter = baseMin * (0.8 + Math.random() * 0.4);
      delivery.status = 'pending';
      delivery.nextRetryAt = new Date(Date.now() + jitter * 60000);
    }
  }
  await delivery.save();
  return delivery;
}

/** Publish an event to all active subscribers (fire-and-log). */
export async function publishWebhookEvent(hospitalId, event, payload) {
  const subs = await WebhookSubscription.find({ hospitalId, active: true, events: event }).lean();
  for (const sub of subs) {
    const delivery = await WebhookDelivery.create({
      hospitalId, subId: sub._id, event, payload, status: 'pending',
    });
    deliverWebhook(delivery).catch((e) => logger.warn(`webhook deliver: ${e.message}`));
  }
  return subs.length;
}

router.get('/webhooks/subs', authorize('staff:manage'), async (req, res) => {
  try {
    const rows = await WebhookSubscription.find(tenant(req)).lean();
    const safe = rows.map((r) => ({ ...r, secret: r.secret ? '••••••' : '' }));
    return res.json({ subs: safe });
  } catch (err) {
    logger.error(`Webhook subs error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/webhooks/subs', authorize('staff:manage'), async (req, res) => {
  try {
    const { url, events } = req.body || {};
    if (!url || !/^https?:\/\//.test(url)) return res.status(400).json({ message: 'Valid http(s) url required' });
    const row = await WebhookSubscription.create({
      ...tenant(req), url, events: events || [],
      secret: nodeCrypto.randomBytes(24).toString('hex'),
    });
    await auditLog('webhook_sub_created', actorId(req), { subId: row._id, url, ip: req.ip });
    // Return the secret ONCE at creation; list endpoint never reveals it.
    return res.status(201).json({ id: String(row._id), secret: row.secret });
  } catch (err) {
    logger.error(`Webhook sub create error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.delete('/webhooks/subs/:id', authorize('staff:manage'), async (req, res) => {
  try {
    await WebhookSubscription.findByIdAndDelete(req.params.id);
    return res.json({ deleted: true });
  } catch (err) {
    logger.error(`Webhook sub delete error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.get('/webhooks/deliveries', authorize('staff:manage'), async (req, res) => {
  try {
    const { status } = req.query;
    const filter = tenant(req);
    if (status) filter.status = status;
    const rows = await WebhookDelivery.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    return res.json({ deliveries: rows });
  } catch (err) {
    logger.error(`Deliveries error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// Scheduler hook: retry due pending deliveries.
export async function retryDueWebhooks() {
  const due = await WebhookDelivery.find({
    status: 'pending', nextRetryAt: { $lte: new Date() },
  }).limit(100);
  for (const d of due) {
    try {
       
      await deliverWebhook(d);
    } catch (e) {
      logger.warn(`[scheduler:webhooks] ${d._id}: ${e.message}`);
    }
  }
  return due.length;
}

export default router;
