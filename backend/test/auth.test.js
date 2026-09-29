import request from 'supertest';
import app from '../src/index.js';
import { beforeAll } from '@jest/globals';
import { post, get, setupCsrf } from './helpers/csrf.js';

beforeAll(async () => {
  await setupCsrf();
});

describe('Auth Endpoints', () => {
  it('should reject registration with missing required fields', async () => {
    const res = await post('/api/auth/register').send({ email: 'invalid-email' });
    expect([400, 422]).toContain(res.status);
  });

  it('should reject login with empty credentials', async () => {
    const res = await post('/api/auth/login').send({});
    expect([400, 401, 422]).toContain(res.status);
  });

  it('should reject accessing /api/auth/me without a token', async () => {
    const res = await get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
