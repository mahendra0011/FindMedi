import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  einvoiceConfig,
  generateMockIrn,
  generateAckNo,
  buildEinvoicePayload,
  generateEinvoice,
  cancelEinvoice,
} from '../../src/services/einvoiceService.js';
import { validateGstin, gstinChecksum } from '../../src/lib/gstin.js';

describe('GSTIN Validator & Checksum', () => {
  it('validates genuine GSTIN structure and checksum', () => {
    // 27AAPFU0939F1ZV -> Maharashtra (27), PAN AAPFU0939F, entity 1, Z, checksum V
    const sample = '27AAPFU0939F1ZV';
    const chk = gstinChecksum(sample.slice(0, 14));
    expect(chk).toBe('V');

    const res = validateGstin(sample);
    expect(res.valid).toBe(true);
    expect(res.gstin).toBe(sample);
  });

  it('rejects invalid state code', () => {
    // 00 is not a valid state code
    const res = validateGstin('00AAPFU0939F1ZV');
    expect(res.valid).toBe(false);
    expect(res.reason).toBe('state_code');
  });

  it('rejects regex format mismatches', () => {
    expect(validateGstin('').valid).toBe(false);
    expect(validateGstin('12345').valid).toBe(false);
    expect(validateGstin('27AAPFU0939F0ZV').valid).toBe(false); // Entity character cannot be 0
  });

  it('detects single-character typo checksum failures', () => {
    const typo = '27AAPFU0939F1ZW'; // W instead of V
    const res = validateGstin(typo);
    expect(res.valid).toBe(false);
    expect(res.reason).toBe('checksum');
  });
});

