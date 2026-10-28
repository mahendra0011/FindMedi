import { jest as jestApi } from '@jest/globals';
import { mountApp } from '../helpers/appHarness.js';

// SITE-LEG 3.1: public takedown intake → the SAME moderation pipeline (same
// item shape, same SLA pre-save machinery), no authentication, rate-limited,
// audited. The Legal & Statutory Compliance Desk works these items from the
// regular queue — the claimant never needs a support login.
const ITEM_ID = '7000000000000000000000a9';

const itemCreate = jestApi.fn().mockImplementation(async (body) => ({
  _id: ITEM_ID,
  actions: [],
  notes: [],
  slaDueAt: new Date('2026-10-29T12:00:00.000Z').toISOString(),
  ...body,
}));
const itemFindOne = jestApi.fn().mockImplementation(() => Promise.resolve(null));
const auditLog = jestApi.fn().mockResolvedValue({});

jestApi.unstable_mockModule('../../src/models/ModerationItem.js', () => ({
  __esModule: true,
  default: {
    findOne: (...a) => itemFindOne(...a),
    create: (...a) => itemCreate(...a),
  },
}));
jestApi.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLog: (...args) => auditLog(...args),
}));

const { as } = await mountApp('moderation');

const validPayload = {
  targetType: 'review',
  targetId: '64b0000000000000000aa',
  category: 'copyright',
  claimantName: 'Dr. A K Sharma',
  claimantContact: 'legal+dmca@example.com',
  jurisdiction: 'India (IT Rules 2021)',
  statement: 'This review reproduces our clinic brochure verbatim; we hold copyright over the reproduced text and request removal.',
};

describe('SITE-LEG 3.1: public takedown intake', () => {
  const post = (body) => as(null).post('/takedown').send(body);

  beforeEach(() => {
    itemCreate.mockClear();
    itemFindOne.mockClear();
    auditLog.mockClear();
  });

  test('files a request without auth and returns an SLA-stamped item', async () => {
    const res = await post(validPayload).expect(201);
    expect(res.body.success).toBe(true);
    expect(res.body.item.id).toBe(ITEM_ID);
    expect(res.body.item.slaDueAt).toBeTruthy();
    const body = itemCreate.mock.calls[0][0];
    expect(body.category).toBe('copyright');
    expect(body.source).toBe('user_report');
    expect(body.reporterId).toBe(null);
    expect(body.notes[0].note).toContain('TAKEDOWN (copyright) from Dr. A K Sharma');
    expect(body.notes[0].note).toContain('Contact: legal+dmca@example.com · Jurisdiction: India (IT Rules 2021)');
    expect(body.notes[0].note).toContain('No attached evidence URL');
    expect(auditLog).toHaveBeenCalledWith('takedown_filed', null, expect.objectContaining({ claimant: 'Dr. A K Sharma' }));
  });

  test('deduplicates into the existing open item for the same target', async () => {
    itemFindOne.mockImplementationOnce(() => Promise.resolve({
      _id: ITEM_ID, status: 'open', severity: 'medium', notes: { push() {} },
      save: jestApi.fn().mockResolvedValue(undefined),
    }));
    const res = await post(validPayload).expect(200);
    expect(res.body.created).toBe(false);
    expect(itemCreate).not.toHaveBeenCalled();
  });

  test('rejects a too-short statement (the "why" is mandatory)', async () => {
    await post({ ...validPayload, statement: 'remove it' }).expect(400);
  });

  test('rejects an unknown category', async () => {
    await post({ ...validPayload, category: 'defamatory-claims' }).expect(400);
  });

  test('rejects an invalid attachment URL', async () => {
    await post({ ...validPayload, attachmentUrl: 'not-a-url' }).expect(400);
  });
});
