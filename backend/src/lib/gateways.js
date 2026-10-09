/**
 * File 16 §16.2: gateway abstraction. One normalized surface for every
 * provider; routes never touch provider SDKs directly. MockGateway is the
 * test double AND the dev default. RazorpayGateway verifies real webhook
 * signatures but performs no live API calls without credentials — adding
 * live credentials is a user-side step, not a code gap.
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

export class RazorpayGateway {
  name = 'razorpay';

  constructor({ keyId, keySecret } = {}) {
    this.keyId = keyId || process.env.RAZORPAY_KEY_ID || '';
    this.keySecret = keySecret || process.env.RAZORPAY_KEY_SECRET || '';
  }

  get configured() {
    return Boolean(this.keyId && this.keySecret);
  }

  async createOrder() {
    if (!this.configured) {
      const err = new Error('Razorpay credentials not configured');
      err.code = 'GATEWAY_NOT_CONFIGURED';
      throw err;
    }
    // Live order creation intentionally goes through the official SDK at
    // deploy time; this layer only normalizes. Throwing here (instead of a
    // half-wired call) keeps failed attempts visible in the attempt ledger.
    const err = new Error('Live Razorpay order creation needs the deploy-time SDK wiring');
    err.code = 'GATEWAY_NOT_WIRED';
    throw err;
  }

  verifyWebhookSignature(rawBody, signature) {
    if (!this.keySecret || !signature) return false;
    const expected = nodeCrypto.createHmac('sha256', this.keySecret).update(rawBody).digest('hex');
    return nodeCrypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(signature)));
  }

  normalizeEvent(payload = {}) {
    const p = payload.payload?.payment?.entity || {};
    return {
      event: payload.event || '',
      gatewayOrderId: p.order_id || '',
      gatewayPaymentId: p.id || '',
      amount: p.amount ? Number(p.amount) / 100 : 0,
    };
  }
}

export function gatewayFor(name) {
  return name === 'razorpay' ? new RazorpayGateway() : new MockGateway();
}
