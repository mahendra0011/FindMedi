/**
 * A5 — appointment lifecycle: the status state machine plus the cancellation
 * refund policy of 5.md §2.4, in one PURE module (no mongoose, no config).
 *
 * WHY A SEPARATE MODULE
 * Three copies of "what may move to what" existed: the model enum, the zod
 * schema (which even carried a `Rescheduled` value the model rejects at
 * runtime), and whatever each handler happened to write. The same drift
 * afflicted refunds — there was NO cancellation policy at all, so a cancel
 * three hours out silently kept the full fee while the spec's tier table
 * (>24 h full refund, 24–4 h partial, <4 h none-or-≤20 %) was unimplemented
 * and untestable.
 *
 * So the table lives here, the model takes its `enum` from it, the route
 * asserts before it writes, and the tier arithmetic is a pure function of
 * (start, now, actor, paid) that a unit test can pin at the boundaries.
 * Money moves through utils/money.js paise arithmetic — 0.1 + 0.2 must not
 * decide a refund.
 *
 * Provider-configurable percents (5.md §2.4 "provider-configurable within
 * platform limits") are accepted through `policy` and CLAMPED to
 * PLATFORM_CANCELLATION_POLICY; no route passes one yet, so the platform
 * defaults are what apply.
 */
import { assertTransition, canTransition } from './flowStates.js';
import { toPaise, fromPaise } from '../utils/money.js';

// ==============================================================================
// Status machine
// ==============================================================================

export const APPOINTMENT_STATUS = Object.freeze({
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
  IN_QUEUE: 'In Queue',
  SERVING: 'Serving',
  MISSED: 'Missed',
});

/** The model enum is THIS list — one definition, no drifting copies. */
export const APPOINTMENT_STATUSES = Object.freeze(Object.values(APPOINTMENT_STATUS));

/**
 * The only legal moves. Anything absent is rejected with 409
 * ILLEGAL_STATE_TRANSITION (flowStates.assertTransition).
 *
 * Notes on the shape:
 *  - Pending -> Confirmed is the payment gate in routes/appointments.js and the
 *    auto-confirm in routes/billing.js; Pending -> Cancelled is checkout expiry.
 *  - Confirmed -> In Queue covers both checkin and transit-arrived.
 *  - Completed is terminal: "cancel a finished consult" is a refund dispute,
 *    not a status change.
 *  - Missed is terminal for the same reason: converting a no-show into a
 *    completion would erase the evidence the penalty decision rests on.
 *  - `Rescheduled` is deliberately ABSENT: it is not a stored state. The zod
 *    schema still accepts the legacy string so old clients get a structured
 *    409 explaining the move rather than a bare 400.
 */
export const APPOINTMENT_TRANSITIONS = Object.freeze({
  [APPOINTMENT_STATUS.PENDING]: [
    APPOINTMENT_STATUS.CONFIRMED,
    APPOINTMENT_STATUS.CANCELLED,
    APPOINTMENT_STATUS.MISSED,
  ],
  [APPOINTMENT_STATUS.CONFIRMED]: [
    APPOINTMENT_STATUS.CANCELLED,
    APPOINTMENT_STATUS.COMPLETED,
    APPOINTMENT_STATUS.IN_QUEUE,
    APPOINTMENT_STATUS.MISSED,
  ],
  [APPOINTMENT_STATUS.IN_QUEUE]: [
    APPOINTMENT_STATUS.SERVING,
    APPOINTMENT_STATUS.COMPLETED,
    APPOINTMENT_STATUS.CANCELLED,
    APPOINTMENT_STATUS.MISSED,
  ],
  [APPOINTMENT_STATUS.SERVING]: [
    APPOINTMENT_STATUS.COMPLETED,
    APPOINTMENT_STATUS.CANCELLED,
    APPOINTMENT_STATUS.MISSED,
    APPOINTMENT_STATUS.IN_QUEUE,
  ],
  [APPOINTMENT_STATUS.COMPLETED]: [],
  [APPOINTMENT_STATUS.MISSED]: [],
  [APPOINTMENT_STATUS.CANCELLED]: [],
});

/** Throws FlowTransitionError (409, code ILLEGAL_STATE_TRANSITION) on a bad move. */
export const assertAppointmentTransition = (from, to) =>
  assertTransition('appointment', APPOINTMENT_TRANSITIONS, from, to);

