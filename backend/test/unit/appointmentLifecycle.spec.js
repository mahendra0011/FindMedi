/**
 * A5 — appointment lifecycle unit tests (pure, no HTTP).
 *
 * Two contracts are pinned here:
 *  1. The status transition table — including the 409 on the moves that used
 *     to write straight through (Completed -> anything, `Rescheduled`).
 *  2. The cancellation tier arithmetic of 5.md §2.4 at its BOUNDARIES — the
 *     whole point of the tier table is what happens exactly at 24 h and 4 h,
 *     where "about right" refunds the wrong amount.
 *
 * Plus the two definitions that must never drift apart:
 *  - dateUtils.slotStartAt vs appointmentReminder.job#appointmentInstant
 *    (same IST math, two modules that cannot import each other);
 *  - the Appointment model's status enum vs APPOINTMENT_STATUSES.
 */
import { describe, it, expect } from '@jest/globals';
import {
  APPOINTMENT_STATUS,
  APPOINTMENT_STATUSES,
  APPOINTMENT_TRANSITIONS,
  assertAppointmentTransition,
  canAppointmentTransition,
  CANCELLATION_TIER,
  PLATFORM_CANCELLATION_POLICY,
  cancellationTier,
  resolveRefundPercent,
  computeCancellation,
} from '../../src/lib/appointmentLifecycle.js';
import { slotStartAt } from '../../src/utils/dateUtils.js';
import { appointmentInstant } from '../../src/jobs/appointmentReminder.job.js';
import { updateAppointmentSchema } from '../../src/utils/validate.js';
import Appointment from '../../src/models/Appointment.js';

const H = 60 * 60 * 1000;

describe('appointment status machine (5.md §2.1)', () => {
  it('model enum and lib table expose the same statuses', () => {
    expect([...APPOINTMENT_STATUSES].sort()).toEqual(
      [...Appointment.schema.path('status').enumValues].sort(),
    );
    expect(Object.keys(APPOINTMENT_TRANSITIONS).sort()).toEqual([...APPOINTMENT_STATUSES].sort());
  });

  it('permits the documented live moves', () => {
    expect(assertAppointmentTransition('Pending', 'Confirmed')).toBe(true); // paid
    expect(assertAppointmentTransition('Pending', 'Cancelled')).toBe(true); // checkout expiry
    expect(assertAppointmentTransition('Confirmed', 'In Queue')).toBe(true); // checkin / transit
    expect(assertAppointmentTransition('Confirmed', 'Completed')).toBe(true);
    expect(assertAppointmentTransition('In Queue', 'Serving')).toBe(true);
    expect(assertAppointmentTransition('Serving', 'Completed')).toBe(true);
    expect(assertAppointmentTransition('Confirmed', 'Missed')).toBe(true); // no-show
  });

  it('treats a re-assertion of the same state as legal (idempotent retry)', () => {
    expect(assertAppointmentTransition('Cancelled', 'Cancelled')).toBe(true);
    expect(assertAppointmentTransition('Confirmed', 'Confirmed')).toBe(true);
  });

  it('refuses to un-finish or un-cancel a booking (409 ILLEGAL_STATE_TRANSITION)', () => {
    for (const [from, to] of [
      ['Completed', 'Cancelled'],
      ['Completed', 'Confirmed'],
      ['Cancelled', 'Confirmed'],
      ['Cancelled', 'Pending'],
      ['Missed', 'Completed'],
    ]) {
      let thrown = null;
      try {
        assertAppointmentTransition(from, to);
      } catch (err) { thrown = err; }
      expect(thrown).not.toBeNull();
      expect(thrown.status).toBe(409);
      expect(thrown.code).toBe('ILLEGAL_STATE_TRANSITION');
      expect(thrown.from).toBe(from);
      expect(thrown.to).toBe(to);
      expect(canAppointmentTransition(from, to)).toBe(false);
    }
  });

  it("rejects the zod schema's legacy `Rescheduled` as an illegal move", () => {
    // The schema still ACCEPTS the string so old clients get the structured
    // 409 below instead of a bare 400...
    expect(updateAppointmentSchema.safeParse({ status: 'Rescheduled' }).success).toBe(true);
    // ...but no stored status may ever transition into it.
    expect(canAppointmentTransition('Confirmed', 'Rescheduled')).toBe(false);
    expect(canAppointmentTransition('Pending', 'Rescheduled')).toBe(false);
    // And the schema still refuses statuses that never existed.
    expect(updateAppointmentSchema.safeParse({ status: 'Nope' }).success).toBe(false);
  });
});

