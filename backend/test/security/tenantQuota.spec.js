/**
 * ADM-M-06 - per-tenant (per-hospital) API quotas.
 *
 * The platform throttled per USER and per IP (rateLimit.js) and nothing per
 * TENANT, so a single hospital could multiply its share of Mongo/Redis/Kafka
 * across N staff accounts until everyone else degraded. This suite pins the
 * missing aggregate dimension:
 *
 *   - GUARD: `tenantQuotaGuard` runs at the end of `protect`, keyed
 *     `rl:tenant:<hospitalId>` with the SAME Lua admission contract as the
 *     per-user limiters (at the cap the script returns the PRE-add count, so
 *     the comparison must be `>=` - the RL-01 bug class). Shared script in
 *     lib/admitLua.js: one copy, two consumers, pinned below.
 *   - FAIL-OPEN, deliberately: a quota is a capacity/abuse control, not a
 *     security gate. Redis down must never lock a hospital out of its own
 *     data (contrast authLimiter, which fails closed because it IS the
 *     brute-force defence).
 *   - NEVER THROTTLE LIFE SAFETY: SOS/emergency PATHS bypass, client-supplied
 *     body flags do not (AUTH-006 rule, mirrored here).
 *   - SUPERADMIN + TENANTLESS callers are not tenant traffic and never spend
 *     quota.
 *   - COLD-START SAFETY: config reads are readyState-gated - mongoose buffers
 *     offline queries for 10s before rejecting, which would add that latency
 *     to EVERY authenticated request; offline therefore means the built-in
 *     default, and a corrupt settings row can never become an unbounded
 *     window (normalizeQuota bounds both fields).
 *   - MANAGEMENT: superadmin CRUD at /api/tenant-quotas with an audit row per
 *     change; the route file must NOT import middleware/rateLimit.js (harness
 *     mock-registry constraint - fixed limiter export list).
 *
 * ONE mount per file; harness mounts the router at '/', so route paths here
 * are '/', '/:hospitalId' - the '/api/tenant-quotas' prefix only exists in
 * index.js.
 */
import { jest, describe, it, expect, beforeAll, beforeEach, afterEach } from '@jest/globals';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import mongoose from 'mongoose';
import { mountApp } from '../helpers/appHarness.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, '..', '..', 'src');

// ---- registered before any src import (ESM mock contract) ----
const redisMock = {
  isOpen: true,
  eval: jest.fn(),
  zCard: jest.fn(),
  incr: jest.fn(),
  scanIterator: jest.fn(),
};
let redisReady = true;
jest.unstable_mockModule('../../src/config/redis.js', () => ({
  redisClient: redisMock,
  isRedisReady: () => redisReady,
}));

// SystemSetting doubles as the config store for the service AND the route;
// rows are plain values so the DB cold path can be driven directly.
const settingStore = new Map();
jest.unstable_mockModule('../../src/models/SystemSetting.js', () => ({
  default: {
    findOne: jest.fn((q) => ({
      maxTimeMS: () => ({
        lean: async () => (settingStore.has(q.key) ? { key: q.key, value: settingStore.get(q.key) } : null),
      }),
    })),
    find: jest.fn((q) => ({
      lean: async () => [...settingStore]
        .filter(([key]) => new RegExp(q.key.$regex).test(key))
        .map(([key, value]) => ({ key, value })),
    })),
    findOneAndUpdate: jest.fn(async (filter, update) => {
      settingStore.set(filter.key, update.value);
      return { key: filter.key, value: update.value };
    }),
    deleteOne: jest.fn(async (filter) => {
      settingStore.delete(filter.key);
      return { acknowledged: true };
    }),
  },
}));

const {
  tenantQuotaGuard,
  getQuota,
  setQuota,
  deleteQuota,
  listQuotas,
  DEFAULT_QUOTA,
  _resetQuotaCache,
} = await import('../../src/services/tenantQuotaService.js');
const { buildInventory } = await import('../../scripts/lib/authzClassify.mjs');

