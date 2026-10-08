import express from 'express';
import Payment from '../models/Payment.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { protect, adminOnly, authorize } from '../middleware/auth.js';
import { validate, createPaymentSchema, updatePaymentSchema, refundPaymentSchema } from '../utils/validate.js';
import { auditLog } from '../middleware/audit.js';
import { paymentLimiter } from '../middleware/rateLimit.js';
import { idempotencyGuard } from '../middleware/idempotency.js';
import { requireStepUp } from '../middleware/stepUpAuth.js';
import { paginatedResults } from '../utils/pagination.js';
import { generateTransactionId } from '../utils/idGenerator.js';
import { getISTDateString } from '../utils/dateUtils.js';
import { mirrorPayment } from '../lib/pgDualWrite.js';
import logger from '../config/logger.js';
// A5 (5.md §15): a payment booked against an appointment is priced by the
// server — the client amount is only a checksum against the doctor's listed fee.
import Appointment from '../models/Appointment.js';
import { resolveAuthoritativeAmount, assertAmountMatches } from '../services/pricingService.js';

const router = express.Router();

// GET /api/payments — paginated list.
// Previously returned EVERY matching document (`Payment.find(filter).sort()`
// with no limit), so a hospital with years of history loaded it all. Uses the
// same `paginatedResults` helper as /transactions so list endpoints behave
// consistently (helper clamps limit to 1..100).
router.get('/', protect, authorize('billing:read', 'billing:read:own'), async (req, res) => {
  try {
    const { status, patient_id, page, limit } = req.query;
    const filter = {};
    // DLB-28: this list had no authorize() and scoped with
    // `if (req.user.hospitalId && role !== 'superadmin')`, so every account
    // without a hospital (riders, lawyers, assistants, nurses, doctors) listed
    // EVERY payment on the platform, and `?patient_id=` was a cross-tenant read
    // for every staff role.
    if (req.user.role === 'patient') {
      filter.patient_id = req.user._id.toString();
    } else if (req.user.role === 'superadmin') {
      if (patient_id) filter.patient_id = patient_id;
    } else {
      if (!req.user.hospitalId) {
        return res.status(403).json({ message: 'No hospital scope for this account' });
      }
      filter.hospitalId = req.user.hospitalId;
      if (patient_id) filter.patient_id = patient_id;
    }
    if (status && status !== 'All') filter.status = status;

    const [result, amountAgg] = await Promise.all([
      paginatedResults(Payment, filter, { page, limit, sort: { createdAt: -1 } }),
      // Summed across the WHOLE filter, not just the page — consumers treat
      // `total_amount` as the cohort total, never as a page subtotal.
      Payment.aggregate([{ $match: filter }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    ]);

    res.json({
      payments: result.data,
      total_amount: amountAgg[0]?.total || 0,
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PAY-B-10: this route had NO role gate and accepted a client-authored `status`
// plus an arbitrary `patient_id`, so ANY authenticated user could mint a
// `completed` payment against somebody else's patient and fire them a
// "Payment Received" notification. Payment capture is now staff-only, the
// status is server-set and the patient linkage is tenant-authoritative.
const PAYMENT_STAFF_ROLES = ['hospital_admin', 'superadmin', 'accountant', 'pharmacy_owner', 'lab_owner'];
router.post('/', protect, paymentLimiter, (req, res, next) => {
  if (!PAYMENT_STAFF_ROLES.includes(req.user.role)) {
    return res.status(403).json({ message: 'Only hospital staff can record a payment' });
  }
  next();
}, validate(createPaymentSchema), idempotencyGuard({ prefix: 'payment-create', failClosed: true }), async (req, res) => {
  try {
    const transaction_id = generateTransactionId();
    // The patient must belong to the caller's tenant (or be the caller).
    const requestedPatient = req.body.patient_id;
    if (!requestedPatient) return res.status(400).json({ message: 'patient_id is required' });
    const patient = await User.findById(requestedPatient).select('_id hospitalId role name').lean();
    if (!patient || patient.role !== 'patient') return res.status(404).json({ message: 'Patient not found' });
    if (req.user.role !== 'superadmin' && (!req.user.hospitalId || String(patient.hospitalId || '') !== String(req.user.hospitalId))) {
      return res.status(403).json({ message: 'Patient is outside your hospital scope' });
    }
    // A5 (5.md §15): PAY-B-01 extended to the staff capture path. When the
    // payment is linked to an appointment the authoritative price is the
    // doctor's listed fee; `amount` may CONFIRM it, never SET it. The linkage
    // used to be dropped entirely (no referenceId), so even a correct check
    // could not later be reconciled against the booking.
    const referenceId = req.body.appointment_id || req.body.bill_id || undefined;
    if (req.body.appointment_id && (!req.body.serviceType || req.body.serviceType === 'appointment')) {
      const appointment = await Appointment.findById(req.body.appointment_id);
      if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
      const authoritative = await resolveAuthoritativeAmount({ serviceType: 'appointment', appointment });
      if (!authoritative.ok) {
        return res.status(400).json({ message: authoritative.message, code: 'NO_SERVER_PRICE' });
      }
      const match = assertAmountMatches(authoritative.amount, req.body.amount);
      if (!match.ok) {
        return res.status(409).json({
          message: match.message,
          code: 'PRICE_MISMATCH',
          authoritative: match.authoritative,
          received: match.received,
        });
      }
    }
    const payment = await Payment.create({
      patient_name: patient.name,
      amount: req.body.amount,
      method: req.body.method,
      description: req.body.description,
      provider: req.body.provider,
      serviceType: req.body.serviceType,
      patient_id: requestedPatient,
      transaction_id,
      referenceId,
      // Server-owned state — the client can no longer mark it completed.
      status: 'pending',
      hospitalId: req.user.hospitalId || undefined,
    });
    try {
      await Notification.create({
        userId: requestedPatient,
        title: 'Payment Pending',
        message: `A payment of INR ${payment.amount} via ${payment.method || 'card'} is pending. Transaction: ${transaction_id}`,
        type: 'payment',
        date: getISTDateString(),
      });
    } catch (notificationError) {
      // Payment persistence is authoritative; do not turn a successful insert
      // into an HTTP failure that causes a duplicate retry.
      logger.error(`Payment notification creation failed for ${payment._id}: ${notificationError.message}`);
    }
    await auditLog('create_payment', req.user._id, { paymentId: payment._id, amount: payment.amount, transaction_id });
    void mirrorPayment(payment);
    res.status(201).json(payment);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id', protect, paymentLimiter, adminOnly, validate(updatePaymentSchema), async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    // PAY-B-12: fail CLOSED - an admin account with no linked hospital could
    // otherwise edit the amount/method of, or refund, ANY tenant's payment.
    if (req.user.role !== 'superadmin') {
      if (!req.user.hospitalId || !payment.hospitalId || payment.hospitalId.toString() !== req.user.hospitalId.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }
    // Refund.settleRefund only updates our local state machine; there is no
    // provider adapter to move money. Keep production payment records unchanged
    // until a verified provider refund result can be reconciled.
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({
        message: 'Online refunds are temporarily unavailable until a payment provider is configured.',
        code: 'REFUND_PROVIDER_UNAVAILABLE',
      });
    }
    // AUTH-030: allowlisted fields only — status via refund endpoint, ids immutable.
    const { pickBody } = await import('../utils/pick.js');
    Object.assign(payment, pickBody(req.body, ['amount', 'method', 'description', 'provider', 'lineItems']));
    await payment.save();
    await auditLog('update_payment', req.user._id, { paymentId: payment._id, changes: req.body });
    void mirrorPayment(payment);
    res.json(payment);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// AUTHZ-M-03: a refund moves money back out, so it needs a fresh proof of
// possession, not just a valid session.
router.put('/:id/refund', protect, paymentLimiter, requireStepUp('refunds:issue'), idempotencyGuard({ prefix: 'refund', failClosed: true }), adminOnly, validate(refundPaymentSchema), async (req, res) => {
  try {
    // PAY-B-08: fail closed in production — same guard as PUT /:id above.
    // No provider adapter is connected, so any mutation here would record a
    // refund locally without moving money. Refuse before any read or write.
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({
        message: 'Online refunds are temporarily unavailable until a payment provider is configured.',
        code: 'REFUND_PROVIDER_UNAVAILABLE',
      });
    }
    // A5: an omitted `refund_amount` means "the rest of it" — the admin's
    // default action on a refund screen is a full refund, and forcing the
    // client to compute `amount - already_refunded` invited arithmetic errors
    // that the positive check happily accepted. Explicit amounts keep their
    // old meaning.
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    const remaining = Math.round(((Number(payment.amount) || 0) - (Number(payment.refund_amount) || 0)) * 100) / 100;
    const refund_amount = req.body.refund_amount !== undefined ? req.body.refund_amount : remaining;
    if (refund_amount <= 0) {
      return res.status(400).json({ message: 'Payment is already fully refunded', code: 'ALREADY_REFUNDED' });
    }
    if (refund_amount > payment.amount) {
      return res.status(400).json({ message: `Refund amount (${refund_amount}) cannot exceed original payment amount (${payment.amount})` });
    }
    // PAY-B-12: fail CLOSED - an admin account with no linked hospital could
    // otherwise edit the amount/method of, or refund, ANY tenant's payment.
    if (req.user.role !== 'superadmin') {
      if (!req.user.hospitalId || !payment.hospitalId || payment.hospitalId.toString() !== req.user.hospitalId.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }
    // PAY-B-07: a refund is a RECORDED, state-machine-guarded, idempotent event --
    // not a status edit. Previously `payment.status = 'refunded'` meant a
    // double-click re-ran the handler and issued TWO refunds, and a partial refund
    // reported the terminal `refunded` status. Both are now refused.
    const idemKey = req.header('Idempotency-Key') || `refund:${payment._id}:${refund_amount}`;
    const { default: Refund } = await import('../models/Refund.js');
    const { refund, created } = await Refund.requestRefund({
      paymentId: payment._id,
      amount: refund_amount,
      originalAmount: payment.amount,
      reason: req.body.reason || 'Refund processed by administrator',
      reasonCode: req.body.reasonCode || 'patient_request',
      idempotencyKey: idemKey,
      requestedBy: req.user._id,
    });

    if (!created) {
      return res.status(200).json({
        message: 'Refund already recorded for this idempotency key',
        payment, refund, duplicate: true,
      });
    }

    let settle;
    try {
      settle = await Refund.settleRefund({ paymentId: payment._id, amount: refund_amount });
    } catch (settleErr) {
      refund.status = 'FAILED';
      refund.failureReason = settleErr.message;
      await refund.save();
      return res.status(settleErr.status || 409).json({ message: settleErr.message });
    }

    const { payment: updated, status: refundStatus, totalRefunded } = settle;
    refund.status = refundStatus;
    refund.settledAt = new Date();
    await refund.save();

    await auditLog('refund_payment', req.user._id, {
      paymentId: updated._id, refundId: refund._id, refund_amount,
      totalRefunded, original_amount: updated.amount, refundStatus,
    });
    void mirrorPayment(updated);
    res.json({
      message: `Refund of ${refund_amount} processed`,
      payment: updated, refund, refundStatus, totalRefunded,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
