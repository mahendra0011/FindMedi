import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const CONFIG = {
  _id: 'cfg1', typeKey: 'dental_clinic', kind: 'facility', group: 'clinical', tier: 'T1',
  label: 'Dental Clinic', version: 3, isActive: true, save: jestApi.fn().mockResolvedValue(undefined),
};

const configFindById = jestApi.fn();
const configFindByIdAndDelete = jestApi.fn();
const configExists = jestApi.fn();
const configCreate = jestApi.fn();
const configFind = jestApi.fn();
const auditLog = jestApi.fn();

jestApi.unstable_mockModule('../../src/models/ProviderTypeConfig.js', () => ({
  default: {
    find: (...args) => configFind(...args),
    findById: (...args) => configFindById(...args),
    findByIdAndDelete: (...args) => configFindByIdAndDelete(...args),
    exists: (...args) => configExists(...args),
    create: (...args) => configCreate(...args),
  },
}));

jestApi.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLog: (...args) => auditLog(...args),
}));

const { as } = await mountApp('adminProviderTypes', {});

// The admin handlers chain .sort().lean() / .lean() on these, so the stubs must
// look like queries, not bare promises.
const chain = (value) => query(value);

const superadmin = { _id: 'sa1', role: 'superadmin' };
const hospitalAdmin = { _id: 'ha1', role: 'hospital_admin' };

const VALID = {
  typeKey: 'yoga_studio',
  kind: 'facility',
  group: 'wellness',
  label: 'Yoga Studio',
  steps: [{ key: 'facility', label: 'Facility', fields: ['name'] }],
  fields: [{ key: 'name', label: 'Name', type: 'text', required: true }],
  requiredDocs: [{ key: 'registration', label: 'Studio registration', mandatory: true }],
  approvalPolicy: { level: 'single', slaHours: 48, twoPerson: false },
};

beforeEach(() => {
  CONFIG.version = 3;
  configFind.mockReset().mockImplementation(() => chain([CONFIG]));
  configFindById.mockReset().mockImplementation(() => chain(CONFIG));
  configFindByIdAndDelete.mockReset().mockResolvedValue(CONFIG);
  configExists.mockReset().mockResolvedValue(null);
  configCreate.mockReset().mockImplementation(async (body) => ({ _id: 'cfg2', version: 1, ...body }));
  auditLog.mockReset().mockResolvedValue(undefined);
  CONFIG.save.mockClear();
});

describe('admin provider-type-config authz', () => {
  it('refuses anonymous callers', async () => {
    const res = await as().get('/');
    expect(res.status).toBe(401);
    expect(configFind).not.toHaveBeenCalled();
  });

  it('refuses a hospital admin: onboarding policy is platform-wide', async () => {
    const res = await as(hospitalAdmin).get('/');
    expect(res.status).toBe(403);
  });

  it('lets superadmin list', async () => {
    const res = await as(superadmin).get('/');
    expect(res.status).toBe(200);
    expect(res.body.providerTypes).toHaveLength(1);
  });
});

describe('POST /admin/provider-type-configs', () => {
  it('creates a config and audits it', async () => {
    const res = await as(superadmin).post('/').send(VALID);
    expect(res.status).toBe(201);
    expect(configCreate).toHaveBeenCalledWith(expect.objectContaining({
      typeKey: 'yoga_studio', kind: 'facility', group: 'wellness',
    }));
    expect(auditLog).toHaveBeenCalledWith('create_provider_type_config', 'sa1', expect.objectContaining({ typeKey: 'yoga_studio' }));
  });

  it('rejects a duplicate typeKey before touching the model', async () => {
    configExists.mockResolvedValue({ _id: 'taken' });
    const res = await as(superadmin).post('/').send(VALID);
    expect(res.status).toBe(409);
    expect(configCreate).not.toHaveBeenCalled();
  });

  it('rejects an unknown kind or a non-snake_case typeKey', async () => {
    expect((await as(superadmin).post('/').send({ ...VALID, kind: 'spaceship' })).status).toBe(400);
    expect((await as(superadmin).post('/').send({ ...VALID, typeKey: 'Yoga Studio' })).status).toBe(400);
  });
});

describe('PUT /admin/provider-type-configs/:id', () => {
  it('bumps the config version on every edit', async () => {
    const res = await as(superadmin).put('/cfg1').send({ label: 'Yoga & Meditation', approvalPolicy: { slaHours: 24 } });
    expect(res.status).toBe(200);
    expect(CONFIG.version).toBe(4);
    expect(auditLog).toHaveBeenCalledWith('update_provider_type_config', 'sa1', expect.objectContaining({ version: 4 }));
  });

  it('cannot rename typeKey', async () => {
    const res = await as(superadmin).put('/cfg1').send({ typeKey: 'renamed' });
    expect(res.status).toBe(400);
    expect(CONFIG.save).not.toHaveBeenCalled();
  });

  it('404s a missing config', async () => {
    configFindById.mockResolvedValue(null);
    const res = await as(superadmin).put('/missing').send({ label: 'Nope' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /admin/provider-type-configs/:id', () => {
  it('deletes and audits', async () => {
    const res = await as(superadmin).delete('/cfg1');
    expect(res.status).toBe(200);
    expect(configFindByIdAndDelete).toHaveBeenCalledWith('cfg1');
    expect(auditLog).toHaveBeenCalledWith('delete_provider_type_config', 'sa1', expect.any(Object));
  });

  it('404s a missing config', async () => {
    configFindByIdAndDelete.mockResolvedValue(null);
    const res = await as(superadmin).delete('/missing');
    expect(res.status).toBe(404);
  });
});
