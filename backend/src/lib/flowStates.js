/**
 * FLOW-B (request & quote), FLOW-E (events/camps) and FLOW-G (equipment
 * rental): the state machines, plus the server-owned money arithmetic each
 * flow quotes with.
 *
 * WHY A SEPARATE MODULE
 * Every one of these three flows has the same failure mode: the model enum, the
 * route handler and the test each carry their own copy of "what may move to
 * what", and the copies drift. The first drift is always in the direction that
 * opens a hole — a handler that writes `req.body.status` straight through, or a
 * cancel branch that was added to the route but not to the enum, so the write
 * either silently fails validation or lands in a state nothing handles.
 *
 * So the transition tables live here, the models take their `enum` from them
 * (`Object.values(...)`), the routes assert before they write, and the tests
 * read the same tables. One definition, and a transition that is not in the
 * table is rejected by all three layers.
 *
 * Money arithmetic is here for the same reason (5.md 15 "server-owned pricing;
 * ignore client amounts"): the quote total and the rental charge are computed
 * from stored inputs in INTEGER PAISE via utils/money.js, never read out of the
 * request body. A client can send line items; it cannot send the total.
 */
import { toPaise, fromPaise } from '../utils/money.js';

/** An illegal move. 409, because the resource EXISTS and is simply not there. */
export class FlowTransitionError extends Error {
  constructor(machine, from, to) {
    super(`Illegal ${machine} transition ${from} -> ${to}`);
    this.name = 'FlowTransitionError';
    this.status = 409;
    this.code = 'ILLEGAL_STATE_TRANSITION';
    this.machine = machine;
    this.from = from;
    this.to = to;
  }
}

/**
 * Is `from -> to` legal for this machine?
 *
 * Re-asserting the state you are already in is NOT a transition and returns
 * true: two racing accept clicks both resolve to ACCEPTED and neither is an
 * error. Anything not in the table is.
 */
export function canTransition(table, from, to) {
  if (from === to) return true;
  return (table[from] || []).includes(to);
}

export function assertTransition(machine, table, from, to) {
  if (!canTransition(table, from, to)) throw new FlowTransitionError(machine, from, to);
  return true;
}

// ==============================================================================
// FLOW-B - request & quote (5.md 3)
//   REQUESTED -> QUOTE_SENT -> ACCEPTED | DECLINED | EXPIRED | CANCELLED
// ==============================================================================

export const QUOTE_STATUS = Object.freeze({
  REQUESTED: 'REQUESTED',
  QUOTE_SENT: 'QUOTE_SENT',
  ACCEPTED: 'ACCEPTED',
  DECLINED: 'DECLINED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
});

export const QUOTE_TRANSITIONS = Object.freeze({
  [QUOTE_STATUS.REQUESTED]: [
    QUOTE_STATUS.QUOTE_SENT,
    QUOTE_STATUS.DECLINED,
    QUOTE_STATUS.EXPIRED,
    QUOTE_STATUS.CANCELLED,
  ],
  [QUOTE_STATUS.QUOTE_SENT]: [
    QUOTE_STATUS.ACCEPTED,
    QUOTE_STATUS.DECLINED,
    QUOTE_STATUS.EXPIRED,
    QUOTE_STATUS.CANCELLED,
  ],
  // ACCEPTED is terminal on purpose. 5.md 3 continues into
  // SCHEDULED -> IN_PROGRESS -> COMPLETED -> CLOSED, and those belong to the
  // appointment/payment seam (see routes/quotes.js), not to this row: until an
  // appointment exists there is nothing that could legally become SCHEDULED.
  [QUOTE_STATUS.ACCEPTED]: [],
  [QUOTE_STATUS.DECLINED]: [],
  [QUOTE_STATUS.EXPIRED]: [],
  [QUOTE_STATUS.CANCELLED]: [],
});

/** 5.md 3: a quote is valid for 48 h, then EXPIRED. */
export const QUOTE_VALIDITY_HOURS = 48;

export const quoteExpiryDate = (from = new Date()) =>
  new Date(from.getTime() + QUOTE_VALIDITY_HOURS * 60 * 60 * 1000);

/**
 * The stored expiry is authoritative for ACCEPT; a quote read past it reports
 * EXPIRED even though the stored status still says QUOTE_SENT (no job needs to
 * have run for the rule to hold).
 */