const HOSP = '64b0000000000000000000aa';
const OTHER = '64b0000000000000000000bb';
const SUPER = { _id: '64b0000000000000000000cc', role: 'superadmin', name: 'Root' };
const ADMIN = { _id: '64b0000000000000000000dd', role: 'hospital_admin', hospitalId: HOSP };
const PATIENT = { _id: '64b0000000000000000000ee', role: 'patient' };

function mockRes() {
  const headers = {};
  return {
    statusCode: null,
    body: null,
    headers,
    setHeader(k, v) { headers[k] = String(v); },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

// readyState is a non-configurable prototype accessor - shadow it as an OWN
// property to pretend Mongo is up, delete it to restore (verified: instance
// own-property shadowing wins, deletion falls back to the prototype).
const readyDesc = Object.getOwnPropertyDescriptor(mongoose.connection, 'readyState');
function dbOnline() {
  Object.defineProperty(mongoose.connection, 'readyState', { configurable: true, get: () => 1 });
}
function restoreDb() {
  if (readyDesc) Object.defineProperty(mongoose.connection, 'readyState', readyDesc);
  else delete mongoose.connection.readyState;
}

beforeEach(() => {
  settingStore.clear();
  _resetQuotaCache();
  redisReady = true;
  redisMock.isOpen = true;
  redisMock.eval.mockReset();
  redisMock.zCard.mockReset();
  redisMock.scanIterator.mockReset();
});
afterEach(restoreDb);

describe('tenantQuotaGuard', () => {
  const guard = (req) => {
    const res = mockRes();
    const next = jest.fn();
    return { res, next, run: () => tenantQuotaGuard(req, res, next) };
  };

  it('passes tenantless requests through without spending a bucket', async () => {
    const t = guard({ user: { role: 'patient' }, originalUrl: '/api/appointments' });
    await t.run();
    expect(t.next).toHaveBeenCalledTimes(1);
    expect(redisMock.eval).not.toHaveBeenCalled();
  });

  it('exempts superadmin even when the account carries a hospital link', async () => {
    const t = guard({ user: { role: 'superadmin', hospitalId: HOSP }, originalUrl: '/api/users' });
    await t.run();
    expect(t.next).toHaveBeenCalledTimes(1);
    expect(redisMock.eval).not.toHaveBeenCalled();
  });

  it('never counts life-safety paths, no matter how full the window is', async () => {
    for (const url of ['/api/emergency-sos/123', '/api/emergency/1', '/api/sos/start']) {
      redisMock.eval.mockResolvedValue(999);
      const t = guard({ user: { role: 'doctor', hospitalId: HOSP }, originalUrl: url });
      await t.run();
      expect(t.next).toHaveBeenCalledTimes(1);
    }
    expect(redisMock.eval).not.toHaveBeenCalled();
  });

  it('does not let a client-supplied emergency flag bypass the quota', async () => {
    redisMock.eval.mockResolvedValue(DEFAULT_QUOTA.max);
    const t = guard({
      user: { role: 'doctor', hospitalId: HOSP },
      originalUrl: '/api/records',
      body: { isEmergency: true },
    });
    await t.run();
    expect(t.next).not.toHaveBeenCalled();
    expect(t.res.statusCode).toBe(429);
  });

  it('fails OPEN when Redis is down - availability beats capacity control', async () => {
    redisReady = false;
    const t = guard({ user: { role: 'doctor', hospitalId: HOSP }, originalUrl: '/api/records' });
    await t.run();
    expect(t.next).toHaveBeenCalledTimes(1);
    expect(redisMock.eval).not.toHaveBeenCalled();
  });

  it('fails open when the Redis call itself throws', async () => {
    redisMock.eval.mockRejectedValue(new Error('ECONNRESET'));
    const t = guard({ user: { role: 'doctor', hospitalId: HOSP }, originalUrl: '/api/records' });
    await t.run();
    expect(t.next).toHaveBeenCalledTimes(1);
    expect(t.res.statusCode).toBeNull();
  });

  it('admits under quota with tenant-scoped keys and limit headers', async () => {
    redisMock.eval.mockResolvedValue(42);
    const t = guard({ user: { role: 'doctor', hospitalId: HOSP }, originalUrl: '/api/records' });
    await t.run();
    expect(t.next).toHaveBeenCalledTimes(1);
    expect(t.res.headers['X-TenantQuota-Limit']).toBe(String(DEFAULT_QUOTA.max));
    expect(t.res.headers['X-TenantQuota-Remaining']).toBe(String(DEFAULT_QUOTA.max - 42));
    const call = redisMock.eval.mock.calls[0];
    expect(call[1].keys[0]).toBe(`rl:tenant:${HOSP}`);
  });

  it('rejects AT the cap (the RL-01 >= contract) with 429 + Retry-After', async () => {
    redisMock.eval.mockResolvedValue(DEFAULT_QUOTA.max);
    const t = guard({ user: { role: 'nurse', hospitalId: HOSP }, originalUrl: '/api/beds' });
    await t.run();
    expect(t.next).not.toHaveBeenCalled();
    expect(t.res.statusCode).toBe(429);
    expect(t.res.body.error).toBe('TENANT_QUOTA_EXCEEDED');
    expect(t.res.body.retryAfterSeconds).toBe(60);
    expect(t.res.headers['Retry-After']).toBe('60');
    expect(t.res.headers['X-TenantQuota-Remaining']).toBe('0');
  });

  it('honours a per-hospital override written through setQuota', async () => {
    await setQuota(HOSP, { windowMs: 30_000, max: 5 }, 'root');
    redisMock.eval.mockResolvedValue(5);
    const t = guard({ user: { role: 'doctor', hospitalId: HOSP }, originalUrl: '/api/records' });
    await t.run();
    expect(t.res.statusCode).toBe(429);
    expect(t.res.headers['X-TenantQuota-Limit']).toBe('5');
    expect(t.res.headers['Retry-After']).toBe('30');
    expect(settingStore.get(`tenantQuota:${HOSP}`)).toEqual({ windowMs: 30_000, max: 5 });
  });
});

describe('quota configuration', () => {
  it('uses the built-in default when nothing is configured', async () => {
    expect(await getQuota(HOSP)).toEqual(DEFAULT_QUOTA);
    expect(DEFAULT_QUOTA).toEqual({ windowMs: 60_000, max: 1_000 });
  });

  it('reads a hospital override from SystemSetting on a cold cache when Mongo is up', async () => {
    settingStore.set(`tenantQuota:${OTHER}`, { windowMs: 45_000, max: 9 });
    dbOnline();
    _resetQuotaCache();
    expect(await getQuota(OTHER)).toEqual({ windowMs: 45_000, max: 9 });
  });

  it('falls back to the platform default override when the hospital has none', async () => {
    settingStore.set('tenantQuota:default', { windowMs: 120_000, max: 42 });
    dbOnline();
    expect(await getQuota(OTHER)).toEqual({ windowMs: 120_000, max: 42 });
  });

  it('ignores a corrupt settings row instead of trusting an unbounded window', async () => {
    settingStore.set(`tenantQuota:${HOSP}`, { windowMs: -1, max: 'lots' });
    dbOnline();
    _resetQuotaCache();
    expect(await getQuota(HOSP)).toEqual(DEFAULT_QUOTA);
  });

  it('refuses out-of-bounds quotas at the writer', async () => {
    await expect(setQuota(HOSP, { windowMs: 10, max: 5 }, 'root')).rejects.toThrow('Invalid quota');
    await expect(setQuota(HOSP, { windowMs: 60_000, max: 0 }, 'root')).rejects.toThrow('Invalid quota');
    await expect(setQuota(HOSP, { windowMs: 9_999_999, max: 5 }, 'root')).rejects.toThrow('Invalid quota');
    expect(settingStore.size).toBe(0);
  });

  it('setQuota persists + seeds the cache; deleteQuota reverts to default', async () => {
    await setQuota(HOSP, { windowMs: 15_000, max: 7 }, 'root');
    expect(settingStore.get(`tenantQuota:${HOSP}`)).toEqual({ windowMs: 15_000, max: 7 });
    expect(await getQuota(HOSP)).toEqual({ windowMs: 15_000, max: 7 });

    await deleteQuota(HOSP);
    expect(settingStore.has(`tenantQuota:${HOSP}`)).toBe(false);
    expect(await getQuota(HOSP)).toEqual(DEFAULT_QUOTA);
  });

  it('changing the platform default invalidates every cached tenant', async () => {
    await setQuota(HOSP, { windowMs: 60_000, max: 11 }, 'root');
    expect(await getQuota(OTHER)).toEqual(DEFAULT_QUOTA);

    settingStore.set('tenantQuota:default', { windowMs: 60_000, max: 22 });
    await setQuota('default', { windowMs: 60_000, max: 22 }, 'root');
    dbOnline();
    // OTHER had cached the built-in default - the default write must have
    // dropped it, or the new platform default would never take effect.
    expect(await getQuota(OTHER)).toEqual({ windowMs: 60_000, max: 22 });
  });

  it('lists default, overrides and live window usage (SCAN, not KEYS)', async () => {
    settingStore.set('tenantQuota:default', { windowMs: 60_000, max: 50 });
    settingStore.set(`tenantQuota:${OTHER}`, { windowMs: 30_000, max: 5 });
    settingStore.set(`tenantQuota:${HOSP}`, { windowMs: 90_000, max: 9 });
    dbOnline();
    redisMock.scanIterator.mockImplementation(() => (async function* () {
      yield [`rl:tenant:${HOSP}`, `rl:tenant:${OTHER}`];
    })());
    redisMock.zCard.mockResolvedValueOnce(4).mockResolvedValueOnce(6);

    const listing = await listQuotas();
    expect(listing.default).toEqual({ windowMs: 60_000, max: 50 });
    expect(listing.defaultSource).toBe('override');
    expect(listing.overrides.map((o) => o.hospitalId)).toEqual([HOSP, OTHER].sort());
    expect(listing.usage).toEqual({ [HOSP]: 4, [OTHER]: 6 });
  });

  it('degrades to an empty usage map when Redis is unavailable', async () => {
    redisReady = false;
    const listing = await listQuotas();
    expect(listing.usage).toEqual({});
    expect(listing.default).toEqual(DEFAULT_QUOTA);
    expect(listing.defaultSource).toBe('builtin');
  });
});

describe('management API /api/tenant-quotas', () => {
  const auditStub = { create: jest.fn(async (doc) => ({ _id: '64b0000000000000000000f1', ...doc })) };
  let as;

  beforeAll(async () => {
    ({ as } = await mountApp('tenantQuotas', {
      '../../src/models/AuditLog.js': () => ({ default: auditStub }),
    }));
  });

  beforeEach(() => auditStub.create.mockClear());

  it('is 401 for an unauthenticated caller on the listing', async () => {
    const r = await as().get('/');
    expect(r.status).toBe(401);
  });

  it.each([['hospital_admin', ADMIN], ['patient', PATIENT]])('is 403 for role %s', async (_role, user) => {
    const r = await as(user).get('/');
    expect(r.status).toBe(403);
  });

  it('returns default + overrides + usage for a superadmin', async () => {
    const r = await as(SUPER).get('/');
    expect(r.status).toBe(200);
    expect(r.body.default).toEqual(DEFAULT_QUOTA);
    expect(r.body.defaultSource).toBe('builtin');
    expect(Array.isArray(r.body.overrides)).toBe(true);
    expect(typeof r.body.usage).toBe('object');
  });

  it('rejects a quota body that is out of bounds (zod)', async () => {
    const r = await as(SUPER).put(`/${HOSP}`).send({ windowMs: 60_000 });
    expect(r.status).toBe(400);
    const r2 = await as(SUPER).put(`/${HOSP}`).send({ windowMs: 60_000, max: 0 });
    expect(r2.status).toBe(400);
  });

  it('rejects a hospitalId that is neither ObjectId nor "default"', async () => {
    const r = await as(SUPER).put('/not-a-hospital').send({ windowMs: 60_000, max: 10 });
    expect(r.status).toBe(400);
    expect(r.body.message).toContain('ObjectId');
    const r2 = await as(SUPER).delete('/also-bad');
    expect(r2.status).toBe(400);
  });

  it('PUT upserts the override and writes an audit row', async () => {
    const r = await as(SUPER).put(`/${HOSP}`).send({ windowMs: 120_000, max: 77 });
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ hospitalId: HOSP, windowMs: 120_000, max: 77 });
    expect(settingStore.get(`tenantQuota:${HOSP}`)).toEqual({ windowMs: 120_000, max: 77 });

    expect(auditStub.create).toHaveBeenCalledTimes(1);
    const row = auditStub.create.mock.calls[0][0];
    expect(row.action).toBe('set_tenant_quota');
    expect(row.details.targetHospitalId).toBe(HOSP);
    expect(row.details.max).toBe(77);
  });

  it('PUT /default updates the platform default with an audit row', async () => {
    const r = await as(SUPER).put('/default').send({ windowMs: 60_000, max: 250 });
    expect(r.status).toBe(200);
    expect(settingStore.get('tenantQuota:default')).toEqual({ windowMs: 60_000, max: 250 });
    const row = auditStub.create.mock.calls[0][0];
    expect(row.action).toBe('set_tenant_quota');
    expect(row.details.targetHospitalId).toBe('default');
  });

  it('DELETE removes the override and writes an audit row', async () => {
    await setQuota(HOSP, { windowMs: 60_000, max: 5 }, 'root');
    const r = await as(SUPER).delete(`/${HOSP}`);
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ hospitalId: HOSP, deleted: true });
    expect(settingStore.has(`tenantQuota:${HOSP}`)).toBe(false);
    const row = auditStub.create.mock.calls[0][0];
    expect(row.action).toBe('delete_tenant_quota');
    expect(row.details.targetHospitalId).toBe(HOSP);
  });
});

