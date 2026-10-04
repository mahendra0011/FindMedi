/**
 * INS-M-01 — insurance signed-callback replay + cross-tenant attachment.
 *
 * Part A (unit, real verifyWebhook/assertWebhookFresh): a captured payer
 * callback is single-use — replay inside the window is rejected; missing /
 * stale / forged signatures and missing secrets fail closed.
 * Part B (seeded HTTP, real insurance router): claim `documents` (attachment
 * surface) cannot be written or read across tenants.
 */
import { jest, beforeEach, describe, it, expect } from '@jest/globals';
import crypto from 'node:crypto';

// ─── Part A: signed callback replay ──────────────────────────────────────────
const redisStore = new Map();
jest.unstable_mockModule('../../src/config/redis.js', () => ({
  redisClient: {
    isOpen: true,
    set: async (k, v, opts) => {
      if (opts?.NX && redisStore.has(k)) return null;
      redisStore.set(k, v);
      return 'OK';
    },
    get: async (k) => redisStore.get(k) ?? null,
  },
  isRedisReady: () => true,
  redisPub: {}, redisSub: {}, connectRedis: jest.fn(),
  updateDeliveryBoyLocation: jest.fn(), setUserPresence: jest.fn(), removeUserPresence: jest.fn(),
  getOnlinePresence: jest.fn(), getOnlineDoctorsList: jest.fn(),
}));
jest.unstable_mockModule('../../src/config/logger.js', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const { verifyWebhook, assertWebhookFresh } = await import('../../src/services/webhookSecurity.js');

process.env.WEBHOOK_SECRET_INSPAY = 'ins-callback-secret-for-tests';

const signCallback = (raw, ts, secret = process.env.WEBHOOK_SECRET_INSPAY) =>
  crypto.createHmac('sha256', secret).update(Buffer.concat([Buffer.from(`${ts}.`, 'utf8'), Buffer.from(raw)])).digest('hex');

const mockRes = () => {
  const res = { statusCode: 200 };
  res.status = jest.fn((c) => { res.statusCode = c; return res; });
  res.json = jest.fn((b) => { res.body = b; return res; });
  return res;
};

beforeEach(() => { redisStore.clear(); });

describe('INS-M-01 signed payer callback (verifyWebhook)', () => {
  const raw = JSON.stringify({ eventId: 'evt-1', claimId: 'clm_1', status: 'Settled' });

  it('accepts a fresh signed callback exactly once, then rejects the replay', async () => {
    const ts = Math.floor(Date.now() / 1000);
    const sig = signCallback(raw, ts);
    const run = async () => {
      const req = { headers: { 'x-signature': sig, 'x-webhook-timestamp': String(ts) }, body: Buffer.from(raw) };
      const res = mockRes();
      const next = jest.fn();
      await verifyWebhook('inspay', { prefix: 'ins-test' })(req, res, next);
      return { req, res, next };
    };
    const first = await run();
    expect(first.next).toHaveBeenCalledTimes(1);
    expect(first.req.webhook?.provider).toBe('inspay');

    const second = await run();
    expect(second.next).not.toHaveBeenCalled();
    expect(second.res.statusCode).toBe(401);
    expect(second.res.body).toMatchObject({ error: 'Replayed signature' });
  });

  it('rejects a forged signature without touching the replay cache', async () => {
    const ts = Math.floor(Date.now() / 1000);
    const req = { headers: { 'x-signature': '0'.repeat(64), 'x-webhook-timestamp': String(ts) }, body: Buffer.from(raw) };
    const res = mockRes();
    const next = jest.fn();
    await verifyWebhook('inspay', { prefix: 'ins-test' })(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(redisStore.size).toBe(0);
  });

  it('rejects a callback with no timestamp (unlimited-lifetime signatures are closed)', async () => {
    const ts = Math.floor(Date.now() / 1000);
    const sig = signCallback(raw, ts);
    const req = { headers: { 'x-signature': sig }, body: Buffer.from(raw) };
    const res = mockRes();
    await verifyWebhook('inspay', { prefix: 'ins-test' })(req, res, jest.fn());
    expect(res.statusCode).toBe(401);
    expect(res.body).toMatchObject({ error: 'Missing timestamp' });
  });

  it('rejects a stale callback outside the window', async () => {
    const ts = Math.floor(Date.now() / 1000) - 3600;
    const sig = signCallback(raw, ts);
    const req = { headers: { 'x-signature': sig, 'x-webhook-timestamp': String(ts) }, body: Buffer.from(raw) };
    const res = mockRes();
    await verifyWebhook('inspay', { prefix: 'ins-test', windowSeconds: 300 })(req, res, jest.fn());
    expect(res.statusCode).toBe(401);
    expect(res.body).toMatchObject({ error: 'Expired signature' });
  });

  it('fails closed (503) when the provider secret is not configured', async () => {
    const req = { headers: { 'x-signature': 'abc', 'x-webhook-timestamp': String(Math.floor(Date.now() / 1000)) }, body: Buffer.from(raw) };
    const res = mockRes();
    await verifyWebhook('no-such-provider-xyz', { prefix: 'ins-test' })(req, res, jest.fn());
    expect(res.statusCode).toBe(503);
  });

  it('assertWebhookFresh: fresh ok, replayed + missing-timestamp rejected', async () => {
    const ts = Math.floor(Date.now() / 1000);
    const sig = `${ts}.${'a'.repeat(32)}`;
    const req = { headers: { 'x-signature': sig } };
    expect((await assertWebhookFresh(req, { prefix: 'ins-fresh' })).ok).toBe(true);
    expect(await assertWebhookFresh(req, { prefix: 'ins-fresh' })).toMatchObject({ ok: false, reason: 'replayed' });
    expect(await assertWebhookFresh({ headers: {} }, { prefix: 'ins-fresh' })).toMatchObject({ ok: false, reason: 'missing-timestamp' });
  });
});

// ─── Part B: cross-tenant claim attachment ───────────────────────────────────
const { mountApp, query } = await import('../helpers/appHarness.js');

const claimsDb = [
  {
    _id: 'clm-h1', claimId: 'CLM-H1', patientId: 'pat-1', patientName: 'Aarav Sharma',
    hospitalId: 'H1', coverageType: 'Reimbursement', claimStatus: 'Filed',
    documents: [{ name: 'bill.pdf', url: 'https://files.test/bill.pdf' }],
  },
];

const fakeInsurance = {
  find: (filter = {}) => query(claimsDb.filter((d) => Object.entries(filter).every(([k, v]) => String(d[k]) === String(v)))),
  findById: (id) => query(claimsDb.find((d) => String(d._id) === String(id)) || null),
  findByIdAndUpdate: (id, update) => {
    const doc = claimsDb.find((d) => String(d._id) === String(id));
    if (!doc) return query(null);
    Object.assign(doc, update?.$set || update || {});
    return query(doc);
  },
  countDocuments: () => Promise.resolve(claimsDb.length),
  aggregate: async () => [],
};

const { as } = await mountApp('insurance', {
  '../../src/models/Insurance.js': () => ({ default: fakeInsurance }),
  '../../src/models/Hospital.js': () => ({ default: { findById: () => query(null) } }),
  '../../src/models/Notification.js': () => ({ default: { create: async () => ({}) } }),
  '../../src/middleware/audit.js': () => ({ auditLog: async () => {} }),
  '../../src/middleware/idempotency.js': () => ({ idempotencyGuard: () => (_req, _res, next) => next() }),
  '../../src/lib/pgDualWrite.js': () => ({
    toPgEnum: () => null, ledgerRow: () => ({}), mirrorLedgerEntry: () => {},
    paymentRow: () => ({}), mirrorPayment: () => {}, billingRow: () => ({}),
    mirrorBilling: () => {}, mirrorInsurance: () => {}, mirrorCommissionConfig: () => {},
    payoutRow: () => ({}), mirrorPayout: () => {}, mirrorAtomic: async () => {},
    mirrorPayoutWithLedger: async () => {}, mirrorPaymentWithLedger: async () => {},
  }),
});

const ADMIN_H1 = { id: 'a1', _id: 'a1', role: 'hospital_admin', hospitalId: 'H1' };
const ADMIN_H2 = { id: 'a2', _id: 'a2', role: 'hospital_admin', hospitalId: 'H2' };
const PAT1 = { id: 'pat-1', _id: 'pat-1', role: 'patient' };
const PAT2 = { id: 'pat-2', _id: 'pat-2', role: 'patient' };

describe('INS-M-01 cross-tenant claim attachment (seeded HTTP)', () => {
  it('foreign tenant staff cannot read the claim (404, no data)', async () => {
    const res = await as(ADMIN_H2).get('/clm-h1');
    expect(res.status).toBe(404);
    expect(JSON.stringify(res.body)).not.toContain('bill.pdf');
  });

  it('foreign tenant staff cannot append attachments (404, no mutation)', async () => {
    const before = JSON.stringify(claimsDb[0].documents);
    const res = await as(ADMIN_H2).put('/clm-h1').send({ documents: [{ name: 'evil.pdf', url: 'https://evil.test/x' }] });
    expect(res.status).toBe(404);
    expect(JSON.stringify(claimsDb[0].documents)).toBe(before);
    expect(JSON.stringify(claimsDb[0].documents)).not.toContain('evil.pdf');
  });

  it('another patient cannot read or rewrite the claim documents', async () => {
    const get = await as(PAT2).get('/clm-h1');
    expect(get.status).toBe(404);
    const put = await as(PAT2).put('/clm-h1').send({ documents: [] });
    expect(put.status).toBe(404);
  });

  it('own tenant staff can update documents; owner patient can read', async () => {
    const put = await as(ADMIN_H1).put('/clm-h1').send({ notes: 'verified by H1' });
    expect(put.status).toBe(200);
    const get = await as(PAT1).get('/clm-h1');
    expect(get.status).toBe(200);
    expect(get.body.documents).toHaveLength(1);
  });
});
