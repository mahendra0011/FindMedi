import express from 'express';
import logger from '../config/logger.js';
// PAY-B-06: ONE shared, mandatory verification path — raw-body HMAC in constant
// time + a timestamp window + a single-use replay cache. Previously each provider
// route re-implemented this, so the easy-to-get-wrong parts were opt-in.
import { verifyWebhook } from '../services/webhookSecurity.js';

const router = express.Router();

// PAY-B-13: no literal fallbacks. A hard-coded "test secret" meant that any
// deployment without the env var accepted webhooks signed with a PUBLIC string,
// i.e. payment state could be forged. Missing configuration now fails closed.
const WEBHOOK_SECRETS = {
  paytm: process.env.WEBHOOK_SECRET_PAYTM,
  razorpay: process.env.WEBHOOK_SECRET_RAZORPAY,
  stripe: process.env.WEBHOOK_SECRET_STRIPE,
};
const KNOWN_PROVIDERS = new Set(Object.keys(WEBHOOK_SECRETS));

// authz: role — unauthenticated by design (the gateway is the caller), so the
// HMAC is the only credential. Unknown providers are rejected before verification.
router.post('/:provider', async (req, res, next) => {
  const provider = req.params.provider;
  if (!KNOWN_PROVIDERS.has(provider)) {
    logger.warn(`Unknown webhook provider: ${provider}`);
    return res.status(400).json({ error: 'Unknown provider' });
  }
  return next();
}, verifyWebhook((req) => req.params.provider, {
  // The provider is a path segment, so its secret is resolved per request.
  resolveSecret: (req, provider) => WEBHOOK_SECRETS[provider],
}), async (req, res) => {
  const provider = req.params.provider;
  // index.js mounts this router with express.raw() BEFORE the global body parser so
  // the HMAC is computed over the exact bytes the gateway sent.
  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from('{}', 'utf8');

  let payload;
  try {
    payload = JSON.parse(raw.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'Malformed payload' });
  }
  // PAY-B-13: never log the payload — it carries payer PII and payment state.
  logger.info(`Webhook received from ${provider} (event ${payload?.eventId || 'n/a'})`);

  // PAY-B-07: atomic settlement contract (minimal scaffold).
  // ONLY a signature-verified webhook may settle a Payment to `completed`
  // (plus the referenced booking/order state) and it must do so atomically.
  // No provider settlement adapter is connected yet, so every settlement
  // attempt fails closed here instead of minting a local `completed` row.
  const settlement = await applyWebhookSettlement({ provider, payload });
  if (!settlement.ok) {
    return res.status(settlement.status || 503).json({
      received: true,
      provider,
      eventId: payload?.eventId || Date.now().toString(),
      settled: false,
      code: settlement.code,
      message: settlement.message,
    });
  }

  res.json({ received: true, provider, eventId: payload?.eventId || Date.now().toString(), settled: true });
});

/**
 * PAY-B-07 settlement contract.
 *
 * Intended final shape (TODO when a provider adapter lands):
 *   1. resolve the Payment by provider reference inside a Mongo transaction;
 *   2. assert the transition pending/processing -> completed is legal;
 *   3. apply Payment + booking/order updates in the SAME transaction/session;
 *   4. record the webhook eventId idempotently (unique index) so a replay
 *      inside the HMAC window cannot double-settle.
 *
 * Today: no adapter exists, so this is a guarded stub that ALWAYS refuses to
 * settle. Client routes (billing.js / transactions.js / payments.js POST) must
 * NEVER set `completed` directly in production — they 503 via
 * *_PROVIDER_UNAVAILABLE. Only this function may ever write `completed` from a
 * verified provider event.
 */
export const WEBHOOK_SETTLEMENT_IMPLEMENTED = false;

export async function applyWebhookSettlement({ provider, payload } = {}) {
  void provider;
  void payload;
  // Fail closed until a verified provider settlement path exists.
  if (!WEBHOOK_SETTLEMENT_IMPLEMENTED) {
    return {
      ok: false,
      status: 503,
      code: 'SETTLEMENT_NOT_IMPLEMENTED',
      message: 'Verified webhook received; settlement is disabled until a payment provider adapter is configured.',
    };
  }
  return { ok: true };
}

export default router;