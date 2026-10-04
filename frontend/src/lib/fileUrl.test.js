/**
 * Unit tests for the file-URL helpers in src/lib/api.js.
 *
 * These functions decide how protected uploads are resolved and rendered —
 * regressions here show up as broken prescriptions/records previews (or, worse,
 * bare filenames becoming bogus relative URLs).
 */
import { afterEach, describe, it, expect, vi } from 'vitest';
import { setAuthTokens, clearRefreshTokenCache } from './axios';
import {
  resolveFileUrl,
  isValidFileUrl,
  getFileType,
  txToEarningsBill,
  getServerOrigin,
  getFilePreviewUrl,
} from './api';

afterEach(() => {
  vi.restoreAllMocks();
  clearRefreshTokenCache();
});

describe('resolveFileUrl', () => {
  it('returns empty string for falsy input', () => {
    expect(resolveFileUrl('')).toBe('');
    expect(resolveFileUrl(undefined)).toBe('');
    expect(resolveFileUrl(null)).toBe('');
  });

  it('passes through absolute http(s) and data: URLs untouched', () => {
    expect(resolveFileUrl('https://res.cloudinary.com/x/y.png')).toBe('https://res.cloudinary.com/x/y.png');
    expect(resolveFileUrl('http://example.com/a.pdf')).toBe('http://example.com/a.pdf');
    expect(resolveFileUrl('data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA');
  });

  it('prefixes server-relative paths with the API origin', () => {
    expect(resolveFileUrl('/uploads/documents/report.pdf')).toBe(
      `${getServerOrigin()}/uploads/documents/report.pdf`,
    );
  });

  it('leaves unknown relative values as-is', () => {
    expect(resolveFileUrl('bare-filename.jpg')).toBe('bare-filename.jpg');
  });
});

describe('isValidFileUrl', () => {
  it('rejects empty and bare filenames', () => {
    expect(isValidFileUrl('')).toBe(false);
    expect(isValidFileUrl(undefined)).toBe(false);
    expect(isValidFileUrl('report.pdf')).toBe(false);
  });

  it('accepts absolute, root-relative, data: and blob: URLs', () => {
    expect(isValidFileUrl('https://x.test/a.png')).toBe(true);
    expect(isValidFileUrl('/uploads/a.png')).toBe(true);
    expect(isValidFileUrl('data:image/png;base64,AAAA')).toBe(true);
    expect(isValidFileUrl('blob:http://localhost/1234')).toBe(true);
  });
});

describe('getFileType', () => {
  it('classifies images, pdfs and everything else', () => {
    expect(getFileType('/a/b/scan.JPG')).toBe('image');
    expect(getFileType('photo.jpeg')).toBe('image');
    expect(getFileType('result.webp')).toBe('image');
    expect(getFileType('/reports/r.pdf')).toBe('pdf');
    expect(getFileType('report.PDF')).toBe('pdf');
    expect(getFileType('lab-result.txt')).toBe('other');
    expect(getFileType()).toBe('other');
  });
});

describe('getFilePreviewUrl credential boundary', () => {
  it('sends the app session only to local protected uploads', async () => {
    setAuthTokens('session-secret');
    const createUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview-local');
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/pdf' },
      blob: async () => new Blob(['private report']),
    });

    await expect(getFilePreviewUrl('/uploads/patient-report.pdf')).resolves.toMatchObject({ type: 'pdf', url: 'blob:preview-local' });
    expect(fetchSpy).toHaveBeenCalledWith(`${getServerOrigin()}/uploads/patient-report.pdf`, {
      credentials: 'include',
      headers: { Authorization: 'Bearer session-secret' },
    });
    expect(createUrl).toHaveBeenCalledOnce();
  });

  it('never sends bearer tokens or cookies to an external file host', async () => {
    setAuthTokens('session-secret');
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'image/png' },
      blob: async () => new Blob(['image']),
    });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview-external');

    await expect(getFilePreviewUrl('https://files.example.test/patient-report.png')).resolves.toMatchObject({ type: 'image' });
    expect(fetchSpy).toHaveBeenCalledWith('https://files.example.test/patient-report.png', {
      credentials: 'omit',
      headers: {},
    });
  });
});

describe('txToEarningsBill', () => {
  it('maps completed payments to Paid with amount collected', () => {
    const bill = txToEarningsBill({
      _id: 't1',
      amount: 500,
      status: 'completed',
      serviceType: 'appointment',
      method: 'wallet',
    });
    expect(bill.status).toBe('Paid');
    expect(bill.paid).toBe(500);
    expect(bill.service).toBe('Appointment');
    expect(bill.method).toBe('wallet');
  });

  it('never counts unpaid amounts as paid', () => {
    for (const status of ['pending', 'failed', 'refunded']) {
      const bill = txToEarningsBill({ amount: 100, status });
      expect(bill.paid).toBe(0);
    }
    expect(txToEarningsBill({ amount: 100, status: 'pending' }).status).toBe('Pending');
    expect(txToEarningsBill({ amount: 100, status: 'failed' }).status).toBe('Failed');
    expect(txToEarningsBill({ amount: 100, status: 'refunded' }).status).toBe('Refunded');
  });

  it('derives IST date/time slices (5h30m ahead of UTC)', () => {
    // 2025-01-15T20:00:00Z → IST 2025-01-16 01:30
    const bill = txToEarningsBill({
      amount: 10,
      status: 'completed',
      createdAt: '2025-01-15T20:00:00.000Z',
    });
    expect(bill.date).toBe('2025-01-16');
    expect(bill.time).toBe('01:30');
  });

  it('coerces garbage amounts to 0 and defaults patient label', () => {
    const bill = txToEarningsBill({ amount: 'not-a-number', status: 'completed' });
    expect(bill.amount).toBe(0);
    expect(bill.paid).toBe(0);
    expect(bill.patient).toBe('Patient');
  });
});
