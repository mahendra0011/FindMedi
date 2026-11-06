/**
 * A4 (rolesmd 10.md §4.4 "GET/POST /api/admin/dsr") - the compliance queue
 * behind dsr:read / dsr:approve (compliance_officer in the permission matrix).
 *
 * What this pins:
 *  - authentication on every route (the harness authorize() stub 401s an
 *    anonymous caller; role semantics are checkPermissionMatrix's job);
 *  - the queue's filters, especially overdue = OPEN + dueAt in the past;
 *  - the local transition table: a decision that skips a step (fulfil straight
 *    out of `submitted`) is a 409, and a terminal row is immutable;
 *  - the conditional requirements the SCHEMA cannot know: method to verify,
 *    exportRef to fulfil an export;
 *  - extension: once, bounded (+15 days), reasoned, and only while open.
 */
import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const DAY = 24 * 60 * 60 * 1000;
const ROW_ID = '7300000000000000000000a1';
const OFFICER = { _id: 'off-1', id: 'off-1', role: 'compliance_officer' };

const auditLog = jestApi.fn();
const countDocuments = jestApi.fn();
const applyUpdate = (row, update) => {
  if (!row) return null;
  Object.assign(row, update.$set || {});
  for (const [path, value] of Object.entries(update.$push || {})) row[path] = [...(row[path] || []), value];
  for (const [path, value] of Object.entries(update.$unset || {})) { void value; delete row[path]; }
  for (const [path, condition] of Object.entries(update.$pull || {})) row[path] = (row[path] || []).filter((item) => String(item.approverId) !== String(condition.approverId));
  return row;
};

let listRows = [];
let currentRow = null;
let lastFilter = null;

jestApi.unstable_mockModule('../../src/models/DataSubjectRequest.js', () => ({
  default: {
    find: (filter) => { lastFilter = filter; return query(listRows); },
    findById: () => query(currentRow),
    findOneAndUpdate: (_filter, update) => Promise.resolve(applyUpdate(currentRow, update)),
    updateOne: (_filter, update) => Promise.resolve(applyUpdate(currentRow, update)),
    countDocuments: (...args) => countDocuments(...args),
  },
}));
jestApi.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLog: (...args) => auditLog(...args),
  auditLogRequired: (...args) => auditLog(...args),
}));
jestApi.unstable_mockModule('../../src/middleware/stepUpAuth.js', () => ({
  requireStepUp: () => (_req, _res, next) => next(),
}));
jestApi.unstable_mockModule('../../src/services/notificationService.js', () => ({
  createNotification: jestApi.fn().mockResolvedValue({ notification: { _id: 'notice-1' } }),
}));

const { as } = await mountApp('adminDsr', {});

const makeRow = (status = 'submitted', over = {}) => ({
  _id: ROW_ID,
  userId: 'pat-1',
  type: 'access',
  status,
  requestedAt: new Date(),
  dueAt: new Date(Date.now() + 10 * DAY),
  extensionReason: '',
  exportRef: '',
  resolutionNote: '',
  verification: { method: '', at: null, by: null },
  fulfillmentApprovals: [],
  save: jestApi.fn().mockResolvedValue(undefined),
  ...over,
});

beforeEach(() => {
  listRows = [];
  currentRow = null;
  lastFilter = null;
  countDocuments.mockReset().mockResolvedValue(1);
  auditLog.mockReset().mockResolvedValue(undefined);
});

describe('authentication', () => {
  it('refuses anonymous callers on every route', async () => {
    expect((await as().get('/')).status).toBe(401);
    expect((await as().post(`/x/decision`).send({ action: 'review' })).status).toBe(401);
    expect((await as().post(`/x/extend`).send({ reason: 'need more time' })).status).toBe(401);
    expect(lastFilter).toBeNull();
  });
});

