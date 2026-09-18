import request from 'supertest';
import app from '../index.js';

describe('Auth Endpoints', () => {
  it('should reject registration with missing required fields', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Origin', 'http://localhost:3000')
      .send({ email: 'invalid-email' });
    expect([400, 422]).toContain(res.status);
  });

  it('should reject login with empty credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Origin', 'http://localhost:3000')
      .send({});
    expect([400, 401, 422]).toContain(res.status);
  });

  it('should reject accessing /api/auth/me without a token', async () => {
    const res = await request(app)
      .get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
