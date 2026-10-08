/**
 * A3 — the provider catalogue workspace (10.md 4.2: CRUD /api/provider/plans
 * and /api/provider/products; models from 10.md 2.7/2.11 landed in A2).
 *
 * The ownership contract is deliberately identical to providerServices.spec:
 * a list is scoped to the caller's own providers, a providerId outside that
 * set is a 404 (not an empty 200), writes prove ownership of the PARENT row,
 * and DELETE archives in place because memberships/orders cite the row.
 */
import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const PROV_ID = '7000000000000000000000a1';
const OTHER_PROV_ID = '7000000000000000000000b2';
const ROW_ID = '7000000000000000000000c3';

const planRow = {
  _id: ROW_ID, providerId: PROV_ID, name: 'Annual membership', status: 'active',
  save: jestApi.fn().mockResolvedValue(undefined),
};
const productRow = {
  _id: ROW_ID, vendorId: PROV_ID, name: 'Whey protein', status: 'active',
  save: jestApi.fn().mockResolvedValue(undefined),
};

const planFind = jestApi.fn();
const planCount = jestApi.fn();
const planCreate = jestApi.fn();
const planFindById = jestApi.fn();
const productFind = jestApi.fn();
const productCount = jestApi.fn();
const productCreate = jestApi.fn();
const productFindById = jestApi.fn();
const providerFind = jestApi.fn();
const providerFindById = jestApi.fn();
const auditLog = jestApi.fn();

let lastPlanFilter = null;
let lastProductFilter = null;
let lastProviderFilter = null;

jestApi.unstable_mockModule('../../src/models/Plan.js', () => ({
  default: {
    find: (filter) => { lastPlanFilter = filter; return query([planRow]); },
    countDocuments: (...args) => planCount(...args),
    create: (...args) => planCreate(...args),
    findById: (...args) => planFindById(...args),
  },
}));

jestApi.unstable_mockModule('../../src/models/Product.js', () => ({
  default: {
    find: (filter) => { lastProductFilter = filter; return query([productRow]); },
    countDocuments: (...args) => productCount(...args),
    create: (...args) => productCreate(...args),
    findById: (...args) => productFindById(...args),
  },
}));

jestApi.unstable_mockModule('../../src/models/Provider.js', () => ({
  default: {
    find: (filter) => { lastProviderFilter = filter; return providerFind(filter); },
    findById: (...args) => providerFindById(...args),
  },
}));

jestApi.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLog: (...args) => auditLog(...args),
}));

const { as } = await mountApp('providerCatalog', {});

const owner = { _id: 'owner-1', role: 'doctor' };
const stranger = { _id: 'owner-2', role: 'doctor' };
const superadmin = { _id: 'sa1', role: 'superadmin' };

const PLAN_BODY = {
  providerId: PROV_ID,
  type: 'gym',
  name: 'Annual membership',
  duration: { value: 12, unit: 'month' },
  price: 12000,
  freezeRules: { maxFreezeDaysPerYear: 30 },
};

const PRODUCT_BODY = {
  vendorId: PROV_ID,
  kind: 'supplement',
  name: 'Whey protein',
  variants: [{ sku: 'WHEY-1KG', pack: '1 kg', price: 1500, stock: 40 }],
};

beforeEach(() => {
  lastPlanFilter = null;
  lastProductFilter = null;
  lastProviderFilter = null;
  planFind.mockReset();
  planCount.mockReset().mockResolvedValue(1);
  planCreate.mockReset().mockImplementation(async (body) => ({ _id: ROW_ID, ...body }));
  planFindById.mockReset().mockResolvedValue(planRow);
  productFind.mockReset();
  productCount.mockReset().mockResolvedValue(1);
  productCreate.mockReset().mockImplementation(async (body) => ({ _id: ROW_ID, ...body }));
  productFindById.mockReset().mockResolvedValue(productRow);
  providerFind.mockReset().mockImplementation(() => query([{ _id: PROV_ID }]));
  providerFindById.mockReset().mockResolvedValue({ _id: PROV_ID, ownerUserId: 'owner-1' });
  auditLog.mockReset().mockResolvedValue(undefined);
  planRow.save.mockClear();
  productRow.save.mockClear();
  planRow.status = 'active';
  productRow.status = 'active';
});