describe('GET /admin/dsr (queue)', () => {
  it('returns the queue with derived overdue flags, earliest deadline first', async () => {
    listRows = [
      makeRow('submitted', { dueAt: new Date(Date.now() - DAY) }),
      makeRow('in_review', { dueAt: new Date(Date.now() + 5 * DAY) }),
    ];
    const res = await as(OFFICER).get('/');
    expect(res.status).toBe(200);
    expect(lastFilter).toEqual({});
    expect(res.body.total).toBe(1);
    expect(res.body.requests[0].overdue).toBe(true);
    expect(res.body.requests[1].overdue).toBe(false);
    expect(res.body.requests[0].id).toBe(ROW_ID);
  });

  it('filters by status, type and the open set', async () => {
    await as(OFFICER).get('/?status=in_review&type=export');
    expect(lastFilter).toEqual({ status: 'in_review', type: 'export' });
  });

  it('overdue=1 means OPEN and past due, not merely a past dueAt', async () => {
    await as(OFFICER).get('/?overdue=1');
    expect(lastFilter.status).toEqual({ $in: ['submitted', 'in_review', 'verified'] });
    expect(lastFilter.dueAt.$lt).toBeInstanceOf(Date);
    expect(lastFilter.dueAt.$lt.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('combines an explicit status with the overdue window', async () => {
    await as(OFFICER).get('/?status=verified&overdue=1');
    expect(lastFilter.status).toBe('verified');
    expect(lastFilter.dueAt.$lt).toBeInstanceOf(Date);
  });
});

describe('POST /admin/dsr/:id/decision', () => {
  it('reviews a submitted request into in_review and records the actor', async () => {
    currentRow = makeRow('submitted');
    const res = await as(OFFICER).post(`/${ROW_ID}/decision`).send({ action: 'review' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('in_review');
    expect(currentRow.decidedBy).toBe('off-1');
    expect(currentRow.decidedAt).toBeInstanceOf(Date);
    expect(currentRow.save).toHaveBeenCalled();
    expect(auditLog).toHaveBeenCalledWith('dsr_review', 'off-1', expect.objectContaining({
      from: 'submitted', to: 'in_review',
    }));
  });

  it('409s skipping the verification step (submitted -> fulfilled)', async () => {
    currentRow = makeRow('submitted');
    const res = await as(OFFICER).post(`/${ROW_ID}/decision`).send({ action: 'fulfill' });
    expect(res.status).toBe(409);
    expect(currentRow.save).not.toHaveBeenCalled();
  });

  it('requires a method to verify an identity', async () => {
    currentRow = makeRow('in_review');
    const res = await as(OFFICER).post(`/${ROW_ID}/decision`).send({ action: 'verify' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/method/);
    expect(currentRow.save).not.toHaveBeenCalled();
  });

  it('verifies with a method, stamping the verification on the row', async () => {
    currentRow = makeRow('in_review');
    const res = await as(OFFICER).post(`/${ROW_ID}/decision`)
      .send({ action: 'verify', method: 'email_otp' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('verified');
    expect(currentRow.verification).toEqual(expect.objectContaining({ method: 'email_otp' }));
    expect(currentRow.verification.by).toBe('off-1');
  });

  it('requires an identity-verified request before export approval', async () => {
    currentRow = makeRow('verified', { type: 'export' });
    const res = await as(OFFICER).post(`/${ROW_ID}/decision`).send({ action: 'fulfill' });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/Verify the data principal/);
  });

  it('requires an opaque ref and a specific purpose for an identified export', async () => {
    currentRow = makeRow('verified', { type: 'export', verification: { method: 'email_otp', at: new Date(), by: 'off-1' } });
    const res = await as(OFFICER).post(`/${ROW_ID}/decision`).send({
      action: 'fulfill', exportRef: 'https://public.example/export',
      exportPurpose: 'Deliver the verified account archive to the requester',
      exportExpiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/opaque export artifact/);
  });

  it('requires two different operators to fulfill an identified export', async () => {
    currentRow = makeRow('verified', { type: 'export', verification: { method: 'email_otp', at: new Date(), by: 'off-1' } });
    const payload = {
      action: 'fulfill', exportRef: 'dsr-job-opaque-42',
      exportPurpose: 'Deliver the verified account archive to the requesting data principal',
      exportExpiresAt: new Date(Date.now() + 60 * 60_000).toISOString(),
    };
    const res = await as(OFFICER).post(`/${ROW_ID}/decision`).send(payload);
    expect(res.status).toBe(503);
    expect(res.body.message).toMatch(/artifact store/);
    expect(currentRow.fulfillmentApprovals).toHaveLength(0);
    expect(currentRow.fulfilledAt).toBeUndefined();
  });

  it('restricts the privacy queue to DPO and compliance roles', async () => {
    const res = await as({ ...OFFICER, role: 'superadmin' }).get('/');
    expect(res.status).toBe(403);
  });

  it('does not require exportRef for a non-export fulfilment', async () => {
    currentRow = makeRow('verified', { type: 'access' });
    const res = await as(OFFICER).post(`/${ROW_ID}/decision`).send({ action: 'fulfill' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('fulfilled');
  });

  it('keeps a terminal row immutable', async () => {
    currentRow = makeRow('fulfilled');
    const res = await as(OFFICER).post(`/${ROW_ID}/decision`).send({ action: 'reject' });
    expect(res.status).toBe(409);
    expect(currentRow.save).not.toHaveBeenCalled();
  });

  it('404s an unknown id and 404s a malformed one', async () => {
    currentRow = null;
    expect((await as(OFFICER).post(`/${ROW_ID}/decision`).send({ action: 'review' })).status).toBe(404);
    expect((await as(OFFICER).post('/nope/decision').send({ action: 'review' })).status).toBe(404);
  });

  it('400s an invented action (strict schema)', async () => {
    currentRow = makeRow('submitted');
    const res = await as(OFFICER).post(`/${ROW_ID}/decision`).send({ action: 'delete' });
    expect(res.status).toBe(400);
    expect(currentRow.save).not.toHaveBeenCalled();
  });
});

describe('POST /admin/dsr/:id/extend', () => {
  it('extends an open deadline by 15 days against the STORED dueAt', async () => {
    const base = new Date(Date.now() + 10 * DAY);
    currentRow = makeRow('in_review', { dueAt: base });
    const res = await as(OFFICER).post(`/${ROW_ID}/extend`).send({ reason: 'awaiting records' });
    expect(res.status).toBe(200);
    expect(Math.abs(new Date(currentRow.dueAt).getTime() - (base.getTime() + 15 * DAY))).toBeLessThan(5000);
    expect(currentRow.extensionReason).toBe('awaiting records');
    expect(currentRow.save).toHaveBeenCalled();
    expect(auditLog).toHaveBeenCalledWith('dsr_extended', 'off-1', expect.any(Object));
  });

  it('requires a reason', async () => {
    currentRow = makeRow('submitted');
    const res = await as(OFFICER).post(`/${ROW_ID}/extend`).send({ reason: '' });
    expect(res.status).toBe(400);
    expect(currentRow.save).not.toHaveBeenCalled();
  });

  it('extends only once', async () => {
    currentRow = makeRow('submitted', { extensionReason: 'first extension' });
    const res = await as(OFFICER).post(`/${ROW_ID}/extend`).send({ reason: 'second' });
    expect(res.status).toBe(409);
    expect(currentRow.save).not.toHaveBeenCalled();
  });

  it('refuses to extend a terminal request', async () => {
    currentRow = makeRow('fulfilled');
    const res = await as(OFFICER).post(`/${ROW_ID}/extend`).send({ reason: 'later' });
    expect(res.status).toBe(409);
    expect(currentRow.save).not.toHaveBeenCalled();
  });
});