describe('cancellation tiers (5.md §2.4 boundaries)', () => {
  const now = new Date('2026-06-15T12:00:00Z');
  const at = (hoursFromNow) => new Date(now.getTime() + hoursFromNow * H);

  it('splits the bands exactly where the spec does', () => {
    expect(cancellationTier(at(48), now)).toBe(CANCELLATION_TIER.EARLY);   // > 24 h
    expect(cancellationTier(at(24.0001), now)).toBe(CANCELLATION_TIER.EARLY);
    expect(cancellationTier(at(24), now)).toBe(CANCELLATION_TIER.MID);     // exactly 24 h -> 24–4 band
    expect(cancellationTier(at(10), now)).toBe(CANCELLATION_TIER.MID);
    expect(cancellationTier(at(4), now)).toBe(CANCELLATION_TIER.MID);      // exactly 4 h still mid
    expect(cancellationTier(at(3.999), now)).toBe(CANCELLATION_TIER.LATE); // < 4 h
    expect(cancellationTier(at(-0.001), now)).toBe(CANCELLATION_TIER.NO_SHOW);
    expect(cancellationTier(at(-48), now)).toBe(CANCELLATION_TIER.NO_SHOW);
  });

  it('treats an unusable start as LATE, never as a free full refund', () => {
    expect(cancellationTier(null, now)).toBe(CANCELLATION_TIER.LATE);
    expect(cancellationTier(undefined, now)).toBe(CANCELLATION_TIER.LATE);
    expect(cancellationTier('not-a-date', now)).toBe(CANCELLATION_TIER.LATE);
    // new Date(null) is the epoch — the trap this guards against.
    expect(cancellationTier(new Date(null), now)).toBe(CANCELLATION_TIER.NO_SHOW); // documented coercion of an actual Date(null)
  });

  it('platform bands: early pinned 100, mid default 50, late capped at 20', () => {
    expect(PLATFORM_CANCELLATION_POLICY.early).toEqual({ defaultRefundPercent: 100, minRefundPercent: 100, maxRefundPercent: 100 });
    expect(PLATFORM_CANCELLATION_POLICY.mid.defaultRefundPercent).toBe(50);
    expect(PLATFORM_CANCELLATION_POLICY.late.maxRefundPercent).toBe(20);
    expect(PLATFORM_CANCELLATION_POLICY.no_show.maxRefundPercent).toBe(20);
  });
});

describe('resolveRefundPercent — provider config clamped to platform limits', () => {
  it('patient uses the band defaults', () => {
    expect(resolveRefundPercent({ tier: 'early', cancelledBy: 'patient' })).toBe(100);
    expect(resolveRefundPercent({ tier: 'mid', cancelledBy: 'patient' })).toBe(50);
    expect(resolveRefundPercent({ tier: 'late', cancelledBy: 'patient' })).toBe(0);
    expect(resolveRefundPercent({ tier: 'no_show', cancelledBy: 'patient' })).toBe(0);
  });

  it('provider cancel is always full refund, in every band', () => {
    for (const tier of ['early', 'mid', 'late', 'no_show']) {
      expect(resolveRefundPercent({ tier, cancelledBy: 'provider' })).toBe(100);
    }
  });

  it('honours provider policy inside the band and clamps outside it', () => {
    expect(resolveRefundPercent({ tier: 'mid', cancelledBy: 'patient', policy: { midRefundPercent: 80 } })).toBe(80);
    expect(resolveRefundPercent({ tier: 'mid', cancelledBy: 'patient', policy: { midRefundPercent: 150 } })).toBe(100);
    expect(resolveRefundPercent({ tier: 'mid', cancelledBy: 'patient', policy: { midRefundPercent: -20 } })).toBe(0);
    expect(resolveRefundPercent({ tier: 'late', cancelledBy: 'patient', policy: { lateRefundPercent: 30 } })).toBe(20); // spec cap ≤ 20 %
    expect(resolveRefundPercent({ tier: 'late', cancelledBy: 'patient', policy: { lateRefundPercent: 10 } })).toBe(10);
    // The early band is a platform promise: it cannot be configured away.
    expect(resolveRefundPercent({ tier: 'early', cancelledBy: 'patient', policy: { earlyRefundPercent: 0 } })).toBe(100);
  });

  it('an unknown tier falls back to the conservative late band', () => {
    expect(resolveRefundPercent({ tier: 'weird', cancelledBy: 'patient' })).toBe(0);
  });
});

