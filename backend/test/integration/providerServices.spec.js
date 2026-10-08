import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const PROV_ID = '7000000000000000000000a1';
const OTHER_PROV_ID = '7000000000000000000000b2';
const SVC_ID = '7000000000000000000000c3';

const SERVICE = {
  _id: SVC_ID, providerId: PROV_ID, categoryCode: 'SPEC.CARDIO', name: 'Cardiology consult',
  isActive: true, save: jestApi.fn().mockResolvedValue(undefined),
};

const serviceFind = jestApi.fn();
const serviceCount = jestApi.fn();
const serviceCreate = jestApi.fn();
const serviceFindById = jestApi.fn();
const serviceFindByIdAndDelete = jestApi.fn();
const providerFind = jestApi.fn();
const providerFindById = jestApi.fn();
const auditLog = jestApi.fn();

let lastServiceFilter = null;
let lastProviderFilter = null;

jestApi.unstable_mockModule('../../src/models/Service.js', () => ({
  default: {
    find: (filter) => { lastServiceFilter = filter; return query([SERVICE]); },
    countDocuments: (...args) => serviceCount(...args),
    create: (...args) => serviceCreate(...args),
    findById: (...args) => serviceFindById(...args),
    findByIdAndDelete: (...args) => serviceFindByIdAndDelete(...args),
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

const { as } = await mountApp('providerServices', {});

const owner = { _id: 'owner-1', role: 'doctor' };
const stranger = { _id: 'owner-2', role: 'doctor' };
const superadmin = { _id: 'sa1', role: 'superadmin' };

const VALID_BODY = {
  providerId: PROV_ID,
  categoryCode: 'SPEC.CARDIO',
  name: 'Cardiology consult',
  modes: [{ mode: 'video', fee: 500, durationMin: 20 }],
  price: { amount: 500, currency: 'INR', taxInclusive: true, gstRate: 0 },
};

beforeEach(() => {
  lastServiceFilter = null;
  lastProviderFilter = null;
  serviceFind.mockReset().mockResolvedValue(0);
  serviceCount.mockReset().mockResolvedValue(1);
  serviceCreate.mockReset().mockImplementation(async (body) => ({ _id: SVC_ID, ...body }));
  serviceFindById.mockReset().mockResolvedValue(SERVICE);
  serviceFindByIdAndDelete.mockReset().mockResolvedValue(SERVICE);
  providerFind.mockReset().mockImplementation(() => query([{ _id: PROV_ID }]));
  providerFindById.mockReset().mockResolvedValue({ _id: PROV_ID, ownerUserId: 'owner-1' });
  auditLog.mockReset().mockResolvedValue(undefined);
  SERVICE.save.mockClear();
});

describe('GET /provider/services', () => {
  it('refuses anonymous callers', async () => {
    const res = await as().get('/');
    expect(res.status).toBe(401);
    expect(lastServiceFilter).toBeNull();
  });

  it('scopes the list to the providers the caller owns', async () => {
    const res = await as(owner).get('/');
    expect(res.status).toBe(200);
    expect(lastProviderFilter).toEqual({ ownerUserId: 'owner-1' });
    expect(lastServiceFilter.providerId).toEqual({ $in: [PROV_ID] });
    expect(res.body.services).toHaveLength(1);
  });

  it('narrows to one owned provider', async () => {
    await as(owner).get(`/?providerId=${PROV_ID}`);
    expect(lastServiceFilter.providerId).toBe(PROV_ID);
  });

  it('404s a providerId the caller does not own instead of returning an empty list', async () => {
    providerFindById.mockResolvedValue({ _id: OTHER_PROV_ID, ownerUserId: 'owner-2' });
    providerFind.mockImplementation(() => query([]));
    const res = await as(owner).get(`/?providerId=${PROV_ID}`);
    expect(res.status).toBe(404);
    expect(lastServiceFilter).toBeNull();
  });

  it('lets superadmin list across providers', async () => {
    const res = await as(superadmin).get(`/?providerId=${PROV_ID}`);
    expect(res.status).toBe(200);
    expect(lastProviderFilter).toBeNull();
    expect(lastServiceFilter.providerId).toBe(PROV_ID);
  });
});

describe('POST /provider/services', () => {
  it('refuses anonymous callers', async () => {
    const res = await as().post('/').send(VALID_BODY);
    expect(res.status).toBe(401);
    expect(serviceCreate).not.toHaveBeenCalled();
  });

  it('404s a providerId that does not exist', async () => {
    providerFindById.mockResolvedValue(null);
    const res = await as(owner).post('/').send(VALID_BODY);
    expect(res.status).toBe(404);
    expect(serviceCreate).not.toHaveBeenCalled();
  });

  it('404s a service offered on somebody else provider', async () => {
    providerFindById.mockResolvedValue({ _id: PROV_ID, ownerUserId: 'owner-2' });
    const res = await as(owner).post('/').send(VALID_BODY);
    expect(res.status).toBe(404);
    expect(serviceCreate).not.toHaveBeenCalled();
  });

  it('creates a service on the caller own provider and audits it', async () => {
    const res = await as(owner).post('/').send(VALID_BODY);
    expect(res.status).toBe(201);
    expect(serviceCreate).toHaveBeenCalledWith(VALID_BODY);
    expect(auditLog).toHaveBeenCalledWith('create_service', 'owner-1', expect.objectContaining({ providerId: PROV_ID }));
  });

  it('rejects a malformed providerId before the guard runs', async () => {
    const res = await as(owner).post('/').send({ ...VALID_BODY, providerId: 'not-an-id' });
    expect(res.status).toBe(400);
    expect(providerFindById).not.toHaveBeenCalled();
  });

  it('rejects unknown fields instead of silently dropping them', async () => {
    const res = await as(owner).post('/').send({ ...VALID_BODY, status: 'live' });
    expect(res.status).toBe(400);
    expect(serviceCreate).not.toHaveBeenCalled();
  });
});

describe('PATCH /provider/services/:id', () => {
  it('404s a non-ObjectId path param', async () => {
    const res = await as(owner).patch('/nope').send({ name: 'Renamed' });
    expect(res.status).toBe(404);
    expect(serviceFindById).not.toHaveBeenCalled();
  });

  it('404s a caller who does not own the parent provider', async () => {
    const res = await as(stranger).patch(`/${SVC_ID}`).send({ name: 'Renamed' });
    expect(res.status).toBe(404);
    expect(SERVICE.save).not.toHaveBeenCalled();
  });

  it('lets the owner update and audits it', async () => {
    const res = await as(owner).patch(`/${SVC_ID}`).send({ name: 'Cardiology consult (video)' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Cardiology consult (video)');
    expect(SERVICE.save).toHaveBeenCalledTimes(1);
    expect(auditLog).toHaveBeenCalledWith('update_service', 'owner-1', expect.objectContaining({ serviceId: SVC_ID }));
  });

  it('refuses a body that tries to move the service to another provider', async () => {
    const res = await as(owner).patch(`/${SVC_ID}`).send({ providerId: OTHER_PROV_ID });
    expect(res.status).toBe(400);
    expect(SERVICE.save).not.toHaveBeenCalled();
  });
});

describe('DELETE /provider/services/:id', () => {
  it('404s a caller who does not own the parent provider', async () => {
    const res = await as(stranger).delete(`/${SVC_ID}`);
    expect(res.status).toBe(404);
    expect(serviceFindByIdAndDelete).not.toHaveBeenCalled();
  });

  it('lets the owner delete and audits it', async () => {
    const res = await as(owner).delete(`/${SVC_ID}`);
    expect(res.status).toBe(200);
    expect(serviceFindByIdAndDelete).toHaveBeenCalledWith(SVC_ID);
    expect(auditLog).toHaveBeenCalledWith('delete_service', 'owner-1', expect.objectContaining({ serviceId: SVC_ID }));
  });
});