export const canAppointmentTransition = (from, to) =>
  canTransition(APPOINTMENT_TRANSITIONS, from, to);

// ==============================================================================
// Cancellation policy (5.md §2.4)
// ==============================================================================

export const CANCELLATION_TIER = Object.freeze({
  EARLY: 'early',       // more than 24 h before start
  MID: 'mid',           // 24 h to 4 h before start (inclusive both ends)
  LATE: 'late',         // less than 4 h before start
  NO_SHOW: 'no_show',   // the start has already passed
});

/**
 * Platform limits. Provider policy may pick any percent WITHIN the band; the
 * clamp is what keeps "configurable" from becoming "unlimited". The early band
 * is pinned at 100 — a platform that promises a full refund 24 h out cannot let
 * a provider configure that away.
 */
export const PLATFORM_CANCELLATION_POLICY = Object.freeze({
  [CANCELLATION_TIER.EARLY]: Object.freeze({ defaultRefundPercent: 100, minRefundPercent: 100, maxRefundPercent: 100 }),
  [CANCELLATION_TIER.MID]: Object.freeze({ defaultRefundPercent: 50, minRefundPercent: 0, maxRefundPercent: 100 }),
  [CANCELLATION_TIER.LATE]: Object.freeze({ defaultRefundPercent: 0, minRefundPercent: 0, maxRefundPercent: 20 }),
  [CANCELLATION_TIER.NO_SHOW]: Object.freeze({ defaultRefundPercent: 0, minRefundPercent: 0, maxRefundPercent: 20 }),
});

/**
 * Which band does this cancel fall in?
 *
 * An unusable start (null, garbage) is treated as LATE — the conservative
 * direction: a parse failure must never hand out the full refund by accident.
 */
export function cancellationTier(startAt, now = new Date()) {
  // null/undefined/'' must not fall through to `new Date(null)` — that is the
  // epoch, which would read as a no-show with 40 years on the clock.
  if (startAt === null || startAt === undefined || startAt === '') return CANCELLATION_TIER.LATE;
  const start = new Date(startAt).getTime();
  if (!Number.isFinite(start)) return CANCELLATION_TIER.LATE;
  const hoursLeft = (start - now.getTime()) / (60 * 60 * 1000);
  if (hoursLeft < 0) return CANCELLATION_TIER.NO_SHOW;
  if (hoursLeft > 24) return CANCELLATION_TIER.EARLY;
  if (hoursLeft >= 4) return CANCELLATION_TIER.MID;
  return CANCELLATION_TIER.LATE;
}

/**
 * Refund percent for (tier, actor). A PROVIDER cancel is always 100 % —
 * 5.md §2.4 gives the patient a full refund in every row of the provider
 * column; the apology credit / compensation / penalty the spec attaches to
 * those rows are separate ledger decisions and are not computed here.
 */
export function resolveRefundPercent({ tier, cancelledBy = 'patient', policy = {} } = {}) {
  if (cancelledBy === 'provider') return 100;
  const band = PLATFORM_CANCELLATION_POLICY[tier] || PLATFORM_CANCELLATION_POLICY[CANCELLATION_TIER.LATE];
  const requested = policy?.[`${tier}RefundPercent`];
  const wanted = (requested === undefined || requested === null || !Number.isFinite(Number(requested)))
    ? band.defaultRefundPercent
    : Number(requested);
  return Math.min(band.maxRefundPercent, Math.max(band.minRefundPercent, wanted));
}

/**
 * The whole decision in one value: what the patient gets back, what the
 * provider keeps. Paise in, paise out.
 */
export function computeCancellation({
  startAt,
  now = new Date(),
  cancelledBy = 'patient',
  paidAmount = 0,
  policy = {},
} = {}) {
  const tier = cancellationTier(startAt, now);
  const refundPercent = resolveRefundPercent({ tier, cancelledBy, policy });
  const paidPaise = toPaise(paidAmount);
  const refundPaise = Math.round((paidPaise * refundPercent) / 100);
  return {
    tier,
    cancelledBy: cancelledBy === 'provider' ? 'provider' : 'patient',
    refundPercent,
    refundAmount: fromPaise(refundPaise),
    feeAmount: fromPaise(paidPaise - refundPaise),
  };
}
