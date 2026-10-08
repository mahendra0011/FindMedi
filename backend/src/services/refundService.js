/**
 * The one way money goes back to a payer.
 *
 * Three call sites each grew their own copy of request-then-settle
 * (routes/payments.js inline, routes/events.js#issueRefund, and now the
 * appointment cancel path), and every copy had to remember the same four
 * rules: refunds are idempotent on a key, a failed settle must be RECORDED on
 * the refund row rather than swallowed, production has no gateway adapter so
 * it must refuse rather than pretend (PAY-B-08), and a refund amount of zero
 * is not a refund.
 *
 * This module owns those rules. The callers own the DECISION — how much, why,
 * under which reason code — because only the caller knows the policy that
 * produced the number.
 */
import Refund from '../models/Refund.js';
import logger from '../config/logger.js';

/**
 * @param {object} p
 * @param {import('mongoose').Types.ObjectId|string} p.paymentId
 * @param {number} p.amount          refund amount in rupees (> 0)
 * @param {number} p.originalAmount  original captured amount (requestRefund validates against it)
 * @param {string} p.reason          human-readable why (stored on the refund row)
 * @param {string} p.reasonCode      Refund.reasonCode enum value
 * @param {string} p.idempotencyKey  stable per intent — a retry must collide
 * @param {import('mongoose').Types.ObjectId|string|null} [p.requestedBy]
 * @returns {Promise<{ok: true, refund, duplicate?: boolean}
 *                  | {ok: false, reason: string, refund?}>}
 */
export async function issueRefund({
  paymentId,
  amount,
  originalAmount,
  reason,
  reasonCode = 'patient_request',
  idempotencyKey,
  requestedBy = null,
}) {
  if (!paymentId) return { ok: false, reason: 'no-payment' };
  if (!(Number(amount) > 0)) return { ok: false, reason: 'no-amount' };
  if (!idempotencyKey) return { ok: false, reason: 'no-idempotency-key' };
  // PAY-B-08: no provider adapter is connected in production. Recording a
  // refund that never moved money is worse than not recording one.
  if (process.env.NODE_ENV === 'production') return { ok: false, reason: 'provider-unavailable' };
  try {
    const { refund, created } = await Refund.requestRefund({
      paymentId,
      amount,
      originalAmount,
      reason,
      reasonCode,
      idempotencyKey,
      requestedBy,
    });
    if (!created) return { ok: true, refund, duplicate: true };
    try {
      const settle = await Refund.settleRefund({ paymentId, amount });
      refund.status = settle.status;
      refund.settledAt = new Date();
      await refund.save();
      return { ok: true, refund };
    } catch (settleErr) {
      refund.status = 'FAILED';
      refund.failureReason = settleErr.message;
      await refund.save().catch(() => {});
      return { ok: false, reason: settleErr.message, refund };
    }
  } catch (err) {
    logger.error(`issueRefund failed for payment ${paymentId}: ${err.message}`);
    return { ok: false, reason: err.message };
  }
}
