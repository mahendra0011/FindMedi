/**
 * File 16 §16.2 + File 22 P0-9: gateway abstraction. One normalized surface
 * for every provider; routes never touch provider SDKs directly.
 * MockGateway is the test double AND the dev default. RazorpayGateway does
 * LIVE order/refund/fetch through the official SDK when credentials exist
 * (test-mode keys work end-to-end); without them every live call fails
 * closed with GATEWAY_NOT_CONFIGURED — credentials are a user-side step.
 * CashfreeGateway talks to the Cashfree PG REST API (no SDK needed).
 */
import nodeCrypto from 'crypto';

export class MockGateway {
  name = 'mock';

  async createOrder({ amount, currency = 'INR', receipt }) {
    return {
      gatewayOrderId: `order_mock_${receipt || Date.now()}`,
      amount, currency, status: 'created',
    };
  }

  async refund() {
    return { status: 'refunded', provider: 'mock' };
  }

  async fetchPayment() {
    return { status: 'captured', amount: 0 };
  }

  verifyWebhookSignature() {
    return true; // mock accepts everything, by design
  }

  normalizeEvent(payload = {}) {
    return {
      event: payload.event || 'payment.captured',
      gatewayOrderId: payload.orderId || '',
      gatewayPaymentId: payload.paymentId || `pay_mock_${Date.now()}`,
      amount: Number(payload.amount) || 0,
    };
  }
}

