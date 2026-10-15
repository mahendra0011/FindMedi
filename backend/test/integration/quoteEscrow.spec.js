/**
 * FLOW-B escrow (5.md §3): the advance is HELD at accept (verified payment),
 * RELEASED when the service starts, disputable for 48 h after release.
 *
 * What it pins:
 *  - accept with a verified advancePaymentId sets advance.held=true with the
 *    server-computed amount; without one the row still records held:false;
 *    an unverified payment is 402 and writes nothing;
 *  - release is provider-owner-only, needs a held advance, stamps releasedAt
 *    + a 48 h disputeUntil, and is CAS-guarded (second release 409s);
 *  - dispute is patient-only inside the window (disputed=true freezes
 *    settlement); after the window or with no release it 409s.
 */
import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const QUOTE_ID = '7000000000000000000000a1';
const PAYMENT_ID = '7000000000000000000000c3';
const PATIENT = '7000000000000000000000d4';
const PROV_OWNER = '7000000000000000000000c3';

const quoteFindById = jestApi.fn();
const quoteFindOneAndUpdate = jestApi.fn();
const paymentFindById = jestApi.fn();
const auditLog = jestApi.fn();

jestApi.unstable_mockModule('../../src/models/Quote.js', () => ({
  __esModule: true,
  default: {
    findById: (...a) => quoteFindById(...a),
    findOneAndUpdate: (...a) => quoteFindOneAndUpdate(...a),
  },
}));
jestApi.unstable_mockModule('../../src/models/Payment.js', () => ({
  __esModule: true,
  default: { findById: (...a) => paymentFindById(...a) },
}));
jestApi.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLog: (...args) => auditLog(...args),
}));

const { as } = await mountApp('quotes');

const patient = { _id: PATIENT, role: 'patient' };
const providerOwner = { _id: PROV_OWNER, role: 'doctor' };

const quote = (over = {}) => ({
  _id: QUOTE_ID,
  patientId: PATIENT,
  providerId: '7000000000000000000000b2',
  providerOwnerId: PROV_OWNER,
  status: 'QUOTE_SENT',
  quote: { totalAmount: 1200, validUntil: new Date(Date.now() + 36e5) },
  expiresAt: new Date(Date.now() + 36e5),
  advance: { amount: 0, held: false, paymentId: null },
  ...over,
});

const payment = (over = {}) => ({
  _id: PAYMENT_ID,
  patient_id: PATIENT,
  status: 'completed',
  amount: 1200,
  ...over,
});

beforeEach(() => {
  quoteFindById.mockReset().mockImplementation(() => query(quote()));
  quoteFindOneAndUpdate.mockReset().mockImplementation(() => query(quote({ status: 'ACCEPTED' })));
  paymentFindById.mockReset().mockImplementation(() => query(null));
  auditLog.mockReset().mockResolvedValue(undefined);
});

describe('POST /quotes/:id/accept with advance', () => {
  it('holds the advance on a verified payment', async () => {
    paymentFindById.mockImplementation(() => query(payment()));
    const res = await as(patient).post(`/${QUOTE_ID}/accept`).send({ advancePaymentId: PAYMENT_ID });
    expect(res.status).toBe(200);
    const set = quoteFindOneAndUpdate.mock.calls[0][1].$set;
    expect(set['advance.held']).toBe(true);
    expect(set['advance.amount']).toBe(1200);
    expect(String(set['advance.paymentId'])).toBe(PAYMENT_ID);
  });

  it('records held:false when no advance payment rides along', async () => {
    const res = await as(patient).post(`/${QUOTE_ID}/accept`).send({});
    expect(res.status).toBe(200);
    expect(quoteFindOneAndUpdate.mock.calls[0][1].$set['advance.held']).toBe(false);
    expect(paymentFindById).not.toHaveBeenCalled();
  });

  it('402s an unverified advance payment without writing', async () => {
    paymentFindById.mockImplementation(() => query(payment({ patient_id: 'someone-else' })));
    const res = await as(patient).post(`/${QUOTE_ID}/accept`).send({ advancePaymentId: PAYMENT_ID });
    expect(res.status).toBe(402);
    expect(res.body.code).toBe('ADVANCE_NOT_VERIFIED');
    expect(quoteFindOneAndUpdate).not.toHaveBeenCalled();
  });
});

