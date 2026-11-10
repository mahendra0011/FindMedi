// HTTP contract for the Browse-by-Specialties read APIs: tree=1 groups, drill-
// down detail with cross-lists, and distinct parent-and-subs doctor counts.
// Doctor is fully mocked so the count query shape can be asserted exactly.
import { jest as jestApi } from '@jest/globals';
import { mountApp } from '../helpers/appHarness.js';
import { SPECIALTIES, SPEC_CODE_ALIASES, buildSpecialtyTree } from '../../src/lib/taxonomy.js';

const categoryRows = [
  { _id: 'c1', code: 'SPEC.CARDIO', name: 'Cardiology', type: 'specialty', path: 'SPEC.CARDIO', level: 0 },
];

const categoryFind = jestApi.fn();
const doctorCountDocuments = jestApi.fn();
const doctorDistinct = jestApi.fn();
const doctorFind = jestApi.fn();

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
    find: (...args) => doctorFind(...args),
  },
}));

const { as } = await mountApp('categories', {});

beforeEach(() => {
  categoryFind.mockReset();
  doctorCountDocuments.mockReset();
  doctorDistinct.mockReset();
  doctorFind.mockReset();
});

describe('GET /categories/specialties (Â§6 API)', () => {
  it('returns the flat canonical list with an honest total', async () => {
    const res = await as().get('/specialties').expect(200);
    expect(res.body.total).toBe(343);
    expect(res.body.specialties.some((s) => s.code === 'SPEC.CARDIO')).toBe(true);
  });

  it('tree=1 returns 13 groups, 43 tiles, chip-ready children', async () => {
    const res = await as().get('/specialties?tree=1').expect(200);
    expect(res.body.groupsFound).toBe(13);
    expect(res.body.total).toBe(343);
    const tiles = res.body.groups.flatMap((g) => g.tiles);
    expect(tiles.length).toBe(43);
    const gastro = tiles.find((t) => t.code === 'SPEC.GASTRO');
    expect(gastro.children.map((c) => c.code)).toContain('SPEC.HEPAT'); // cross-list
    expect(gastro.children.map((c) => c.code)).toContain('SPEC.GASTRO.IBD');
    expect(new Set(tiles.map((tile) => tile.code)).size).toBe(43);
    expect(tiles.reduce((sum, tile) => sum + tile.children.length, 0)).toBe(348);
    for (const expectedRoot of buildSpecialtyTree()) {
      const actual = tiles.find((tile) => tile.code === expectedRoot.code);
      expect(actual).toBeDefined();
      expect(actual.children.map((child) => child.code).sort()).toEqual(expectedRoot.children.map((child) => child.code).sort());
    }
  });

  it('serves detail for every canonical specialty and sub-specialty code', async () => {
    const responses = await Promise.all(SPECIALTIES.map((item) => as().get(`/specialties/${item.code}`)));
    const treeByCode = new Map(buildSpecialtyTree().map((root) => [root.code, root]));
    for (const [index, item] of SPECIALTIES.entries()) {
      const response = responses[index];
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        code: item.code,
        name: item.name,
        conditions: item.meta?.conditions || [],
        procedures: item.meta?.procedures || [],
        symptoms: item.meta?.symptoms || [],
      });
      const expectedRoot = treeByCode.get(item.code);
      if (expectedRoot) {
        expect(response.body.subs.map((child) => child.code).sort())
          .toEqual(expectedRoot.children.map((child) => child.code).sort());
      }
    }
  }, 30000);

  it('resolves every registered legacy code alias through detail and counts APIs', async () => {
    doctorCountDocuments.mockResolvedValue(0);
    doctorDistinct.mockResolvedValue([]);
    const aliases = Object.entries(SPEC_CODE_ALIASES);
    const responses = await Promise.all(aliases.map(async ([legacy]) => Promise.all([
      as().get(`/specialties/${legacy}`),
      as().get(`/specialties/${legacy}/counts`),
    ])));
    for (const [index, [legacy, canonical]] of aliases.entries()) {
      const [detail, counts] = responses[index];
      expect(detail.status).toBe(200);
      expect(detail.body.code).toBe(canonical);
      expect(counts.status).toBe(200);
      expect(counts.body.requestedCode).toBe(canonical);
      expect(SPECIALTIES.some((item) => item.code === legacy)).toBe(false);
    }
  }, 30000);

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
    // new contract: { $and: [ { $or: [ { specialtyCode: { $in } }, { subSpecialtyCodes: { $in } } ] }, { approved: true } ] }
    expect(Array.isArray(filter.$and)).toBe(true);
    const codeOr = filter.$and[0].$or;
    const subCodes = codeOr[1].subSpecialtyCodes.$in;
    // parent itself included + every own sub + cross-listed subs + legacy aliases
    expect(subCodes).toContain('SPEC.CARDIO');
    expect(subCodes).toContain('SPEC.CARDIO.PAED');
    expect(new Set(subCodes).size).toBe(subCodes.length);
    // 'approved' is on by default (only live doctors get counted)
    expect(filter.$and.some((f) => f.approved === true)).toBe(true);
  });

  it('supports city and facility scoping', async () => {
    doctorCountDocuments.mockResolvedValue(2);
    doctorDistinct.mockResolvedValue(['h1']);
    await as().get('/specialties/SPEC.ORTHO/counts?city=Pune&facilityId=f1').expect(200);
    const filter = doctorCountDocuments.mock.calls[0][0];
    const cityEntry = filter.$and.find((f) => f.$or && f.$or.some((x) => x.city || x.location));
    const facEntry = filter.$and.find((f) => f.$or && f.$or.some((x) => Object.prototype.hasOwnProperty.call(x, 'facilityId') || Object.prototype.hasOwnProperty.call(x, 'hospitalId')));
    expect(cityEntry).toBeDefined();
    expect(facEntry).toBeDefined();
    expect(facEntry.$or.some((x) => x.facilityId === 'f1' || x.hospitalId === 'f1')).toBe(true);
  });

  it('unknown specialty is a 404', async () => {
    await as().get('/specialties/SPEC.NOPE/counts').expect(404);
  });

  it('returns a valid count response for every canonical specialty and sub-specialty', async () => {
    doctorCountDocuments.mockResolvedValue(0);
    doctorDistinct.mockResolvedValue([]);
    const responses = await Promise.all(SPECIALTIES.map((item) => as().get(`/specialties/${item.code}/counts`)));
    for (const [index, item] of SPECIALTIES.entries()) {
      expect(responses[index].status).toBe(200);
      expect(responses[index].body).toMatchObject({
        requestedCode: item.code,
        doctors: 0,
        hospitals: 0,
        facilities: 0,
      });
    }
  }, 30000);

  it('bulk counts resolve legacy codes, cross-listed parents and distinct facilities', async () => {
    doctorFind.mockReturnValue({
      select: () => ({
        lean: async () => [
          { _id: 'd1', specialtyCode: 'SPEC.CARDIO', subSpecialtyCodes: ['SPEC.CARDIO.EP'], facilityId: 'f1' },
          { _id: 'd2', specialtyCode: 'SPEC.PAED.CARDIOLOGY', subSpecialtyCodes: [], hospitalId: 'h1' },
          { _id: 'd3', specialtyCode: 'SPEC.PAEDSURG', subSpecialtyCodes: [], facilityId: 'f1' },
        ],
      }),
    });
    const res = await as().get('/specialties/counts').expect(200);
    expect(res.body.counts['SPEC.CARDIO']).toEqual({ doctors: 2, facilities: 2 });
    expect(res.body.counts['SPEC.PAED']).toEqual({ doctors: 2, facilities: 2 });
  });
});

describe('GET /categories/public fallback untouched', () => {
  it('still serves the Â§A1 catalogue behind the cached route', async () => {
    categoryFind.mockReturnValue({ select: () => ({ sort: () => ({ lean: async () => categoryRows }) }) });
    const res = await as().get('/public?type=specialty').expect(200);
    expect(res.body.categories.length).toBeGreaterThan(0);
  });
});
