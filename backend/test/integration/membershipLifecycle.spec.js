/**
 * A4 -> Flow D lifecycle (5.md Flow D + MEMBERSHIP_TRANSITIONS): cancel, freeze,
 * unfreeze and renew on the member's own term.
 *
 * What it pins:
 *  - auth: 401 anonymously on every lifecycle route; 404 on a malformed id
 *    (requireObjectId) and on another account's row (self-scoped findOne);
 *  - schemas are STRICT: a client-sent `status` is a 400 on cancel/freeze;
 *  - transition asserts: EXPIRED/CANCELLED never move (409 INVALID_TRANSITION);
 *    freeze is ACTIVE-only with a 3-window cap; unfreeze is FROZEN-only and
 *    returns UNUSED frozen days to the term; renew is ACTIVE-only;
 *  - renew money: joining fee is charged once (purchase), renewal pays the
 *    plan price only, verified through the shared verifier, and a consumed
 *    payment is 409;
 *  - every move appends {from, to} history and an audit event.
 */
import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const PATIENT = { _id: 'pat-1', id: 'pat-1', role: 'patient' };
const ROW_ID = '7500000000000000000000d4';
const PLAN_ID = '7500000000000000000000b2';
const PAYMENT_ID = '7500000000000000000000c3';
const DAY_MS = 24 * 60 * 60 * 1000;

const auditLog = jestApi.fn();

let planRow = null;
let paymentRow = null;
let memberRow = null;
let spentPaymentRow = null;

jestApi.unstable_mockModule('../../src/models/Plan.js', () => ({
  default: { findById: () => query(planRow) },
}));
jestApi.unstable_mockModule('../../src/models/Payment.js', () => ({
  default: { findById: () => query(paymentRow) },
}));
jestApi.unstable_mockModule('../../src/models/Membership.js', () => ({
  default: {
    findOne: (filter) => {
      if (filter.paymentId) return query(spentPaymentRow);
      return query(memberRow);
    },
  },
}));
jestApi.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLog: (...args) => auditLog(...args),
}));

const { as } = await mountApp('memberships', {});

const makePlan = (over = {}) => ({
  _id: PLAN_ID,
  providerId: 'prov-1',
  type: 'membership',
  name: 'Gym 3-month',
  status: 'active',
  price: 999,
  joiningFee: 49,
  currency: 'INR',
  duration: { value: 3, unit: 'month' },
  sessionCredits: 0,
  ...over,
});

const makePayment = (over = {}) => ({
  _id: PAYMENT_ID,
  patient_id: 'pat-1',
  status: 'completed',
  amount: 999,
  ...over,
});

// A live mongoose-ish document: the route mutates it, then calls save().
const makeRow = (over = {}) => {
  const row = {
    _id: ROW_ID,
    userId: 'pat-1',
    planId: PLAN_ID,
    status: 'ACTIVE',
    startAt: new Date('2026-09-01T00:00:00.000Z'),
    endAt: new Date('2026-12-01T00:00:00.000Z'),
    pricePaid: 1048,
    history: [],
    freeze: { frozenAt: null, resumeAt: null, windows: [] },
    save: jestApi.fn(async function () { return row; }),
    ...over,
  };
  return row;
};

beforeEach(() => {
  planRow = makePlan();
  paymentRow = null;
  memberRow = null;
  spentPaymentRow = null;
  auditLog.mockReset();
});

describe('lifecycle auth + id guards', () => {
  it('401s anonymously on every lifecycle route', async () => {
    for (const [method, path, body] of [
      ['post', `/${ROW_ID}/cancel`, {}],
      ['post', `/${ROW_ID}/freeze`, { days: 7 }],
      ['post', `/${ROW_ID}/unfreeze`, {}],
      ['post', `/${ROW_ID}/renew`, {}],
    ]) {
      const res = await as()[method](path).send(body);
      expect(res.status).toBe(401);
    }
  });

  it('404s a malformed id and a foreign row', async () => {
    expect((await as(PATIENT).post('/nope/cancel').send({})).status).toBe(404);
    memberRow = null;
    expect((await as(PATIENT).post(`/${ROW_ID}/cancel`).send({})).status).toBe(404);
  });

  it('400s a client-supplied status (schemas are strict)', async () => {
    memberRow = makeRow();
    const res = await as(PATIENT).post(`/${ROW_ID}/cancel`).send({ status: 'ACTIVE' });
    expect(res.status).toBe(400);
    expect(memberRow.save).not.toHaveBeenCalled();
  });
});

