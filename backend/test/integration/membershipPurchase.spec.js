/**
 * A4 -> Flow D (5.md 5 + rule 4, 6.md 2.8, 10.md 4.3 GET/POST memberships):
 * the purchase surface.
 *
 * What it pins:
 *  - auth: 401 anonymously on both routes;
 *  - SERVER-OWNED PRICE: the schema is strict, so a client-sent `price` /
 *    `pricePaid` / `status` is a 400 - the amount comes from the Plan row
 *    (price + joining fee) and so does the term length;
 *  - money: a paid plan without a paymentId is 402, and the payment must pass
 *    owner + completed + amount-coverage (the shared verifier) or the write
 *    never happens; a payment already consumed by another membership is 409;
 *  - lifecycle: only an `active` plan is purchasable (404 missing, 409
 *    otherwise); one LIVE term per plan (409 TERM_EXISTS), while a cancelled/
 *    expired earlier term does not block a re-purchase;
 *  - the created row: status ACTIVE (a purchase, not a provider-granted
 *    TRIAL), calendar-accurate endAt from plan.duration, creditsLeft = pack
 *    size or null (never 0), audit `membership_purchased`;
 *  - GET: session-scoped list, daysLeft derived at read (future -> ceil,
 *    past -> 0, open-ended -> null).
 */
import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const PATIENT = { _id: 'pat-1', id: 'pat-1', role: 'patient' };
const PLAN_ID = '7500000000000000000000b2';
const PAYMENT_ID = '7500000000000000000000c3';
const DAY_MS = 24 * 60 * 60 * 1000;

const auditLog = jestApi.fn();
const create = jestApi.fn(async (doc) => ({ _id: 'memb-1', ...doc }));

let planRow = null;
let paymentRow = null;
let heldRow = null;
let spentPaymentRow = null;
let listRows = [];
let lastFindFilter = null;
let lastFindOneFilter = null;
let lastCreateDoc = null;

