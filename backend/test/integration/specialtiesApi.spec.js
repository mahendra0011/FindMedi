// HTTP contract for the Browse-by-Specialties read APIs: tree=1 groups, drill-
// down detail with cross-lists, and distinct parent-and-subs doctor counts.
// Doctor is fully mocked so the count query shape can be asserted exactly.
import { jest as jestApi } from '@jest/globals';
import { mountApp } from '../helpers/appHarness.js';

const categoryRows = [
  { _id: 'c1', code: 'SPEC.CARDIO', name: 'Cardiology', type: 'specialty', path: 'SPEC.CARDIO', level: 0 },
];

const categoryFind = jestApi.fn();
const doctorCountDocuments = jestApi.fn();
const doctorDistinct = jestApi.fn();

jestApi.unstable_mockModule('../../src/models/Category.js', () => ({
  default: { find: (...args) => categoryFind(...args) },
}));
jestApi.unstable_mockModule('../../src/config/redis.js', () => ({
  getCache: jestApi.fn(),
  setCache: jestApi.fn(),
  flushCachePattern: jestApi.fn(),
}));
jestApi.unstable_mockModule('../../src/models/Doctor.js', () => ({
  default: {
    countDocuments: (...args) => doctorCountDocuments(...args),
    distinct: (...args) => doctorDistinct(...args),
  },
}));

const { as } = await mountApp('categories', {});

beforeEach(() => {
  categoryFind.mockReset();
  doctorCountDocuments.mockReset();
  doctorDistinct.mockReset();
});

describe('GET /categories/specialties (Â§6 API)', () => {
  it('returns the flat canonical list with an honest total', async () => {
    const res = await as().get('/specialties').expect(200);
    expect(res.body.total).toBe(339);
    expect(res.body.specialties.some((s) => s.code === 'SPEC.CARDIO')).toBe(true);
  });

  it('tree=1 returns 13 groups, 43 tiles, chip-ready children', async () => {
    const res = await as().get('/specialties?tree=1').expect(200);
    expect(res.body.groupsFound).toBe(13);
    expect(res.body.total).toBe(339);
    const tiles = res.body.groups.flatMap((g) => g.tiles);
    expect(tiles.length).toBe(43);
    const gastro = tiles.find((t) => t.code === 'SPEC.GASTRO');
    expect(gastro.children.map((c) => c.code)).toContain('SPEC.HEPAT'); // cross-list
    expect(gastro.children.map((c) => c.code)).toContain('SPEC.GASTRO.HEPATOLOGY'.replace('SPEC.GASTRO.HEPATOLOGY', 'SPEC.GASTRO.IBD'));
  });

  it('/:code returns subs, chips and legacy code resolution', async () => {
    const res = await as().get('/specialties/SPEC.CARDIO').expect(200);
    expect(res.body.code).toBe('SPEC.CARDIO');
    expect(res.body.subs.map((s) => s.code)).toContain('SPEC.CARDIO.INTERVENTIONAL');
    expect(res.body.conditions).toContain('Chest pain');
    expect(res.body.procedures).toContain('Angioplasty');
  });

  it('/:code resolves legacy duplicate codes too', async () => {
    const res = await as().get('/specialties/SPEC.PAED.CARDIOLOGY').expect(200);
    expect(res.body.code).toBe('SPEC.CARDIO.PAED');
  });

  it('/specialties/SPEC.NOPE is a 404', async () => {
    await as().get('/specialties/SPEC.NOPE').expect(404);
  });
});

describe('GET /categories/specialties/:code/counts (Â§6 distinct counts)', () => {
  it('counts parent + subs in one $or so a doctor with two subs is counted once', async () => {
    doctorCountDocuments.mockResolvedValue(7);
    doctorDistinct.mockResolvedValue(['h1', 'h2', null]);
    const res = await as().get('/specialties/SPEC.CARDIO/counts').expect(200);
    expect(res.body).toMatchObject({ code: 'SPEC.CARDIO', doctors: 7, hospitals: 2 });

    const filter = doctorCountDocuments.mock.calls[0][0];
    expect(filter.$or[0]).toEqual({ specialtyCode: 'SPEC.CARDIO' });
    const subCodes = filter.$or[1].subSpecialtyCodes.$in;
    // parent itself included + every own sub + cross-listed subs
    expect(subCodes).toContain('SPEC.CARDIO');
    expect(subCodes).toContain('SPEC.CARDIO.PAED');
    expect(new Set(subCodes).size).toBe(subCodes.length);
    // 'approved' is on by default (only live doctors get counted)
    expect(filter.approved).toBe(true);
  });

  it('supports city and facility scoping', async () => {
    doctorCountDocuments.mockResolvedValue(2);
    doctorDistinct.mockResolvedValue(['h1']);
    await as().get('/specialties/SPEC.ORTHO/counts?city=Pune&facilityId=f1').expect(200);
    const filter = doctorCountDocuments.mock.calls[0][0];
    expect(filter.location).toBeDefined();
    expect(filter.facilityId).toBe('f1');
  });

  it('unknown specialty is a 404', async () => {
    await as().get('/specialties/SPEC.NOPE/counts').expect(404);
  });
});

describe('GET /categories/public fallback untouched', () => {
  it('still serves the Â§A1 catalogue behind the cached route', async () => {
    categoryFind.mockReturnValue({ select: () => ({ sort: () => ({ lean: async () => categoryRows }) }) });
    const res = await as().get('/public?type=specialty').expect(200);
    expect(res.body.categories.length).toBeGreaterThan(0);
  });
});