describe('POST /:id/cancel', () => {
  it('cancels ACTIVE with history + audit', async () => {
    memberRow = makeRow();
    const res = await as(PATIENT).post(`/${ROW_ID}/cancel`).send({ reason: 'Moving cities' });
    expect(res.status).toBe(200);
    expect(memberRow.status).toBe('CANCELLED');
    expect(memberRow.cancelledAt).not.toBeNull();
    expect(memberRow.history).toEqual([
      expect.objectContaining({ from: 'ACTIVE', to: 'CANCELLED' }),
    ]);
    expect(memberRow.save).toHaveBeenCalled();
    expect(auditLog).toHaveBeenCalledWith(
      'membership_cancelled',
      'pat-1',
      expect.objectContaining({ membershipId: ROW_ID }),
    );
  });

  it('409s a terminal row (EXPIRED can never move)', async () => {
    memberRow = makeRow({ status: 'EXPIRED' });
    const res = await as(PATIENT).post(`/${ROW_ID}/cancel`).send({});
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('INVALID_TRANSITION');
    expect(memberRow.save).not.toHaveBeenCalled();
  });
});

describe('POST /:id/freeze + /unfreeze', () => {
  it('freezes ACTIVE: window recorded, term extended, audited', async () => {
    memberRow = makeRow();
    const before = new Date(memberRow.endAt).getTime();
    const res = await as(PATIENT).post(`/${ROW_ID}/freeze`).send({ days: 7, reason: 'Travel' });
    expect(res.status).toBe(200);
    expect(memberRow.status).toBe('FROZEN');
    expect(memberRow.freeze.windows).toHaveLength(1);
    expect(memberRow.freeze.windows[0].days).toBe(7);
    expect(new Date(memberRow.endAt).getTime()).toBe(before + 7 * DAY_MS);
    expect(auditLog).toHaveBeenCalledWith(
      'membership_frozen',
      'pat-1',
      expect.objectContaining({ days: 7 }),
    );
  });

  it('400s days outside 1-30 and 409s a non-ACTIVE row', async () => {
    memberRow = makeRow();
    expect((await as(PATIENT).post(`/${ROW_ID}/freeze`).send({ days: 45 })).status).toBe(400);
    memberRow = makeRow({ status: 'FROZEN' });
    const res = await as(PATIENT).post(`/${ROW_ID}/freeze`).send({ days: 7 });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('INVALID_TRANSITION');
  });

  it('409s the 4th window (freeze is a bounded benefit)', async () => {
    memberRow = makeRow({
      status: 'ACTIVE',
      freeze: {
        frozenAt: null,
        resumeAt: null,
        windows: [
          { from: new Date(), to: new Date(), days: 7 },
          { from: new Date(), to: new Date(), days: 7 },
          { from: new Date(), to: new Date(), days: 7 },
        ],
      },
    });
    const res = await as(PATIENT).post(`/${ROW_ID}/freeze`).send({ days: 7 });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('FREEZE_LIMIT');
  });

  it('unfreezes early and returns unused days to the term', async () => {
    // Frozen 2 days + 1s ago: elapsed ceils deterministically to 3 used days,
    // so 4 of the 7 granted days come back and the term keeps +3d extension.
    const frozenAt = new Date(Date.now() - 2 * DAY_MS - 1000);
    memberRow = makeRow({
      status: 'FROZEN',
      endAt: new Date(new Date('2026-12-01T00:00:00.000Z').getTime() + 7 * DAY_MS),
      freeze: {
        frozenAt,
        resumeAt: new Date(frozenAt.getTime() + 7 * DAY_MS),
        windows: [{ from: frozenAt, to: new Date(frozenAt.getTime() + 7 * DAY_MS), days: 7 }],
      },
    });
    const res = await as(PATIENT).post(`/${ROW_ID}/unfreeze`).send({});
    expect(res.status).toBe(200);
    expect(memberRow.status).toBe('ACTIVE');
    // 7 granted - 3 used = 4 returned: the term keeps the +3d used extension.
    const endMs = new Date(memberRow.endAt).getTime();
    const baseMs = new Date('2026-12-01T00:00:00.000Z').getTime();
    expect(endMs).toBe(baseMs + 3 * DAY_MS);
    expect(memberRow.history).toEqual([
      expect.objectContaining({ from: 'FROZEN', to: 'ACTIVE' }),
    ]);
  });

  it('409s unfreeze on an ACTIVE row', async () => {
    memberRow = makeRow();
    const res = await as(PATIENT).post(`/${ROW_ID}/unfreeze`).send({});
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('INVALID_TRANSITION');
  });
});

