/**
 * File 22 P1-25/26/27: kiosk modes, webhook signing, telephony hardening.
 */
import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';
import nodeCrypto from 'node:crypto';

// ─── kiosk ──────────────────────────────────────────────────────────────────
// Shared Billing stub: unstable_mockModule is per-FILE, so every mount in
// this file MUST use the same factory (a second shape shadows the first).
const billingFindOne = jestApi.fn();
const billingFind = jestApi.fn();
const sharedBillingStub = () => ({
  default: {
    findOne: (...a) => billingFindOne(...a),
    find: (...a) => billingFind(...a),
  },
});
const patients = [
  { _id: 'p1', phone: '9811111111', dateOfBirth: new Date('1990-01-01'), userId: 'u1' },
];
const bills = [
  { _id: 'b1', invoiceId: 'INV-1', patient: 'Ram', patientId: 'u1', amount: 1000, paid: 0, balance: 1000, status: 'Pending', hospitalId: 'h1' },
];
const users = [{ _id: 'u1', phone: '9811111111' }];

billingFindOne.mockImplementation((f) => query(bills.find((b) => b.invoiceId === f.invoiceId) || null));
billingFind.mockImplementation(() => query([]));

const { as: asKiosk } = await mountApp('kiosk', {
  '../../src/models/Patient.js': () => ({
    default: {
      findOne: (f) => query(patients.find((p) => !f.phone || p.phone === String(f.phone)) || null),
      create: async (d) => ({ _id: 'np', ...d }),
    },
  }),
  '../../src/models/Token.js': () => ({ default: { countDocuments: async () => 3, findOne: () => query(null) } }),
  '../../src/models/Queue.js': () => ({ default: { findOne: () => query(null) } }),
  '../../src/models/QueueTicket.js': () => ({ default: { create: async (d) => ({ _id: 't1', ...d }) } }),
  '../../src/models/Billing.js': sharedBillingStub,
  '../../src/models/User.js': () => ({
    default: { findById: (id) => query(users.find((u) => String(u._id) === String(id)) || null) },
  }),
  '../../src/models/Payment.js': () => ({ default: { create: async (d) => ({ _id: 'pay1', ...d }) } }),
  '../../src/models/LabOrder.js': () => ({ default: { find: () => query([]) } }),
  '../../src/models/AuditLog.js': () => ({ default: { create: async () => ({}) } }),
});

describe('P1-25 kiosk modes', () => {
  test('duplicate phone+dob routes to reception (not a second file)', async () => {
    const r = await asKiosk(null).post('/register').send({ hospitalId: 'h1', name: 'Ram', phone: '9811111111', dob: '1990-01-01' });
    expect(r.status).toBe(409);
    expect(r.body.code).toBe('DUPLICATE_ROUTE_RECEPTION');
  });

  test('pay validates invoice+phone then mints a mock intent', async () => {
    const ok = await asKiosk(null).post('/pay').send({ invoiceId: 'INV-1', phone: '9811111111', gateway: 'mock' });
    expect(ok.status).toBe(201);
    expect(ok.body.amount).toBe(1000);
    const wrong = await asKiosk(null).post('/pay').send({ invoiceId: 'INV-1', phone: '9800000000' });
    expect(wrong.status).toBe(403);
  });

  test('report-collect gates on phone+dob match', async () => {
    const miss = await asKiosk(null).post('/report-collect').send({ phone: '9811111111', dob: '2000-01-01' });
    expect(miss.status).toBe(404);
    const hit = await asKiosk(null).post('/report-collect').send({ phone: '9811111111', dob: '1990-01-01' });
    expect(hit.status).toBe(200);
    expect(Array.isArray(hit.body.ready)).toBe(true);
  });
});

// ─── hub signing ────────────────────────────────────────────────────────────
const { verifyWebhookPayload } = await import('../../src/routes/hub.js');

describe('P1-26 webhook signing contract', () => {
  const secret = 's3cret';
  const body = '{"event":"billing.paid"}';
  const sign = (ts) => nodeCrypto.createHmac('sha256', secret).update(`${ts}.${body}`).digest('hex');

  test('fresh + valid verifies', () => {
    const ts = String(Math.floor(Date.now() / 1000));
    expect(verifyWebhookPayload(secret, ts, body, sign(ts)).ok).toBe(true);
  });

  test('stale timestamps rejected even with valid signature', () => {
    const ts = String(Math.floor(Date.now() / 1000) - 9999);
    expect(verifyWebhookPayload(secret, ts, body, sign(ts))).toEqual({ ok: false, reason: 'stale' });
  });

  test('tampered body rejected', () => {
    const ts = String(Math.floor(Date.now() / 1000));
    expect(verifyWebhookPayload(secret, ts, `${body}tampered`, sign(ts)).ok).toBe(false);
  });
});