describe('E-Invoice Service Unit Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns valid config object reflecting environment', () => {
    process.env.EINVOICE_MODE = 'sandbox';
    process.env.EINVOICE_GSTIN = '27AAPFU0939F1ZV';
    process.env.EINVOICE_USERNAME = 'user_demo';

    const cfg = einvoiceConfig();
    expect(cfg.mode).toBe('sandbox');
    expect(cfg.gstin).toBe('27AAPFU0939F1ZV');
    expect(cfg.enabled).toBe(true);
  });

  it('generates 64-character deterministic hex mock IRN', () => {
    const irn1 = generateMockIrn('INV-2026-001', '2026-10-12');
    expect(typeof irn1).toBe('string');
    expect(irn1.length).toBe(64);
    expect(/^[0-9A-F]{64}$/.test(irn1)).toBe(true);
  });

  it('generates ACK number starting with AS and 14 digits', () => {
    const ack = generateAckNo();
    expect(ack.startsWith('AS')).toBe(true);
    expect(ack.length).toBe(16);
  });

  it('builds GSTN compliant invoice payload structure', () => {
    process.env.EINVOICE_GSTIN = '27AAPFU0939F1ZV';
    const billing = {
      invoiceId: 'INV-1001',
      createdAt: '2026-10-12T10:00:00.000Z',
      amount: 5000,
      subTotal: 4500,
      cgst: 250,
      sgst: 250,
      igst: 0,
    };
    const hospital = {
      name: 'City Care Hospital',
      address: '123 MG Road',
      city: 'Mumbai',
      pincode: '400001',
      stateCode: '27',
    };
    const patient = {
      name: 'Rahul Sharma',
      city: 'Mumbai',
      pincode: '400001',
      stateCode: '27',
    };
    const lineItems = [
      { description: 'Consultation Fee', amount: 1000, hsnCode: '999312', quantity: 1 },
      { description: 'CBC Lab Test', amount: 3500, hsnCode: '999316', quantity: 1 },
    ];

    const payload = buildEinvoicePayload({ billing, hospital, patient, lineItems });
    expect(payload.Version).toBe('1.1');
    expect(payload.DocDtls.No).toBe('INV-1001');
    expect(payload.DocDtls.Dt).toBe('12/10/2026');
    expect(payload.SellerDtls.Gstin).toBe('27AAPFU0939F1ZV');
    expect(payload.BuyerDtls.LglNm).toBe('Rahul Sharma');
    expect(payload.ItemList).toHaveLength(2);
    expect(payload.ItemList[0].HsnCd).toBe('999312');
    expect(payload.ValDtls.TotInvVal).toBe(5000);
  });

  it('returns error if e-invoice is not configured when generating', async () => {
    delete process.env.EINVOICE_GSTIN;
    delete process.env.EINVOICE_USERNAME;

    const res = await generateEinvoice({ invoiceId: 'INV-1' });
    expect(res.success).toBe(false);
    expect(res.error).toBe('E-INVOICE_NOT_CONFIGURED');
  });

  it('generates complete sandbox e-invoice response bundle with QR and base64 invoice', async () => {
    process.env.EINVOICE_MODE = 'sandbox';
    process.env.EINVOICE_GSTIN = '27AAPFU0939F1ZV';
    process.env.EINVOICE_USERNAME = 'user_demo';

    const billing = {
      invoiceId: 'INV-8899',
      amount: 1500,
      lineItems: [{ description: 'OPD Consultation', amount: 1500 }],
    };

    const res = await generateEinvoice(billing, { name: 'Apollo Demo' }, { name: 'John Doe' });
    expect(res.success).toBe(true);
    expect(res.mode).toBe('sandbox');
    expect(res.irn).toHaveLength(64);
    expect(res.ackNo).toMatch(/^AS\d{14}$/);
    expect(typeof res.signedInvoice).toBe('string');
    expect(res.qrCode).toContain(res.irn);
  });

  it('handles sandbox cancellation successfully', async () => {
    process.env.EINVOICE_MODE = 'sandbox';
    const mockIrn = 'A'.repeat(64);
    const cancelRes = await cancelEinvoice(mockIrn, '1');
    expect(cancelRes.success).toBe(true);
    expect(cancelRes.status).toBe('Cancelled');
    expect(cancelRes.irn).toBe(mockIrn);
  });

  it('differentiates B2B and B2C transaction payload branches correctly', () => {
    process.env.EINVOICE_GSTIN = '27AAPFU0939F1ZV';
    const billingBase = { invoiceId: 'INV-B101', amount: 1000 };
    const hospital = { name: 'City Hospital', stateCode: '27' };

    // B2B when buyer has registered GSTIN
    const b2bPayload = buildEinvoicePayload({
      billing: billingBase,
      hospital,
      patient: { name: 'Corporate TPA', gstin: '27AAPFU0939F1ZV' },
    });
    expect(b2bPayload.TranDtls.SupTyp).toBe('B2B');
    expect(b2bPayload.BuyerDtls.Gstin).toBe('27AAPFU0939F1ZV');

    // B2C when billing specifies B2C
    const b2cPayload = buildEinvoicePayload({
      billing: { ...billingBase, supplyType: 'B2C' },
      hospital,
      patient: { name: 'Retail Patient' },
    });
    expect(b2cPayload.TranDtls.SupTyp).toBe('B2C');
  });

  it('enforces 24-hour cancel-window boundary per GSTN rules', async () => {
    process.env.EINVOICE_MODE = 'sandbox';
    const mockIrn = 'B'.repeat(64);
    const baseTime = new Date('2026-10-12T10:00:00.000Z');

    // Within window (23 hours later) -> Allowed
    const within24h = new Date('2026-10-13T09:00:00.000Z');
    const okRes = await cancelEinvoice(mockIrn, '1', {
      generatedAt: baseTime,
      now: within24h,
    });
    expect(okRes.success).toBe(true);
    expect(okRes.status).toBe('Cancelled');

    // Past window (25 hours later) -> Rejected
    const after24h = new Date('2026-10-13T11:00:00.000Z');
    const expiredRes = await cancelEinvoice(mockIrn, '1', {
      generatedAt: baseTime,
      now: after24h,
    });
    expect(expiredRes.success).toBe(false);
    expect(expiredRes.error).toBe('CANCEL_WINDOW_EXPIRED');
  });
});