export function isQuoteExpired(quote, now = new Date()) {
  if (quote.status !== QUOTE_STATUS.QUOTE_SENT) return false;
  const validUntil = quote?.quote?.validUntil ?? quote.expiresAt;
  return Boolean(validUntil) && new Date(validUntil).getTime() <= now.getTime();
}

export const effectiveQuoteStatus = (quote, now = new Date()) =>
  (isQuoteExpired(quote, now) ? QUOTE_STATUS.EXPIRED : quote.status);

// ==============================================================================
// FLOW-E - events and camps (5.md 6, 10.md 2.12)
// ==============================================================================

export const EVENT_TYPES = Object.freeze([
  'camp', 'workshop', 'webinar', 'vaccination', 'blood_drive', 'training', 'retreat',
]);

/**
 * 'full' is deliberately NOT a stored status: capacity is a count, and a stored
 * flag goes stale the moment one seat is released. Full is derived
 * (`registeredCount >= capacity`) at read and write time.
 */
export const EVENT_STATUS = Object.freeze({
  DRAFT: 'draft',
  OPEN: 'open',
  CANCELLED: 'cancelled',
  ENDED: 'ended',
});

export const EVENT_TRANSITIONS = Object.freeze({
  [EVENT_STATUS.DRAFT]: [EVENT_STATUS.OPEN, EVENT_STATUS.CANCELLED],
  // Unpublish back to draft only while nobody has registered — see the route.
  [EVENT_STATUS.OPEN]: [EVENT_STATUS.DRAFT, EVENT_STATUS.CANCELLED, EVENT_STATUS.ENDED],
  [EVENT_STATUS.CANCELLED]: [],
  [EVENT_STATUS.ENDED]: [],
});

/**
 * Registration states (5.md 6). REFUNDED means "cancelled AND the money went
 * back"; CANCELLED means "cancelled, nothing was owed" (free event, or after
 * the refund cut-off). Keeping them separate is what lets a refund be reported
 * without a second field.
 */
export const REGISTRATION_STATUS = Object.freeze({
  REGISTERED: 'REGISTERED',
  CHECKED_IN: 'CHECKED_IN',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
});

export const REGISTRATION_TRANSITIONS = Object.freeze({
  [REGISTRATION_STATUS.REGISTERED]: [
    REGISTRATION_STATUS.CHECKED_IN,
    REGISTRATION_STATUS.CANCELLED,
    REGISTRATION_STATUS.REFUNDED,
  ],
  // Checked in = the attendee was there. Nothing later can un-attend them; an
  // organiser cancelling AFTER check-in is a data problem, not a transition.
  [REGISTRATION_STATUS.CHECKED_IN]: [],
  [REGISTRATION_STATUS.CANCELLED]: [],
  [REGISTRATION_STATUS.REFUNDED]: [],
});

// ==============================================================================
// FLOW-G - equipment rental (5.md 8)
//   REQUESTED -> APPROVED -> ACTIVE -> RETURNED -> INSPECTION -> CLOSED
//   | REJECTED | CANCELLED, and CLOSED -> DEPOSIT_REFUNDED on close
// ==============================================================================

export const RENTAL_STATUS = Object.freeze({
  REQUESTED: 'REQUESTED',
  APPROVED: 'APPROVED',
  ACTIVE: 'ACTIVE',
  RETURNED: 'RETURNED',
  INSPECTION: 'INSPECTION',
  CLOSED: 'CLOSED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  DEPOSIT_REFUNDED: 'DEPOSIT_REFUNDED',
});

export const RENTAL_TRANSITIONS = Object.freeze({
  [RENTAL_STATUS.REQUESTED]: [
    RENTAL_STATUS.APPROVED,
    RENTAL_STATUS.REJECTED,
    RENTAL_STATUS.CANCELLED,
  ],
  [RENTAL_STATUS.APPROVED]: [RENTAL_STATUS.ACTIVE, RENTAL_STATUS.CANCELLED],
  [RENTAL_STATUS.ACTIVE]: [RENTAL_STATUS.RETURNED],
  [RENTAL_STATUS.RETURNED]: [RENTAL_STATUS.INSPECTION],
  [RENTAL_STATUS.INSPECTION]: [RENTAL_STATUS.CLOSED],
  // Money leaves only as its own step, so "closed" and "deposit returned" are
  // separately auditable states rather than one boolean on a closed row.
  [RENTAL_STATUS.CLOSED]: [RENTAL_STATUS.DEPOSIT_REFUNDED],
  [RENTAL_STATUS.REJECTED]: [],
  [RENTAL_STATUS.CANCELLED]: [],
  [RENTAL_STATUS.DEPOSIT_REFUNDED]: [],
});

