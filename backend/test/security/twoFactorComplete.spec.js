/**
 * Regression pin for the 2FA login bug that shipped because nothing exercised
 * the `/2fa/complete` route end-to-end.
 *
 * `twoFactorSecret` and `twoFactorBackupCodes` are `select: false` on the User
 * model. The complete route used to load only `+password`, so `verifyToken()`
 * always saw `undefined` and every 2FA-enabled account was rejected by its own
 * authenticator — with the misleading "Invalid 2FA code". The same shape of bug
 * hit PHI fields generally this session (ephemeral dev encryption key losing
 * ciphertext across restarts), so the fix tripled as documentation for why the
 * explicit selects exist.
 */
import { describe, it, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

describe('AUTH /2fa/complete loads the secrets it verifies', () => {
  const code = read('../../src/routes/auth.js');

  it('selects twoFactorSecret in addition to the password hash', () => {
    const at = code.indexOf("router.post('/2fa/complete'");
    expect(at).toBeGreaterThan(-1);
    const seg = code.slice(at, code.indexOf('router.', at + 10));
    expect(seg).toMatch(/select\([^)]*\+twoFactorSecret/);
  });

  it('selects twoFactorBackupCodes so the backup path works too', () => {
    const at = code.indexOf("router.post('/2fa/complete'");
    expect(at).toBeGreaterThan(-1);
    const seg = code.slice(at, code.indexOf('router.', at + 10));
    expect(seg).toMatch(/select\([^)]*\+twoFactorBackupCodes/);
  });
});
