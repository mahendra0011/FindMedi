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
router.post('/webhooks/:gateway', async (req, res) => {
  try {
    const gw = gatewayFor(req.params.gateway);
    const raw = req.body instanceof Buffer ? req.body : Buffer.from(JSON.stringify(req.body || {}));
    const signature = req.get('x-razorpay-signature') || req.get('x-signature') || '';
    if (gw.name !== 'mock' && !gw.verifyWebhookSignature(raw, signature)) {
      return res.status(401).json({ message: 'Bad signature' });
    }
    const payload = req.body instanceof Buffer ? JSON.parse(raw.toString() || '{}') : (req.body || {});
    const evt = gw.normalizeEvent(payload);
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
    // Single full-refund transition (partial chain lives in CreditNote).
    row.status = 'refunded';
    row.refundAmount = amount;
    row.refundedAt = new Date();
    row.attempts.push({ at: new Date(), gateway: row.gateway, event: 'refund.issued', payload: { amount } });
    await row.save();
    await auditLog('payment_refunded', req.user._id ?? req.user.id, { paymentId: row._id, amount, ip: req.ip });
    return res.json({ id: String(row._id), status: row.status });
  } catch (err) {
    logger.error(`Refund error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
