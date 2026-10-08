/**
 * FLOW-D membership state machine (5.md §5, 10.md §2.11) — A2.
 *
 * The same contract appointmentLifecycle.spec pins for bookings: the status
 * vocabulary IS the spec's state line, the table admits exactly the moves the
 * line implies, and illegal moves are 409s rather than silent writes. Routes
 * later assert against this table (Membership has no write routes yet), so
 * these tests are the executable version of the spec until they do.
 */
import { describe, it, expect } from '@jest/globals';
import {
  MEMBERSHIP_STATUS,
  MEMBERSHIP_STATUSES,
  MEMBERSHIP_TRANSITIONS,
  PLAN_TYPES,
  assertTransition,
  canTransition,
  FlowTransitionError,
} from '../../src/lib/flowStates.js';

const S = MEMBERSHIP_STATUS;

describe('FLOW-D status vocabulary', () => {
  it('is exactly the 5.md:110 state line — including GRACE and RENEWED that 10.md §2.11 drops', () => {
    expect([...MEMBERSHIP_STATUSES].sort()).toEqual(
      ['ACTIVE', 'CANCELLED', 'EXPIRED', 'FROZEN', 'GRACE', 'PAST_DUE', 'RENEWED', 'TRIAL'].sort(),
    );
  });

  it('every status has a transition row (a missing key would make every move from it illegal)', () => {
    for (const status of MEMBERSHIP_STATUSES) {
      expect(Array.isArray(MEMBERSHIP_TRANSITIONS[status])).toBe(true);
    }
    expect(Object.keys(MEMBERSHIP_TRANSITIONS).sort()).toEqual([...MEMBERSHIP_STATUSES].sort());
  });

  it('no row can transition to a token outside the vocabulary', () => {
    for (const targets of Object.values(MEMBERSHIP_TRANSITIONS)) {
      for (const to of targets) {
        expect(MEMBERSHIP_STATUSES).toContain(to);
      }
    }
  });
});

describe('FLOW-D legal moves', () => {
  it('walks the happy path of the spec line: TRIAL → ACTIVE → FROZEN → ACTIVE', () => {
    expect(canTransition(MEMBERSHIP_TRANSITIONS, S.TRIAL, S.ACTIVE)).toBe(true);
    expect(canTransition(MEMBERSHIP_TRANSITIONS, S.ACTIVE, S.FROZEN)).toBe(true);
    expect(canTransition(MEMBERSHIP_TRANSITIONS, S.FROZEN, S.ACTIVE)).toBe(true);
  });

  it('keeps PAST_DUE a payment state with a ladder: recovery, grace, then cancel/expire', () => {
    expect(canTransition(MEMBERSHIP_TRANSITIONS, S.ACTIVE, S.PAST_DUE)).toBe(true);
    expect(canTransition(MEMBERSHIP_TRANSITIONS, S.PAST_DUE, S.ACTIVE)).toBe(true);
    expect(canTransition(MEMBERSHIP_TRANSITIONS, S.PAST_DUE, S.GRACE)).toBe(true);
    expect(canTransition(MEMBERSHIP_TRANSITIONS, S.GRACE, S.ACTIVE)).toBe(true);
    expect(canTransition(MEMBERSHIP_TRANSITIONS, S.PAST_DUE, S.CANCELLED)).toBe(true);
  });

  it('lets a failed mandate surface from a freeze without passing ACTIVE', () => {
    expect(canTransition(MEMBERSHIP_TRANSITIONS, S.FROZEN, S.PAST_DUE)).toBe(true);
  });

  it('treats RENEWED as a state a row can sit in, returning to ACTIVE for the new term', () => {
    expect(canTransition(MEMBERSHIP_TRANSITIONS, S.ACTIVE, S.RENEWED)).toBe(true);
    expect(canTransition(MEMBERSHIP_TRANSITIONS, S.RENEWED, S.ACTIVE)).toBe(true);
  });

  it('is idempotent — two racing renew clicks both resolve without an error', () => {
    expect(canTransition(MEMBERSHIP_TRANSITIONS, S.ACTIVE, S.ACTIVE)).toBe(true);
    expect(canTransition(MEMBERSHIP_TRANSITIONS, S.CANCELLED, S.CANCELLED)).toBe(true);
  });
});

describe('FLOW-D illegal moves are 409s', () => {
  const illegal = [
    [S.TRIAL, S.FROZEN, 'freeze needs a paid term'],
    [S.TRIAL, S.GRACE, 'grace only follows a lapsed payment'],
    [S.TRIAL, S.RENEWED, 'nothing to renew during a trial'],
    [S.ACTIVE, S.GRACE, 'grace only follows PAST_DUE'],
    [S.ACTIVE, S.PAST_DUE + '_x', 'invented token'],
    [S.CANCELLED, S.ACTIVE, 'terminal — a lapsed membership is a new row'],
    [S.EXPIRED, S.ACTIVE, 'terminal'],
    [S.FROZEN, S.RENEWED, 'no debit happens while frozen'],
    [S.GRACE, S.PAST_DUE, 'grace is the last window, not a loop'],
  ];

  for (const [from, to, why] of illegal) {
    it(`rejects ${from} → ${to} (${why}) with ILLEGAL_STATE_TRANSITION`, () => {
      let thrown;
      try {
        assertTransition('MEMBERSHIP', MEMBERSHIP_TRANSITIONS, from, to);
      } catch (err) {
        thrown = err;
      }
      expect(thrown).toBeInstanceOf(FlowTransitionError);
      expect(thrown.status).toBe(409);
      expect(thrown.code).toBe('ILLEGAL_STATE_TRANSITION');
      expect(thrown.machine).toBe('MEMBERSHIP');
      expect(thrown.from).toBe(from);
      expect(thrown.to).toBe(to);
    });
  }
});

describe('FLOW-D plan catalogue vocabulary', () => {
  it('PLAN_TYPES is the 10.md §2.11 list, in spec order', () => {
    expect([...PLAN_TYPES]).toEqual(['gym', 'yoga', 'program', 'class_pack', 'meal']);
  });
});
