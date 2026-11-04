import { jest } from '@jest/globals';
import { mountApp } from '../helpers/appHarness.js';

// Spec 3.1: versioned Community Guidelines + Provider Agreement. Public reads,
// authenticated version-pinned acceptance into the existing ledger.

const chain = (result) => {
  const q = {
    sort: () => q,
    select: () => q,
    lean: () => Promise.resolve(result),
    then: (res, rej) => Promise.resolve(result).then(res, rej),
    catch: (rej) => Promise.resolve(result).catch(rej),
  };
  return q;
};

const findOne = jest.fn(() => chain(null));
const create = jest.fn(async (body) => ({
  ...body,
  acceptedAt: new Date(),
  toObject() { return { ...this }; },
}));
const auditLog = jest.fn().mockResolvedValue({});

jest.unstable_mockModule('../../src/models/PolicyAcceptance.js', () => ({
  __esModule: true,
  default: { findOne, create },
}));
jest.unstable_mockModule('../../src/middleware/audit.js', () => ({ auditLog }));

const { as } = await mountApp('legal');
const user = { id: '64b0000000000000000000aa', role: 'patient' };

describe('Spec 3.1: legal documents + acceptance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findOne.mockReturnValue(chain(null));
  });

  test('lists the community guidelines and provider agreement for everyone', async () => {
    const res = await as(null).get('/documents').expect(200);
    const contexts = res.body.documents.map((d) => d.context);
    expect(contexts).toContain('community_guidelines');
    expect(contexts).toContain('provider_agreement');
    for (const doc of res.body.documents) {
      expect(doc.documentHash).toMatch(/^[0-9a-f]{64}$/);
      expect(doc.version).toBeTruthy();
    }
  });

  test('serves full sections and 404s unknown documents', async () => {
    const res = await as(null).get('/documents/community_guidelines').expect(200);
    expect(res.body.document.sections.length).toBeGreaterThan(2);
    await as(null).get('/documents/not-a-doc').expect(404);
  });

  test('requires auth to accept', async () => {
    await as(null).post('/accept')
      .send({ context: 'community_guidelines', templateVersion: '2026-10-01' })
      .expect(401);
  });

  test('rejects a stale version with the current version in the body', async () => {
    const res = await as(user).post('/accept')
      .send({ context: 'community_guidelines', templateVersion: '2020-01-01' })
      .expect(409);
    expect(res.body.currentVersion).toBe('2026-10-01');
    expect(res.body.documentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(create).not.toHaveBeenCalled();
  });

  test('records acceptance with hash evidence and is idempotent', async () => {
    const res = await as(user).post('/accept')
      .send({ context: 'provider_agreement', templateVersion: '2026-10-01' })
      .expect(201);
    expect(res.body.acceptance.context).toBe('provider_agreement');
    expect(res.body.acceptance.documentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      userId: '64b0000000000000000000aa',
      templateVersion: '2026-10-01',
    }));

    findOne.mockReturnValueOnce(chain({ _id: 'existing', templateVersion: '2026-10-01' }));
    await as(user).post('/accept')
      .send({ context: 'provider_agreement', templateVersion: '2026-10-01' })
      .expect(201);
    expect(create).toHaveBeenCalledTimes(1);
  });

  test('acceptance status reports upToDate per document', async () => {
    const res = await as(user).get('/acceptances').expect(200);
    expect(res.body.acceptances).toHaveLength(2);
    expect(res.body.acceptances[0].currentVersion).toBe('2026-10-01');
  });
});
