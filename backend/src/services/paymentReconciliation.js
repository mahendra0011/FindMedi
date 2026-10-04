/**
 * PAY-B-04: historical completed-rows reconciliation contract.
 *
 * Every `Payment.status === 'completed'` row must trace to an authorized
 * capture path:
 *   - a verified provider settlement (webhook event / gateway reference), or
 *   - a server-created checkout for a resolvable booking/order reference
 *     (appointment / test / medicine) with a matching authoritative amount.
 *
 * Full provider history is not always available (no adapter is connected), so
 * this module classifies each row and FAILS CLOSED: anything that cannot be
 * tied to a booking/order + a capture marker is `NEEDS_REVIEW`, never `OK`.
 *
 * Pure function — no DB access — so the jest contract test and the
 * `check-completed-payments-reconciliation.mjs` report script share one
 * definition of "reconciled".
 */

export const RECONCILIATION_VERDICTS = Object.freeze({
  OK: 'OK',
  NEEDS_REVIEW: 'NEEDS_REVIEW',
});

/**
 * @param {object} payment Payment row (lean object ok)
 * @param {object} opts
 * @param {boolean|null} opts.bookingExists null = unknown (provider history
 *   unavailable); true/false = booking/order lookup result.
 * @returns {{ verdict: string, reasons: string[] }}
 */
export function classifyCompletedPayment(payment, { bookingExists = null } = {}) {
  const reasons = [];
  if (!payment) return { verdict: RECONCILIATION_VERDICTS.NEEDS_REVIEW, reasons: ['missing-payment-row'] };
  if (payment.status !== 'completed') {
    return { verdict: RECONCILIATION_VERDICTS.OK, reasons: ['not-completed'] };
  }

  const amount = Number(payment.amount);
  if (!Number.isFinite(amount) || amount <= 0) reasons.push('invalid-amount');

  if (!payment.transaction_id) reasons.push('missing-transaction_id');
  if (!payment.serviceType) reasons.push('missing-serviceType');

  // A completed row with no booking/order reference cannot be tied to any
  // capture path — the exact shape a client-minted row would have.
  if (!payment.referenceId) reasons.push('missing-referenceId');

  if (payment.referenceId && bookingExists === false) reasons.push('orphan-missing-booking');
  if (payment.referenceId && bookingExists === null) reasons.push('unverified-booking-reference');

  // Provider capture marker: a gateway/webhook reference. Absence does not
  // prove fraud (server checkout path), but without provider history it
  // cannot be marked clean on its own.
  const hasProviderMarker = Boolean(payment.provider || payment.gatewayReference || payment.webhookEventId);
  if (!hasProviderMarker) reasons.push('no-provider-capture-marker');

  // Fail closed: a completed row is OK only when it has a reference that
  // resolves AND carries no structural defects.
  const structuralDefects = reasons.filter((r) =>
    ['invalid-amount', 'missing-transaction_id', 'missing-serviceType', 'missing-referenceId', 'orphan-missing-booking'].includes(r)
  );
  if (payment.referenceId && bookingExists === true && structuralDefects.length === 0) {
    return { verdict: RECONCILIATION_VERDICTS.OK, reasons };
  }
  return { verdict: RECONCILIATION_VERDICTS.NEEDS_REVIEW, reasons };
}

export default { classifyCompletedPayment, RECONCILIATION_VERDICTS };