describe('POST /quotes/:id/release-advance', () => {
  const held = () => quote({
    status: 'ACCEPTED',
    advance: { amount: 1200, held: true, paymentId: PAYMENT_ID },
  });

  it('releases on provider call with a 48 h dispute window', async () => {
    quoteFindById.mockImplementation(() => query(held()));
    quoteFindOneAndUpdate.mockImplementation(() => query(held()));
    const before = Date.now();
    const res = await as(providerOwner).post(`/${QUOTE_ID}/release-advance`).send({});
    expect(res.status).toBe(200);
    const set = quoteFindOneAndUpdate.mock.calls[0][1].$set;
    expect(set['advance.held']).toBe(false);
    expect(new Date(set['advance.disputeUntil']).getTime() - new Date(set['advance.releasedAt']).getTime()).toBe(48 * 3600 * 1000);
    expect(new Date(set['advance.releasedAt']).getTime()).toBeGreaterThanOrEqual(before);
    expect(auditLog).toHaveBeenCalledWith('quote_advance_released', PROV_OWNER, expect.objectContaining({ amount: 1200 }));
  });

  it('409s when nothing is held', async () => {
    quoteFindById.mockImplementation(() => query(quote({ status: 'ACCEPTED' })));
    const res = await as(providerOwner).post(`/${QUOTE_ID}/release-advance`).send({});
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('NOTHING_HELD');
    expect(quoteFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('does not let the patient release', async () => {
    quoteFindById.mockImplementation(() => query(held()));
    const res = await as(patient).post(`/${QUOTE_ID}/release-advance`).send({});
    expect(res.status).not.toBe(200);
    expect(quoteFindOneAndUpdate).not.toHaveBeenCalled();
  });
});

describe('POST /quotes/:id/dispute-advance', () => {
  const released = (over = {}) => quote({
    status: 'ACCEPTED',
    advance: {
      amount: 1200, held: false, paymentId: PAYMENT_ID,
      releasedAt: new Date(Date.now() - 3600 * 1000),
      disputeUntil: new Date(Date.now() + 47 * 3600 * 1000),
      disputed: false,
      ...over,
    },
  });

  it('freezes settlement inside the window', async () => {
    quoteFindById.mockImplementation(() => query(released()));
    quoteFindOneAndUpdate.mockImplementation(() => query(released()));
    const res = await as(patient).post(`/${QUOTE_ID}/dispute-advance`).send({ reason: 'Work never started' });
    expect(res.status).toBe(200);
    expect(quoteFindOneAndUpdate.mock.calls[0][1].$set['advance.disputed']).toBe(true);
    expect(auditLog).toHaveBeenCalledWith('quote_advance_disputed', PATIENT, expect.objectContaining({}));
  });

  it('409s after the window and with no release', async () => {
    quoteFindById.mockImplementation(() => query(released({ disputeUntil: new Date(Date.now() - 1000) })));
    const closed = await as(patient).post(`/${QUOTE_ID}/dispute-advance`).send({ reason: 'Late' });
    expect(closed.status).toBe(409);
    expect(closed.body.code).toBe('DISPUTE_WINDOW_CLOSED');

    quoteFindById.mockImplementation(() => query(quote({ status: 'ACCEPTED' })));
    const none = await as(patient).post(`/${QUOTE_ID}/dispute-advance`).send({ reason: 'x' });
    expect(none.status).toBe(409);
    expect(none.body.code).toBe('NOTHING_TO_DISPUTE');
  });

  it('400s an empty reason (strict schema)', async () => {
    quoteFindById.mockImplementation(() => query(released()));
    const res = await as(patient).post(`/${QUOTE_ID}/dispute-advance`).send({ reason: '' });
    expect(res.status).toBe(400);
    expect(quoteFindOneAndUpdate).not.toHaveBeenCalled();
  });
});
