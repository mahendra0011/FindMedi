/**
 * Booking flows B/D/E/G + flow-A appointment checkout: the state machines in
 * ONE pure module (no mongoose, no config), plus the idempotency-key helper
 * every create/pay endpoint uses for double-click safety.
 *
 * WHY THIS MODULE EXISTS
 * lib/flowStates.js owns the persisted machines (QUOTE_STATUS, RENTAL_STATUS,
 * REGISTRATION_STATUS, MEMBERSHIP_STATUS) and lib/appointmentLifecycle.js owns
 * the Appointment row. Those enums are storage vocabularies — they do not cover
 * the *checkout* edges (slot hold, payment pending, waitlist) or the simplified
 * journey names the frontend timelines render. This module is the journey
 * layer: each machine lists the user-visible states, the transition table, and
 * a bridge (`mapsTo`) to the stored status it corresponds to, so the route
 * asserts the journey move HERE and writes the stored status there. A move that
 * is not in the table is rejected with 409 ILLEGAL_STATE_TRANSITION before
 * anything is written — the same contract flowStates.js gives.
 *
 * Machines:
 *   A (appointment checkout):
 *     CREATED -> SLOT_HELD -> PAYMENT_PENDING -> CONFIRMED -> COMPLETED
 *     SLOT_HELD -> WAITLISTED (slot taken) -> SLOT_HELD (seat freed, claim window)
 *     any non-terminal -> CANCELLED
 *   B (service request & quote):
 *     REQUEST -> QUOTE -> ACCEPT -> SCHEDULED (+ DECLINED/EXPIRED/CANCELLED)
 *     maps onto QUOTE_STATUS in lib/flowStates.js
 *   G (equipment rental journey):
 *     REQUESTED -> CONFIRMED -> DELIVERED -> ACTIVE -> RETURNED
 *     (+ REJECTED/CANCELLED; maps onto RENTAL_STATUS)
 *   E (event registration journey):
 *     REGISTERED -> CHECKED_IN -> ATTENDED (+ CANCELLED/REFUNDED)
 *     maps onto REGISTRATION_STATUS
 *   D (membership / program):
 *     TRIAL -> ACTIVE -> FROZEN -> RENEWED / CANCELLED
 *     (ACTIVE -> RENEWED -> ACTIVE for auto-renew; maps onto MEMBERSHIP_STATUS)
 */

import { randomUUID } from 'node:crypto';

export class BookingTransitionError extends Error {
  constructor(machine, from, to) {
    super(`Illegal ${machine} transition ${from} -> ${to}`);
    this.name = 'BookingTransitionError';
    this.status = 409;
    this.code = 'ILLEGAL_STATE_TRANSITION';
    this.machine = machine;
    this.from = from;
    this.to = to;
  }
}

export function canBookingTransition(table, from, to) {
  if (from === to) return true;
  return (table[from] || []).includes(to);
}

export function assertBookingTransition(machine, table, from, to) {
  if (!canBookingTransition(table, from, to)) {
    throw new BookingTransitionError(machine, from, to);
  }
  return true;
}

// =============================================================================
// FLOW-A — appointment checkout journey
// =============================================================================

export const BOOKING_A_STATUS = Object.freeze({
  CREATED: 'CREATED',
  SLOT_HELD: 'SLOT_HELD',
  PAYMENT_PENDING: 'PAYMENT_PENDING',
  CONFIRMED: 'CONFIRMED',
  COMPLETED: 'COMPLETED',
  WAITLISTED: 'WAITLISTED',
  CANCELLED: 'CANCELLED',
});

