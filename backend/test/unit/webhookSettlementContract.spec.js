/**
 * PAY-B-07: webhook atomic settlement contract.
 * - Signature-verified events settle via applyWebhookSettlement only.
 * - With no provider adapter connected the stub fails closed (503), never
 *   mints `completed`.
 * - Client routes (payments POST/PUT, billing /pay, transactions /pay) must
 *   never write `completed` directly: production guards + allowlists enforce it.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel) => fs.readFileSync(path.join(here, rel), 'utf8');

const { applyWebhookSettlement, WEBHOOK_SETTLEMENT_IMPLEMENTED } = await import('../../src/routes/webhook.js');

describe('PAY-B-07 · webhook settlement is a guarded stub until an adapter lands', () => {
  it('is explicitly marked unimplemented', () => {
    expect(WEBHOOK_SETTLEMENT_IMPLEMENTED).toBe(false);
  });

  it('fails closed with 503 SETTLEMENT_NOT_IMPLEMENTED instead of settling', async () => {
    const out = await applyWebhookSettlement({ provider: 'razorpay', payload: { eventId: 'evt-1' } });
    expect(out.ok).toBe(false);
    expect(out.status).toBe(503);
    expect(out.code).toBe('SETTLEMENT_NOT_IMPLEMENTED');
  });

  it('routes verified events through applyWebhookSettlement (single settlement path)', () => {
    const src = read('../../src/routes/webhook.js');
    expect(src).toMatch(/applyWebhookSettlement\(\{ provider, payload \}\)/);
    expect(src).toMatch(/Only this function may ever write `completed` from a/);
  });
});

describe('PAY-B-07 · no client route may mint completed directly', () => {
  it('payments POST ignores client status and pins pending server-side', () => {
    const src = read('../../src/routes/payments.js');
    expect(src).toMatch(/status: 'pending',/);
    expect(src).not.toMatch(/status:\s*req\.body\.status/);
  });

  it('payments PUT allowlists fields without status (no client-to-completed edit)', () => {
    const src = read('../../src/routes/payments.js');
    const putBlock = src.slice(src.indexOf("router.put('/:id'"), src.indexOf("router.put('/:id/refund'"));
    expect(putBlock).toMatch(/pickBody\(req\.body,\s*\[/);
    expect(putBlock).not.toMatch(/'status'/);
  });

  it('billing /pay refuses to mint completed in production', () => {
    const src = read('../../src/routes/billing.js');
    expect(src).toMatch(/PAYMENT_PROVIDER_UNAVAILABLE/);
    expect(src).toMatch(/process\.env\.NODE_ENV === 'production'/);
  });

  it('transactions legacy /pay never creates a payment (replay-only, else 410)', () => {
    const src = read('../../src/routes/transactions.js');
    expect(src).toMatch(/LEGACY_PAYMENT_ENDPOINT_RETIRED/);
    expect(src).not.toMatch(/Payment\.create\(\[/);
  });
});
