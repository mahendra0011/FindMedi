import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const PUBLIC_ROWS = [
  { _id: 'c1', code: 'SPEC.CARDIO', name: 'Cardiology', type: 'specialty', path: 'SPEC.CARDIO', level: 0, tier: 'T1', displayOrder: 1, adClaimsRestricted: false },
];
const parentDoc = { _id: 'p1', code: 'TEST.PARENT', name: 'Parent', type: 'test', path: 'TEST.PARENT', level: 0, parent: null };
const beforeDoc = { _id: 'c1', code: 'TEST.CBC', name: 'CBC', type: 'test', path: 'TEST.CBC', level: 0, parent: null };
const superadmin = { _id: 'sa1', role: 'superadmin' };
const patient = { _id: 'pat1', role: 'patient' };

const categoryFindById = jestApi.fn();
const categoryCreate = jestApi.fn();
const categoryFindByIdAndUpdate = jestApi.fn();
const categoryFindByIdAndDelete = jestApi.fn();
const categoryCountDocuments = jestApi.fn();
const categoryUpdateOne = jestApi.fn();
const categoryUpdateMany = jestApi.fn();
const categoryBulkWrite = jestApi.fn();
const cacheGet = jestApi.fn();
const cacheSet = jestApi.fn();
const cacheFlush = jestApi.fn();

let lastSelect = null;
let lastFilter = null;

const findQuery = (value) => {
  const q = query(value);
  q.select = (fields) => { lastSelect = fields; return q; };
  return q;
};

jestApi.unstable_mockModule('../../src/models/Category.js', () => ({
  default: {
    find: (filter) => { lastFilter = filter; return findQuery(PUBLIC_ROWS); },
    findById: (...args) => categoryFindById(...args),
    create: (...args) => categoryCreate(...args),
    findByIdAndUpdate: (...args) => categoryFindByIdAndUpdate(...args),
    findByIdAndDelete: (...args) => categoryFindByIdAndDelete(...args),
    countDocuments: (...args) => categoryCountDocuments(...args),
    updateOne: (...args) => categoryUpdateOne(...args),
    updateMany: (...args) => categoryUpdateMany(...args),
    bulkWrite: (...args) => categoryBulkWrite(...args),
  },
}));

jestApi.unstable_mockModule('../../src/config/redis.js', () => ({
  getCache: (...args) => cacheGet(...args),
  setCache: (...args) => cacheSet(...args),
  flushCachePattern: (...args) => cacheFlush(...args),
}));

const { as } = await mountApp('categories', {});

const PUBLIC_DTO_FIELDS = 'code name nameHi aliases type parent path level tier icon displayOrder adClaimsRestricted';

beforeEach(() => {
  lastSelect = null;
  lastFilter = null;
  categoryFindById.mockReset().mockImplementation(() => query(null));
  categoryCreate.mockReset().mockResolvedValue({ _id: 'new1' });
  categoryFindByIdAndUpdate.mockReset().mockResolvedValue({ _id: 'c1', name: 'Renamed' });
  categoryFindByIdAndDelete.mockReset().mockResolvedValue({ _id: 'c1' });
  categoryCountDocuments.mockReset().mockResolvedValue(0);
  categoryUpdateOne.mockReset().mockResolvedValue({ matchedCount: 1 });
  categoryUpdateMany.mockReset().mockResolvedValue({ matchedCount: 1 });
  categoryBulkWrite.mockReset().mockResolvedValue({ modifiedCount: 1 });
  cacheGet.mockReset().mockResolvedValue(null);
  cacheSet.mockReset().mockResolvedValue(true);
  cacheFlush.mockReset().mockResolvedValue(true);
});

describe('GET /categories/public', () => {
  it('serves the DTO-only catalogue to an anonymous caller, cacheable', async () => {
    const res = await as().get('/public?type=specialty');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('public, max-age=300');
    expect(res.body.categories).toHaveLength(1);
    expect(res.body.categories[0]).toMatchObject({ code: 'SPEC.CARDIO', type: 'specialty' });
    expect(res.body.types).toContain('specialty');
    expect(res.body.types).toContain('medicine');

    const projected = lastSelect.split(' ');
    expect(lastSelect).toBe(PUBLIC_DTO_FIELDS);
    for (const forbidden of ['description', 'createdAt', 'updatedAt', '__v']) {
      expect(projected).not.toContain(forbidden);
    }

    expect(lastFilter).toEqual({ isActive: true, type: 'specialty' });
    expect(cacheGet).toHaveBeenCalledTimes(1);
    expect(cacheSet).toHaveBeenCalledTimes(1);
    expect(cacheSet.mock.calls[0][0]).toContain('categories_public:');
    expect(cacheSet.mock.calls[0][2]).toBe(300);
  });

  it('never returns inactive categories', async () => {
    await as().get('/public');
    expect(lastFilter).toEqual({ isActive: true });
  });

  it('applies an escaped name/aliases search', async () => {
    await as().get('/public?q=heart(');
    expect(lastFilter.$or).toHaveLength(2);
    expect(lastFilter.$or[0]).toHaveProperty('name');
    expect(lastFilter.$or[1]).toHaveProperty('aliases');
    expect(lastFilter.$or[0].name.source).toContain('\\(');
  });

  it('serves a cached payload without touching the model', async () => {
    cacheGet.mockResolvedValue({ categories: [{ code: 'CACHED' }] });
    const res = await as().get('/public');
    expect(res.status).toBe(200);
    expect(res.body.categories[0].code).toBe('CACHED');
    expect(res.headers['x-cache']).toBe('HIT');
    expect(lastSelect).toBeNull();
  });
});