jestApi.unstable_mockModule('../../src/models/Plan.js', () => ({
  default: { findById: () => query(planRow) },
}));
jestApi.unstable_mockModule('../../src/models/Payment.js', () => ({
  default: { findById: () => query(paymentRow) },
}));
jestApi.unstable_mockModule('../../src/models/Membership.js', () => ({
  default: {
    find: (filter) => { lastFindFilter = filter; return query(listRows); },
    findOne: (filter) => {
      lastFindOneFilter = filter;
      if (filter.paymentId) return query(spentPaymentRow);
      return query(heldRow);
    },
    create: (doc) => { lastCreateDoc = doc; return create(doc); },
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
  amount: 1048,
  ...over,
});

beforeEach(() => {
  planRow = makePlan();
  paymentRow = null;
  heldRow = null;
  spentPaymentRow = null;
  listRows = [];
  lastFindFilter = null;
  lastFindOneFilter = null;
  lastCreateDoc = null;
  auditLog.mockReset();
  create.mockClear();
});

describe('GET / - my memberships', () => {
  it('401s anonymously', async () => {
    const res = await as().get('/');
    expect(res.status).toBe(401);
  });

  it('lists only the session account and derives daysLeft at read', async () => {
    listRows = [
      { _id: 'm1', userId: 'pat-1', endAt: new Date(Date.now() + 5.5 * DAY_MS) },
      { _id: 'm2', userId: 'pat-1', endAt: new Date(Date.now() - 3 * DAY_MS) },
      { _id: 'm3', userId: 'pat-1', endAt: null },
    ];
    const res = await as(PATIENT).get('/');
    expect(res.status).toBe(200);
    expect(lastFindFilter).toEqual({ userId: 'pat-1' });
    const byId = Object.fromEntries(res.body.memberships.map((m) => [m._id, m]));
    expect(byId.m1.daysLeft).toBe(6);
    expect(byId.m2.daysLeft).toBe(0);
    expect(byId.m3.daysLeft).toBeNull();
  });
});

describe('POST / - purchase', () => {
  it('401s anonymously', async () => {
    const res = await as().post('/').send({ planId: PLAN_ID });
    expect(res.status).toBe(401);
  });

  it('404s an unknown plan and 409s an inactive one', async () => {
    planRow = null;
    expect((await as(PATIENT).post('/').send({ planId: PLAN_ID })).status).toBe(404);

    planRow = makePlan({ status: 'archived' });
    const res = await as(PATIENT).post('/').send({ planId: PLAN_ID });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('PLAN_NOT_AVAILABLE');
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects a client-supplied price with 400 (the schema is strict)', async () => {
    const res = await as(PATIENT).post('/').send({ planId: PLAN_ID, price: 1, pricePaid: 1 });
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it('409s a second purchase while a term for the same plan is live', async () => {
    heldRow = { _id: 'live-term', status: 'ACTIVE' };
    const res = await as(PATIENT).post('/').send({ planId: PLAN_ID });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('TERM_EXISTS');
    expect(create).not.toHaveBeenCalled();
  });

  it('buys a free plan without a payment: ACTIVE, calendar term, pack credits, audited', async () => {
    planRow = makePlan({ price: 0, joiningFee: 0, sessionCredits: 12, duration: { value: 1, unit: 'month' } });
    const startAt = new Date('2026-10-07T00:00:00.000Z');
    const res = await as(PATIENT).post('/').send({ planId: PLAN_ID, startAt: startAt.toISOString() });
    expect(res.status).toBe(201);
    expect(lastCreateDoc.status).toBe('ACTIVE');
    expect(lastCreateDoc.pricePaid).toBe(0);
    expect(lastCreateDoc.paymentId).toBeNull();
    expect(lastCreateDoc.creditsLeft).toBe(12);
    expect(lastCreateDoc.autoRenew).toBe(false);
    expect(new Date(lastCreateDoc.startAt).getTime()).toBe(startAt.getTime());
    // Calendar month, not 30 days: Oct 7 + 1 month = Nov 7 (31 days).
    expect(new Date(lastCreateDoc.endAt).toISOString()).toBe('2026-11-07T00:00:00.000Z');
    expect(auditLog).toHaveBeenCalledWith(
      'membership_purchased',
      'pat-1',
      expect.objectContaining({ membershipId: 'memb-1', planId: PLAN_ID, amount: 0, paymentId: null }),
    );
  });

  it('402s a paid plan with no paymentId, before anything is written', async () => {
    const res = await as(PATIENT).post('/').send({ planId: PLAN_ID });
    expect(res.status).toBe(402);
    expect(res.body.code).toBe('PAYMENT_REQUIRED');
    expect(create).not.toHaveBeenCalled();
  });

  it('402s when the payment is not owned by the session account', async () => {
    paymentRow = makePayment({ patient_id: 'someone-else' });
    const res = await as(PATIENT).post('/').send({ planId: PLAN_ID, paymentId: PAYMENT_ID });
    expect(res.status).toBe(402);
    expect(res.body.code).toBe('PAYMENT_NOT_VERIFIED');
    expect(create).not.toHaveBeenCalled();
  });

  it('402s when the payment does not cover price + joining fee', async () => {
    paymentRow = makePayment({ amount: 100 }); // required is 1048
    const res = await as(PATIENT).post('/').send({ planId: PLAN_ID, paymentId: PAYMENT_ID });
    expect(res.status).toBe(402);
    expect(res.body.code).toBe('PAYMENT_NOT_VERIFIED');
    expect(create).not.toHaveBeenCalled();
  });

  it('creates the term on a verified payment: server amount, payment linked, audited', async () => {
    paymentRow = makePayment();
    const res = await as(PATIENT).post('/').send({ planId: PLAN_ID, paymentId: PAYMENT_ID, autoRenew: true });
    expect(res.status).toBe(201);
    expect(lastCreateDoc.pricePaid).toBe(1048); // 999 + 49, from the PLAN row
    expect(lastCreateDoc.paymentId).toBe(PAYMENT_ID);
    expect(lastCreateDoc.autoRenew).toBe(true);
    expect(lastCreateDoc.creditsLeft).toBeNull(); // time-based term, not a pack
    expect(auditLog).toHaveBeenCalledWith(
      'membership_purchased',
      'pat-1',
      expect.objectContaining({ amount: 1048, paymentId: PAYMENT_ID }),
    );
  });

  it('409s a payment another membership already consumed', async () => {
    paymentRow = makePayment();
    spentPaymentRow = { _id: 'other-term', paymentId: PAYMENT_ID };
    const res = await as(PATIENT).post('/').send({ planId: PLAN_ID, paymentId: PAYMENT_ID });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('PAYMENT_ALREADY_USED');
    expect(create).not.toHaveBeenCalled();
  });

  it('allows re-purchase after a cancelled term (only LIVE terms block)', async () => {
    heldRow = null; // findOne for {status: {$in: NON_TERMINAL}} found nothing
    planRow = makePlan({ price: 0, joiningFee: 0 });
    const res = await as(PATIENT).post('/').send({ planId: PLAN_ID });
    expect(res.status).toBe(201);
    expect(lastFindOneFilter.status.$in).not.toContain('CANCELLED');
    expect(lastFindOneFilter.status.$in).not.toContain('EXPIRED');
  });
});