export const ASSET_STATUS = Object.freeze({
  AVAILABLE: 'available',
  RESERVED: 'reserved',
  RENTED: 'rented',
  MAINTENANCE: 'maintenance',
  RETIRED: 'retired',
});

export const ASSET_STATUSES = Object.freeze(Object.values(ASSET_STATUS));

/**
 * Chargeable days: whole days from start to end, minimum one. Ceiling, not
 * rounding — a 26-hour hire is two days, and flooring it would bill a rental
 * that spans two calendar days as one.
 */
export const rentalDays = (startAt, endAt) => {
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 1;
  return Math.max(1, Math.ceil((end - start) / (24 * 60 * 60 * 1000)));
};

/**
 * Server-owned quote total. Inputs are the provider's line items and the GST
 * rate; the OUTPUT is what the patient is asked to pay. Nothing here reads a
 * client-supplied total.
 */
export function computeQuoteTotals({ lineItems = [], gstRate = 0 } = {}) {
  let subtotalPaise = 0;
  const items = lineItems.map((item) => {
    const unitPaise = toPaise(item.unitPrice);
    const quantity = Math.max(1, Math.trunc(Number(item.quantity) || 1));
    const amountPaise = unitPaise * quantity;
    subtotalPaise += amountPaise;
    return {
      description: String(item.description),
      quantity,
      unitPrice: fromPaise(unitPaise),
      amount: fromPaise(amountPaise),
    };
  });
  const rate = Math.min(28, Math.max(0, Number(gstRate) || 0));
  const gstPaise = Math.round((subtotalPaise * rate) / 100);
  return {
    lineItems: items,
    subtotal: fromPaise(subtotalPaise),
    gstRate: rate,
    gstAmount: fromPaise(gstPaise),
    totalAmount: fromPaise(subtotalPaise + gstPaise),
    currency: 'INR',
  };
}

/** Server-owned rental charge: the UNIT's rate, never a body's. */
export function computeRentalTotals({ ratePerDay, days, deposit = 0 }) {
  const dayCount = Math.max(1, Math.trunc(Number(days) || 1));
  const ratePaise = toPaise(ratePerDay);
  return {
    days: dayCount,
    ratePerDay: fromPaise(ratePaise),
    rentalAmount: fromPaise(ratePaise * dayCount),
    deposit: fromPaise(toPaise(deposit)),
    currency: 'INR',
  };
}

/**
 * What the customer gets back at close: deposit minus assessed damage, never
 * below zero. Paise in, paise out — damage of 0.1 + 0.2 must not decide
 * whether the deposit was fully refunded.
 */
export function computeDepositRefund({ deposit, damageAmount = 0 }) {
  const held = toPaise(deposit);
  const damage = toPaise(damageAmount);
  return fromPaise(Math.max(0, held - damage));
}

// ==============================================================================
// FLOW-D - recurring / membership / program (5.md 5, 10.md 2.11)
//   TRIAL -> ACTIVE -> (FROZEN) -> PAST_DUE -> (GRACE) -> CANCELLED / EXPIRED
//                                                                     / RENEWED
// ==============================================================================

/**
 * 5.md:110's state line is the machine; 10.md §2.11's model enum lists only the
 * short subset `trial|active|frozen|past_due|cancelled|expired` and therefore
 * loses GRACE and RENEWED — the two states that make "failed payment with a
 * retry window" and "auto-renew succeeded" representable at all. The tokens are
 * uppercase because that is this repo's convention for flow machines
 * (QUOTE_STATUS, APPOINTMENT_STATUS); both docs are prose about the same rows.
 */
export const MEMBERSHIP_STATUS = Object.freeze({
  TRIAL: 'TRIAL',
  ACTIVE: 'ACTIVE',
  FROZEN: 'FROZEN',
  PAST_DUE: 'PAST_DUE',
  GRACE: 'GRACE',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
  RENEWED: 'RENEWED',
});

export const MEMBERSHIP_STATUSES = Object.freeze(Object.values(MEMBERSHIP_STATUS));

