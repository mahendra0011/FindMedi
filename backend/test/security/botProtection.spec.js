/**
 * AUTH-M-05 · bot protection (Cloudflare Turnstile) on signup & OTP request.
 *
 * Env-gated: unset TURNSTILE_SECRET_KEY -> no-op, so dev/test and existing
 * clients are unaffected until the secret is configured.
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import express from 'express';
import supertest from 'supertest';

const OLD_ENV = { ...process.env };
const realFetch = globalThis.fetch;

const load = async () => import('../../src/middleware/botProtection.js');

const appWith = (mw) => {
  const app = express();
  app.use(express.json());
  app.post('/x', mw, (req, res) => res.json({ ok: true }));
  return app;
};

describe('AUTH-M-05 · botProtection', () => {
  beforeEach(() => {
    process.env = { ...OLD_ENV };
    delete process.env.TURNSTILE_SECRET_KEY;
    jest.resetModules();
  });
  afterEach(() => {
    process.env = OLD_ENV;
    globalThis.fetch = realFetch;
  });

  it('is a no-op when TURNSTILE_SECRET_KEY is unset (no token needed)', async () => {
    const { botProtection } = await load();
    const res = await supertest(appWith(botProtection())).post('/x').send({ email: 'a@b.c' });
    expect(res.status).toBe(200);
  });

  it('403 BOT_CHECK_REQUIRED when configured but no token is sent', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    const { botProtection } = await load();
    const res = await supertest(appWith(botProtection())).post('/x').send({ email: 'a@b.c' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('BOT_CHECK_REQUIRED');
  });

  it('passes with a valid token (provider says success)', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ success: true }) });
    const { botProtection } = await load();
    const res = await supertest(appWith(botProtection()))
      .post('/x')
      .send({ email: 'a@b.c', 'cf-turnstile-response': 'tok' });
    expect(res.status).toBe(200);
  });

  it('403 BOT_CHECK_FAILED on an invalid token', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ success: false, 'error-codes': ['invalid-input-response'] }) });
    const { botProtection } = await load();
    const res = await supertest(appWith(botProtection()))
      .post('/x')
      .send({ email: 'a@b.c', 'cf-turnstile-response': 'bad' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('BOT_CHECK_FAILED');
  });

  it('fails OPEN (logged) when the provider is unreachable — spam control must not DoS signup', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    globalThis.fetch = async () => { throw new Error('down'); };
    const { botProtection } = await load();
    const res = await supertest(appWith(botProtection()))
      .post('/x')
      .send({ email: 'a@b.c', 'cf-turnstile-response': 'tok' });
    expect(res.status).toBe(200);
  });

  it('accepts the header carriage as well as the body field', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ success: true }) });
    const { botProtection } = await load();
    const res = await supertest(appWith(botProtection()))
      .post('/x')
      .set('cf-turnstile-response', 'tok')
      .send({ email: 'a@b.c' });
    expect(res.status).toBe(200);
  });
});
