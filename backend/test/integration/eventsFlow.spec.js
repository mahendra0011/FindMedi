import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

// 5.md Flow E (events & camps): seats are a CAS, one registration per person,
// and the cancellation refund rule decides REFUNDED vs CANCELLED on the row.

const EVENT_ID = '7000000000000000000000a1';
const ORG_PROVIDER = '7000000000000000000000b2';
const ORG_OWNER = '7000000000000000000000c3';
const PATIENT = '7000000000000000000000d4';

const eventFind = jestApi.fn();
const eventFindOne = jestApi.fn();
const eventFindById = jestApi.fn();
const eventFindOneAndUpdate = jestApi.fn();
const eventUpdateOne = jestApi.fn();
const eventCount = jestApi.fn();
const regFind = jestApi.fn();
const regFindOne = jestApi.fn();
const regFindById = jestApi.fn();
const regCreate = jestApi.fn();
const regFindOneAndUpdate = jestApi.fn();
const regUpdateOne = jestApi.fn();
const providerFindById = jestApi.fn();
const refundRequest = jestApi.fn();
const refundSettle = jestApi.fn();
const auditLog = jestApi.fn();

let lastRegBody = null;

jestApi.unstable_mockModule('../../src/models/Event.js', () => ({
  __esModule: true,
  default: {
    find: (...a) => eventFind(...a),
    findOne: (...a) => eventFindOne(...a),
    findById: (...a) => eventFindById(...a),
    findOneAndUpdate: (...a) => eventFindOneAndUpdate(...a),
    updateOne: (...a) => eventUpdateOne(...a),
    countDocuments: (...a) => eventCount(...a),
  },
}));

jestApi.unstable_mockModule('../../src/models/EventRegistration.js', () => ({
  __esModule: true,
  default: {
    find: (...a) => regFind(...a),
    findOne: (...a) => regFindOne(...a),
    findById: (...a) => regFindById(...a),
    create: (body) => { lastRegBody = body; return regCreate(body); },
    findOneAndUpdate: (...a) => regFindOneAndUpdate(...a),
    updateOne: (...a) => regUpdateOne(...a),
    countDocuments: jestApi.fn().mockResolvedValue(0),
  },
}));

jestApi.unstable_mockModule('../../src/models/Provider.js', () => ({
  __esModule: true,
  default: { findById: (...a) => providerFindById(...a) },
}));

jestApi.unstable_mockModule('../../src/models/Refund.js', () => ({
  __esModule: true,
  default: {
    requestRefund: (...a) => refundRequest(...a),
    settleRefund: (...a) => refundSettle(...a),
  },
}));

jestApi.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLog: (...args) => auditLog(...args),
}));

const { as } = await mountApp('events');

const organiser = { _id: ORG_OWNER, role: 'doctor' };
const attendee = { _id: PATIENT, role: 'patient' };

const event = (over = {}) => ({
  _id: EVENT_ID, organizerId: ORG_PROVIDER, status: 'open', capacity: 10,
  registeredCount: 3, type: 'camp', title: 'Diabetes screening camp',
  fee: { amount: 0, currency: 'INR' },
  schedule: { start: new Date(Date.now() + 7 * 864e5), end: new Date(Date.now() + 7 * 864e5 + 36e5) },
  refundCutoffHours: 24,
  save: jestApi.fn().mockImplementation(async function save() { return this; }),
  ...over,
});

beforeEach(() => {
  lastRegBody = null;
  eventFind.mockReset().mockImplementation(() => query([]));
  eventFindOne.mockReset().mockImplementation(() => query(event()));
  eventFindById.mockReset().mockImplementation(() => query(event()));
  eventFindOneAndUpdate.mockReset().mockImplementation(() => query(event({ registeredCount: 4 })));
  eventUpdateOne.mockReset().mockResolvedValue({ matchedCount: 1 });
  eventCount.mockReset().mockResolvedValue(1);
  regFind.mockReset().mockImplementation(() => query([]));
  regFindOne.mockReset().mockImplementation(() => query(null));
  regFindById.mockReset().mockImplementation(() => query(null));
  regCreate.mockReset().mockImplementation(async (body) => ({ _id: 'reg1', checkInCode: 'abc12345', ...body }));
  regFindOneAndUpdate.mockReset().mockImplementation(() => query({ _id: 'reg1', status: 'CHECKED_IN' }));
  regUpdateOne.mockReset().mockResolvedValue({ matchedCount: 1 });
  providerFindById.mockReset().mockImplementation(() => query({
    _id: ORG_PROVIDER, ownerUserId: ORG_OWNER, kind: 'organizer', status: 'live',
  }));
  refundRequest.mockReset();
  refundSettle.mockReset();
  auditLog.mockReset().mockResolvedValue(undefined);
});