// ─── telephony ──────────────────────────────────────────────────────────────
process.env.TELEPHONY_WEBHOOK_SECRET = 'tel-secret';

const queues = [];
const interactions = [];
const { as: asCc } = await mountApp('contactCenter', {
  '../../src/models/Interaction.js': () => ({
    default: {
      find: () => query(interactions),
      create: async (d) => { const r = { _id: 'i1', ...d }; interactions.push(r); return r; },
      findByIdAndUpdate: async () => null,
      updateMany: async () => ({ modifiedCount: 0 }),
    },
  }),
  '../../src/models/CallQueue.js': () => ({
    default: {
      find: () => query(queues),
      create: async (d) => { const r = { _id: 'q1', status: 'waiting', ...d }; queues.push(r); return r; },
      findByIdAndUpdate: async () => null,
      findOneAndUpdate: async () => null,
      countDocuments: async () => 0,
    },
  }),
  '../../src/models/AgentSession.js': () => ({
    default: { findOneAndUpdate: async (f, u) => ({ _id: 's1', ...u.$set }), countDocuments: async () => 0 },
  }),
  '../../src/models/OutboundCampaign.js': () => ({ default: { find: () => query([]) } }),
  '../../src/models/WorkTask.js': () => ({ default: { create: async (d) => ({ _id: 't1', ...d }) } }),
  '../../src/models/DndEntry.js': () => ({
    default: {
      find: () => query([]),
      findOne: (f) => query(f.phone === '9811111111' ? { phone: f.phone } : null),
      findOneAndUpdate: async (f, u) => ({ _id: 'd1', ...u.$set }),
      findOneAndDelete: async () => ({}),
    },
  }),
  '../../src/models/Patient.js': () => ({ default: { findOne: () => query(null) } }),
  '../../src/models/PatientFlag.js': () => ({ default: { find: () => query([]) } }),
  '../../src/models/Billing.js': sharedBillingStub,
  '../../src/models/AuditLog.js': () => ({ default: { create: async () => ({}) } }),
});

const hmac = (secret, raw) => nodeCrypto.createHmac('sha256', secret).update(raw).digest('hex');

describe('P1-27 telephony hardening', () => {
  test('unsigned webhook is rejected', async () => {
    const r = await asCc(null).post('/telephony/webhook').send({ hospitalId: 'h1', phone: '9800000000', event: 'ring' });
    expect(r.status).toBe(401);
  });

  test('stale timestamp is rejected even with valid signature', async () => {
    const body = JSON.stringify({ hospitalId: 'h1', phone: '9800000000', event: 'ring' });
    const ts = String(Math.floor(Date.now() / 1000) - 9999);
    const r = await asCc(null).post('/telephony/webhook').set('x-provider-signature', hmac('tel-secret', Buffer.from(body))).set('x-provider-timestamp', ts).set('Content-Type', 'application/json').send(body);
    expect(r.status).toBe(401);
    expect(r.body.code).toBe('STALE_TIMESTAMP');
  });

  test('DND number is flagged on the queue entry', async () => {
    const body = JSON.stringify({ hospitalId: 'h1', phone: '9811111111', event: 'ring' });
    const ts = String(Math.floor(Date.now() / 1000));
    const r = await asCc(null).post('/telephony/webhook').set('x-provider-signature', hmac('tel-secret', Buffer.from(body))).set('x-provider-timestamp', ts).set('Content-Type', 'application/json').send(body);
    expect(r.status).toBe(200);
    expect(r.body.dnd).toBe(true);
    expect(queues[queues.length - 1].dndHit).toBe(true);
  });

  test('screen-pop returns match context', async () => {
    const agent = { _id: 'ag', id: 'ag', role: 'receptionist', hospitalId: 'h1' };
    const r = await asCc(agent).get('/screen-pop?phone=9811111111');
    expect(r.status).toBe(200);
    expect(r.body.dnd).toBe(true);
  });
});
