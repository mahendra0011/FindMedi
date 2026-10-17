import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const ID = '700000000000000000000001';
const claimerId = '64b000000000000000000c1a';

const auditLog = jestApi.fn();
const providerFindById = jestApi.fn();

let doc = null;

// The routes mutate the loaded document and then `save()`, so the fixture is a
// plain object carrying a jest save spy — enough to assert both the writes the
// handler performed and that it persisted them.
const makeDoc = (overrides = {}) => ({
  _id: ID,
  name: 'District Civil Hospital',
  importedFrom: 'njhm.gov.in',
  claimedBy: null,
  claimRequest: {
    userId: null, note: '', status: 'none', requestedAt: null,
    decidedAt: null, decidedBy: null, reason: '',
  },
  save: jestApi.fn().mockResolvedValue(undefined),
  ...overrides,
});

jestApi.unstable_mockModule('../../src/models/Provider.js', () => ({
  __esModule: true,
  default: {
    find: () => query([]),
    findOne: () => query(null),
    findById: (...args) => providerFindById(...args),
    countDocuments: () => query(0),
    create: async (body) => ({ _id: ID, ...body }),
  },
  PROVIDER_STATUS: ['draft', 'submitted', 'under_review', 'needs_info', 'approved', 'live', 'suspended', 'expired', 'rejected', 'archived'],
}));

jestApi.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLog: (...args) => auditLog(...args),
}));

const { as } = await mountApp('providers', {});
// Same mocked module instance the router holds, so re-pointing `find` here is
// what the route's own `Provider.find(...)` call resolves to.
const { default: Provider } = await import('../../src/models/Provider.js');

const claimer = { _id: claimerId, role: 'doctor' };
const superadmin = { _id: '64b000000000000000000c1b', role: 'superadmin' };
const complianceOfficer = { _id: '64b000000000000000000c1c', role: 'compliance_officer' };

beforeEach(() => {
  doc = makeDoc();
  providerFindById.mockReset().mockResolvedValue(doc);
  auditLog.mockReset().mockResolvedValue(undefined);
});