describe('POST /events/:id/register — the seat CAS', () => {
  it('409s when the CAS cannot claim a seat (full / raced / not open)', async () => {
    eventFindOneAndUpdate.mockImplementation(() => query(null));
    eventFindById.mockImplementation(() => query(event()));
    const res = await as(attendee).post(`/${EVENT_ID}/register`).send({});
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('SEATS_FULL');
    expect(regCreate).not.toHaveBeenCalled();
  });

  it('registers the caller with a server-minted check-in code', async () => {
    const res = await as(attendee).post(`/${EVENT_ID}/register`).send({ consentGiven: true });
    expect(res.status).toBe(201);
    expect(lastRegBody.userId).toBe(PATIENT);
    expect(lastRegBody.status).toBe('REGISTERED');
    expect(lastRegBody.checkInCode).toHaveLength(8);
    expect(lastRegBody.consentGivenAt).toBeInstanceOf(Date);
  });

  it('demands a verified payment for a paid event (402, never trusts a fee in the body)', async () => {
    eventFindById.mockImplementation(() => query(event({ fee: { amount: 100, currency: 'INR' } })));
    const res = await as(attendee).post(`/${EVENT_ID}/register`).send({});
    expect(res.status).toBe(402);
    expect(res.body.code).toBe('PAYMENT_REQUIRED');
    expect(regCreate).not.toHaveBeenCalled();
  });

  it('releases the claimed seat when the registration write fails (unique index race)', async () => {
    regCreate.mockImplementation(async () => {
      const err = new Error('dup');
      err.code = 11000;
      throw err;
    });
    const res = await as(attendee).post(`/${EVENT_ID}/register`).send({});
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('DUPLICATE_REGISTRATION');
    expect(eventUpdateOne).toHaveBeenCalledWith(
      { _id: EVENT_ID, registeredCount: { $gt: 0 } },
      { $inc: { registeredCount: -1 } },
    );
  });

  it('401s anonymous callers', async () => {
    const res = await as().post(`/${EVENT_ID}/register`).send({});
    expect(res.status).toBe(401);
  });
});

describe('POST /events/:id/registration/cancel — the refund rule', () => {
  const registration = (over = {}) => ({
    _id: 'reg1', eventId: EVENT_ID, userId: PATIENT, status: 'REGISTERED',
    feeAmount: 100, paymentId: 'pay1',
    ...over,
  });

  it('404s somebody else\'s registration (filter carries the session id)', async () => {
    regFindOne.mockImplementation(() => query(null));
    const res = await as(attendee).post(`/${EVENT_ID}/registration/cancel`).send({ reason: 'plans changed' });
    expect(res.status).toBe(404);
  });

  it('refunds before the cut-off and records REFUNDED on the row', async () => {
    regFindOne.mockImplementation(() => query(registration()));
    const refundDoc = {
      _id: 'ref1', status: 'PENDING',
      save: jestApi.fn().mockResolvedValue(undefined),
    };
    refundRequest.mockResolvedValue({ refund: refundDoc, created: true });
    refundSettle.mockResolvedValue({ status: 'COMPLETED' });
    regFindOneAndUpdate.mockImplementation(() => query(registration({ status: 'REFUNDED' })));

    const res = await as(attendee).post(`/${EVENT_ID}/registration/cancel`).send({ reason: 'cannot attend' });
    expect(res.status).toBe(200);
    expect(res.body.refund.ok).toBe(true);
    const set = regFindOneAndUpdate.mock.calls[0][1].$set;
    expect(set.status).toBe('REFUNDED');
    // The seat goes back either way.
    expect(eventUpdateOne).toHaveBeenCalled();
  });

  it('past the cut-off the row ends CANCELLED and no refund is attempted', async () => {
    regFindOne.mockImplementation(() => query(registration()));
    eventFindById.mockImplementation(() => query(event({
      schedule: { start: new Date(Date.now() + 3600 * 1000), end: new Date(Date.now() + 7200 * 1000) },
      refundCutoffHours: 24,
    })));
    regFindOneAndUpdate.mockImplementation(() => query(registration({ status: 'CANCELLED' })));

    const res = await as(attendee).post(`/${EVENT_ID}/registration/cancel`).send({ reason: 'too late' });
    expect(res.status).toBe(200);
    expect(res.body.refund.ok).toBe(false);
    expect(res.body.refund.reason).toBe('past-cutoff');
    expect(refundRequest).not.toHaveBeenCalled();
    expect(regFindOneAndUpdate.mock.calls[0][1].$set.status).toBe('CANCELLED');
  });
});

describe('POST /events/:id/publish — object ownership + CAS', () => {
  it('404s a caller who does not own the organiser provider', async () => {
    providerFindById.mockImplementation(() => query({ _id: ORG_PROVIDER, ownerUserId: ORG_OWNER, kind: 'organizer' }));
    const res = await as({ _id: '7000000000000000000000e5', role: 'doctor' })
      .post(`/${EVENT_ID}/publish`).send({});
    expect(res.status).toBe(404);
    expect(eventFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('publishes draft -> open', async () => {
    eventFindById.mockImplementation(() => query(event({ status: 'draft' })));
    eventFindOneAndUpdate.mockImplementation(() => query(event({ status: 'open' })));
    const res = await as(organiser).post(`/${EVENT_ID}/publish`).send({});
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('open');
    expect(eventFindOneAndUpdate.mock.calls[0][0].status).toBe('draft');
  });

  it('409s when the CAS loses (row moved since the read)', async () => {
    eventFindById.mockImplementation(() => query(event({ status: 'draft' })));
    eventFindOneAndUpdate.mockImplementation(() => query(null));
    const res = await as(organiser).post(`/${EVENT_ID}/publish`).send({});
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('ILLEGAL_STATE_TRANSITION');
  });
});

describe('public catalogue', () => {
  it('lists without a session and never shows drafts', async () => {
    const res = await as().get('/');
    expect(res.status).toBe(200);
    expect(eventFind.mock.calls[0][0].status.$in).toEqual(['open', 'ended']);
  });

  it('404s an unpublished event by id (no existence oracle)', async () => {
    eventFindOne.mockImplementation(() => query(null));
    const res = await as().get(`/${EVENT_ID}`);
    expect(res.status).toBe(404);
  });
});
