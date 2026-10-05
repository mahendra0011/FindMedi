/**
 * ADM-M-02 (export + target history): first behavioural coverage of the
 * audit-logs router - it had GET / and /stats with no test at all, and this
 * session adds the third leg (CSV export) plus a target filter so the approval
 * pages can deep-link to one record's history.
 *
 * The properties that carry the finding:
 *   - EXPORT USES THE SAME FILTER AS THE LIST VIEW. A wider read behind the
 *     export button than behind the table would make the UI's own-logs-only
 *     rule decorative; asserted here via the non-superadmin case.
 *   - CAP + SELF-AUDIT. An uncapped export is a one-request bulk-dump channel
 *     for any audit:read holder, so rows stop at 10000 and the act of
 *     exporting writes its own `audit_exported` row - including WHICH filters
 *     the operator used (forensics for the export itself).
 *   - CSV INJECTION. The file is opened in Excel by a human; a cell starting
 *     with =, +, - or @ executes. Names and reasons are user-authored text,
 *     so every cell is defanged.
 *   - TARGET FANS OUT across every id-shaped detail key in BOTH string and
 *     ObjectId encoding (Mixed paths do not cast on query - one encoding would
 *     silently miss half the trail, which reads as "no history exists").
 *
 * ONE mount per file (harness mock registry).
 */
import { describe, it, expect, jest, beforeAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import { mountApp, query } from '../helpers/appHarness.js';

const SUPER = { _id: '64b0000000000000000000cc', role: 'superadmin' };
const OTHER = { _id: '64b0000000000000000000dd', role: 'patient' };
// Exactly 24 hex chars - the target filter's ObjectId encoding only fires for a
// real ObjectId shape, so a short constant would test half the fan-out.
const TARGET = `64b${'0'.repeat(19)}d1`;
const TARGET_USER = '64b0000000000000000000aa';

let auditRows;
let userRows;
let findFilters;
let limitCalls;
let createCalls;

// A chain that RECORDS what the route asked for (the stock query() helper
// swallows limit() args, and the cap is the point of the export test).
const chain = (value) => {
  const c = {
    select: () => c,
    populate: () => c,
    sort: () => c,
    skip: () => c,
    lean: () => c,
    limit: (n) => { limitCalls.push(n); return c; },
    then: (onF, onR) => Promise.resolve(value).then(onF, onR),
  };
  return c;
};

const auditModule = {
  find: jest.fn((filter) => { findFilters.push(filter); return chain(auditRows); }),
  countDocuments: jest.fn(async () => auditRows.length),
  create: jest.fn(async (payload) => { createCalls.push(payload); return { _id: 'row', ...payload }; }),
};
const userModule = {
  find: jest.fn(() => chain(userRows)),
  // F7: stepUpAuth (mounted on GET /export) reads the account's 2FA state.
  // This spec's user has none, so step-up skips and the export flow is the
  // behaviour under test.
  findById: jest.fn(() => chain({ twoFactorEnabled: false })),
};

let as;
beforeAll(async () => {
  ({ as } = await mountApp('auditLogs', {
    '../../src/models/AuditLog.js': () => ({ default: auditModule }),
    '../../src/models/User.js': () => ({ default: userModule }),
  }));
});
beforeEach(() => {
  findFilters = [];
  limitCalls = [];
  createCalls = [];
  auditRows = [
    {
      timestamp: new Date('2026-10-01T10:00:00Z'),
      action: 'approve_rider',
      userId: TARGET_USER,
      ip: '10.0.0.7',
      userAgent: 'FindMedi-Admin/1.0',
      details: { targetUserId: TARGET, profileId: TARGET, ip: '10.0.0.7' },
    },
    {
      timestamp: new Date('2026-10-01T11:00:00Z'),
      action: '=SUM(A1)',
      userId: TARGET_USER,
      ip: null,
      userAgent: null,
      details: {},
    },
  ];
  userRows = [{ _id: TARGET_USER, name: '=EVIL()', email: 'ops@findmedi.test', role: 'superadmin' }];
});

describe('ADM-M-02 GET /audit-logs/export', () => {
  it('requires a session', async () => {
    await as().get('/export').expect(401);
    expect(auditModule.find).not.toHaveBeenCalled();
  });

  it('returns a real CSV attachment: BOM, quoted header, rows, no-store, self-audit', async () => {
    const res = await as(SUPER).get('/export').expect(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toMatch(/^attachment; filename="audit-export-.+\.csv"$/);
    expect(res.headers['cache-control']).toBe('no-store');
    // BOM: without it Excel reads UTF-8 as ANSI and mangles every non-ASCII name.
    expect(res.text.charCodeAt(0)).toBe(0xFEFF);
    expect(res.text).toContain('"timestamp","action","actorName"');
    expect(res.text).toContain('"approve_rider"');
    // actor was enriched from the User lookup, not just the raw userId.
    expect(res.text).toContain('"ops@findmedi.test"');

    expect(createCalls).toHaveLength(1);
    expect(createCalls[0].action).toBe('audit_exported');
    expect(createCalls[0].details.rows).toBe(2);
    expect(createCalls[0].details.truncated).toBe(false);
    expect(createCalls[0].details.filter).toEqual({ action: null, target: null, search: null });
  });

  it('defangs spreadsheet formula injection (a leading =, +, - or @ executes in Excel)', async () => {
    const res = await as(SUPER).get('/export').expect(200);
    expect(res.text).toContain('"\'=EVIL()"');   // actor name
    expect(res.text).toContain('"\'=SUM(A1)"');  // action field
    expect(res.text).not.toMatch(/,"=SUM/);      // no raw formula cell survived
  });

  it('caps the dump at EXPORT_MAX_ROWS', async () => {
    await as(SUPER).get('/export').expect(200);
    expect(limitCalls).toContain(10000);
  });

  it('a non-superadmin exports ONLY their own rows - the same filter as the list view', async () => {
    await as(OTHER).get('/export').expect(200);
    expect(findFilters[0].userId).toBe(OTHER._id);
    expect(findFilters[0].$or).toBeUndefined();
  });

  it('?target= fans out across every id-shaped detail key, in string AND ObjectId form', async () => {
    await as(SUPER).get(`/export?target=${TARGET}`).expect(200);
    const clauses = findFilters[0].$or;
    expect(clauses).toHaveLength(14); // 7 detail keys x 2 encodings
    expect(clauses).toContainEqual({ 'details.profileId': TARGET });
    expect(clauses).toContainEqual({ 'details.targetUserId': new mongoose.Types.ObjectId(TARGET) });
    // the trail of the export names the filter the operator used.
    expect(createCalls[0].details.filter.target).toBe(TARGET);
  });

  it('the action filter reaches the export too', async () => {
    await as(SUPER).get('/export?action=approve_rider').expect(200);
    expect(findFilters[0].action).toBe('approve_rider');
    expect(createCalls[0].details.filter.action).toBe('approve_rider');
  });
});

describe('ADM-M-02 GET /audit-logs list with target (the deep-link the approval pages use)', () => {
  it('accepts ?target=, keeps actor enrichment, and returns the rows', async () => {
    const res = await as(SUPER).get(`/?target=${TARGET}`).expect(200);
    expect(findFilters[0].$or).toHaveLength(14);
    expect(res.body.total).toBe(2);
    expect(res.body.logs).toHaveLength(2);
    expect(res.body.logs[0].user).toMatchObject({ name: '=EVIL()', email: 'ops@findmedi.test' });
  });

  it('an unauthenticated caller still gets 401 (guard untouched)', async () => {
    await as().get(`/?target=${TARGET}`).expect(401);
  });
});
