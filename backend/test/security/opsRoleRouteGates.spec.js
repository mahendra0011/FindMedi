/**
 * 8.md 1 over HTTP: the console gates, decided by a real middleware chain.
 *
 * authMatrix.spec.js proves HOW the middlewares decide; this file proves the
 * ROUTES actually carry the ops-role allow-lists of 8.md 1 - over a real
 * Express app, through the harness's production middleware chain, with only
 * `protect` (identity from a header) and the models substituted.
 *
 * Two gates are exercised because they are structurally different:
 *   - adminApplications: a router.use() gate that owns the whole KYC queue;
 *   - categories: a per-route gate where several consoles share one file and
 *     only ONE route (the anonymous public catalogue) may stay open.
 *
 * The rest of the console's gates are pinned by source in opsRoles.spec.js;
 * the behavioural contract for what each role can DO lives with its feature
 * spec (adminApplications.spec.js, categoriesPublic.spec.js, ...).
 */
import { jest as jestApi, describe, it, expect, beforeEach } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const USER = (id, role) => ({ _id: id, id, role });

const SUPERADMIN = USER('7000000000000000000000f1', 'superadmin');
const KYC_REVIEWER = USER('7000000000000000000000f2', 'kyc_reviewer');
const CATALOG_MANAGER = USER('7000000000000000000000f3', 'catalog_manager');
const FINANCE_ADMIN = USER('7000000000000000000000f4', 'finance_admin');
const MODERATOR = USER('7000000000000000000000f5', 'moderator');
const SUPPORT_AGENT = USER('7000000000000000000000f6', 'support_agent');
const COMPLIANCE_OFFICER = USER('7000000000000000000000f7', 'compliance_officer');
const HOSPITAL_ADMIN = USER('7000000000000000000000f8', 'hospital_admin');
const PATIENT = USER('7000000000000000000000f9', 'patient');

const appFind = jestApi.fn();
const categoryFind = jestApi.fn();

// ── adminApplications (the KYC queue) ───────────────────────────────────────
jestApi.unstable_mockModule('../../src/models/ProviderApplication.js', () => ({
  __esModule: true,
  default: {
    find: (...args) => { appFind(...args); return query([]); },
    findById: async () => null,
    countDocuments: async () => 0,
  },
}));
jestApi.unstable_mockModule('../../src/models/ProviderDocument.js', () => ({
  __esModule: true, default: { find: () => query([]) },
}));
jestApi.unstable_mockModule('../../src/models/ProviderTypeConfig.js', () => ({
  __esModule: true, default: { findOne: async () => null },
}));
jestApi.unstable_mockModule('../../src/models/Notification.js', () => ({
  __esModule: true, default: { create: async () => ({}) },
}));
jestApi.unstable_mockModule('../../src/models/Provider.js', () => ({
  __esModule: true, default: { create: async (body) => ({ _id: 'p1', ...body }) },
}));
jestApi.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLog: async () => undefined,
}));

// ── categories (catalog console) ────────────────────────────────────────────
jestApi.unstable_mockModule('../../src/models/Category.js', () => ({
  __esModule: true,
  default: {
    find: (...args) => { categoryFind(...args); return query([]); },
    countDocuments: async () => 0,
    findByIdAndDelete: async () => ({ _id: 'c1' }),
  },
}));
jestApi.unstable_mockModule('../../src/config/redis.js', () => ({
  __esModule: true,
  default: {},
  getCache: async () => null,
  setCache: async () => undefined,
  flushCachePattern: async () => undefined,
}));

const applications = await mountApp('adminApplications', {});
const categories = await mountApp('categories', {});

beforeEach(() => {
  appFind.mockClear();
  categoryFind.mockClear();
});

describe('8.md 2 · the KYC queue is reachable by exactly superadmin + kyc_reviewer', () => {
  it('lets a kyc_reviewer into the review queue', async () => {
    const res = await applications.as(KYC_REVIEWER).get('/');
    expect(res.status).toBe(200);
    expect(appFind).toHaveBeenCalled();
  });

  it('still lets superadmin in', async () => {
    const res = await applications.as(SUPERADMIN).get('/');
    expect(res.status).toBe(200);
  });

  it.each([
    ['finance_admin', FINANCE_ADMIN],
    ['moderator', MODERATOR],
    ['support_agent', SUPPORT_AGENT],
    ['compliance_officer', COMPLIANCE_OFFICER],
    ['catalog_manager', CATALOG_MANAGER],
    ['hospital_admin', HOSPITAL_ADMIN],
    ['patient', PATIENT],
  ])('refuses a %s - the queue is not their console', async (_role, user) => {
    const res = await applications.as(user).get('/');
    expect(res.status).toBe(403);
    expect(appFind).not.toHaveBeenCalled();
  });

  it('refuses an unauthenticated caller before the model is touched', async () => {
    const res = await applications.as().get('/');
    expect(res.status).toBe(401);
    expect(appFind).not.toHaveBeenCalled();
  });

  it('holds the gate on the decision route too, not just the list', async () => {
    const path = '/7000000000000000000000c3/decision';
    expect((await applications.as(FINANCE_ADMIN).post(path).send({ decision: 'approve' })).status).toBe(403);
    expect((await applications.as(MODERATOR).post(path).send({ decision: 'approve' })).status).toBe(403);
    // The reviewer reaches the handler (its own validation/404 answers, never 403).
    const asReviewer = await applications.as(KYC_REVIEWER).post(path).send({ decision: 'approve' });
    expect(asReviewer.status).not.toBe(403);
  });
});

describe('8.md 4 · the category tree is reachable by exactly superadmin + catalog_manager', () => {
  it('lets a catalog_manager list categories', async () => {
    const res = await categories.as(CATALOG_MANAGER).get('/');
    expect(res.status).toBe(200);
    expect(categoryFind).toHaveBeenCalled();
  });

  it('still lets superadmin in', async () => {
    const res = await categories.as(SUPERADMIN).get('/');
    expect(res.status).toBe(200);
  });

  it.each([
    ['kyc_reviewer', KYC_REVIEWER],
    ['finance_admin', FINANCE_ADMIN],
    ['support_agent', SUPPORT_AGENT],
    ['hospital_admin', HOSPITAL_ADMIN],
    ['patient', PATIENT],
  ])('refuses a %s', async (_role, user) => {
    const res = await categories.as(user).get('/');
    expect(res.status).toBe(403);
    expect(categoryFind).not.toHaveBeenCalled();
  });

  it('keeps the anonymous catalogue open - least privilege does not mean "closed"', async () => {
    const res = await categories.as().get('/public');
    expect(res.status).toBe(200);
  });

  it('holds the gate on the writes as well as the list', async () => {
    const write = await categories.as(FINANCE_ADMIN).post('/').send({ name: 'Nope', type: 'test' });
    expect(write.status).toBe(403);
    // Same file, same gate: the reviewer's own console role is not a catalogue role.
    expect((await categories.as(KYC_REVIEWER).delete('/c1')).status).toBe(403);
    expect((await categories.as(CATALOG_MANAGER).delete('/c1')).status).toBe(200);
  });
});
