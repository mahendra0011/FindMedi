/**
 * 10.md 4.1 "Public (cacheable, DTO-only)" — the three catalogue surfaces that
 * were missing, plus the guarantee that the ones already there stay anonymous:
 *
 *   GET /api/products?category=&q=        cross-vendor storefront (FLOW-C)
 *   GET /api/practitioners/:slug          practitioner spelling of detail DTO
 *   GET /api/search?q=&type=&city=&lat=&lng=   directory search (OpenSearch or
 *                                              mongo fallback), DTO-allowlisted
 *
 * What it pins:
 *  - every route answers an ANONYMOUS caller (no 401) and sets Cache-Control;
 *  - products: only `active` rows from `live` vendors; the projection carries
 *    no batch/expiry/regulatory fields; stock surfaces as a boolean; the vendor
 *    join is slug+name from live vendors only; `q` arrives regex-escaped;
 *  - practitioners: the query pins kind:'practitioner' + status live, and a
 *    miss is 404 (never 403 — a slug must not confirm which listings exist);
 *  - search: spec params (type→vertical, lng→lon) reach the engine, size is
 *    capped, and engine output is allowlist-mapped so an index document can
 *    never widen the card; the authenticated /providers half still 401s.
 */
import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

jestApi.unstable_mockModule('../../src/services/ehrSearchAccess.js', () => ({
  assertEhrSearchAccess: jestApi.fn(async () => ({ ok: false })),
}));

let productRows = [];
let productTotal = 0;
let lastProductFilter = null;
let lastProductSelect = null;
let providerFindCalls = [];
let lastFindOneFilter = null;
let detailRow = null;
let searchOut = { source: 'mongo_fallback', results: [] };
let lastSearchArgs = null;

jestApi.unstable_mockModule('../../src/models/Product.js', () => ({
  default: {
    find: (filter) => {
      lastProductFilter = filter;
      const q = query(productRows);
      q.select = (fields) => { lastProductSelect = fields; return q; };
      return q;
    },
    countDocuments: (filter) => { lastProductFilter = filter; return query(productTotal); },
  },
}));
jestApi.unstable_mockModule('../../src/models/Provider.js', () => ({
  default: {
    find: (filter) => {
      providerFindCalls.push(filter);
      // First call is the live-vendor id sweep ({status}); the second is the
      // seller join ({_id, status}).
      return query(filter._id ? [{ _id: 'v1', slug: 'v-slug', name: 'Vendor One' }] : [{ _id: 'v1' }]);
    },
    findOne: (filter) => { lastFindOneFilter = filter; return query(detailRow); },
  },
}));
jestApi.unstable_mockModule('../../src/services/opensearchIndexer.js', () => ({
  searchProviders: async (args) => { lastSearchArgs = args; return searchOut; },
  searchDrugs: async () => ({ results: [] }),
  searchEhr: async () => ({ results: [] }),
  searchIcd: async () => ({ results: [] }),
  isOpenSearchConfigured: () => false,
  // providers.js (via practitioners) loads middleware/audit.js, which imports
  // this name at module scope — a mock factory missing it is a link error the
  // moment the route file is imported, not when auditLog is called.
  indexAuditLog: async () => {},
}));

const { as: asProducts } = await mountApp('products', {});
const { as: asPractitioners } = await mountApp('practitioners', {});
const { as: asSearch } = await mountApp('search', {});

const productRow = {
  _id: 'p1',
  vendorId: 'v1',
  kind: 'supplement',
  categoryCodes: ['SUP.AYUR'],
  brand: 'AyurCo',
  name: 'Ashwagandha 60t',
  images: ['img/1.jpg'],
  rxSchedule: 'OTC',
  storage: 'ambient',
  claims: ['stress'],
  warrantyMonths: 6,
  rentable: { perDay: 10, deposit: 50, available: true },
  fssaiNo: 'FSSAI-123',
  gstRate: 18,
  status: 'active',
  variants: [
    { sku: 'SKU1', pack: '60 tablets', price: 100, mrp: 120, stock: 7, batch: 'BATCH-77', expiry: new Date('2027-01-01') },
    { sku: 'SKU2', pack: '30 tablets', price: 60, stock: 0 },
  ],
};

beforeEach(() => {
  productRows = [productRow];
  productTotal = 1;
  lastProductFilter = null;
  lastProductSelect = null;
  providerFindCalls = [];
  lastFindOneFilter = null;
  detailRow = null;
  searchOut = { source: 'mongo_fallback', results: [] };
  lastSearchArgs = null;
});