describe('GET /provider/plans', () => {
  it('refuses anonymous callers', async () => {
    const res = await as().get('/plans');
    expect(res.status).toBe(401);
    expect(lastPlanFilter).toBeNull();
  });

  it('scopes the list to the providers the caller owns', async () => {
    const res = await as(owner).get('/plans');
    expect(res.status).toBe(200);
    expect(lastProviderFilter).toEqual({ ownerUserId: 'owner-1' });
    expect(lastPlanFilter.providerId).toEqual({ $in: [PROV_ID] });
    expect(res.body.plans).toHaveLength(1);
  });

  it('narrows to one owned provider and honours a status filter', async () => {
    await as(owner).get(`/plans?providerId=${PROV_ID}&status=active`);
    expect(lastPlanFilter.providerId).toBe(PROV_ID);
    expect(lastPlanFilter.status).toBe('active');
  });

  it('404s a providerId the caller does not own instead of returning an empty list', async () => {
    providerFind.mockImplementation(() => query([]));
    const res = await as(owner).get(`/plans?providerId=${PROV_ID}`);
    expect(res.status).toBe(404);
    expect(lastPlanFilter).toBeNull();
  });

  it('lets superadmin list across providers', async () => {
    const res = await as(superadmin).get(`/plans?providerId=${PROV_ID}`);
    expect(res.status).toBe(200);
    expect(lastProviderFilter).toBeNull();
    expect(lastPlanFilter.providerId).toBe(PROV_ID);
  });
});

describe('POST /provider/plans', () => {
  it('refuses anonymous callers', async () => {
    const res = await as().post('/plans').send(PLAN_BODY);
    expect(res.status).toBe(401);
    expect(planCreate).not.toHaveBeenCalled();
  });

  it('404s a providerId that does not exist', async () => {
    providerFindById.mockResolvedValue(null);
    const res = await as(owner).post('/plans').send(PLAN_BODY);
    expect(res.status).toBe(404);
    expect(planCreate).not.toHaveBeenCalled();
  });

  it('404s a plan offered on somebody else provider', async () => {
    providerFindById.mockResolvedValue({ _id: PROV_ID, ownerUserId: 'owner-2' });
    const res = await as(owner).post('/plans').send(PLAN_BODY);
    expect(res.status).toBe(404);
    expect(planCreate).not.toHaveBeenCalled();
  });

  it('creates a plan on the caller own provider and audits it', async () => {
    const res = await as(owner).post('/plans').send(PLAN_BODY);
    expect(res.status).toBe(201);
    expect(planCreate).toHaveBeenCalledWith(PLAN_BODY);
    expect(auditLog).toHaveBeenCalledWith('create_plan', 'owner-1', expect.objectContaining({ providerId: PROV_ID }));
  });

  it('rejects a plan type outside the spec list', async () => {
    const res = await as(owner).post('/plans').send({ ...PLAN_BODY, type: 'crossfit' });
    expect(res.status).toBe(400);
    expect(planCreate).not.toHaveBeenCalled();
  });

  it('rejects unknown fields instead of silently dropping them', async () => {
    const res = await as(owner).post('/plans').send({ ...PLAN_BODY, live: true });
    expect(res.status).toBe(400);
    expect(planCreate).not.toHaveBeenCalled();
  });
});

