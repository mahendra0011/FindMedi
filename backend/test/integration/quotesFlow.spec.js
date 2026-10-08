import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

// 5.md Flow B (request & quote): the patient files, the provider prices, the
// patient decides. Server-owned totals, CAS on every money-adjacent move, and
// the 48 h validity window enforced on read AND on accept.

const QUOTE_ID = '7000000000000000000000a1';
const PROVIDER_ID = '7000000000000000000000b2';
const PROV_OWNER = '7000000000000000000000c3';
const PATIENT = '7000000000000000000000d4';

const quoteFind = jestApi.fn();
const quoteCount = jestApi.fn();
const quoteCreate = jestApi.fn();
const quoteFindById = jestApi.fn();
const quoteFindOneAndUpdate = jestApi.fn();
const quoteUpdateOne = jestApi.fn();
const providerFindById = jestApi.fn();
const providerFind = jestApi.fn();
const auditLog = jestApi.fn();

let lastCreateBody = null;

jestApi.unstable_mockModule('../../src/models/Quote.js', () => ({
  __esModule: true,
  default: {
    find: (...a) => quoteFind(...a),
    countDocuments: (...a) => quoteCount(...a),
    create: (body) => { lastCreateBody = body; return quoteCreate(body); },
    findById: (...a) => quoteFindById(...a),
    findOneAndUpdate: (...a) => quoteFindOneAndUpdate(...a),
    updateOne: (...a) => quoteUpdateOne(...a),
  },
}));

jestApi.unstable_mockModule('../../src/models/Provider.js', () => ({
  __esModule: true,
  default: {
    findById: (...a) => providerFindById(...a),
    find: (...a) => providerFind(...a),
  },
}));

jestApi.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLog: (...args) => auditLog(...args),
}));

const { as } = await mountApp('quotes');

const patient = { _id: PATIENT, role: 'patient' };
const providerOwner = { _id: PROV_OWNER, role: 'doctor' };
const stranger = { _id: '7000000000000000000000e5', role: 'patient' };

const quote = (over = {}) => {
  const doc = {
    _id: QUOTE_ID, patientId: PATIENT, providerId: PROVIDER_ID, providerOwnerId: PROV_OWNER,
    status: 'QUOTE_SENT',
    quote: { totalAmount: 1200, validUntil: new Date(Date.now() + 36e5), lineItems: [] },
    expiresAt: new Date(Date.now() + 36e5),
    ...over,
  };
  // The read handler serialises through the document API; the stub answers it.
  doc.toObject = () => {
    const { toObject, ...rest } = doc;
    return rest;
  };
  return doc;
};

const liveProvider = { _id: PROVIDER_ID, ownerUserId: PROV_OWNER, status: 'live' };

beforeEach(() => {
  lastCreateBody = null;
  quoteFind.mockReset().mockImplementation(() => query([]));
  quoteCount.mockReset().mockResolvedValue(0);
  quoteCreate.mockReset().mockImplementation(async (body) => ({ _id: QUOTE_ID, ...body }));
  quoteFindById.mockReset().mockImplementation(() => query(quote()));
  quoteFindOneAndUpdate.mockReset().mockImplementation(() => query(quote({ status: 'ACCEPTED' })));
  quoteUpdateOne.mockReset().mockResolvedValue({ matchedCount: 1 });
  providerFindById.mockReset().mockImplementation(() => query(liveProvider));
  providerFind.mockReset().mockImplementation(() => query([]));
  auditLog.mockReset().mockResolvedValue(undefined);
});

describe('GET /quotes', () => {
  it('401s anonymous callers (every route here is session-scoped)', async () => {
    const res = await as().get('/');
    expect(res.status).toBe(401);
  });

  it('lists the caller\'s own requests only', async () => {
    const res = await as(patient).get('/');
    expect(res.status).toBe(200);
    expect(quoteFind.mock.calls[0][0].$or).toEqual([{ patientId: PATIENT }]);
  });
});

describe('POST /quotes — filing a request', () => {
  const body = { providerId: PROVIDER_ID, serviceDescription: 'Need a home physio assessment for my father' };

  it('stamps the patient id from the session, never the body', async () => {
    const res = await as(patient).post('/').send(body);
    expect(res.status).toBe(201);
    expect(lastCreateBody.patientId).toBe(PATIENT);
    expect(lastCreateBody.status).toBe('REQUESTED');
  });

  it('409s a provider that is not taking requests', async () => {
    providerFindById.mockImplementation(() => query({ ...liveProvider, status: 'draft' }));
    const res = await as(patient).post('/').send(body);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('PROVIDER_NOT_TAKING_REQUESTS');
    expect(quoteCreate).not.toHaveBeenCalled();
  });
});

