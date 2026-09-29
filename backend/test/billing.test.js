import request from 'supertest';
import app from '../src/index.js';
import { beforeAll } from '@jest/globals';
import { post, setupCsrf } from './helpers/csrf.js';

beforeAll(async () => {
  await setupCsrf();
});

describe('Billing Endpoints', () => {
  it('should reject fetching bills without authentication', async () => {
    const res = await request(app).get('/api/billing');
    expect(res.status).toBe(401);
  });

  it('should reject creating a bill without authentication', async () => {
    const res = await post('/api/billing').send({
      patient: 'Test Patient',
      amount: 500,
      service: 'Consultation',
    });
    expect(res.status).toBe(401);
  });

  it('should reject downloading bill PDF without authentication', async () => {
    const res = await request(app).get('/api/billing/64d9f8c2e1b2c3d4e5f6a7b8/pdf');
    expect([401, 404]).toContain(res.status);
  });
});
