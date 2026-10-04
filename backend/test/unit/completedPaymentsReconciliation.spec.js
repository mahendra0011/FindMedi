/**
 * PAY-B-04: historical completed-rows reconciliation contract.
 * Every completed row must trace to an authorized capture path; anything that
 * cannot be tied to a booking/order is NEEDS_REVIEW (fail closed), because
 * full provider history may be unavailable.
 */
import { classifyCompletedPayment } from '../../src/services/paymentReconciliation.js';

describe('PAY-B-04 · classifyCompletedPayment', () => {
  const healthy = {
    _id: 'pay-1', status: 'completed', amount: 500,
    transaction_id: 'TXN-1', serviceType: 'appointment',
    referenceId: 'appt-1', provider: 'razorpay',
  };

  it('marks a referenced, resolvable row OK', () => {
    const out = classifyCompletedPayment(healthy, { bookingExists: true });
    expect(out.verdict).toBe('OK');
  });

  it('flags a completed row with no reference (client-mint shape) for review', () => {
    const out = classifyCompletedPayment({ ...healthy, referenceId: '' }, { bookingExists: null });
    expect(out.verdict).toBe('NEEDS_REVIEW');
    expect(out.reasons).toContain('missing-referenceId');
  });

  it('flags an orphan whose booking no longer exists', () => {
    const out = classifyCompletedPayment(healthy, { bookingExists: false });
    expect(out.verdict).toBe('NEEDS_REVIEW');
    expect(out.reasons).toContain('orphan-missing-booking');
  });

  it('fails closed when the booking cannot be verified (no provider history)', () => {
    const out = classifyCompletedPayment(healthy, { bookingExists: null });
    expect(out.verdict).toBe('NEEDS_REVIEW');
    expect(out.reasons).toContain('unverified-booking-reference');
  });

  it('flags zero/negative amounts and missing transaction ids', () => {
    expect(classifyCompletedPayment({ ...healthy, amount: 0 }, { bookingExists: true }).verdict).toBe('NEEDS_REVIEW');
    expect(classifyCompletedPayment({ ...healthy, transaction_id: '' }, { bookingExists: true }).reasons)
      .toContain('missing-transaction_id');
  });

  it('ignores non-completed rows', () => {
    expect(classifyCompletedPayment({ ...healthy, status: 'pending' }).verdict).toBe('OK');
  });
});
