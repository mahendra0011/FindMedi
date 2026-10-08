import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const ACTIVE = {
  _id: 'cfg1', typeKey: 'dental_clinic', kind: 'facility', group: 'clinical', tier: 'T1',
  label: 'Dental Clinic', icon: 'tooth', description: 'Clinic with a dentist',
  steps: [{ key: 'facility', label: 'Facility', fields: ['name'] }],
  fields: [{ key: 'name', label: 'Name', type: 'text', required: true }],
  requiredDocs: [{ key: 'license', label: 'Dental license', mandatory: true }],
  optionalDocs: [], agreementTemplateId: 'ag-dental-v2',
  approvalPolicy: { level: 'single', slaHours: 72, twoPerson: false },
  enabledCities: [], commissionDefaults: { percent: 12, fixed: 0, currency: 'INR' },
  allowedStatus: ['draft'], version: 3, isActive: true,
};

const configFind = jestApi.fn();
let lastFilter = null;
let lastSelect = null;

const chain = (value) => {
  const q = query(value);
  q.select = (fields) => { lastSelect = fields; return q; };
  return q;
};

jestApi.unstable_mockModule('../../src/models/ProviderTypeConfig.js', () => ({
  default: {
    find: (filter) => { lastFilter = filter; return chain([ACTIVE]); },
    findOne: (...args) => configFind(...args),
  },
}));

const { as } = await mountApp('providerTypes', {});

beforeEach(() => {
  lastFilter = null;
  lastSelect = null;
  configFind.mockReset().mockResolvedValue(ACTIVE);
});

describe('GET /config/provider-types (join wizard config)', () => {
  it('serves anonymous callers with active configs only', async () => {
    const res = await as().get('/');
    expect(res.status).toBe(200);
    expect(res.body.providerTypes).toHaveLength(1);
    expect(lastFilter).toEqual({ isActive: true });
  });

  it('carries the wizard shape the frontend steps render from', async () => {
    const res = await as().get('/');
    const cfg = res.body.providerTypes[0];
    expect(cfg).toMatchObject({ typeKey: 'dental_clinic', kind: 'facility', group: 'clinical' });
    expect(cfg.steps[0].key).toBe('facility');
    expect(cfg.fields[0]).toMatchObject({ key: 'name', type: 'text', required: true });
    expect(cfg.requiredDocs[0].key).toBe('license');
    expect(cfg.version).toBe(3);
  });

  it('never leaks commission economics or internal workflow to an anonymous wizard', async () => {
    await as().get('/');
    expect(lastSelect).toBe(
      'typeKey kind group tier label icon description steps fields requiredDocs optionalDocs '
      + 'agreementTemplateId approvalPolicy.slaHours version',
    );
    for (const forbidden of ['commissionDefaults', 'allowedStatus', 'approvalPolicy.level', 'approvalPolicy.twoPerson']) {
      expect(lastSelect).not.toContain(forbidden);
    }
  });

  it('filters by kind, group and city', async () => {
    await as().get('/?kind=facility&group=clinical&city=Pune');
    expect(lastFilter.kind).toBe('facility');
    expect(lastFilter.group).toBe('clinical');
    expect(lastFilter.$or).toHaveLength(2);
  });

  it('is cacheable', async () => {
    const res = await as().get('/');
    expect(res.headers['cache-control']).toBe('public, max-age=300');
    expect(res.headers.pragma).toBeUndefined();
  });
});