async function razorpayClient(keyId, keySecret) {
  const { default: Razorpay } = await import('razorpay');
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

export class RazorpayGateway {
  name = 'razorpay';

  constructor({ keyId, keySecret } = {}) {
    this.keyId = keyId || process.env.RAZORPAY_KEY_ID || '';
    this.keySecret = keySecret || process.env.RAZORPAY_KEY_SECRET || '';
  }

  get configured() {
    return Boolean(this.keyId && this.keySecret);
  }

  requireConfigured() {
    if (!this.configured) {
      const err = new Error('Razorpay credentials not configured (RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET)');
      err.code = 'GATEWAY_NOT_CONFIGURED';
      throw err;
    }
  }

  async createOrder({ amount, currency = 'INR', receipt, notes } = {}) {
    this.requireConfigured();
    const client = await razorpayClient(this.keyId, this.keySecret);
    const order = await client.orders.create({
      amount: Math.round(Number(amount) * 100), // rupees → paise
      currency, receipt: String(receipt || `rcpt_${Date.now()}`).slice(0, 40),
      notes: notes || {},
    });
    return { gatewayOrderId: order.id, amount: Number(amount), currency, status: order.status };
  }

  async refund(gatewayPaymentId, amount) {
    this.requireConfigured();
    const client = await razorpayClient(this.keyId, this.keySecret);
    const body = {};
    if (amount != null) body.amount = Math.round(Number(amount) * 100);
    const r = await client.payments.refund(gatewayPaymentId, body);
    return { status: r.status || 'refunded', refundId: r.id };
  }

  async fetchPayment(gatewayPaymentId) {
    this.requireConfigured();
    const client = await razorpayClient(this.keyId, this.keySecret);
    const p = await client.payments.fetch(gatewayPaymentId);
    return {
      status: p.status, amount: p.amount ? Number(p.amount) / 100 : 0,
      orderId: p.order_id || '', method: p.method || '',
    };
  }

  async createPaymentLink({ amount, currency = 'INR', description, customer }) {
    this.requireConfigured();
    const client = await razorpayClient(this.keyId, this.keySecret);
    const link = await client.paymentLink.create({
      amount: Math.round(Number(amount) * 100), currency,
      description: String(description || 'FindMedi payment').slice(0, 255),
      customer: customer || {},
    });
    return { url: link.short_url, linkId: link.id, status: link.status };
  }

  verifyWebhookSignature(rawBody, signature) {
    if (!this.keySecret || !signature) return false;
    const expected = nodeCrypto.createHmac('sha256', this.keySecret).update(rawBody).digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(String(signature));
    if (a.length !== b.length) return false;
    return nodeCrypto.timingSafeEqual(a, b);
  }

  normalizeEvent(payload = {}) {
    const p = payload.payload?.payment?.entity || payload.payload?.refund?.entity || {};
    return {
      event: payload.event || '',
      gatewayOrderId: p.order_id || '',
      gatewayPaymentId: p.id || '',
      amount: p.amount ? Number(p.amount) / 100 : 0,
    };
  }
}

export class CashfreeGateway {
  name = 'cashfree';

  constructor({ appId, secretKey, env } = {}) {
    this.appId = appId || process.env.CASHFREE_APP_ID || '';
    this.secretKey = secretKey || process.env.CASHFREE_SECRET_KEY || '';
    this.env = env || process.env.CASHFREE_ENV || 'sandbox';
  }

  get configured() {
    return Boolean(this.appId && this.secretKey);
  }

  requireConfigured() {
    if (!this.configured) {
      const err = new Error('Cashfree credentials not configured (CASHFREE_APP_ID/CASHFREE_SECRET_KEY)');
      err.code = 'GATEWAY_NOT_CONFIGURED';
      throw err;
    }
  }

  baseUrl() {
    return this.env === 'production' ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg';
  }

  headers() {
    return {
      'Content-Type': 'application/json',
      'x-api-version': '2023-08-01',
      'x-client-id': this.appId,
      'x-client-secret': this.secretKey,
    };
  }

  async createOrder({ amount, currency = 'INR', receipt, customer }) {
    this.requireConfigured();
    const resp = await fetch(`${this.baseUrl()}/orders`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        order_id: String(receipt || `cf_${Date.now()}`).slice(0, 50),
        order_amount: Number(amount), order_currency: currency,
        customer_details: {
          customer_id: String(customer?.id || `c_${Date.now()}`),
          customer_phone: customer?.phone || '9999999999',
          customer_email: customer?.email || undefined,
        },
      }),
    });
    if (!resp.ok) {
      const err = new Error(`Cashfree order failed: HTTP ${resp.status}`);
      err.code = 'GATEWAY_ERROR';
      throw err;
    }
    const o = await resp.json();
    return { gatewayOrderId: o.order_id, amount: Number(amount), currency, status: o.order_status || 'created', sessionId: o.payment_session_id };
  }

  async refund(gatewayOrderId, amount) {
    this.requireConfigured();
    const resp = await fetch(`${this.baseUrl()}/orders/${gatewayOrderId}/refunds`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ refund_amount: Number(amount), refund_id: `rf_${Date.now()}` }),
    });
    if (!resp.ok) {
      const err = new Error(`Cashfree refund failed: HTTP ${resp.status}`);
      err.code = 'GATEWAY_ERROR';
      throw err;
    }
    const r = await resp.json();
    return { status: r.refund_status || 'refunded', refundId: r.refund_id };
  }

  async fetchPayment(gatewayOrderId) {
    this.requireConfigured();
    const resp = await fetch(`${this.baseUrl()}/orders/${gatewayOrderId}`, { headers: this.headers() });
    if (!resp.ok) {
      const err = new Error(`Cashfree fetch failed: HTTP ${resp.status}`);
      err.code = 'GATEWAY_ERROR';
      throw err;
    }
    const o = await resp.json();
    return { status: o.order_status, amount: Number(o.order_amount) || 0, orderId: o.order_id };
  }

  verifyWebhookSignature(rawBody, signature) {
    if (!this.secretKey || !signature) return false;
    const expected = nodeCrypto.createHmac('sha256', this.secretKey).update(rawBody).digest('base64');
    const a = Buffer.from(expected);
    const b = Buffer.from(String(signature));
    if (a.length !== b.length) return false;
    return nodeCrypto.timingSafeEqual(a, b);
  }

  normalizeEvent(payload = {}) {
    const d = payload.data?.order || {};
    const type = payload.type || '';
    return {
      event: /SUCCESS|PAYMENT/i.test(type) ? 'payment.captured' : type,
      gatewayOrderId: d.order_id || '',
      gatewayPaymentId: d.cf_payment_id || payload.data?.payment?.cf_payment_id || '',
      amount: Number(d.order_amount) || 0,
    };
  }
}

export function gatewayFor(name) {
  if (name === 'razorpay') return new RazorpayGateway();
  if (name === 'cashfree') return new CashfreeGateway();
  return new MockGateway();
}
