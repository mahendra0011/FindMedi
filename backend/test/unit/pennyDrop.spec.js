import { jest } from '@jest/globals';
import {
  PENNY_DROP_MODES,
  pennyDropMode,
  normalizeName,
  evaluateNameMatch,
  verifyPennyDrop,
} from '../../src/lib/pennyDrop.js';

// 2.md 14 — the payout "penny-drop". Two halves: the pure NAME MATCH the bank
// credited name goes through, and the mode machine (off/mock/live) that must
// never 500 the join flow. Live mode is exercised with a stubbed global fetch —
// no test in this suite may open a socket.

const ORIGINAL_ENV = {
  PENNY_DROP_MODE: process.env.PENNY_DROP_MODE,
  PENNY_DROP_URL: process.env.PENNY_DROP_URL,
  PENNY_DROP_KEY: process.env.PENNY_DROP_KEY,
};
const originalFetch = global.fetch;
const restoreEnv = (key) => {
  if (ORIGINAL_ENV[key] === undefined) delete process.env[key];
  else process.env[key] = ORIGINAL_ENV[key];
};

afterEach(() => {
  restoreEnv('PENNY_DROP_MODE');
  restoreEnv('PENNY_DROP_URL');
  restoreEnv('PENNY_DROP_KEY');
  global.fetch = originalFetch;
});

describe('pennyDropMode', () => {
  it('defaults to mock, never to live', () => {
    expect(pennyDropMode()).toBe('mock');
  });

  it('accepts the three known modes case- and space-insensitively', () => {
    process.env.PENNY_DROP_MODE = ' OFF ';
    expect(pennyDropMode()).toBe('off');
    process.env.PENNY_DROP_MODE = 'Live';
    expect(pennyDropMode()).toBe('live');
    expect(PENNY_DROP_MODES).toEqual(['off', 'mock', 'live']);
  });

  it('falls back to mock for a typo instead of turning money-movement on', () => {
    process.env.PENNY_DROP_MODE = 'liv';
    expect(pennyDropMode()).toBe('mock');
    process.env.PENNY_DROP_MODE = 'production';
    expect(pennyDropMode()).toBe('mock');
  });
});

describe('normalizeName', () => {
  it('uppercases and strips punctuation/honorific spacing down to tokens', () => {
    expect(normalizeName('Shri Ramesh Kumar')).toBe('SHRI RAMESH KUMAR');
    expect(normalizeName('  ramesh   kumar  ')).toBe('RAMESH KUMAR');
    expect(normalizeName('M/s. A+B Clinic')).toBe('M S A B CLINIC');
  });

  it('treats null/undefined as empty', () => {
    expect(normalizeName(null)).toBe('');
    expect(normalizeName(undefined)).toBe('');
  });
});

describe('evaluateNameMatch', () => {
  it('matches exact normalized equality regardless of case', () => {
    expect(evaluateNameMatch('Ramesh Kumar', 'ramesh kumar')).toBe(true);
  });

  it('matches containment — bank-added suffixes and honorifics', () => {
    expect(evaluateNameMatch('RAMESH KUMAR', 'Ramesh Kumar s/o Ram')).toBe(true);
    expect(evaluateNameMatch('Shri Ramesh Kumar', 'Ramesh Kumar')).toBe(true);
  });

  it('matches reordered tokens when every token of the shorter side appears', () => {
    expect(evaluateNameMatch('Ramesh Kumar', 'Kumar, Ramesh')).toBe(true);
  });

  it('refuses a single-token near-miss that is not a substring', () => {
    expect(evaluateNameMatch('Verma', 'Ramesh Kumar')).toBe(false);
  });

  it('refuses names with no shared substance', () => {
    expect(evaluateNameMatch('Amit Sharma', 'Rahul Verma')).toBe(false);
  });

  it('refuses comparisons where either side is too short to mean anything', () => {
    expect(evaluateNameMatch('ab', 'abc')).toBe(false);
    expect(evaluateNameMatch('', 'Ramesh Kumar')).toBe(false);
    expect(evaluateNameMatch('Ramesh Kumar', null)).toBe(false);
  });
});

