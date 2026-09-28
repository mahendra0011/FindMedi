import fs from 'fs';
import os from 'os';
import path from 'path';
import { parseSecretsFile, applySecretsFile } from '../src/utils/secretsFile.js';

// Phase 8: external secrets injection (Doppler/Vault/AWS render a KEY=VALUE
// file; SECRETS_FILE points the server at it). These tests pin the parsing
// rules and, more importantly, the precedence chain
// platform-env > secrets file > .env — a wrong precedence here means prod
// either ignores the real secrets or lets a stale .env win.
describe('secrets file loading', () => {
  let tmpFile;

  const writeSecrets = (contents) => {
    tmpFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'findmedi-secrets-')), 'secrets.env');
    fs.writeFileSync(tmpFile, contents);
    return tmpFile;
  };

  afterEach(() => {
    if (tmpFile) fs.rmSync(path.dirname(tmpFile), { recursive: true, force: true });
    tmpFile = null;
  });

  describe('parseSecretsFile', () => {
    it('parses plain KEY=VALUE lines', () => {
      expect(parseSecretsFile('JWT_SECRET=abc123\nSTRIPE_KEY=sk_live_xyz')).toEqual({
        JWT_SECRET: 'abc123',
        STRIPE_KEY: 'sk_live_xyz',
      });
    });

    it('strips surrounding single and double quotes', () => {
      expect(parseSecretsFile('A="quoted value"\nB=\'single\'')).toEqual({
        A: 'quoted value',
        B: 'single',
      });
    });

    it('keeps "=" inside the value (base64 padding survives)', () => {
      expect(parseSecretsFile('PG_URL=postgres://u:p@h/db?opt=1==')).toEqual({
        PG_URL: 'postgres://u:p@h/db?opt=1==',
      });
    });

    it('ignores comments, blank lines and `export` prefixes', () => {
      const parsed = parseSecretsFile(
        ['# rendered by doppler', '', '   ', 'export TOKEN=abc', 'NOT A PAIR'].join('\n'),
      );
      expect(parsed).toEqual({ TOKEN: 'abc' });
    });

    it('handles CRLF files without trailing \\r in values', () => {
      expect(parseSecretsFile('A=1\r\nB=2\r\n')).toEqual({ A: '1', B: '2' });
    });
  });

  describe('applySecretsFile', () => {
    it('applies every parsed value and reports the count', () => {
      const target = {};
      const result = applySecretsFile(writeSecrets('A=1\nB=2\n'), [], target);
      expect(result).toEqual({ applied: 2, skipped: 0 });
      expect(target).toEqual({ A: '1', B: '2' });
    });

    it('never overwrites platform-injected env vars when passed the pre-dotenv snapshot', () => {
      // Snapshot mimics real boot: the operator already set JWT_SECRET.
      const snapshot = new Set(['JWT_SECRET']);
      const target = { JWT_SECRET: 'from-platform' };
      const result = applySecretsFile(writeSecrets('JWT_SECRET=from-file\nNEW=1\n'), snapshot, target);

      expect(target.JWT_SECRET).toBe('from-platform');
      expect(target.NEW).toBe('1');
      expect(result).toEqual({ applied: 1, skipped: 1 });
    });

    it('overwrites a stale .env value (file beats .env)', () => {
      const target = { JWT_SECRET: 'stale-dev-default' };
      applySecretsFile(writeSecrets('JWT_SECRET=real-secret\n'), new Set(), target);
      expect(target.JWT_SECRET).toBe('real-secret');
    });

    it('throws for a missing file so boot can surface the reason', () => {
      expect(() => applySecretsFile(path.join(os.tmpdir(), 'nope-does-not-exist.env'), [], {}))
        .toThrow();
    });
  });
});