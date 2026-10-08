import Payment from '../models/Payment.js';
import { toPaise } from '../utils/money.js';

/**
 * Verify a completed payment BEFORE a paid row is written.
 *
 * The client supplies only the payment's id; owner, status and amount are read
 * back here. `patient_id` is the payer, `status` must be `completed`, and
 * `amount` must cover the price the SERVER computed from the catalogue row -
 * so neither the price nor "who paid" can be asserted by the request.
 *
 * Extracted from routes/events.js (its paid registration used this rule) so
 * the membership purchase (5.md Flow D) enforces the identical contract from
 * one source: two hand-copied copies of a money guard drift, and the drifted
 * one is always the one that accepts too much. Returns the payment row on
 * success and `null` for every failure mode - the CALLER chooses the status
 * code and message for its own endpoint.
 */
export const verifiedPaymentFor = async (paymentId, userId, amount) => {
  const payment = await Payment.findById(paymentId).lean();
  if (!payment) return null;
  if (String(payment.patient_id ?? '') !== String(userId)) return null;
  if (payment.status !== 'completed') return null;
  if (toPaise(payment.amount) < toPaise(amount)) return null;
  return payment;
};