describe('POST /:id/renew', () => {
  it('renews ACTIVE at plan price only (no second joining fee)', async () => {
    memberRow = makeRow();
    paymentRow = makePayment({ amount: 999 });
    const before = new Date(memberRow.endAt);
    const res = await as(PATIENT).post(`/${ROW_ID}/renew`).send({ paymentId: PAYMENT_ID });
    expect(res.status).toBe(200);
    expect(memberRow.status).toBe('RENEWED');
    expect(memberRow.pricePaid).toBe(1048 + 999); // joining fee charged once
    const after = new Date(memberRow.endAt);
    expect(after.getTime()).toBeGreaterThan(before.getTime());
    // +3 calendar months on Dec 1 -> Mar 1.
    expect(after.toISOString()).toBe('2027-03-01T00:00:00.000Z');
    expect(auditLog).toHaveBeenCalledWith(
      'membership_renewed',
      'pat-1',
      expect.objectContaining({ amount: 999, paymentId: PAYMENT_ID }),
    );
  });

  it('402s without a covering payment and 409s a consumed one', async () => {
    memberRow = makeRow();
    const noPay = await as(PATIENT).post(`/${ROW_ID}/renew`).send({});
    expect(noPay.status).toBe(402);
    expect(noPay.body.code).toBe('PAYMENT_REQUIRED');

    paymentRow = makePayment();
    spentPaymentRow = { _id: 'other-term', paymentId: PAYMENT_ID };
    const spent = await as(PATIENT).post(`/${ROW_ID}/renew`).send({ paymentId: PAYMENT_ID });
    expect(spent.status).toBe(409);
    expect(spent.body.code).toBe('PAYMENT_ALREADY_USED');
    expect(memberRow.save).not.toHaveBeenCalled();
  });

  it('409s renew on EXPIRED (lapsed terms are re-purchased, not renewed)', async () => {
    memberRow = makeRow({ status: 'EXPIRED' });
    paymentRow = makePayment();
    const res = await as(PATIENT).post(`/${ROW_ID}/renew`).send({ paymentId: PAYMENT_ID });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('INVALID_TRANSITION');
    expect(memberRow.save).not.toHaveBeenCalled();
  });

  it('configures and cancels UPI AutoPay mandate', async () => {
    memberRow = makeRow();
    const setup = await as(PATIENT).post(`/${ROW_ID}/autopay`).send({
      mandateRef: 'mandate_upi_rzp_12345678',
      autoRenew: true,
    });
    expect(setup.status).toBe(200);
    expect(memberRow.mandateRef).toBe('mandate_upi_rzp_12345678');
    expect(memberRow.autoRenew).toBe(true);

    const cancel = await as(PATIENT).delete(`/${ROW_ID}/autopay`);
    expect(cancel.status).toBe(200);
    expect(memberRow.autoRenew).toBe(false);
    expect(memberRow.mandateRef).toBe('');
  });

  it('records attendance check-in and burns class-pack credit', async () => {
    memberRow = makeRow({ creditsLeft: 5, checkIns: [] });
    const res = await as(PATIENT).post(`/${ROW_ID}/check-in`).send({
      method: 'qr',
      location: 'Gym Floor Gate A',
    });
    expect(res.status).toBe(200);
    expect(res.body.creditsLeft).toBe(4);
    expect(memberRow.creditsLeft).toBe(4);
    expect(memberRow.checkIns).toHaveLength(1);
    expect(memberRow.checkIns[0].location).toBe('Gym Floor Gate A');
  });
});