export const BOOKING_A_TRANSITIONS = Object.freeze({
  [BOOKING_A_STATUS.CREATED]: [BOOKING_A_STATUS.SLOT_HELD, BOOKING_A_STATUS.CANCELLED],
  [BOOKING_A_STATUS.SLOT_HELD]: [
    BOOKING_A_STATUS.PAYMENT_PENDING,
    BOOKING_A_STATUS.WAITLISTED,
    BOOKING_A_STATUS.CANCELLED,
  ],
  // A held slot whose seat was taken races into the waitlist; when a seat
  // frees, the waitlisted party re-claims the hold inside the claim window.
  [BOOKING_A_STATUS.WAITLISTED]: [BOOKING_A_STATUS.SLOT_HELD, BOOKING_A_STATUS.CANCELLED],
  [BOOKING_A_STATUS.PAYMENT_PENDING]: [BOOKING_A_STATUS.CONFIRMED, BOOKING_A_STATUS.CANCELLED],
  [BOOKING_A_STATUS.CONFIRMED]: [BOOKING_A_STATUS.COMPLETED, BOOKING_A_STATUS.CANCELLED],
  [BOOKING_A_STATUS.COMPLETED]: [],
  [BOOKING_A_STATUS.CANCELLED]: [],
});

export const BOOKING_A_STORED = Object.freeze({
  [BOOKING_A_STATUS.CREATED]: 'Pending',
  [BOOKING_A_STATUS.SLOT_HELD]: 'Pending',
  [BOOKING_A_STATUS.PAYMENT_PENDING]: 'Pending',
  [BOOKING_A_STATUS.WAITLISTED]: 'Pending',
  [BOOKING_A_STATUS.CONFIRMED]: 'Confirmed',
  [BOOKING_A_STATUS.COMPLETED]: 'Completed',
  [BOOKING_A_STATUS.CANCELLED]: 'Cancelled',
});

// =============================================================================
// FLOW-B — service request & quote journey (bridges QUOTE_STATUS)
// =============================================================================

export const BOOKING_B_STATUS = Object.freeze({
  REQUEST: 'REQUEST',
  QUOTE: 'QUOTE',
  ACCEPT: 'ACCEPT',
  SCHEDULED: 'SCHEDULED',
  DECLINED: 'DECLINED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
});

export const BOOKING_B_TRANSITIONS = Object.freeze({
  [BOOKING_B_STATUS.REQUEST]: [
    BOOKING_B_STATUS.QUOTE,
    BOOKING_B_STATUS.DECLINED,
    BOOKING_B_STATUS.EXPIRED,
    BOOKING_B_STATUS.CANCELLED,
  ],
  [BOOKING_B_STATUS.QUOTE]: [
    BOOKING_B_STATUS.ACCEPT,
    BOOKING_B_STATUS.DECLINED,
    BOOKING_B_STATUS.EXPIRED,
    BOOKING_B_STATUS.CANCELLED,
  ],
  // ACCEPT is money-adjacent but not terminal: the accepted quote still needs
  // a scheduled service (appointment) before the journey is done.
  [BOOKING_B_STATUS.ACCEPT]: [BOOKING_B_STATUS.SCHEDULED, BOOKING_B_STATUS.CANCELLED],
  [BOOKING_B_STATUS.SCHEDULED]: [],
  [BOOKING_B_STATUS.DECLINED]: [],
  [BOOKING_B_STATUS.EXPIRED]: [],
  [BOOKING_B_STATUS.CANCELLED]: [],
});

/** Journey state -> stored QUOTE_STATUS. ACCEPT/SCHEDULED both persist ACCEPTED. */
export const BOOKING_B_STORED = Object.freeze({
  [BOOKING_B_STATUS.REQUEST]: 'REQUESTED',
  [BOOKING_B_STATUS.QUOTE]: 'QUOTE_SENT',
  [BOOKING_B_STATUS.ACCEPT]: 'ACCEPTED',
  [BOOKING_B_STATUS.SCHEDULED]: 'ACCEPTED',
  [BOOKING_B_STATUS.DECLINED]: 'DECLINED',
  [BOOKING_B_STATUS.EXPIRED]: 'EXPIRED',
  [BOOKING_B_STATUS.CANCELLED]: 'CANCELLED',
});

// =============================================================================
// FLOW-G — equipment rental journey (bridges RENTAL_STATUS)
// =============================================================================

