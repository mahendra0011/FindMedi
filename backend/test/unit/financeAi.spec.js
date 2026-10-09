/**
 * File 16 §16.2 + File 17 §17.4 + File 18 §18.3: gateway + AI + webhook
 * signing pure-logic tests. No DB, no network.
 */
import nodeCrypto from 'crypto';
import { MockGateway, RazorpayGateway, CashfreeGateway, gatewayFor } from '../../src/lib/gateways.js';
import { redactPhi, noShowScore, forecastDemand } from '../../src/lib/aiGateway.js';

describe('MockGateway', () => {
  test('creates an order shape', async () => {
    const gw = new MockGateway();
    const o = await gw.createOrder({ amount: 100, receipt: 'r1' });
    expect(o.gatewayOrderId).toMatch(/order_mock_/);
    expect(o.amount).toBe(100);
  });
  test('normalizes events', () => {
    const gw = new MockGateway();
    const e = gw.normalizeEvent({ orderId: 'o1', paymentId: 'p1', amount: 50 });
    expect(e.gatewayOrderId).toBe('o1');
  });
});

describe('RazorpayGateway', () => {
  test('refuses live orders without credentials', async () => {
    const gw = new RazorpayGateway({ keyId: '', keySecret: '' });
    await expect(gw.createOrder({ amount: 100 })).rejects.toMatchObject({ code: 'GATEWAY_NOT_CONFIGURED' });
    await expect(gw.refund('pay_1', 100)).rejects.toMatchObject({ code: 'GATEWAY_NOT_CONFIGURED' });
  });
  test('verifies signatures with timing-safe compare', () => {
    const gw = new RazorpayGateway({ keyId: 'k', keySecret: 's3cret' });
    const body = Buffer.from('{"a":1}');
    const sig = nodeCrypto.createHmac('sha256', 's3cret').update(body).digest('hex');
    expect(gw.verifyWebhookSignature(body, sig)).toBe(true);
    const bad = `${sig.slice(0, -1)}${sig.endsWith('0') ? '1' : '0'}`;
    expect(gw.verifyWebhookSignature(body, bad)).toBe(false);
  });
  test('normalizes razorpay payload paise→rupees', () => {
    const gw = new RazorpayGateway({ keyId: 'k', keySecret: 's' });
    const e = gw.normalizeEvent({
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_1', order_id: 'order_1', amount: 50000 } } },
    });
    expect(e.amount).toBe(500);
    expect(e.gatewayPaymentId).toBe('pay_1');
  });
});

describe('CashfreeGateway', () => {
  test('refuses live calls without credentials', async () => {
    const gw = new CashfreeGateway({ appId: '', secretKey: '' });
    await expect(gw.createOrder({ amount: 100 })).rejects.toMatchObject({ code: 'GATEWAY_NOT_CONFIGURED' });
  });
  test('verifies base64 HMAC signatures', () => {
    const gw = new CashfreeGateway({ appId: 'a', secretKey: 's3cret' });
    const body = Buffer.from('{"x":1}');
    const sig = nodeCrypto.createHmac('sha256', 's3cret').update(body).digest('base64');
    expect(gw.verifyWebhookSignature(body, sig)).toBe(true);
    expect(gw.verifyWebhookSignature(body, 'bogus')).toBe(false);
  });
  test('gatewayFor resolves all three providers', () => {
    expect(gatewayFor('razorpay').name).toBe('razorpay');
    expect(gatewayFor('cashfree').name).toBe('cashfree');
    expect(gatewayFor('nope').name).toBe('mock');
  });
});

describe('aiGateway.redactPhi', () => {
  test('redacts emails and phones', () => {
    const { text, redacted } = redactPhi('call me at 9876543210 or a@b.com');
    expect(redacted).toBe(true);
    expect(text).not.toMatch(/9876543210|a@b\.com/);
  });
  test('clean text passes through', () => {
    const { text, redacted } = redactPhi('Diagnosis: fracture');
    expect(redacted).toBe(false);
    expect(text).toBe('Diagnosis: fracture');
  });
});

describe('noShowScore + forecastDemand', () => {
  test('repeat no-shows score high', () => {
    expect(noShowScore({ pastNoShows: 4, pastVisits: 5 })).toBeGreaterThan(50);
    expect(noShowScore({ pastNoShows: 0, pastVisits: 5 })).toBeLessThan(30);
  });
  test('forecast averages', () => {
    expect(forecastDemand([20, 30]).forecast).toBe(25);
    expect(forecastDemand([]).basis).toBe('no-data');
  });
});
