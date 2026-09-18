import request from 'supertest';
import app from '../index.js';

describe('OTP / Two-Factor Verification Endpoints', () => {
  // ── One-time password (email verification during registration) ──
  it('should reject OTP verification with a missing otp', async () => {
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .set('Origin', 'http://localhost:3000')
      .send({ email: 'test@example.com' });
    expect([400, 422]).toContain(res.status);
  });

  it('should reject OTP verification with an invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .set('Origin', 'http://localhost:3000')
      .send({ email: 'invalid-email', otp: '123456' });
    expect([400, 422]).toContain(res.status);
  });

  it('should reject resending an OTP with a missing email', async () => {
    const res = await request(app)
      .post('/api/auth/resend-otp')
      .set('Origin', 'http://localhost:3000')
      .send({});
    expect([400, 422]).toContain(res.status);
  });

  // ── Two-factor authentication (per-user TOTP / backup codes) ──
  it('should reject 2FA validation with a missing email', async () => {
    const res = await request(app)
      .post('/api/auth/2fa/validate')
      .set('Origin', 'http://localhost:3000')
      .send({});
    expect([400, 422]).toContain(res.status);
  });

  it('should reject 2FA validation with an invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/2fa/validate')
      .set('Origin', 'http://localhost:3000')
      .send({ email: 'not-an-email' });
    expect([400, 422]).toContain(res.status);
  });

  it('should reject checking 2FA status without authentication', async () => {
    const res = await request(app).get('/api/auth/2fa/status');
    expect(res.status).toBe(401);
  });

  it('should reject enabling 2FA without authentication', async () => {
    const res = await request(app)
      .post('/api/auth/2fa/verify')
      .set('Origin', 'http://localhost:3000')
      .send({ token: '123456' });
    expect(res.status).toBe(401);
  });

  it('should reject disabling 2FA without authentication', async () => {
    const res = await request(app)
      .post('/api/auth/2fa/disable')
      .set('Origin', 'http://localhost:3000')
      .send({ password: 'password123' });
    expect(res.status).toBe(401);
  });
});