export const BOOKING_G_STATUS = Object.freeze({
  REQUESTED: 'REQUESTED',
  CONFIRMED: 'CONFIRMED',
  DELIVERED: 'DELIVERED',
  ACTIVE: 'ACTIVE',
  RETURNED: 'RETURNED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
});

export const BOOKING_G_TRANSITIONS = Object.freeze({
  [BOOKING_G_STATUS.REQUESTED]: [
    BOOKING_G_STATUS.CONFIRMED,
    BOOKING_G_STATUS.REJECTED,
    BOOKING_G_STATUS.CANCELLED,
  ],
  // CONFIRMED = vendor approved; DELIVERED = unit handed over in transit;
  // ACTIVE = renter in possession (stored ACTIVE).
  [BOOKING_G_STATUS.CONFIRMED]: [BOOKING_G_STATUS.DELIVERED, BOOKING_G_STATUS.CANCELLED],
  [BOOKING_G_STATUS.DELIVERED]: [BOOKING_G_STATUS.ACTIVE, BOOKING_G_STATUS.CANCELLED],
  [BOOKING_G_STATUS.ACTIVE]: [BOOKING_G_STATUS.RETURNED],
  [BOOKING_G_STATUS.RETURNED]: [],
  [BOOKING_G_STATUS.REJECTED]: [],
  [BOOKING_G_STATUS.CANCELLED]: [],
});

/** Journey state -> stored RENTAL_STATUS. */
export const BOOKING_G_STORED = Object.freeze({
  [BOOKING_G_STATUS.REQUESTED]: 'REQUESTED',
  [BOOKING_G_STATUS.CONFIRMED]: 'APPROVED',
  [BOOKING_G_STATUS.DELIVERED]: 'ACTIVE',
  [BOOKING_G_STATUS.ACTIVE]: 'ACTIVE',
  [BOOKING_G_STATUS.RETURNED]: 'RETURNED',
  [BOOKING_G_STATUS.REJECTED]: 'REJECTED',
  [BOOKING_G_STATUS.CANCELLED]: 'CANCELLED',
});

// =============================================================================
// FLOW-E — event registration journey (bridges REGISTRATION_STATUS)
// =============================================================================

export const BOOKING_E_STATUS = Object.freeze({
  REGISTERED: 'REGISTERED',
  CHECKED_IN: 'CHECKED_IN',
  ATTENDED: 'ATTENDED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
});

export const BOOKING_E_TRANSITIONS = Object.freeze({
  [BOOKING_E_STATUS.REGISTERED]: [
    BOOKING_E_STATUS.CHECKED_IN,
    BOOKING_E_STATUS.CANCELLED,
    BOOKING_E_STATUS.REFUNDED,
  ],
  // CHECKED_IN -> ATTENDED is the organiser closing the session: presence
  // confirmed at the door becomes attendance on record. Nothing un-attends.
  [BOOKING_E_STATUS.CHECKED_IN]: [BOOKING_E_STATUS.ATTENDED],
  [BOOKING_E_STATUS.ATTENDED]: [],
  [BOOKING_E_STATUS.CANCELLED]: [],
  [BOOKING_E_STATUS.REFUNDED]: [],
});

/** Journey state -> stored REGISTRATION_STATUS (ATTENDED persists CHECKED_IN). */
export const BOOKING_E_STORED = Object.freeze({
  [BOOKING_E_STATUS.REGISTERED]: 'REGISTERED',
  [BOOKING_E_STATUS.CHECKED_IN]: 'CHECKED_IN',
  [BOOKING_E_STATUS.ATTENDED]: 'CHECKED_IN',
  [BOOKING_E_STATUS.CANCELLED]: 'CANCELLED',
  [BOOKING_E_STATUS.REFUNDED]: 'REFUNDED',
});

// =============================================================================
// FLOW-D — membership / program journey (bridges MEMBERSHIP_STATUS)
// =============================================================================