describe('computeCancellation — money out', () => {
  const start = new Date('2026-06-20T10:00:00Z');

  it('mid-band patient cancel: 50/50 split of a ₹500 fee', () => {
    const d = computeCancellation({
      startAt: start,
      now: new Date(start.getTime() - 10 * H),
      cancelledBy: 'patient',
      paidAmount: 500,
    });
    expect(d.tier).toBe('mid');
    expect(d.refundPercent).toBe(50);
    expect(d.refundAmount).toBe(250);
    expect(d.feeAmount).toBe(250);
    expect(d.refundAmount + d.feeAmount).toBe(500); // split conserves the capture
  });

  it('late patient cancel: provider keeps the fee, nothing goes back', () => {
    const d = computeCancellation({
      startAt: start,
      now: new Date(start.getTime() - 1 * H),
      cancelledBy: 'patient',
      paidAmount: 500,
    });
    expect(d.tier).toBe('late');
    expect(d.refundAmount).toBe(0);
    expect(d.feeAmount).toBe(500);
  });

  it('provider cancel one hour out: full refund despite the late band', () => {
    const d = computeCancellation({
      startAt: start,
      now: new Date(start.getTime() - 1 * H),
      cancelledBy: 'provider',
      paidAmount: 500,
    });
    expect(d.tier).toBe('late');
    expect(d.cancelledBy).toBe('provider');
    expect(d.refundAmount).toBe(500);
    expect(d.feeAmount).toBe(0);
  });

  it('an unpaid booking cancels with zero on both sides', () => {
    const d = computeCancellation({ startAt: start, now: new Date(), cancelledBy: 'patient', paidAmount: 0 });
    expect(d.refundAmount).toBe(0);
    expect(d.feeAmount).toBe(0);
  });

  it('splits in integer paise so the two sides always sum to the capture', () => {
    const d = computeCancellation({
      startAt: start,
      now: new Date(start.getTime() - 10 * H),
      cancelledBy: 'patient',
      paidAmount: 999.99,
    });
    expect(d.refundAmount + d.feeAmount).toBe(999.99);
    expect(Number.isInteger(Math.round(d.refundAmount * 100))).toBe(true);
  });
});

describe('slotStartAt — IST wall clock to instant', () => {
  it('agrees with the reminder job instant at every sampled slot', () => {
    const samples = [
      ['2026-03-10', '00:15'], // pre-dawn IST: previous UTC day
      ['2026-03-10', '05:30'], // exactly the offset
      ['2026-03-10', '12:00'],
      ['2026-12-31', '23:59'],
      ['2026-01-01', '00:00'],
      ['2026-02-28', '09:05'],
    ];
    for (const [date, time] of samples) {
      const mine = slotStartAt(date, time);
      const theirs = appointmentInstant(date, time);
      expect(mine).not.toBeNull();
      expect(mine.getTime()).toBe(theirs.getTime());
    }
  });

  it('rejects non-dates instead of normalising them', () => {
    expect(slotStartAt('2026-02-31', '10:00')).toBeNull();
    expect(slotStartAt('2026-13-01', '10:00')).toBeNull();
    expect(slotStartAt('not-a-date', '10:00')).toBeNull();
    expect(slotStartAt('2026-03-10', '99:99')).toBeNull();
    expect(slotStartAt(null, undefined)).toBeNull();
  });
});