describe('POST /quotes/:id/quote — server-computed totals', () => {
  it('400s a body carrying its own total (strict schema)', async () => {
    const res = await as(providerOwner).post(`/${QUOTE_ID}/quote`).send({
      lineItems: [{ description: 'Consult', quantity: 1, unitPrice: 500 }],
      totalAmount: 99999,
    });
    expect(res.status).toBe(400);
    expect(quoteFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('computes the total from line items and stores the 48 h window', async () => {
    quoteFindOneAndUpdate.mockImplementation(() => query(quote({
      status: 'QUOTE_SENT',
      quote: { totalAmount: 1000, validUntil: new Date(Date.now() + 48 * 36e5) },
    })));
    const res = await as(providerOwner).post(`/${QUOTE_ID}/quote`).send({
      lineItems: [{ description: 'Consult', quantity: 2, unitPrice: 500 }],
      gstRate: 0,
    });
    expect(res.status).toBe(200);
    const update = quoteFindOneAndUpdate.mock.calls[0][1];
    expect(update.$set.quote.totalAmount).toBe(1000);
    expect(new Date(update.$set.expiresAt).getTime()).toBeGreaterThan(Date.now() + 47 * 36e5);
  });

  it('is not reachable by the patient (ownerLoader resolves the provider owner)', async () => {
    providerFindById.mockImplementation(() => query(liveProvider));
    const res = await as(patient).post(`/${QUOTE_ID}/quote`).send({
      lineItems: [{ description: 'Consult', quantity: 1, unitPrice: 500 }],
    });
    expect(res.status).toBe(404);
    expect(quoteFindOneAndUpdate).not.toHaveBeenCalled();
  });
});

describe('POST /quotes/:id/accept', () => {
  it('409s an expired quote and records the expiry', async () => {
    quoteFindById.mockImplementation(() => query(quote({
      status: 'QUOTE_SENT', expiresAt: new Date(Date.now() - 1000),
      quote: { validUntil: new Date(Date.now() - 1000), totalAmount: 1200 },
    })));
    const res = await as(patient).post(`/${QUOTE_ID}/accept`).send({});
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('QUOTE_EXPIRED');
    expect(quoteUpdateOne).toHaveBeenCalled();
    expect(quoteFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('replays idempotently when a concurrent accept won the CAS', async () => {
    quoteFindOneAndUpdate.mockImplementation(() => query(null));
    quoteFindById.mockImplementation(() => query(quote({ status: 'ACCEPTED' })));
    const res = await as(patient).post(`/${QUOTE_ID}/accept`).send({});
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ACCEPTED');
  });

  it('accepts with the advance recorded but NOT held (escrow seam)', async () => {
    quoteFindOneAndUpdate.mockImplementation(() => query(quote({ status: 'ACCEPTED' })));
    const res = await as(patient).post(`/${QUOTE_ID}/accept`).send({});
    expect(res.status).toBe(200);
    const update = quoteFindOneAndUpdate.mock.calls[0][1].$set;
    expect(update.status).toBe('ACCEPTED');
    expect(update['advance.held']).toBe(false);
    expect(update['advance.amount']).toBe(1200);
  });

  it('refuses an empty body — accept carries no payload, least of all a price', async () => {
    const res = await as(patient).post(`/${QUOTE_ID}/accept`).send({ totalAmount: 1 });
    expect(res.status).toBe(400);
  });
});

describe('GET /quotes/:id', () => {
  it('404s a caller who is neither party', async () => {
    quoteFindById.mockImplementation(() => query(quote()));
    const res = await as(stranger).get(`/${QUOTE_ID}`);
    expect(res.status).toBe(404);
  });

  it('serves the patient their own request, with the effective status', async () => {
    quoteFindById.mockImplementation(() => query(quote({
      status: 'QUOTE_SENT', expiresAt: new Date(Date.now() - 1000),
      quote: { validUntil: new Date(Date.now() - 1000) },
    })));
    const res = await as(patient).get(`/${QUOTE_ID}`);
    expect(res.status).toBe(200);
    expect(res.body.effectiveStatus).toBe('EXPIRED');
  });
});
