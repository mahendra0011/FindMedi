/**
 * 10.md 4.1 / Spec 02 — the public directory search must answer with the
 * platform's OWN listings, not only the legacy Facility rows.
 *
 * Before this, `GET /api/search/unified` searched Facility, Doctor and
 * Medicine only, so every provider that completed the join wizard (dental,
 * gym, yoga, equipment rental, …) was invisible in search. These tests pin:
 *
 *  - a live provider is returned as `source: 'provider'` with the public card
 *    contract (Spec 02 §5);
 *  - only `status: 'live'` providers are ever queried;
 *  - a vertical tab narrows the provider rows to the matching typeKeys;
 *  - lat/lng turn into a real distance instead of an empty "distance" chip.
 */
import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

let providerRows = [];
let facilityRows = [];
let doctorRows = [];
let lastProviderFilter = null;
let lastProviderSelect = null;
let lastFacilityFilter = null;

jestApi.unstable_mockModule('../../src/models/Provider.js', () => ({
  default: {
    find: (filter) => {
      lastProviderFilter = filter;
      const q = query(providerRows);
      q.select = (fields) => { lastProviderSelect = fields; return q; };
      return q;
    },
    findOne: () => query(null),
    countDocuments: () => query(0),
  },
}));

jestApi.unstable_mockModule('../../src/models/Facility.js', () => ({
  // providerTypeCatalog.js imports these constants from the Facility model,
  // and search.js loads that catalogue at module scope.
  FACILITY_SUBTYPES: ['hospital', 'clinic', 'lab', 'pharmacy'],
  FACILITY_OWNERSHIP: ['Private', 'Trust', 'Government'],
  SYSTEMS_OF_MEDICINE: ['Modern Medicine (Allopathy)', 'Ayurveda'],
  FACILITY_SCHEMES: ['PM-JAY', 'CGHS'],
  default: {
    find: (filter) => {
      lastFacilityFilter = filter;
      const q = query(facilityRows);
      q.select = () => q;
      return q;
    },
  },
}));

jestApi.unstable_mockModule('../../src/models/Doctor.js', () => ({
  default: {
    find: () => {
      const q = query(doctorRows);
      q.select = () => q;
      return q;
    },
  },
}));

jestApi.unstable_mockModule('../../src/models/Medicine.js', () => ({
  default: { find: () => query([]) },
}));

jestApi.unstable_mockModule('../../src/models/UnmetDemand.js', () => ({
  default: { findOneAndUpdate: () => Promise.resolve({}) },
}));

jestApi.unstable_mockModule('../../src/models/Service.js', () => ({
  default: {
    find: () => query([]),
    aggregate: () => Promise.resolve([]),
  },
}));

jestApi.unstable_mockModule('../../src/models/Review.js', () => ({
  default: { find: () => query([]) },
}));

jestApi.unstable_mockModule('../../src/services/opensearchIndexer.js', () => ({
  searchProviders: async () => ({ results: [] }),
  searchDrugs: async () => ({ results: [] }),
  searchEhr: async () => ({ results: [] }),
  isOpenSearchConfigured: () => false,
  indexAuditLog: async () => {},
}));

const { as } = await mountApp('search', {});

const providerRow = {
  _id: 'prov1',
  slug: 'smile-dental-studio',
  kind: 'facility',
  type: 'dental_clinic',
  group: 'clinical',
  tier: 'T1',
  name: 'Smile Dental Studio',
  tagline: 'Painless dentistry',
  media: [{ url: 'img/dental.jpg', type: 'image' }],
  address: { city: 'Pune', area: 'Kothrud', geo: { type: 'Point', coordinates: [73.8, 18.5] } },
  stats: { ratingAvg: 4.7, ratingCount: 12 },
  verification: { status: 'verified' },
  trusted: true,
  plan: 'premium',
  languages: ['Hindi', 'English'],
  schemesAccepted: ['PM-JAY'],
  timings: { is24x7: false, weekly: [] },
  status: 'live',
};

beforeEach(() => {
  providerRows = [providerRow];
  facilityRows = [];
  doctorRows = [];
  lastProviderFilter = null;
  lastProviderSelect = null;
  lastFacilityFilter = null;
});

describe('GET /api/search/unified — provider listings', () => {
  it('returns a live provider as the public card contract', async () => {
    const res = await as().get('/unified?q=smile');
    expect(res.status).toBe(200);
    const hit = res.body.results.find((r) => r.source === 'provider');
    expect(hit).toBeTruthy();
    expect(hit.card).toMatchObject({
      id: 'prov1',
      slug: 'smile-dental-studio',
      type: 'dental_clinic',
      name: 'Smile Dental Studio',
      verified: true,
      ratingAvg: 4.7,
      ratingCount: 12,
      imageUrl: 'img/dental.jpg',
      isSponsored: true,
      city: 'Pune',
      area: 'Kothrud',
    });
    expect(hit.card.ratingVisible).toBe(true);
    expect(hit.card).not.toHaveProperty('ownerUserId');
    expect(hit.card).not.toHaveProperty('relayPhone');
  });

  it('only ever queries live provider rows', async () => {
    await as().get('/unified?q=smile');
    expect(lastProviderFilter.status).toBe('live');
  });

  it('narrows provider rows by the vertical tab', async () => {
    await as().get('/unified?vertical=lab');
    expect(lastProviderFilter.type).toEqual({
      $in: expect.arrayContaining(['diagnostic', 'imaging_centre', 'pathology_lab']),
    });
  });

  it('narrows provider rows to a typeKey the catalogue knows', async () => {
    await as().get('/unified?vertical=dental_clinic');
    expect(lastProviderFilter.type).toBe('dental_clinic');
  });

  it('computes a real distance when the caller supplies lat/lng', async () => {
    const res = await as().get('/unified?q=smile&lat=18.5&lng=73.8');
    const hit = res.body.results.find((r) => r.source === 'provider');
    expect(hit.card.distanceKm).toBe(0);
    expect(hit.card.geo).toEqual({ lat: 18.5, lng: 73.8 });
  });

  it('leaves distance empty when the caller supplies no coordinates', async () => {
    const res = await as().get('/unified?q=smile');
    const hit = res.body.results.find((r) => r.source === 'provider');
    expect(hit.card.distanceKm).toBeNull();
  });

  it('still searches the legacy facility rows', async () => {
    facilityRows = [{ _id: 'f1', name: 'City Hospital', type: 'hospital', slug: 'city-hospital', city: 'Pune' }];
    const res = await as().get('/unified?q=city');
    expect(res.body.results.some((r) => r.vertical === 'hospital')).toBe(true);
  });
});