describe('POST /providers/:id/claim (claim-listing, 10.md 4.4)', () => {
  it('refuses anonymous callers', async () => {
    const res = await as().post(`/${ID}/claim`).send({});
    expect(res.status).toBe(401);
    expect(auditLog).not.toHaveBeenCalled();
  });

  it('rejects a listing that is neither govt nor imported', async () => {
    doc = makeDoc({ importedFrom: '', type: 'dental_clinic', kind: 'facility' });
    providerFindById.mockResolvedValue(doc);

    const res = await as(claimer).post(`/${ID}/claim`).send({ note: 'We run it' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/cannot be claimed/i);
    expect(doc.save).not.toHaveBeenCalled();
  });

  it.each([
    ['an imported row', { importedFrom: 'njhm.gov.in' }],
    ['a govt facility type', { type: 'govt_facility' }],
    ['an info-only kind', { kind: 'info' }],
    ['a helpline', { type: 'helpline' }],
  ])('accepts %s as claimable', async (_label, override) => {
    doc = makeDoc({ type: 'dental_clinic', kind: 'facility', importedFrom: '', ...override });
    providerFindById.mockResolvedValue(doc);

    const res = await as(claimer).post(`/${ID}/claim`).send({});
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('pending');
  });

  it('conflicts when the listing is already claimed', async () => {
    doc = makeDoc({ claimedBy: '64b000000000000000000c1d' });
    providerFindById.mockResolvedValue(doc);

    const res = await as(claimer).post(`/${ID}/claim`).send({});

    expect(res.status).toBe(409);
    expect(doc.save).not.toHaveBeenCalled();
  });

  it('conflicts when the claimant already owns it', async () => {
    doc = makeDoc({ claimedBy: claimerId });
    providerFindById.mockResolvedValue(doc);

    const res = await as(claimer).post(`/${ID}/claim`).send({});

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already manage/i);
  });

  it('conflicts while another request is still under review', async () => {
    doc = makeDoc({ claimRequest: { userId: '64b000000000000000000c1e', status: 'pending' } });
    providerFindById.mockResolvedValue(doc);

    const res = await as(claimer).post(`/${ID}/claim`).send({});

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/under review/i);
    expect(doc.save).not.toHaveBeenCalled();
  });

  it('records a pending request and audits it', async () => {
    const res = await as(claimer).post(`/${ID}/claim`).send({ note: 'We are the district operator' });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('pending');
    expect(res.body.providerId).toBe(ID);
    expect(doc.claimRequest.userId).toBe(claimerId);
    expect(doc.claimRequest.status).toBe('pending');
    expect(doc.claimRequest.note).toBe('We are the district operator');
    expect(doc.save).toHaveBeenCalledTimes(1);
    expect(auditLog).toHaveBeenCalledWith(
      'provider_claim_requested',
      claimerId,
      expect.objectContaining({ providerId: ID }),
    );
  });

  it('does not stamp claimedBy — that only happens on approval', async () => {
    await as(claimer).post(`/${ID}/claim`).send({});
    expect(doc.claimedBy).toBeNull();
  });

  it('rejects unknown body keys and an over-long note', async () => {
    const unknownKey = await as(claimer).post(`/${ID}/claim`).send({ approved: true });
    expect(unknownKey.status).toBe(400);

    const tooLong = await as(claimer).post(`/${ID}/claim`).send({ note: 'x'.repeat(501) });
    expect(tooLong.status).toBe(400);
    expect(doc.save).not.toHaveBeenCalled();
  });

  it('resolves a public detail page by slug, since that is what it has', async () => {
    const slugDoc = makeDoc({ _id: '700000000000000000000002' });
    const findOne = jestApi.fn().mockResolvedValue(slugDoc);
    Provider.findOne = findOne;

    try {
      const res = await as(claimer).post('/district-civil-hospital/claim').send({ note: 'We run it' });
      expect(res.status).toBe(201);
      expect(findOne).toHaveBeenCalledWith({ slug: 'district-civil-hospital' });
      expect(providerFindById).not.toHaveBeenCalled();
      expect(slugDoc.claimRequest.userId).toBe(claimerId);
    } finally {
      Provider.findOne = () => query(null);
    }
  });

  it('404s an unknown slug', async () => {
    const findOne = jestApi.fn().mockResolvedValue(null);
    Provider.findOne = findOne;
    try {
      const res = await as(claimer).post('/district-civil-hospital/claim').send({});
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Provider not found');
      expect(findOne).toHaveBeenCalledWith({ slug: 'district-civil-hospital' });
      expect(providerFindById).not.toHaveBeenCalled();
    } finally {
      Provider.findOne = () => query(null);
    }
  });

  it('never falls an id-shaped string through to a slug lookup', async () => {
    providerFindById.mockResolvedValue(null);
    const findOne = jestApi.fn();
    Provider.findOne = findOne;
    try {
      const res = await as(claimer).post(`/${'f'.repeat(24)}/claim`).send({});
      expect(res.status).toBe(404);
      expect(providerFindById).toHaveBeenCalledWith(`${'f'.repeat(24)}`);
      expect(findOne).not.toHaveBeenCalled();
    } finally {
      Provider.findOne = () => query(null);
    }
  });
});