describe('GET /categories (superadmin list)', () => {
  it('refuses anonymous callers', async () => {
    const res = await as().get('/');
    expect(res.status).toBe(401);
  });

  it('refuses a patient', async () => {
    const res = await as(patient).get('/');
    expect(res.status).toBe(403);
  });

  it('serves a superadmin', async () => {
    const res = await as(superadmin).get('/');
    expect(res.status).toBe(200);
    expect(res.body.categories).toHaveLength(1);
  });
});

describe('POST /categories', () => {
  it('derives code, path and level when the client sends none', async () => {
    const res = await as(superadmin).post('/').send({ name: 'CBC', type: 'test' });
    expect(res.status).toBe(201);
    expect(categoryCreate).toHaveBeenCalledWith(expect.objectContaining({
      name: 'CBC', type: 'test', code: 'TEST.CBC', path: 'TEST.CBC', level: 0,
    }));
    expect(cacheFlush).toHaveBeenCalledWith('categories_public:*');
  });

  it('materialises the path under a resolvable parent', async () => {
    categoryFindById.mockImplementation(() => query(parentDoc));
    const res = await as(superadmin).post('/').send({ name: 'CBC', type: 'test', parent: 'p1' });
    expect(res.status).toBe(201);
    expect(categoryCreate).toHaveBeenCalledWith(expect.objectContaining({
      code: 'TEST.CBC', path: 'TEST.PARENT/TEST.CBC', level: 1,
    }));
  });

  it('rejects a malformed code', async () => {
    const res = await as(superadmin).post('/').send({ name: 'CBC', type: 'test', code: 'not a code' });
    expect(res.status).toBe(400);
    expect(categoryCreate).not.toHaveBeenCalled();
  });

  it('rejects an unknown type', async () => {
    const res = await as(superadmin).post('/').send({ name: 'CBC', type: 'not-a-type' });
    expect(res.status).toBe(400);
    expect(categoryCreate).not.toHaveBeenCalled();
  });
});

describe('PUT /categories/:id', () => {
  it('never writes a client-supplied code, path or level', async () => {
    categoryFindById.mockImplementation(() => query(beforeDoc));
    const res = await as(superadmin).put('/c1')
      .send({ name: 'Renamed', code: 'SPEC.HACK', path: 'HACK', level: 9 });
    expect(res.status).toBe(200);
    expect(categoryFindByIdAndUpdate.mock.calls[0][1]).toEqual({ name: 'Renamed' });
    expect(cacheFlush).toHaveBeenCalledWith('categories_public:*');
  });

  it('re-paths descendants when the parent changes', async () => {
    categoryFindById.mockImplementation((id) => query(String(id) === 'p1' ? parentDoc : { ...beforeDoc, level: 1 }));
    categoryFindByIdAndUpdate.mockResolvedValue({
      _id: 'c1', name: 'CBC', path: 'TEST.PARENT/TEST.CBC', level: 1,
    });
    const res = await as(superadmin).put('/c1').send({ parent: 'p1' });
    expect(res.status).toBe(200);
    expect(categoryFindByIdAndUpdate.mock.calls[0][1]).toMatchObject({
      path: 'TEST.PARENT/TEST.CBC', level: 1,
    });
    expect(categoryBulkWrite).toHaveBeenCalledTimes(1);
  });

  it('404s on a missing category', async () => {
    const res = await as(superadmin).put('/missing').send({ name: 'Nope' });
    expect(res.status).toBe(404);
    expect(categoryFindByIdAndUpdate).not.toHaveBeenCalled();
  });
});

describe('DELETE /categories/:id', () => {
  it('refuses to orphan subcategories', async () => {
    categoryCountDocuments.mockResolvedValue(3);
    const res = await as(superadmin).delete('/c1');
    expect(res.status).toBe(400);
    expect(categoryFindByIdAndDelete).not.toHaveBeenCalled();
  });

  it('deletes a leaf and flushes the public cache', async () => {
    const res = await as(superadmin).delete('/c1');
    expect(res.status).toBe(200);
    expect(categoryFindByIdAndDelete).toHaveBeenCalledWith('c1');
    expect(cacheFlush).toHaveBeenCalledWith('categories_public:*');
  });
});

describe('POST /categories/merge', () => {
  it('flushes the public cache after merging', async () => {
    const res = await as(superadmin).post('/merge').send({ sourceIds: ['a'], targetId: 'b' });
    expect(res.status).toBe(200);
    expect(categoryUpdateMany).toHaveBeenCalled();
    expect(cacheFlush).toHaveBeenCalledWith('categories_public:*');
  });
});
