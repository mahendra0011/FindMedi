import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const LIVE_CARD = {
  _id: 'p1', providerId: '1000000000000001', slug: 'smile-dental-studio',
  kind: 'facility', type: 'dental_clinic', group: 'clinical', tier: 'T1',
  name: 'Smile Dental Studio', tagline: 'Painless dentistry',
  media: [], address: { city: 'Pune' },
  stats: { ratingAvg: 4.6, ratingCount: 12 },
  verification: { status: 'verified', level: 2, riskScore: 17 },
  trusted: true, plan: 'premium', status: 'live',
  ownerUserId: 'owner-1',
  contact: { publicPhone: '+911100000000', relayPhone: '+919999999999' },
  probation: { active: false, payoutHold: true },
};

const configRow = { typeKey: 'dental_clinic', kind: 'facility', group: 'clinical', tier: 'T1', isActive: true };

const providerFindOne = jestApi.fn();
const providerFindById = jestApi.fn();
const providerCountDocuments = jestApi.fn();
const providerCreate = jestApi.fn();
const configFindOne = jestApi.fn();
const auditLog = jestApi.fn();

let lastListFilter = null;
let lastSelect = null;

// Query stub that records the projection the route asked for, so the spec can
// assert the DTO fields directly (the way categoriesPublic.spec.js does).
const chain = (value) => {
  const q = query(value);
  q.select = (fields) => { lastSelect = fields; return q; };
  return q;
};

jestApi.unstable_mockModule('../../src/models/Provider.js', () => ({
  __esModule: true,
  default: {
    find: (filter) => { lastListFilter = filter; return chain([LIVE_CARD]); },
    findOne: (...args) => providerFindOne(...args),
    findById: (...args) => providerFindById(...args),
    countDocuments: (...args) => providerCountDocuments(...args),
    create: (...args) => providerCreate(...args),
  },
  PROVIDER_STATUS: ['draft', 'submitted', 'under_review', 'needs_info', 'approved', 'live', 'suspended', 'expired', 'rejected', 'archived'],
}));

jestApi.unstable_mockModule('../../src/models/ProviderTypeConfig.js', () => ({
  default: { findOne: (...args) => configFindOne(...args) },
}));

jestApi.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLog: (...args) => auditLog(...args),
}));

const { as } = await mountApp('providers', {});

const owner = { _id: 'owner-1', role: 'doctor' };
const stranger = { _id: 'someone-else', role: 'doctor' };
const superadmin = { _id: 'sa1', role: 'superadmin' };
const hospitalAdmin = { _id: 'ha1', role: 'hospital_admin' };
// Path params on the write routes are checked against a 24-hex ObjectId before
// authorizeObject runs, so the fixtures have to look like real ids.
const PROVIDER_ID = '700000000000000000000001';

beforeEach(() => {
  lastListFilter = null;
  lastSelect = null;
  providerFindOne.mockReset().mockImplementation(() => chain(LIVE_CARD));
  providerFindById.mockReset().mockResolvedValue({
    _id: 'p1', ownerUserId: 'owner-1', type: 'dental_clinic', kind: 'facility',
    group: 'clinical', tier: 'T1', status: 'draft', save: jestApi.fn().mockResolvedValue(undefined),
  });
  providerCountDocuments.mockReset().mockResolvedValue(1);
  providerCreate.mockReset().mockImplementation(async (body) => ({ _id: 'p1', ...body }));
  configFindOne.mockReset().mockResolvedValue(configRow);
  auditLog.mockReset().mockResolvedValue(undefined);
});

describe('GET /providers (public directory)', () => {
  it('serves anonymous callers and only ever queries live rows', async () => {
    const res = await as().get('/');
    expect(res.status).toBe(200);
    expect(res.body.providers).toHaveLength(1);
    expect(lastListFilter).toEqual({ status: 'live' });
  });

  it('narrows by type, group and city without letting the caller widen status', async () => {
    await as().get('/?type=Dental_Clinic&group=clinical&city=Pune&q=smile');
    expect(lastListFilter.status).toBe('live');
    expect(lastListFilter.type).toBe('dental_clinic');
    expect(lastListFilter.group).toBe('clinical');
    expect(lastListFilter['address.city']).toBeInstanceOf(RegExp);
    expect(lastListFilter.$or).toHaveLength(2);
  });

  it('clamps pagination instead of trusting the query string', async () => {
    await as().get('/?page=-4&limit=99999');
    const res = await as().get('/?page=-4&limit=99999');
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(100);
  });

  it('escapes regex metacharacters in the city filter', async () => {
    await as().get('/?city=Pune+(%2B)');
    expect(lastListFilter['address.city'].source).toContain('\\+');
  });
});

describe('GET /providers/:slug (detail DTO)', () => {
  it('returns the live detail document', async () => {
    const res = await as().get('/smile-dental-studio');
    expect(res.status).toBe(200);
    expect(res.body.slug).toBe('smile-dental-studio');
    expect(res.headers['cache-control']).toBe('public, max-age=120');
  });

  it('404s a slug that is not live', async () => {
    providerFindOne.mockImplementation(() => chain(null));
    const res = await as().get('/draft-clinic');
    expect(res.status).toBe(404);
  });
});

