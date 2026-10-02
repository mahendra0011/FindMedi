/**
 * Regression tests for the refresh-token lookup key and the /refresh ordering.
 *
 * Both defects were found by reading the code against the actual JWT format
 * rather than against what the comment claimed, which is the only reason they
 * were caught at all.
 */
import { describe, it, expect } from '@jest/globals';
import { createHash } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { readFileSync } from 'node:fs';

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

/**
 * Strip comments before matching code patterns.
 *
 * The first version of the ordering test below failed against CORRECT code,
 * because the fix's own explanatory comment contains the literal text
 * "`stored.replacedBy` used to be checked BEFORE `compareToken`" - so
 * `indexOf('stored.replacedBy')` matched the comment, not the branch. This is
 * the identical defect found and fixed in `triage-authz-gaps.mjs` the same day:
 * a comment is not a control, but it very often NAMES one.
 */
const stripComments = (text) =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .map((line) => {
      let out = '';
      let quote = null;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (quote) {
          out += ch;
          if (ch === '\\') { out += line[++i] ?? ''; continue; }
          if (ch === quote) quote = null;
          continue;
        }
        if (ch === '"' || ch === "'" || ch === '`') { quote = ch; out += ch; continue; }
        if (ch === '/' && line[i + 1] === '/') break;
        out += ch;
      }
      return out;
    })
    .join('\n');

const sign = (payload) => jwt.sign(payload, 'test-secret', { expiresIn: '7d' });

// Mirrors the model's static, so the test does not need a Mongo connection.
const getTokenKey = (token) =>
  createHash('sha256').update(String(token)).digest('hex').slice(0, 32);

describe('SEC · refresh tokenKey must not be a prefix of the token', () => {
  it('gives different tokens different keys', () => {
    // THE REGRESSION. `getTokenKey` was `token.substring(0, 16)`, and a JWT
    // header is identical for every token the service signs, so that returned
    // the CONSTANT `eyJhbGciOiJIUzI1` for all of them.
    const a = sign({ id: 'u1' });
    const b = sign({ id: 'u2' });
    const c = sign({ id: 'u3' });
    expect(new Set([getTokenKey(a), getTokenKey(b), getTokenKey(c)]).size).toBe(3);
  });

  it('demonstrates WHY the old prefix failed, so the reason is not lost', () => {
    const a = sign({ id: 'u1' });
    const b = sign({ id: 'u2' });
    // Both tokens really do share their first 16 characters...
    expect(a.substring(0, 16)).toBe(b.substring(0, 16));
    // ...which is exactly why a prefix cannot be a lookup key here.
    expect(getTokenKey(a)).not.toBe(getTokenKey(b));
  });

  it('is stable, so a token can be looked up twice', () => {
    const t = sign({ id: 'u1' });
    expect(getTokenKey(t)).toBe(getTokenKey(t));
  });

  it('is a fixed-width hex string, safe as an index key', () => {
    expect(getTokenKey(sign({ id: 'u1' }))).toMatch(/^[0-9a-f]{32}$/);
  });

  it('does not embed the token itself', () => {
    const t = sign({ id: 'u1' });
    expect(getTokenKey(t)).not.toContain(t.substring(0, 20));
  });

  it('the model actually uses the hash, not a substring', () => {
    const model = read('../../src/models/RefreshToken.js');
    expect(model).toMatch(/createHash\('sha256'\)/);
    expect(model).not.toMatch(/getTokenKey\s*=\s*\(token\)\s*=>\s*token\.substring/);
  });

  it('a junk string with the old constant prefix no longer selects a row', () => {
    // The attack string: the 16-byte constant plus arbitrary filler. It is not
    // a token, and it must not collide with any real token's key.
    const junk = 'eyJhbGciOiJIUzI1' + 'x'.repeat(200);
    const real = sign({ id: 'victim' });
    expect(getTokenKey(junk)).not.toBe(getTokenKey(real));
  });
});

describe('SEC · /refresh must verify the token before acting on rotation state', () => {
  const handler = () => {
    const code = read('../../src/routes/auth.js');
    const at = code.indexOf("router.post('/refresh'");
    expect(at).toBeGreaterThan(-1);
    // Comments stripped: the fix's own comment names both symbols, and matching
    // it would make this test pass or fail for the wrong reason.
    return stripComments(code.slice(at, at + 3200));
  };

  it('checks the hash BEFORE the reuse branch', () => {
    const seg = handler();
    // The ordering is the whole fix: the reuse branch runs deleteMany, so it
    // must not be reachable by a token that was merely looked up.
    expect(seg.indexOf('compareToken(refreshToken)')).toBeLessThan(seg.indexOf('stored.replacedBy'));
  });

  it('checks expiry BEFORE the reuse branch too', () => {
    const seg = handler();
    expect(seg.indexOf('stored.expiresAt < new Date()')).toBeLessThan(seg.indexOf('if (stored.replacedBy)'));
  });

  it('revokes every session for the user, and says so', () => {
    const seg = handler();
    expect(seg).toMatch(/await RefreshToken\.deleteMany\(\{ userId: stored\.userId \}\)/);
  });

  it('no longer carries the family-scoped line that did nothing', () => {
    // `familyId || undefined` strips to a bare { userId } filter when familyId
    // is absent, so this line was either redundant or broader than its comment.
    const seg = handler();
    expect(seg).not.toMatch(/deleteMany\(\{ userId: stored\.userId, familyId:/);
  });

  it('still audits the reuse event', () => {
    expect(handler()).toMatch(/refresh_token_reuse_detected/);
  });
});
