import request from 'supertest';
import app from '../src/index.js';
import { beforeAll } from '@jest/globals';
import { post, setupCsrf } from './helpers/csrf.js';

beforeAll(async () => {
  await setupCsrf();
});


describe('OTP / Two-Factor Verification Endpoints', () => {
  // ── One-time password (email verification during registration) ──
  it('should reject OTP verification with a missing otp', async () => {
    const res = await post('/api/auth/verify-otp')
      .send({ email: 'test@example.com' });
    expect([400, 422]).toContain(res.status);
  });

  it('should reject OTP verification with an invalid email', async () => {
    const res = await post('/api/auth/verify-otp')
      .send({ email: 'invalid-email', otp: '123456' });
    expect([400, 422]).toContain(res.status);
  });

  it('should reject resending an OTP with a missing email', async () => {
    const res = await post('/api/auth/resend-otp')
      .send({});
    expect([400, 422]).toContain(res.status);
  });

  // ── Two-factor authentication (per-user TOTP / backup codes) ──
  it('should reject 2FA validation with a missing email', async () => {
    const res = await post('/api/auth/2fa/validate')
      .send({});
    expect([400, 422]).toContain(res.status);
  });

  it('should reject 2FA validation with an invalid email', async () => {
    const res = await post('/api/auth/2fa/validate')
      .send({ email: 'not-an-email' });
    expect([400, 422]).toContain(res.status);
  });

  it('should reject checking 2FA status without authentication', async () => {
    const res = await request(app).get('/api/auth/2fa/status');
    expect(res.status).toBe(401);
  });

  it('should reject enabling 2FA without authentication', async () => {
    const res = await post('/api/auth/2fa/verify')
      .send({ token: '123456' });
    expect(res.status).toBe(401);
  });

  it('should reject disabling 2FA without authentication', async () => {
    const res = await post('/api/auth/2fa/disable')
      .send({ password: 'password123' });
    expect(res.status).toBe(401);
  });
});
