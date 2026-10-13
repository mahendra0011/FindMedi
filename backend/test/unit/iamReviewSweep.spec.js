/**
 * File 25 §10: quarterly access-certification sweep. Idempotent by
 * (tenantId, cycle) — one campaign per tenant per calendar quarter, reviewer
 * is the tenant's own admin, and one tenant's failure never stops the sweep.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const distinctMock = jest.fn();
const findMock = jest.fn();
const existsMock = jest.fn();
const createMock = jest.fn();
const findOneMock = jest.fn();

jest.unstable_mockModule('../../src/models/IamAssignment.js', () => ({
  default: {
    distinct: (...a) => distinctMock(...a),
    find: (...a) => findMock(...a),
  },
}));
jest.unstable_mockModule('../../src/models/AccessReview.js', () => ({
  default: {
    exists: (...a) => existsMock(...a),
    create: (...a) => createMock(...a),
  },
}));
jest.unstable_mockModule('../../src/models/User.js', () => ({
  default: { findOne: (...a) => findOneMock(...a) },
}));

const sweep = await import('../../src/lib/iamReviewSweep.js');

const chain = (rows) => {
  const q = { select: () => q, lean: async () => rows };
  return q;
};

const Q1 = new Date(2026, 0, 15); // Jan → Q1
const Q4 = new Date(2026, 10, 1); // Nov → Q4

beforeEach(() => {
  distinctMock.mockReset();
  findMock.mockReset();
  existsMock.mockReset();
  createMock.mockReset();
  findOneMock.mockReset();
  createMock.mockImplementation(async (doc) => ({ _id: 'rev1', ...doc }));
  existsMock.mockResolvedValue(false);
  findMock.mockReturnValue(chain([{ _id: 'a1' }, { _id: 'a2' }]));
  findOneMock.mockResolvedValue({ _id: 'admin1' });
  distinctMock.mockResolvedValue(['t1']);
});

describe('quarterCycle naming', () => {
  it('maps months to calendar quarters', () => {
    expect(sweep.quarterCycle(Q1)).toBe('2026-Q1-Certification');
    expect(sweep.quarterCycle(new Date(2026, 4, 1))).toBe('2026-Q2-Certification');
    expect(sweep.quarterCycle(new Date(2026, 7, 1))).toBe('2026-Q3-Certification');
    expect(sweep.quarterCycle(Q4)).toBe('2026-Q4-Certification');
  });
});

describe('runIamReviewCampaigns', () => {
  it('creates a campaign with every active assignment when none exists', async () => {
    const out = await sweep.runIamReviewCampaigns(Q1);
    expect(out).toEqual({ created: 1, skipped: 0, cycle: '2026-Q1-Certification' });
    expect(createMock).toHaveBeenCalledTimes(1);
    const doc = createMock.mock.calls[0][0];
    expect(String(doc.tenantId)).toBe('t1');
    expect(doc.cycle).toBe('2026-Q1-Certification');
    expect(String(doc.reviewerId)).toBe('admin1');
    expect(doc.items).toEqual([
      { assignmentId: 'a1', decision: 'pending', note: '' },
      { assignmentId: 'a2', decision: 'pending', note: '' },
    ]);
    // Reviewer lookup scoped to the tenant's own admins.
    const reviewerFilter = findOneMock.mock.calls[0][0];
    expect(reviewerFilter.$or).toEqual([{ hospitalId: 't1' }, { facilityId: 't1' }]);
  });

  it('is idempotent: skips tenants that already have this quarter campaign', async () => {
    existsMock.mockResolvedValue(true);
    const out = await sweep.runIamReviewCampaigns(Q1);
    expect(out.created).toBe(0);
    expect(out.skipped).toBe(1);
    expect(createMock).not.toHaveBeenCalled();
  });

  it('skips tenants with no active assignments', async () => {
    findMock.mockReturnValue(chain([]));
    const out = await sweep.runIamReviewCampaigns(Q1);
    expect(out).toMatchObject({ created: 0, skipped: 1 });
    expect(createMock).not.toHaveBeenCalled();
  });

  it('skips (never creates reviewer-less) when the tenant has no admin', async () => {
    findOneMock.mockResolvedValue(null);
    const out = await sweep.runIamReviewCampaigns(Q1);
    expect(out).toMatchObject({ created: 0, skipped: 1 });
    expect(createMock).not.toHaveBeenCalled();
  });

  it('one tenant blowing up does not stop the rest of the sweep', async () => {
    distinctMock.mockResolvedValue(['bad', 'good']);
    existsMock.mockImplementation(async ({ tenantId }) => {
      if (String(tenantId) === 'bad') throw new Error('index glitch');
      return false;
    });
    const out = await sweep.runIamReviewCampaigns(Q1);
    expect(out.created).toBe(1);
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(String(createMock.mock.calls[0][0].tenantId)).toBe('good');
  });

  it('returns { created: 0 } when even the tenant listing fails', async () => {
    distinctMock.mockRejectedValue(new Error('connection reset'));
    const out = await sweep.runIamReviewCampaigns(Q1);
    expect(out).toMatchObject({ created: 0 });
  });

  it('creates nothing in a tenant-less world', async () => {
    distinctMock.mockResolvedValue([]);
    const out = await sweep.runIamReviewCampaigns(Q1);
    expect(out).toMatchObject({ created: 0, skipped: 0 });
    expect(createMock).not.toHaveBeenCalled();
  });
});
