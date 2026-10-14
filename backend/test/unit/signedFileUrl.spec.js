import { describe, it, expect } from '@jest/globals';
import {
  signFileUrl, verifyFileUrlSignature, SIGNED_FILE_TTL_SECONDS,
} from '../../src/utils/signedFileUrl.js';

// 2.md 5 — signed short-lived preview links for the private application
// uploads. Pure crypto: no models, no clock beyond injectable `now`.

const PATH = '/uploads/documents/abc123.pdf';
const USER = '7000000000000000000000f5';
const OTHER_USER = '7000000000000000000000f1';

const parts = (url) => Object.fromEntries(new URLSearchParams(String(url).split('?')[1]));

describe('signedFileUrl', () => {
  it('round-trips a fresh signature for the exact path + user', () => {
    const url = signFileUrl(PATH, { userId: USER });
    expect(url.startsWith(`${PATH}?exp=`)).toBe(true);
    const { exp, sig } = parts(url);
    expect(sig).toMatch(/^[0-9a-f]{64}$/);
    expect(verifyFileUrlSignature({ path: PATH, exp, sig, userId: USER })).toBe(true);
  });

  it('expires after the default short TTL', () => {
    const { exp } = parts(signFileUrl(PATH, { userId: USER }));
    expect(Number(exp) - Math.floor(Date.now() / 1000)).toBe(SIGNED_FILE_TTL_SECONDS);
    expect(SIGNED_FILE_TTL_SECONDS).toBeLessThanOrEqual(900); // "short-lived" stays short
  });

  it('rejects an expired signature', () => {
    const stale = parts(signFileUrl(PATH, { userId: USER, ttlSeconds: 60, now: Date.now() - 120_000 }));
    expect(verifyFileUrlSignature({ path: PATH, ...stale, userId: USER })).toBe(false);
  });

  it('rejects another user — a copied link is useless to anyone else', () => {
    const { exp, sig } = parts(signFileUrl(PATH, { userId: USER }));
    expect(verifyFileUrlSignature({ path: PATH, exp, sig, userId: OTHER_USER })).toBe(false);
  });

  it('rejects a transplanted path — one file never signs for another', () => {
    const { exp, sig } = parts(signFileUrl(PATH, { userId: USER }));
    expect(verifyFileUrlSignature({ path: '/uploads/documents/OTHER.pdf', exp, sig, userId: USER })).toBe(false);
    expect(verifyFileUrlSignature({ path: '/uploads/reports/leak.pdf', exp, sig, userId: USER })).toBe(false);
  });

  it('rejects tampered exp or sig values', () => {
    const { exp, sig } = parts(signFileUrl(PATH, { userId: USER }));
    const future = String(Number(exp) + 3600);
    expect(verifyFileUrlSignature({ path: PATH, exp: future, sig, userId: USER })).toBe(false);
    expect(verifyFileUrlSignature({ path: PATH, exp, sig: sig.replace(/^./, sig[0] === 'a' ? 'b' : 'a'), userId: USER })).toBe(false);
  });

  it('fails closed on missing or malformed inputs', () => {
    const { exp, sig } = parts(signFileUrl(PATH, { userId: USER }));
    expect(verifyFileUrlSignature({ path: PATH, exp: undefined, sig: undefined, userId: USER })).toBe(false);
    expect(verifyFileUrlSignature({ path: PATH, exp: 'soon', sig, userId: USER })).toBe(false);
    expect(verifyFileUrlSignature({ path: PATH, exp, sig: 'short', userId: USER })).toBe(false);
    expect(verifyFileUrlSignature({ path: PATH, exp, sig, userId: undefined })).toBe(false);
    expect(verifyFileUrlSignature({ path: '', exp, sig, userId: USER })).toBe(false);
  });

  it('refuses to sign anything outside the private upload paths', () => {
    expect(signFileUrl('/etc/passwd', { userId: USER })).toBe('/etc/passwd');
    expect(signFileUrl('/uploads/../secrets.env', { userId: USER })).toBe('/uploads/../secrets.env');
    expect(signFileUrl('', { userId: USER })).toBe('');
    const { exp, sig } = parts(signFileUrl(PATH, { userId: USER }));
    expect(verifyFileUrlSignature({ path: '/uploads/../secrets.env', exp, sig, userId: USER })).toBe(false);
  });
});
