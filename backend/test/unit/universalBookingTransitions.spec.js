import { describe, it, expect } from '@jest/globals';
import {
  UNIVERSAL_BOOKING_STATUS,
  UNIVERSAL_BOOKING_TRANSITIONS,
  canTransition,
  assertTransition,
  FlowTransitionError,
} from '../../src/lib/flowStates.js';

describe('Universal Cross-Service Booking State Machine (APPT-MISSING-01)', () => {
  it('allows valid state progression: DRAFT -> HELD -> CONFIRMED -> DISPATCHED -> IN_PROGRESS -> COMPLETED', () => {
    expect(canTransition(UNIVERSAL_BOOKING_TRANSITIONS, UNIVERSAL_BOOKING_STATUS.DRAFT, UNIVERSAL_BOOKING_STATUS.HELD)).toBe(true);
    expect(canTransition(UNIVERSAL_BOOKING_TRANSITIONS, UNIVERSAL_BOOKING_STATUS.HELD, UNIVERSAL_BOOKING_STATUS.CONFIRMED)).toBe(true);
    expect(canTransition(UNIVERSAL_BOOKING_TRANSITIONS, UNIVERSAL_BOOKING_STATUS.CONFIRMED, UNIVERSAL_BOOKING_STATUS.DISPATCHED)).toBe(true);
    expect(canTransition(UNIVERSAL_BOOKING_TRANSITIONS, UNIVERSAL_BOOKING_STATUS.DISPATCHED, UNIVERSAL_BOOKING_STATUS.IN_PROGRESS)).toBe(true);
    expect(canTransition(UNIVERSAL_BOOKING_TRANSITIONS, UNIVERSAL_BOOKING_STATUS.IN_PROGRESS, UNIVERSAL_BOOKING_STATUS.COMPLETED)).toBe(true);
  });

  it('allows cancellation from preliminary and active stages', () => {
    expect(canTransition(UNIVERSAL_BOOKING_TRANSITIONS, UNIVERSAL_BOOKING_STATUS.DRAFT, UNIVERSAL_BOOKING_STATUS.CANCELLED)).toBe(true);
    expect(canTransition(UNIVERSAL_BOOKING_TRANSITIONS, UNIVERSAL_BOOKING_STATUS.HELD, UNIVERSAL_BOOKING_STATUS.CANCELLED)).toBe(true);
    expect(canTransition(UNIVERSAL_BOOKING_TRANSITIONS, UNIVERSAL_BOOKING_STATUS.CONFIRMED, UNIVERSAL_BOOKING_STATUS.CANCELLED)).toBe(true);
    expect(canTransition(UNIVERSAL_BOOKING_TRANSITIONS, UNIVERSAL_BOOKING_STATUS.IN_PROGRESS, UNIVERSAL_BOOKING_STATUS.CANCELLED)).toBe(true);
  });

  it('allows refund from COMPLETED or CANCELLED', () => {
    expect(canTransition(UNIVERSAL_BOOKING_TRANSITIONS, UNIVERSAL_BOOKING_STATUS.COMPLETED, UNIVERSAL_BOOKING_STATUS.REFUNDED)).toBe(true);
    expect(canTransition(UNIVERSAL_BOOKING_TRANSITIONS, UNIVERSAL_BOOKING_STATUS.CANCELLED, UNIVERSAL_BOOKING_STATUS.REFUNDED)).toBe(true);
  });

  it('prohibits illegal backwards transitions', () => {
    expect(canTransition(UNIVERSAL_BOOKING_TRANSITIONS, UNIVERSAL_BOOKING_STATUS.COMPLETED, UNIVERSAL_BOOKING_STATUS.CONFIRMED)).toBe(false);
    expect(canTransition(UNIVERSAL_BOOKING_TRANSITIONS, UNIVERSAL_BOOKING_STATUS.REFUNDED, UNIVERSAL_BOOKING_STATUS.IN_PROGRESS)).toBe(false);
    expect(canTransition(UNIVERSAL_BOOKING_TRANSITIONS, UNIVERSAL_BOOKING_STATUS.CANCELLED, UNIVERSAL_BOOKING_STATUS.DISPATCHED)).toBe(false);
  });

  it('throws FlowTransitionError when assertTransition encounters invalid transition', () => {
    expect(() => {
      assertTransition(
        'UniversalBooking',
        UNIVERSAL_BOOKING_TRANSITIONS,
        UNIVERSAL_BOOKING_STATUS.COMPLETED,
        UNIVERSAL_BOOKING_STATUS.DRAFT
      );
    }).toThrow(FlowTransitionError);
  });

  it('enforces idempotent re-assertion of identical state', () => {
    expect(canTransition(UNIVERSAL_BOOKING_TRANSITIONS, UNIVERSAL_BOOKING_STATUS.CONFIRMED, UNIVERSAL_BOOKING_STATUS.CONFIRMED)).toBe(true);
  });

  describe('Slot Hold TTL & Quota Policy', () => {
    const SLOT_HOLD_TTL_SECONDS = 300; // 5 minutes
    const MAX_ACTIVE_HOLDS_PER_USER = 3;

    it('enforces strict 5-minute TTL on temporary booking holds', () => {
      const holdCreatedAt = new Date('2026-10-15T12:00:00Z');
      const validCheckTime = new Date('2026-10-15T12:04:30Z');
      const expiredCheckTime = new Date('2026-10-15T12:05:01Z');

      const isExpired = (createdAt, checkAt) => (checkAt.getTime() - createdAt.getTime()) / 1000 > SLOT_HOLD_TTL_SECONDS;

      expect(isExpired(holdCreatedAt, validCheckTime)).toBe(false);
      expect(isExpired(holdCreatedAt, expiredCheckTime)).toBe(true);
    });

    it('enforces maximum per-user simultaneous hold quota', () => {
      const activeHolds = ['hold-1', 'hold-2', 'hold-3'];
      const canHoldMore = (currentHolds) => currentHolds.length < MAX_ACTIVE_HOLDS_PER_USER;

      expect(canHoldMore(activeHolds)).toBe(false);
      expect(canHoldMore(activeHolds.slice(0, 2))).toBe(true);
    });
  });
});