describe('provider DTO projections', () => {
  it('keeps private provider fields out of the card list', async () => {
    await as().get('/');
    for (const forbidden of ['relayPhone', 'ownerUserId', 'probation', 'riskScore', 'commissionConfigId']) {
      expect(lastSelect).not.toContain(forbidden);
    }
    expect(lastSelect).toContain('slug');
    expect(lastSelect).toContain('stats');
  });

  it('keeps private provider fields out of the detail page', async () => {
    await as().get('/smile-dental-studio');
    for (const forbidden of ['relayPhone', 'ownerUserId', 'probation', 'riskScore', 'commissionConfigId']) {
      expect(lastSelect).not.toContain(forbidden);
    }
    expect(lastSelect).toContain('contact.publicPhone');
    expect(lastSelect).toContain('address.geo');
  });
});

describe('POST /providers', () => {
  it('refuses anonymous callers', async () => {
    const res = await as().post('/').send({ type: 'dental_clinic', name: 'Smile' });
    expect(res.status).toBe(401);
    expect(providerCreate).not.toHaveBeenCalled();
  });

  it('refuses a role outside the allowlist', async () => {
    const res = await as({ _id: 'pat1', role: 'patient' }).post('/').send({ type: 'dental_clinic', name: 'Smile' });
    expect(res.status).toBe(403);
  });

  it('rejects a type the config table does not know', async () => {
    configFindOne.mockResolvedValue(null);
    const res = await as(superadmin).post('/').send({ type: 'unlisted_type', name: 'Smile' });
    expect(res.status).toBe(400);
    expect(providerCreate).not.toHaveBeenCalled();
  });

  it('derives kind, group and tier from config and locks the row as a draft', async () => {
    const res = await as(hospitalAdmin).post('/').send({ type: 'dental_clinic', name: 'Smile Dental Studio' });
    expect(res.status).toBe(201);
    expect(providerCreate).toHaveBeenCalledWith(expect.objectContaining({
      type: 'dental_clinic',
      name: 'Smile Dental Studio',
      kind: 'facility',
      group: 'clinical',
      tier: 'T1',
      ownerUserId: 'ha1',
      status: 'draft',
    }));
    expect(auditLog).toHaveBeenCalledWith('create_provider', 'ha1', expect.objectContaining({ type: 'dental_clinic' }));
  });

  it('rejects a body carrying operator-owned fields', async () => {
    const res = await as(superadmin).post('/').send({
      type: 'dental_clinic', name: 'Smile', status: 'live', trusted: true, kind: 'vendor',
    });
    expect(res.status).toBe(400);
    expect(providerCreate).not.toHaveBeenCalled();
  });
});

describe('PATCH /providers/:id', () => {
  it('lets the owner edit writable fields only', async () => {
    const res = await as(owner).patch(`/${PROVIDER_ID}`).send({ tagline: 'Gentle hands' });
    expect(res.status).toBe(200);
    expect(res.body.tagline).toBe('Gentle hands');
    expect(auditLog).toHaveBeenCalledWith('update_provider', 'owner-1', expect.any(Object));
  });

  it('denies an unrelated caller with a 404, not a 403 oracle', async () => {
    const res = await as(stranger).patch(`/${PROVIDER_ID}`).send({ tagline: 'Mine now' });
    expect(res.status).toBe(404);
    expect(auditLog).not.toHaveBeenCalled();
  });

  it('lets superadmin through', async () => {
    const res = await as(superadmin).patch(`/${PROVIDER_ID}`).send({ description: 'Updated by ops' });
    expect(res.status).toBe(200);
  });

  it('refuses status and trusted even for the owner', async () => {
    const res = await as(owner).patch(`/${PROVIDER_ID}`).send({ status: 'live', trusted: true });
    expect(res.status).toBe(400);
  });

  it('refuses an unknown provider type on a type change', async () => {
    configFindOne.mockResolvedValue(null);
    const res = await as(owner).patch(`/${PROVIDER_ID}`).send({ type: 'mystery_type' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Unknown or inactive provider type');
  });
});

describe('POST /providers/:id/status (operator lifecycle gate)', () => {
  it('refuses a patient', async () => {
    const res = await as({ _id: 'pat1', role: 'patient' }).post(`/${PROVIDER_ID}/status`).send({ status: 'live' });
    expect(res.status).toBe(403);
    expect(providerFindById).not.toHaveBeenCalled();
  });

  it('lets superadmin move a draft to live and audits the transition', async () => {
    const res = await as(superadmin).post(`/${PROVIDER_ID}/status`).send({ status: 'live', reason: 'KYC verified' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ _id: 'p1', status: 'live' });
    expect(auditLog).toHaveBeenCalledWith('provider_status_changed', 'sa1', expect.objectContaining({
      from: 'draft', to: 'live', reason: 'KYC verified',
    }));
  });

  it('rejects a no-op transition', async () => {
    const res = await as(superadmin).post(`/${PROVIDER_ID}/status`).send({ status: 'draft' });
    expect(res.status).toBe(400);
  });

  it('rejects a status outside the lifecycle enum', async () => {
    const res = await as(superadmin).post(`/${PROVIDER_ID}/status`).send({ status: 'party_time' });
    expect(res.status).toBe(400);
  });
});