export const BOOKING_D_STATUS = Object.freeze({
  TRIAL: 'TRIAL',
  ACTIVE: 'ACTIVE',
  FROZEN: 'FROZEN',
  RENEWED: 'RENEWED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
});

export const BOOKING_D_TRANSITIONS = Object.freeze({
  [BOOKING_D_STATUS.TRIAL]: [
    BOOKING_D_STATUS.ACTIVE,
    BOOKING_D_STATUS.CANCELLED,
    BOOKING_D_STATUS.EXPIRED,
  ],
  [BOOKING_D_STATUS.ACTIVE]: [
    BOOKING_D_STATUS.FROZEN,
    BOOKING_D_STATUS.RENEWED,
    BOOKING_D_STATUS.CANCELLED,
    BOOKING_D_STATUS.EXPIRED,
  ],
  [BOOKING_D_STATUS.FROZEN]: [
    BOOKING_D_STATUS.ACTIVE,
    BOOKING_D_STATUS.CANCELLED,
    BOOKING_D_STATUS.EXPIRED,
  ],
  [BOOKING_D_STATUS.RENEWED]: [
    BOOKING_D_STATUS.ACTIVE,
    BOOKING_D_STATUS.CANCELLED,
    BOOKING_D_STATUS.EXPIRED,
  ],
  [BOOKING_D_STATUS.CANCELLED]: [],
  [BOOKING_D_STATUS.EXPIRED]: [],
});

export const BOOKING_D_STORED = BOOKING_D_STATUS;

export const BOOKING_MACHINES = Object.freeze({
  A: { states: BOOKING_A_STATUS, transitions: BOOKING_A_TRANSITIONS, stored: BOOKING_A_STORED },
  B: { states: BOOKING_B_STATUS, transitions: BOOKING_B_TRANSITIONS, stored: BOOKING_B_STORED },
  G: { states: BOOKING_G_STATUS, transitions: BOOKING_G_TRANSITIONS, stored: BOOKING_G_STORED },
  E: { states: BOOKING_E_STATUS, transitions: BOOKING_E_TRANSITIONS, stored: BOOKING_E_STORED },
  D: { states: BOOKING_D_STATUS, transitions: BOOKING_D_TRANSITIONS, stored: BOOKING_D_STORED },
});

export function assertBookingMove(machine, from, to) {
  const def = BOOKING_MACHINES[machine];
  if (!def) throw new BookingTransitionError(String(machine), String(from), String(to));
  return assertBookingTransition(machine, def.transitions, from, to);
}

export function canBookingMove(machine, from, to) {
  const def = BOOKING_MACHINES[machine];
  if (!def) return false;
  return canBookingTransition(def.transitions, from, to);
}

/** Journey state -> the status the row persists (for routes to write). */
export function storedStatusFor(machine, journeyState) {
  const def = BOOKING_MACHINES[machine];
  return def?.stored?.[journeyState] ?? journeyState;
}

// =============================================================================
// Idempotency-key helper (5.md rule 4: double-click safe create/pay)
// =============================================================================

/**
 * Mint a client-safe idempotency key: `<prefix>:<uuid>`. The wire guard is
 * middleware/idempotency.js (Idempotency-Key header replay); this helper is
 * for callers that need to CREATE a key (frontend checkout, retries, jobs).
 */
export function newIdempotencyKey(prefix = 'booking') {
  const safe = String(prefix || 'booking').replace(/[^a-z0-9_-]/gi, '').slice(0, 40) || 'booking';
  return `${safe}:${randomUUID()}`;
}

/**
 * Deterministic key for a logical operation (e.g. `event-cancel:<regId>`):
 * same inputs always produce the same key, so a retried worker replays
 * instead of double-executing. Not a secret — only a dedupe token.
 */
export function idempotencyKeyFor(...parts) {
  return parts.map((p) => String(p ?? '').replace(/[^a-z0-9_-]/gi, '').slice(0, 60)).join(':');
}
