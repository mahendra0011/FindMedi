/**
 * File 24 §4.13: CRM ↔ application event sync. The sweep upserts a Lead per
 * submitted ProviderApplication — idempotent via linkedApplicationId, links
 * pre-existing field leads via dedupeKey instead of duplicating, advances
 * stage forward only, and lands rejections in churned with the reason.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const findOneMock = jest.fn();
const findAppMock = jest.fn();
const saved = [];

jest.unstable_mockModule('../../src/models/ProviderApplication.js', () => ({
  default: {
    find: (...a) => findAppMock(...a),
  },
}));

jest.unstable_mockModule('../../src/models/Lead.js', () => {
  function MockLead(doc) { Object.assign(this, doc); }
  MockLead.prototype.save = async function save() { saved.push(this); return this; };
  MockLead.findOne = (...a) => findOneMock(...a);
  return {
    __esModule: true,
    LEAD_STAGES_LIST: [
      'identified', 'contacted', 'interested', 'demo_done', 'docs_collected',
      'application_submitted', 'under_review', 'approved', 'activated',
      'active', 'at_risk', 'churned',
    ],
    default: MockLead,
  };
});

const { syncCrmFromApplications } = await import('../../src/lib/crmApplicationSync.js');

// Existing leads must behave like mongoose documents (save() pushes to `saved`).
const mkExisting = (doc) => {
  const lead = { ...doc };
  lead.save = async function save() { saved.push(lead); return lead; };
  return lead;
};

const appRow = (over = {}) => ({
  _id: 'a1',
  typeKey: 'dental_clinic',
  status: 'submitted',
  submittedAt: new Date(),
  providerId: null,
  applicantUserId: 'u1',
  rejectionReason: '',
  draft: { stepData: { business: { display_name: 'Smile Dental Studio', city: 'Pune', pincode: '411001' } } },
  ...over,
});

const chain = (rows) => ({
  sort: () => ({ limit: () => ({ lean: async () => rows }) }),
});

beforeEach(() => {
  saved.length = 0;
  findOneMock.mockReset();
  findAppMock.mockReset();
});

describe('crmApplicationSync', () => {
  it('creates a lead from a submitted application', async () => {
    findAppMock.mockReturnValue(chain([appRow()]));
    findOneMock.mockResolvedValue(null);
    const out = await syncCrmFromApplications();
    expect(out).toMatchObject({ scanned: 1, created: 1, updated: 0, linked: 0 });
    expect(saved).toHaveLength(1);
    expect(saved[0].stage).toBe('application_submitted');
    expect(saved[0].source).toBe('inbound');
    expect(String(saved[0].linkedApplicationId)).toBe('a1');
    expect(saved[0].dedupeKey).toBe('smile dental studio|pune|411001');
  });

  it('links a pre-existing field lead instead of duplicating it', async () => {
    findAppMock.mockReturnValue(chain([appRow()]));
    const existing = mkExisting({
      _id: 'l1', businessName: 'Smile Dental Studio', stage: 'docs_collected',
      pincode: '', linkedApplicationId: null, lostReason: '',
    });
    findOneMock
      .mockResolvedValueOnce(null) // linkedApplicationId lookup
      .mockResolvedValueOnce(existing); // dedupeKey lookup
    const out = await syncCrmFromApplications();
    expect(out.linked).toBe(1);
    expect(saved).toHaveLength(1);
    expect(String(saved[0].linkedApplicationId)).toBe('a1');
    expect(saved[0].stage).toBe('application_submitted');
  });

  it('never pushes an existing lead backwards', async () => {
    findAppMock.mockReturnValue(chain([appRow()]));
    const existing = mkExisting({
      _id: 'l1', stage: 'approved', providerId: null, pincode: '411001',
      linkedApplicationId: 'a1', lostReason: '',
    });
    findOneMock.mockResolvedValue(existing);
    const out = await syncCrmFromApplications();
    expect(saved[0].stage).toBe('approved');
    expect(out.updated).toBe(1);
  });

  it('moves a rejected application lead to churned with the reason', async () => {
    findAppMock.mockReturnValue(chain([appRow({ status: 'rejected', rejectionReason: 'PAN mismatch' })]));
    const existing = mkExisting({
      _id: 'l1', stage: 'under_review', providerId: null, pincode: '411001',
      linkedApplicationId: 'a1', lostReason: '',
    });
    findOneMock.mockResolvedValue(existing);
    const out = await syncCrmFromApplications();
    expect(saved[0].stage).toBe('churned');
    expect(saved[0].lostReason).toContain('PAN mismatch');
    expect(out.updated).toBe(1);
  });

  it('derives activated from application.providerId and advances past approval', async () => {
    findAppMock.mockReturnValue(chain([appRow({ status: 'approved', providerId: 'p1' })]));
    findOneMock.mockResolvedValue(null);
    const out = await syncCrmFromApplications();
    expect(saved[0].stage).toBe('activated');
    expect(String(saved[0].linkedProviderId)).toBe('p1');
    expect(out.created).toBe(1);
  });

  it('keeps going when one application fails', async () => {
    findAppMock.mockReturnValue(chain([
      appRow({ _id: 'bad' }),
      appRow({ _id: 'a2' }),
    ]));
    findOneMock
      .mockRejectedValueOnce(new Error('db down')) // 'bad' -> skipped
      .mockResolvedValueOnce(null)                // 'a2' linkedApplicationId lookup
      .mockResolvedValueOnce(null);               // 'a2' dedupeKey lookup -> create
    const out = await syncCrmFromApplications();
    expect(out.scanned).toBe(2);
    expect(out.skipped).toBe(1);
    expect(out.created).toBe(1);
  });
});
