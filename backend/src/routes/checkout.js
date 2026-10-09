import express from 'express';
import Payment from '../models/Payment.js';
import { protect, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { gatewayFor } from '../lib/gateways.js';
import logger from '../config/logger.js';

// File 16 §16.2: gateway-normalized payment intents + verified webhooks.
// State machine: pending → completed | failed; completed → refunded (full).
// Idempotency: (gatewayOrderId) unique per intent; webhook replays replay the
// same transition instead of double-posting.

const router = express.Router();

router.post('/intents', protect, authorize('billing:write'), async (req, res) => {
  try {
    const { amount, gateway, patientId, patientName, invoiceId, referenceId, description } = req.body || {};
    if (!amount || Number(amount) <= 0) return res.status(400).json({ message: 'amount required' });
    const gw = gatewayFor(gateway);
    const receipt = `rcpt_${Date.now()}`;
    let order;
    try {
      order = await gw.createOrder({ amount: Number(amount), receipt });
    } catch (e) {
      return res.status(422).json({ message: e.message, code: e.code || 'GATEWAY_ERROR' });
    }
    const row = await Payment.create({
      transactionId: `txn_${receipt}`,
      patientId: String(patientId || req.user._id || ''),
      patientName: String(patientName || req.user.name || ''),
      amount: Number(amount), method: 'upi', status: 'pending',
      invoiceId: invoiceId || '', referenceId: referenceId || '',
      description: description || '', gateway: gw.name,
      gatewayOrderId: order.gatewayOrderId,
      hospitalId: req.user.hospitalId || undefined,
      attempts: [{ at: new Date(), gateway: gw.name, event: 'intent.created', payload: order }],
    });
    return res.status(201).json({
      id: String(row._id), gatewayOrderId: order.gatewayOrderId, amount: order.amount,
    });
  } catch (err) {
    logger.error(`Payment intent error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// Public webhook (signature-verified; raw body needed → mounted with express.raw in index).
// File 22 P0-9: replay-safe — a seen gatewayPaymentId short-circuits to the
// stored status WITHOUT re-running the transition (no double ledger posts).
router.post('/webhooks/:gateway', async (req, res) => {
  try {
    const gw = gatewayFor(req.params.gateway);
    const raw = req.body instanceof Buffer ? req.body : Buffer.from(JSON.stringify(req.body || {}));
    const signature = req.get('x-razorpay-signature') || req.get('x-signature') || req.get('x-webhook-signature') || '';
    if (gw.name !== 'mock' && !gw.verifyWebhookSignature(raw, signature)) {
      return res.status(401).json({ message: 'Bad signature' });
    }
    const payload = req.body instanceof Buffer ? JSON.parse(raw.toString() || '{}') : (req.body || {});
    const evt = gw.normalizeEvent(payload);
    // Replay check FIRST (payment-id is the provider's idempotency key).
    if (evt.gatewayPaymentId) {
      const seen = await Payment.findOne({ gatewayPaymentId: evt.gatewayPaymentId });
      if (seen) {
        await auditLog('gateway_webhook_replay', null, { gateway: gw.name, paymentId: evt.gatewayPaymentId });
        return res.json({ ok: true, status: seen.status, replay: true });
      }
    }
    const row = await Payment.findOne({ gatewayOrderId: evt.gatewayOrderId });
    if (!row) return res.status(404).json({ message: 'Unknown order' });
    row.attempts.push({ at: new Date(), gateway: gw.name, event: evt.event, payload });
    if (/captured|completed|paid|success/i.test(evt.event) && row.status === 'pending') {
      row.status = 'completed';
      row.gatewayPaymentId = evt.gatewayPaymentId;
      row.gatewaySignature = String(signature || '').slice(0, 200);
      row.settledAt = new Date();
    } else if (/failed/i.test(evt.event) && row.status === 'pending') {
      row.status = 'failed';
    }
    await row.save();
    await auditLog('gateway_webhook', null, { gateway: gw.name, event: evt.event, orderId: evt.gatewayOrderId });
    return res.json({ ok: true, status: row.status });
  } catch (err) {
    logger.error(`Gateway webhook error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/:id/refund', protect, authorize('billing:write'), async (req, res) => {
  try {
    const row = await Payment.findById(req.params.id);
    if (!row || row.status !== 'completed') return res.status(404).json({ message: 'Completed payment not found' });
    const amount = Number(req.body?.amount) || row.amount;
    if (amount > row.amount) return res.status(400).json({ message: 'Refund exceeds captured amount' });
    // File 22 P0-9: refund through the provider when live (mock records locally).
    const gw = gatewayFor(row.gateway);
    let providerRefund = null;
    if (gw.name !== 'mock' && row.gatewayPaymentId) {
      try {
        providerRefund = await gw.refund(row.gatewayPaymentId, amount);
      } catch (e) {
        return res.status(422).json({ message: `Provider refund failed: ${e.message}`, code: e.code || 'GATEWAY_ERROR' });
      }
    }
    // Single full-refund transition (partial chain lives in CreditNote).
    row.status = 'refunded';
    row.refundAmount = amount;
    row.refundedAt = new Date();
    row.attempts.push({ at: new Date(), gateway: row.gateway, event: 'refund.issued', payload: { amount, providerRefund } });
    await row.save();
    await auditLog('payment_refunded', req.user._id ?? req.user.id, { paymentId: row._id, amount, ip: req.ip });
    return res.json({ id: String(row._id), status: row.status });
  } catch (err) {
    logger.error(`Refund error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// File 22 P0-9: reconcile — verify unsettled completed payments against the
// provider and mark settled. Scheduler calls this per hospital (idempotent).
export async function reconcileGatewayTenant(hospitalId, gatewayName) {
  const gw = gatewayFor(gatewayName);
  if (!gw.configured) return { gateway: gw.name, checked: 0, settled: 0, skipped: 'not-configured' };
  const rows = await Payment.find({
    hospitalId, gateway: gw.name, status: 'completed', settledAt: null,
    gatewayPaymentId: { $ne: '' },
  }).limit(100);
  let settled = 0;
  for (const row of rows) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const live = await gw.fetchPayment(row.gatewayPaymentId);
      row.attempts.push({ at: new Date(), gateway: gw.name, event: 'reconcile.check', payload: live });
      if (/captured|completed|paid|success|settled/i.test(String(live.status || ''))) {
        row.settledAt = new Date();
        settled += 1;
      }
      // eslint-disable-next-line no-await-in-loop
      await row.save();
    } catch (e) {
      logger.warn(`reconcile ${row._id}: ${e.message}`);
    }
  }
  return { gateway: gw.name, checked: rows.length, settled };
}

router.post('/reconcile', protect, authorize('billing:write'), async (req, res) => {
  try {
    const out = await reconcileGatewayTenant(req.user.hospitalId, req.body?.gateway || 'razorpay');
    return res.json(out);
  } catch (err) {
    logger.error(`Reconcile error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// Payment link for desk/remote collection (live gateways only).
router.post('/payment-links', protect, authorize('billing:write'), async (req, res) => {
  try {
    const { amount, gateway, description, customer } = req.body || {};
    if (!amount || Number(amount) <= 0) return res.status(400).json({ message: 'amount required' });
    const gw = gatewayFor(gateway);
    if (gw.name === 'mock' || typeof gw.createPaymentLink !== 'function') {
      return res.status(422).json({ message: 'Payment links need a live gateway (razorpay)', code: 'GATEWAY_NOT_CONFIGURED' });
    }
    const link = await gw.createPaymentLink({ amount: Number(amount), description, customer });
    await auditLog('payment_link_created', req.user._id ?? req.user.id, { amount, gateway: gw.name, ip: req.ip });
    return res.status(201).json(link);
  } catch (err) {
    return res.status(422).json({ message: err.message, code: err.code || 'GATEWAY_ERROR' });
  }
});

export default router;
