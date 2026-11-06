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
import crypto from 'node:crypto';

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

/** Provider-side cancellation defaults. A provider policy may override these. */
export const DEFAULT_PROVIDER_CANCEL_POLICY = Object.freeze({
  providerCompensationPercent: 0,
  providerPenaltyPercent: 0,
});

const clampPercent = (value, fallback = 0) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, n));
};

/** Provider cancellation compensation/penalty, clamped to 0..100. */
export function resolveProviderCancelPolicy(policy = {}) {
  const cfg = policy?.providerCancel || policy || {};
  return {
    providerCompensationPercent: clampPercent(
      cfg.providerCompensationPercent ?? DEFAULT_PROVIDER_CANCEL_POLICY.providerCompensationPercent,
    ),
    providerPenaltyPercent: clampPercent(
      cfg.providerPenaltyPercent ?? DEFAULT_PROVIDER_CANCEL_POLICY.providerPenaltyPercent,
    ),
  };
}

/**
 * Turn an appointment's stored policy snapshot into the flat policy shape
 * resolveRefundPercent expects. Reading the snapshot (not today's policy) is
 * what makes a later platform/provider rule change non-retroactive.
 */
export function policyFromSnapshot(snapshot) {
  const bands = snapshot?.refundBands;
  if (!bands || typeof bands !== 'object') return null;
  const policy = {};
  for (const [tier, band] of Object.entries(bands)) {
    const pct = Number(band?.defaultRefundPercent);
    if (Number.isFinite(pct)) policy[`${tier}RefundPercent`] = pct;
  }
  return Object.keys(policy).length ? policy : null;
}

/**
 * Split a refund across the original funding sources. Combined wallet+gateway
 * payments are refunded in the same proportion they were paid; a single-source
 * payment goes back where it came from. Rounded in paise, with the remainder on
 * the gateway side so the two parts always equal the refund exactly.
 */
export function allocateRefund({
  refundAmount = 0,
  paidAmount = 0,
  method = 'gateway',
  walletPaid,
  gatewayPaid,
} = {}) {
  const refundPaise = Math.round(toPaise(refundAmount));
  const paidPaise = Math.round(toPaise(paidAmount));
  const hasWallet = walletPaid !== undefined && walletPaid !== null;
  const hasGateway = gatewayPaid !== undefined && gatewayPaid !== null;
  let walletPaise = hasWallet ? Math.round(toPaise(walletPaid)) : 0;
  let gatewayPaise = hasGateway ? Math.round(toPaise(gatewayPaid)) : 0;
  if (!hasWallet && !hasGateway) {
    if (method === 'wallet') walletPaise = paidPaise;
    else gatewayPaise = paidPaise;
  }
  walletPaise = Math.max(0, walletPaise);
  gatewayPaise = Math.max(0, gatewayPaise);
  const fundedPaise = walletPaise + gatewayPaise;
  if (refundPaise <= 0 || fundedPaise <= 0) {
    return { walletAmount: 0, gatewayAmount: 0 };
  }
  const walletRefundPaise = Math.round((refundPaise * walletPaise) / fundedPaise);
  return {
    walletAmount: fromPaise(walletRefundPaise),
    gatewayAmount: fromPaise(refundPaise - walletRefundPaise),
  };
}

/**
 * The whole decision in one value: what the patient gets back, what the
 * provider keeps, how the refund is split, and (for provider cancellations)
 * the policy compensation/penalty. Paise in, paise out.
 */
export function computeCancellation({
  startAt,
  now = new Date(),
  cancelledBy = 'patient',
  paidAmount = 0,
  policy = {},
  policySnapshot = null,
  payment = null,
} = {}) {
  const tier = cancellationTier(startAt, now);
  // A booking's snapshot wins over today's platform/provider rules.
  const effectivePolicy = policyFromSnapshot(policySnapshot) || policy;
  const refundPercent = resolveRefundPercent({ tier, cancelledBy, policy: effectivePolicy });
  const paidPaise = Math.round(toPaise(paidAmount));
  const refundPaise = Math.round((paidPaise * refundPercent) / 100);
  const refundAmount = fromPaise(refundPaise);
  const split = allocateRefund({
    refundAmount,
    paidAmount,
    method: payment?.method || 'gateway',
    walletPaid: payment?.walletAmount,
    gatewayPaid: payment?.gatewayAmount,
  });
  const providerPolicy = resolveProviderCancelPolicy(
    policySnapshot?.providerCancel ? { providerCancel: policySnapshot.providerCancel } : policy,
  );
  const appliesToProvider = cancelledBy === 'provider';
  const compensationPaise = appliesToProvider
    ? Math.round((paidPaise * providerPolicy.providerCompensationPercent) / 100)
    : 0;
  const penaltyPaise = appliesToProvider
    ? Math.round((paidPaise * providerPolicy.providerPenaltyPercent) / 100)
    : 0;
  return {
    tier,
    cancelledBy: appliesToProvider ? 'provider' : 'patient',
    refundPercent,
    refundAmount,
    feeAmount: fromPaise(paidPaise - refundPaise),
    refundWalletAmount: split.walletAmount,
    refundGatewayAmount: split.gatewayAmount,
    providerCompensationAmount: fromPaise(compensationPaise),
    providerPenaltyAmount: fromPaise(penaltyPaise),
  };
}

// --- SITE-BOK 2.1/2.2: policy identity travels with the booking --------------
// The tier table above IS the refund engine; what was missing is a SNAPSHOT of
// which table decided the number: a platform bump or a provider override has to
// change future bookings only, and a dispute on an existing booking must read
// the exact rules that were in force when it was created. Every appointment
// write stamps `policySnapshot` at creation; every refund re-derives the tier
// from the SAME snapshot version and records it on the Refund row.

export const BOOKING_POLICY_VERSION = 'booking-cancellation-v2';
export const BOOKING_POLICY_CONTEXT = 'booking_cancellation';

const canonicalPolicyBands = () =>
  Object.fromEntries(Object.entries(PLATFORM_CANCELLATION_POLICY).map(([tier, band]) => [tier, { ...band }]));

/** Hash of the exact policy text — bumping the version without changing the rules keeps the same hash. */
export const policyDocumentHash = (bands = canonicalPolicyBands(), providerCancel = DEFAULT_PROVIDER_CANCEL_POLICY) =>
  crypto.createHash('sha256').update(JSON.stringify({ version: BOOKING_POLICY_VERSION, bands, providerCancel })).digest('hex');

/** The snapshot embedded into a booking at creation time. Pure — pass `now`. */
export function bookingPolicySnapshot(now = new Date()) {
  const bands = canonicalPolicyBands();
  const providerCancel = { ...DEFAULT_PROVIDER_CANCEL_POLICY };
  return {
    version: BOOKING_POLICY_VERSION,
    context: BOOKING_POLICY_CONTEXT,
    refundBands: bands,
    providerCancel,
    documentHash: policyDocumentHash(bands, providerCancel),
    acceptedAt: new Date(now),
  };
}