/**
 * Reading of the 5.md line, made executable:
 *
 *   - FROZEN only exists off ACTIVE (a trial does not freeze; freeze is a
 *     benefit of a paid term) and returns to ACTIVE when the window ends, or
 *     to PAST_DUE if the mandate failed while frozen.
 *   - PAST_DUE is a payment state, not a cancellation: the retry ladder goes
 *     ACTIVE (recovered) or GRACE (one more window); CANCELLED only after the
 *     ladder is exhausted. EXPIRED is the term running out mid-ladder.
 *   - RENEWED is what an auto-renew write records; the row returns to ACTIVE
 *     for the new term (or is cancelled/expired there), so RENEWED is a state
 *     a membership can actually sit in, not a one-way terminal.
 *   - CANCELLED and EXPIRED are terminal: a lapsed membership is a new row.
 */
export const MEMBERSHIP_TRANSITIONS = Object.freeze({
  [MEMBERSHIP_STATUS.TRIAL]: [
    MEMBERSHIP_STATUS.ACTIVE,
    MEMBERSHIP_STATUS.CANCELLED,
    MEMBERSHIP_STATUS.EXPIRED,
  ],
  [MEMBERSHIP_STATUS.ACTIVE]: [
    MEMBERSHIP_STATUS.FROZEN,
    MEMBERSHIP_STATUS.PAST_DUE,
    MEMBERSHIP_STATUS.RENEWED,
    MEMBERSHIP_STATUS.CANCELLED,
    MEMBERSHIP_STATUS.EXPIRED,
  ],
  [MEMBERSHIP_STATUS.FROZEN]: [
    MEMBERSHIP_STATUS.ACTIVE,
    MEMBERSHIP_STATUS.PAST_DUE,
    MEMBERSHIP_STATUS.CANCELLED,
    MEMBERSHIP_STATUS.EXPIRED,
  ],
  [MEMBERSHIP_STATUS.PAST_DUE]: [
    MEMBERSHIP_STATUS.ACTIVE,
    MEMBERSHIP_STATUS.GRACE,
    MEMBERSHIP_STATUS.CANCELLED,
    MEMBERSHIP_STATUS.EXPIRED,
  ],
  [MEMBERSHIP_STATUS.GRACE]: [
    MEMBERSHIP_STATUS.ACTIVE,
    MEMBERSHIP_STATUS.CANCELLED,
    MEMBERSHIP_STATUS.EXPIRED,
  ],
  [MEMBERSHIP_STATUS.RENEWED]: [
    MEMBERSHIP_STATUS.ACTIVE,
    MEMBERSHIP_STATUS.CANCELLED,
    MEMBERSHIP_STATUS.EXPIRED,
  ],
  [MEMBERSHIP_STATUS.CANCELLED]: [],
  [MEMBERSHIP_STATUS.EXPIRED]: [],
});

/** 5.md:104 — freeze is bounded: N days per year, M windows, notice required. */
export const PLAN_TYPES = Object.freeze(['gym', 'yoga', 'program', 'class_pack', 'meal']);

/**
 * FLOW-D's meal subscription (6.md §2.7, 5.md:108: pause / skip / weekly menu).
 *
 * Pause is a HOLD WITH A WINDOW, not a cancellation: active <-> paused, with
 * cancel/complete reachable from either. `completed` is job territory (the term
 * ended) - no route sets it, but the table records it so a worker asserting the
 * same transition reads the same list a route does.
 *
 * The tokens are lowercase, unlike MEMBERSHIP_STATUS above: MealSubscription's
 * model enum shipped that way in A2, and the machine must match the rows it
 * governs - renaming one without the other is exactly the drift this module
 * exists to prevent.
 */
export const MEAL_STATUS = Object.freeze({
  ACTIVE: 'active',
  PAUSED: 'paused',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
});

export const MEAL_TRANSITIONS = Object.freeze({
  [MEAL_STATUS.ACTIVE]: [MEAL_STATUS.PAUSED, MEAL_STATUS.CANCELLED, MEAL_STATUS.COMPLETED],
  [MEAL_STATUS.PAUSED]: [MEAL_STATUS.ACTIVE, MEAL_STATUS.CANCELLED, MEAL_STATUS.COMPLETED],
  [MEAL_STATUS.CANCELLED]: [],
  [MEAL_STATUS.COMPLETED]: [],
});