describe('POST /providers/:id/claim-approve (10.md 4.4)', () => {
  const pending = () => makeDoc({
    claimRequest: {
      userId: claimerId, note: 'District operator', status: 'pending',
      requestedAt: new Date('2026-10-01T00:00:00.000Z'),
      decidedAt: null, decidedBy: null, reason: '',
    },
  });

  it('is gated by role', async () => {
    doc = pending();
    providerFindById.mockResolvedValue(doc);

    const res = await as({ _id: claimerId, role: 'doctor' }).post(`/${ID}/claim-approve`).send({});

    expect(res.status).toBe(403);
    expect(doc.save).not.toHaveBeenCalled();
    expect(auditLog).not.toHaveBeenCalled();
  });

  it('404s anonymous callers', async () => {
    const res = await as().post(`/${ID}/claim-approve`).send({});
    expect(res.status).toBe(401);
  });

  it('approves: claimedBy flips to the claimant and the decision is audited', async () => {
    doc = pending();
    providerFindById.mockResolvedValue(doc);

    const res = await as(superadmin).post(`/${ID}/claim-approve`).send({});

    expect(res.status).toBe(200);
    expect(res.body.claimedBy).toBe(claimerId);
    expect(res.body.status).toBe('approved');
    expect(String(doc.claimedBy)).toBe(claimerId);
    expect(doc.claimRequest.decidedBy).toBe(superadmin._id);
    expect(doc.claimRequest.decidedAt).toBeInstanceOf(Date);
    expect(doc.save).toHaveBeenCalledTimes(1);
    expect(auditLog).toHaveBeenCalledWith(
      'provider_claim_approved',
      superadmin._id,
      expect.objectContaining({ providerId: ID, claimedBy: claimerId }),
    );
  });

  it('is reachable by a compliance_officer too', async () => {
    doc = pending();
    providerFindById.mockResolvedValue(doc);

    const res = await as(complianceOfficer).post(`/${ID}/claim-approve`).send({});
    expect(res.status).toBe(200);
  });

  it('refuses when there is nothing pending', async () => {
    const res = await as(superadmin).post(`/${ID}/claim-approve`).send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/no claim request/i);
    expect(doc.save).not.toHaveBeenCalled();
    expect(auditLog).not.toHaveBeenCalled();
  });

  it('refuses to re-approve an already approved claim', async () => {
    doc = makeDoc({
      claimedBy: claimerId,
      claimRequest: { userId: claimerId, status: 'approved', note: '', requestedAt: null, decidedAt: new Date(), decidedBy: superadmin._id, reason: '' },
    });
    providerFindById.mockResolvedValue(doc);

    const res = await as(superadmin).post(`/${ID}/claim-approve`).send({});
    expect(res.status).toBe(400);
    expect(doc.save).not.toHaveBeenCalled();
  });
});

describe('POST /providers/:id/claim-reject', () => {
  const pending = () => makeDoc({
    claimRequest: {
      userId: claimerId, note: 'trust me', status: 'pending',
      requestedAt: new Date(), decidedAt: null, decidedBy: null, reason: '',
    },
  });

  it('is gated by role', async () => {
    const res = await as({ _id: claimerId, role: 'doctor' }).post(`/${ID}/claim-reject`).send({});
    expect(res.status).toBe(403);
  });

  it('clears the queue entry without touching claimedBy', async () => {
    doc = pending();
    providerFindById.mockResolvedValue(doc);

    const res = await as(superadmin).post(`/${ID}/claim-reject`).send({ reason: 'No document of authorisation' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('rejected');
    expect(res.body.reason).toBe('No document of authorisation');
    expect(res.body.claimedBy).toBeNull();
    expect(doc.claimedBy).toBeNull();
    expect(doc.claimRequest.decidedBy).toBe(superadmin._id);
    expect(doc.save).toHaveBeenCalledTimes(1);
    expect(auditLog).toHaveBeenCalledWith(
      'provider_claim_rejected',
      superadmin._id,
      expect.objectContaining({ providerId: ID, reason: 'No document of authorisation' }),
    );
  });

  it('leaves the listing claimable again by the next applicant', async () => {
    doc = pending();
    providerFindById.mockResolvedValue(doc);
    await as(complianceOfficer).post(`/${ID}/claim-reject`).send({ reason: 'wrong listing' });

    // Second applicant on the same row: only a *pending* request conflicts.
    doc.save.mockClear();
    const second = await as({ _id: '64b000000000000000000c1f', role: 'doctor' }).post(`/${ID}/claim`).send({});
    expect(second.status).toBe(201);
    expect(second.body.status).toBe('pending');
  });

  it('refuses when there is nothing pending', async () => {
    const res = await as(superadmin).post(`/${ID}/claim-reject`).send({ reason: 'nope' });
    expect(res.status).toBe(400);
    expect(doc.save).not.toHaveBeenCalled();
  });
});

describe('claim state surfaces in the admin directory', () => {
  it('projects claimedBy/claimRequest so the review queue can read them', async () => {
    const selects = [];
    const chain = query([]);
    chain.select = (fields) => { selects.push(fields); return chain; };
    const originalFind = Provider.find;
    Provider.find = () => chain;
    try {
      const res = await as(superadmin).get('/admin/list');
      expect(res.status).toBe(200);
      const projected = selects.join(' ');
      expect(projected).toContain('claimRequest');
      expect(projected).toContain('claimedBy');
      expect(projected).toContain('importedFrom');
    } finally {
      Provider.find = originalFind;
    }
  });
});