describe('PATCH /provider/plans/:id', () => {
  it('404s a non-ObjectId path param', async () => {
    const res = await as(owner).patch('/plans/nope').send({ name: 'Renamed' });
    expect(res.status).toBe(404);
    expect(planFindById).not.toHaveBeenCalled();
  });

  it('404s a caller who does not own the parent provider', async () => {
    // Default mock: the parent belongs to owner-1, caller is owner-2.
    const res = await as(stranger).patch(`/plans/${ROW_ID}`).send({ name: 'Renamed' });
    expect(res.status).toBe(404);
    expect(planRow.save).not.toHaveBeenCalled();
  });

  it('lets the owner update and audits it', async () => {
    const res = await as(owner).patch(`/plans/${ROW_ID}`).send({ name: 'Annual membership (2027)' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Annual membership (2027)');
    expect(planRow.save).toHaveBeenCalledTimes(1);
    expect(auditLog).toHaveBeenCalledWith('update_plan', 'owner-1', expect.objectContaining({ planId: ROW_ID }));
  });

  it('refuses a body that tries to move the plan to another provider', async () => {
    const res = await as(owner).patch(`/plans/${ROW_ID}`).send({ providerId: OTHER_PROV_ID });
    expect(res.status).toBe(400);
    expect(planRow.save).not.toHaveBeenCalled();
  });
});

describe('DELETE /provider/plans/:id archives instead of orphaning memberships', () => {
  it('404s a caller who does not own the parent provider', async () => {
    const res = await as(stranger).delete(`/plans/${ROW_ID}`);
    expect(res.status).toBe(404);
    expect(planRow.save).not.toHaveBeenCalled();
  });

  it('archives in place and audits it', async () => {
    const res = await as(owner).delete(`/plans/${ROW_ID}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('archived');
    expect(planRow.status).toBe('archived');
    expect(planRow.save).toHaveBeenCalledTimes(1);
    expect(auditLog).toHaveBeenCalledWith('archive_plan', 'owner-1', expect.objectContaining({ planId: ROW_ID }));
  });
});

describe('GET /provider/products', () => {
  it('scopes to owned vendors and searches name + brand', async () => {
    const res = await as(owner).get('/products?q=whey');
    expect(res.status).toBe(200);
    expect(lastProductFilter.providerId).toEqual({ $in: [PROV_ID] });
    expect(lastProductFilter.$or).toEqual([{ name: expect.anything() }, { brand: expect.anything() }]);
    expect(res.body.products).toHaveLength(1);
  });

  it('404s a vendorId the caller does not own', async () => {
    providerFindById.mockResolvedValue({ _id: PROV_ID, ownerUserId: 'owner-2' });
    providerFind.mockImplementation(() => query([]));
    const res = await as(owner).get(`/products?vendorId=${PROV_ID}`);
    expect(res.status).toBe(404);
    expect(lastProductFilter).toBeNull();
  });
});

describe('POST /provider/products', () => {
  it('404s a product offered on somebody else vendor', async () => {
    providerFindById.mockResolvedValue({ _id: PROV_ID, ownerUserId: 'owner-2' });
    const res = await as(owner).post('/products').send(PRODUCT_BODY);
    expect(res.status).toBe(404);
    expect(productCreate).not.toHaveBeenCalled();
  });

  it('creates a product on the caller own vendor and audits it', async () => {
    const res = await as(owner).post('/products').send(PRODUCT_BODY);
    expect(res.status).toBe(201);
    expect(productCreate).toHaveBeenCalledWith(PRODUCT_BODY);
    expect(auditLog).toHaveBeenCalledWith('create_product', 'owner-1', expect.objectContaining({ vendorId: PROV_ID }));
  });

  it('requires at least one variant — stock lives on the variant, never the parent', async () => {
    const res = await as(owner).post('/products').send({ ...PRODUCT_BODY, variants: [] });
    expect(res.status).toBe(400);
    expect(productCreate).not.toHaveBeenCalled();
  });

  it('rejects an unknown field and a kind outside the spec list', async () => {
    const unknown = await as(owner).post('/products').send({ ...PRODUCT_BODY, warranty: 12 });
    expect(unknown.status).toBe(400);
    const badKind = await as(owner).post('/products').send({ ...PRODUCT_BODY, kind: 'toys' });
    expect(badKind.status).toBe(400);
    expect(productCreate).not.toHaveBeenCalled();
  });
});

describe('PATCH/DELETE /provider/products/:id', () => {
  it('404s a caller who does not own the parent vendor', async () => {
    const patched = await as(stranger).patch(`/products/${ROW_ID}`).send({ name: 'Renamed' });
    const deleted = await as(stranger).delete(`/products/${ROW_ID}`);
    expect(patched.status).toBe(404);
    expect(deleted.status).toBe(404);
    expect(productRow.save).not.toHaveBeenCalled();
  });

  it('lets the owner update, then archive — both audited', async () => {
    const patched = await as(owner).patch(`/products/${ROW_ID}`).send({ name: 'Whey protein 2 kg' });
    expect(patched.status).toBe(200);
    expect(auditLog).toHaveBeenCalledWith('update_product', 'owner-1', expect.objectContaining({ productId: ROW_ID }));

    const deleted = await as(owner).delete(`/products/${ROW_ID}`);
    expect(deleted.status).toBe(200);
    expect(deleted.body.status).toBe('archived');
    expect(productRow.save).toHaveBeenCalledTimes(2);
    expect(auditLog).toHaveBeenCalledWith('archive_product', 'owner-1', expect.objectContaining({ productId: ROW_ID }));
  });
});