describe('wiring + inventory pins', () => {
  const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');

  it('protect ends in the tenant quota guard (every authenticated tenant request is counted)', () => {
    const src = read(path.join('middleware', 'auth.js'));
    expect(src).toContain('tenantQuotaGuard(req, res, next)');
    expect(src).toContain("from '../services/tenantQuotaService.js'");
  });

  it('the app mounts the management API and normalizes its prefix-less form', () => {
    const src = read('index.js');
    expect(src).toContain("app.use('/api/tenant-quotas', tenantQuotaRoutes)");
    expect(src).toContain("'/tenant-quotas'");
  });

  it('the admission script has exactly one copy, shared by limiters and quota', () => {
    expect(read(path.join('lib', 'admitLua.js'))).toContain('export const ADMIT_LUA');
    expect(read(path.join('middleware', 'rateLimit.js'))).toContain("from '../lib/admitLua.js'");
    expect(read(path.join('services', 'tenantQuotaService.js'))).toContain("from '../lib/admitLua.js'");
  });

  it('the quota route never imports rateLimit.js (harness mock-registry constraint)', () => {
    expect(read(path.join('routes', 'tenantQuotas.js'))).not.toMatch(/from\s+['"][^'"]*rateLimit/);
  });

  it('the guard fails open by design - no failClosed path exists in the quota service', () => {
    expect(read(path.join('services', 'tenantQuotaService.js'))).not.toContain('failClosed');
  });

  it('all three management routes are classified role-gated (authz manifest)', () => {
    const rows = buildInventory(path.resolve(SRC, 'routes')).filter((r) => r.file === 'tenantQuotas.js');
    expect(rows).toHaveLength(3);
    for (const row of rows) expect(row.tag).toBe('role');
  });
});
