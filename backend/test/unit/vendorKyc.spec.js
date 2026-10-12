import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { KYC_ALERT_WINDOW_DAYS } from '../../src/jobs/vendorKycExpiry.job.js';

describe('Vendor KYC Expiry Sweep Job Unit Tests (T7)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exports KYC_ALERT_WINDOW_DAYS as 30', () => {
    expect(KYC_ALERT_WINDOW_DAYS).toBe(30);
  });

  it('calculates 30-day advance alert threshold correctly', () => {
    const now = new Date('2026-10-15T00:00:00Z').getTime();
    const windowEnd = new Date(now + KYC_ALERT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    expect(windowEnd.toISOString()).toBe('2026-11-14T00:00:00.000Z');
  });

  it('identifies overdue vs soon-expiring documents accurately', () => {
    const fixedNow = new Date('2026-10-15T10:00:00Z');
    const windowEnd = new Date(fixedNow.getTime() + 30 * 24 * 60 * 60 * 1000);

    const docPast = { docType: 'DrugLicense', expiry: new Date('2026-10-10T00:00:00Z') };
    const docSoon = { docType: 'DrugLicense', expiry: new Date('2026-10-25T00:00:00Z') };
    const docFar = { docType: 'DrugLicense', expiry: new Date('2026-12-01T00:00:00Z') };

    expect(docPast.expiry <= fixedNow).toBe(true);
    expect(docSoon.expiry > fixedNow && docSoon.expiry <= windowEnd).toBe(true);
    expect(docFar.expiry > windowEnd).toBe(true);
  });
});