describe('GET /api/products — public storefront', () => {
  it('serves an anonymous caller, cacheable', async () => {
    const res = await asProducts().get('/');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('public, max-age=60');
    expect(res.body.products).toHaveLength(1);
    expect(res.body.total).toBe(1);
  });

  it('restricts to active rows of LIVE vendors', async () => {
    await asProducts().get('/');
    expect(lastProductFilter.status).toBe('active');
    expect(lastProductFilter.vendorId).toEqual({ $in: ['v1'] });
    expect(providerFindCalls[0]).toEqual({ status: 'live' });
  });

  it('projects a storefront DTO — no batch, expiry or regulatory fields', async () => {
    const res = await asProducts().get('/');
    const product = res.body.products[0];
    for (const forbidden of ['vendorId', 'fssaiNo', 'gstRate', 'status']) {
      expect(product[forbidden]).toBeUndefined();
    }
    expect(product.vendor).toEqual({ slug: 'v-slug', name: 'Vendor One' });
    expect(product.variants[0]).toEqual({ sku: 'SKU1', pack: '60 tablets', price: 100, mrp: 120, inStock: true });
    expect(product.variants[1]).toEqual({ sku: 'SKU2', pack: '30 tablets', price: 60, mrp: 60, inStock: false });
    expect(lastProductSelect).toContain('vendorId');
    expect(lastProductSelect).toContain('variants.stock');
    for (const forbidden of ['batch', 'expiry', 'fssaiNo', 'gstRate']) {
      expect(lastProductSelect).not.toContain(forbidden);
    }
    // The seller join reads slug+name from live vendors only.
    expect(providerFindCalls[1]).toEqual({ _id: { $in: ['v1'] }, status: 'live' });
  });

  it('applies category and an escaped q across name/brand', async () => {
    await asProducts().get('/?category=SUP.AYUR&q=heart(');
    expect(lastProductFilter.categoryCodes).toBe('SUP.AYUR');
    expect(lastProductFilter.$or).toHaveLength(2);
    expect(lastProductFilter.$or[0].name.source).toContain('\\(');
    expect(lastProductFilter.$or[1]).toHaveProperty('brand');
  });

  it('skips the seller join when the page is empty', async () => {
    productRows = [];
    productTotal = 0;
    const res = await asProducts().get('/');
    expect(res.body.products).toEqual([]);
    expect(providerFindCalls).toHaveLength(1);
  });
});

describe('GET /api/practitioners/:slug — practitioner detail spelling', () => {
  it('serves a live practitioner anonymously, pinned to kind', async () => {
    detailRow = { _id: 'doc1', slug: 'dr-mehta', kind: 'practitioner', name: 'Dr Mehta' };
    const res = await asPractitioners().get('/dr-mehta');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('public, max-age=120');
    expect(lastFindOneFilter).toEqual({ slug: 'dr-mehta', status: 'live', kind: 'practitioner' });
  });

  it('404s a miss — never 403s, so a slug cannot confirm which rows exist', async () => {
    detailRow = null;
    const res = await asPractitioners().get('/nope');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: 'Provider not found' });
  });
});

describe('GET /api/search — public directory search', () => {
  it('answers an anonymous caller and allowlist-maps the engine output', async () => {
    searchOut = {
      source: 'mongo_fallback',
      results: [{
        score: 2.5,
        providerId: 'doc-1',
        vertical: 'doctor',
        fullName: 'Dr Mehta',
        specialization: 'Cardiology',
        relayPhone: '+919999999999',
        ownerUserId: 'user-77',
        geoPoint: { lat: 18.5, lon: 73.8 },
      }],
    };
    const res = await asSearch().get('/?q=mehta');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('public, max-age=60');
    expect(res.body.engine).toBe('mongo');
    expect(res.body.results).toEqual([{
      score: 2.5,
      providerId: 'doc-1',
      vertical: 'doctor',
      fullName: 'Dr Mehta',
      specialization: 'Cardiology',
    }]);
  });

  it('maps the spec params (type→vertical, lng→lon) and caps size', async () => {
    await asSearch().get('/?q=heart&type=doctor&city=Pune&lat=18.5&lng=73.8&radiusKm=5&size=999');
    expect(lastSearchArgs).toEqual({
      q: 'heart',
      vertical: 'doctor',
      city: 'Pune',
      lat: 18.5,
      lon: 73.8,
      radiusKm: 5,
      size: 50,
    });
  });

  it('keeps the authenticated /providers half behind protect', async () => {
    const res = await asSearch().get('/providers?q=heart');
    expect(res.status).toBe(401);
  });
});
