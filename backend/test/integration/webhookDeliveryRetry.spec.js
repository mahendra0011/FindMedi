/**
 * File 22 P1-26: manual webhook-delivery retry. The scheduler path
 * (retryDueWebhooks) already existed; this covers the human one the Studio
 * button calls — including the 409 that stops re-sending a delivered event.
 */
import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const deliveries = [];
const audit = [];

const mkDelivery = (d) => ({
  _id: `d${deliveries.length}`, status: 'pending', attempts: 0, lastError: '', nextRetryAt: null,
  save: async function save() { return this; },
  ...d,
});
deliveries.push(mkDelivery({ _id: 'del-failed', status: 'failed', event: 'billing.paid', hospitalId: 'h1' }));
deliveries.push(mkDelivery({ _id: 'del-done', status: 'delivered', event: 'lab.critical', hospitalId: 'h1' }));
deliveries.push(mkDelivery({ _id: 'del-else', status: 'failed', event: 'x', hospitalId: 'h2' }));

const { as } = await mountApp('hub', {
  '../../src/models/WebhookDelivery.js': () => ({
    default: {
      find: (f) => query(
        deliveries.filter((d) => (f?.hospitalId ? d.hospitalId === String(f.hospitalId) : true)),
      ),
      findOne: (f) => query(
        deliveries.find((d) => String(d._id) === String(f._id)
          && (!f?.hospitalId || d.hospitalId === String(f.hospitalId))) || null,
      ),
      create: async (d) => { const r = mkDelivery(d); deliveries.push(r); return r; },
    },
  }),
  // No active subscription → deliverWebhook marks the row failed without any
  // outbound fetch, so the spec never touches the network.
  '../../src/models/WebhookSubscription.js': () => ({
    default: { find: () => query([]), findById: () => query(null) },
  }),
  '../../src/models/HubIntegration.js': () => ({ default: { find: () => query([]) } }),
  '../../src/models/MappingProfile.js': () => ({ default: { find: () => query([]) } }),
  '../../src/models/IntegrationMessage.js': () => ({
    default: { find: () => query([]), create: async (d) => ({ _id: 'm1', ...d }) },
  }),
  '../../src/middleware/audit.js': () => ({
    auditLog: async (action, userId, details) => { audit.push({ action, userId, details }); return {}; },
    scrubAuditDetails: (v) => v,
  }),
});

const admin = { _id: 'a1', id: 'a1', role: 'hospital_admin', hospitalId: 'h1' };
const admin2 = { _id: 'a2', id: 'a2', role: 'hospital_admin', hospitalId: 'h2' };

describe('P1-26 webhook delivery retry', () => {
  beforeEach(() => { audit.length = 0; });

  test('lists deliveries for the tenant only', async () => {
    const r = await as(admin).get('/webhooks/deliveries');
    expect(r.status).toBe(200);
    expect(r.body.deliveries).toHaveLength(2);
    expect(r.body.deliveries.some((d) => d._id === 'del-else')).toBe(false);
  });

  test('retry 404s for an unknown delivery', async () => {
    const r = await as(admin).post('/webhooks/deliveries/nope/retry');
    expect(r.status).toBe(404);
  });

  test('retry 409s for an already-delivered event', async () => {
    const r = await as(admin).post('/webhooks/deliveries/del-done/retry');
    expect(r.status).toBe(409);
    expect(r.body.message).toMatch(/Already delivered/i);
  });

  test('retry 404s across tenants (no cross-tenant resend)', async () => {
    const r = await as(admin).post('/webhooks/deliveries/del-else/retry');
    expect(r.status).toBe(404);
    expect(deliveries.find((d) => d._id === 'del-else').status).toBe('failed');
  });

  test('retry resets a failed row to pending, audits and re-dispatches', async () => {
    const row = deliveries.find((d) => d._id === 'del-failed');
    row.status = 'failed';
    row.lastError = 'HTTP 500';

    const r = await as(admin).post('/webhooks/deliveries/del-failed/retry');
    // The response reflects the state AT the moment the retry was accepted;
    // deliverWebhook runs fire-and-forget afterwards (covered next).
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('pending');
    expect(audit.some((a) => a.action === 'webhook_delivery_retry')).toBe(true);
    expect(row.attempts === 0 || row.attempts === 1).toBe(true);
  });

  test('an inactive subscription lands the retry as failed, not silently stuck', async () => {
    await as(admin).post('/webhooks/deliveries/del-failed/retry');
    // deliverWebhook is fire-and-forget; give the microtask queue a tick
    await new Promise((r) => setTimeout(r, 30));
    const row = deliveries.find((d) => d._id === 'del-failed');
    expect(row.status).toBe('failed');
    expect(row.lastError).toMatch(/subscription inactive/i);
  });

  test('unauthenticated caller is refused', async () => {
    const r = await as(null).post('/webhooks/deliveries/del-failed/retry');
    expect(r.status).toBe(401);
  });

  test('another tenant cannot read them either', async () => {
    const r = await as(admin2).get('/webhooks/deliveries');
    expect(r.status).toBe(200);
    expect(r.body.deliveries).toHaveLength(1);
    expect(r.body.deliveries[0]._id).toBe('del-else');
  });
});
