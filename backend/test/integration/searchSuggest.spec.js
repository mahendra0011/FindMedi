/**
 * Spec B-1.4/b.5 typeahead: GET /api/search/suggest — suggestions from the real
 * browse taxonomy (tiles, sub-specialties by name/alias/sub-token, and the
 * parent-mounted symptom/condition/procedure chips), never generic strings.
 *
 * Pinned here:
 *  - anonymous + cacheable + red-flag banner inline (chest → Cardiology chip
 *    AND the 108 emergency banner in the same payload);
 *  - sensitive tiles (PSYCH/SEXO/INFERT roots and their children) are ABSENT
 *    from suggestions — the user spec keeps them discreet;
 *  - alias + sub-token spellings resolve (Orthopedics, pcos → ENDO.PCOS with
 *    the home parent attached);
 *  - short/empty queries answer empty results without banner noise.
 */
import { jest as jestApi } from '@jest/globals';
import { mountApp } from '../helpers/appHarness.js';

jestApi.unstable_mockModule('../../src/services/opensearchIndexer.js', () => ({
  searchProviders: async () => ({ source: 'mongo_fallback', results: [] }),
  searchDrugs: async () => ({ results: [] }),
  searchEhr: async () => ({ results: [] }),
  searchIcd: async () => ({ results: [] }),
  isOpenSearchConfigured: () => false,
  indexAuditLog: async () => {},
}));

const { as } = await mountApp('search', {});

describe('GET /api/search/suggest — taxonomy-backed typeahead (anonymous)', () => {
  it('answers a short query with no results and no banner noise', async () => {
    const res = await as().get('/suggest?q=c');
    expect(res.status).toBe(200);
    expect(res.body.results).toEqual([]);
    expect(res.body.taxonomy.isEmergency).toBe(false);
  });

  it('resolves an alias spelling to its tile', async () => {
    const res = await as().get('/suggest?q=orthopedics');
    expect(res.status).toBe(200);
    const hit = res.body.results.find((r) => r.code === 'SPEC.ORTHO');
    expect(hit.kind).toBe('specialty');
    expect(hit.parent).toBeNull();
    expect(hit.nameHi).toBeTruthy();
  });

  it('resolves a sub-specialty sub-token with its home parent', async () => {
    const res = await as().get('/suggest?q=pcos');
    expect(res.status).toBe(200);
    const hit = res.body.results.find((r) => r.code === 'SPEC.ENDO.PCOS');
    expect(hit).toBeTruthy();
    expect(hit.parent).toBe('SPEC.ENDO');
  });

  it('suggests a Hinglish symptom chip bound to its parent tile + banner', async () => {
    const res = await as().get('/suggest?q=chest%20pain');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('public, max-age=300');
    const chip = res.body.results.find((r) => r.kind === 'symptom' && /chest pain/i.test(r.label));
    expect(chip.specialty.code).toBe('SPEC.CARDIO');
    expect(res.body.taxonomy.isEmergency).toBe(true);
    expect(res.body.taxonomy.emergencyMessage).toContain('108');
  });

  it('hides sensitive tiles (and their aliases) from suggestions', async () => {
    const res = await as().get('/suggest?q=psych');
    expect(res.status).toBe(200);
    expect(res.body.results).toEqual([]);
  });
});