describe('verifyPennyDrop', () => {
  it('skips entirely when the mode is off', async () => {
    process.env.PENNY_DROP_MODE = 'off';
    const r = await verifyPennyDrop({ ifsc: 'HDFC0001234', accountNumber: '123456789012', accountHolder: 'Ramesh Kumar' });
    expect(r.status).toBe('skipped');
    expect(r.mode).toBe('off');
  });

  it('reports incomplete when payout fields are missing, in any mode', async () => {
    process.env.PENNY_DROP_MODE = 'mock';
    const r = await verifyPennyDrop({ ifsc: '', accountNumber: '123456789012', accountHolder: 'Ramesh Kumar' });
    expect(r.status).toBe('incomplete');
  });

  it('mock mode verifies without a network round-trip', async () => {
    process.env.PENNY_DROP_MODE = 'mock';
    global.fetch = jest.fn();
    const r = await verifyPennyDrop({ ifsc: 'HDFC0001234', accountNumber: '123456789012', accountHolder: 'Ramesh Kumar' });
    expect(r.status).toBe('verified');
    expect(r.mode).toBe('mock');
    expect(r.nameMatch).toBe(true);
    expect(r.creditedName).toBe('Ramesh Kumar');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('live mode without a configured gateway degrades to unavailable', async () => {
    process.env.PENNY_DROP_MODE = 'live';
    delete process.env.PENNY_DROP_URL;
    const r = await verifyPennyDrop({ ifsc: 'HDFC0001234', accountNumber: '123456789012', accountHolder: 'Ramesh Kumar' });
    expect(r.status).toBe('unavailable');
    expect(r.note).toContain('PENNY_DROP_URL');
  });

  it('live mode treats a rejected gateway response as unavailable, not an error', async () => {
    process.env.PENNY_DROP_MODE = 'live';
    process.env.PENNY_DROP_URL = 'https://bank.example/penny';
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    const r = await verifyPennyDrop({ ifsc: 'HDFC0001234', accountNumber: '123456789012', accountHolder: 'Ramesh Kumar' });
    expect(r.status).toBe('unavailable');
    expect(r.note).toContain('ECONNREFUSED');
  });

  it('live mode compares the bank-credited name through evaluateNameMatch', async () => {
    process.env.PENNY_DROP_MODE = 'live';
    process.env.PENNY_DROP_URL = 'https://bank.example/penny';
    process.env.PENNY_DROP_KEY = 'k-123';

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ creditedName: 'RAMESH KUMAR' }),
    });
    const good = await verifyPennyDrop({ ifsc: 'HDFC0001234', accountNumber: '123456789012', accountHolder: 'Ramesh Kumar' });
    expect(good.status).toBe('verified');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://bank.example/penny',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'x-api-key': 'k-123' }),
      }),
    );

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ creditedName: 'Somebody Else Entirely' }),
    });
    const bad = await verifyPennyDrop({ ifsc: 'HDFC0001234', accountNumber: '123456789012', accountHolder: 'Ramesh Kumar' });
    expect(bad.status).toBe('name_mismatch');
    expect(bad.nameMatch).toBe(false);
    expect(bad.note).toContain('bank credited');
  });

  it('a non-2xx gateway answer is unavailable, never a throw', async () => {
    process.env.PENNY_DROP_MODE = 'live';
    process.env.PENNY_DROP_URL = 'https://bank.example/penny';
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 });
    const r = await verifyPennyDrop({ ifsc: 'HDFC0001234', accountNumber: '123456789012', accountHolder: 'Ramesh Kumar' });
    expect(r.status).toBe('unavailable');
    expect(r.note).toContain('503');
  });
});
