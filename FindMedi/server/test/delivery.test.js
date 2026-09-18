import request from 'supertest';
import app from '../index.js';

const userId = '64d9f8c2e1b2c3d4e5f6a7b8';

describe('Delivery read endpoints', () => {
  it.each([
    ['history', 'tasks'],
    ['orders', 'orders'],
    ['zones', 'zones'],
    ['earnings', 'earnings'],
    ['documents', 'documents'],
    ['reviews', 'reviews'],
  ])('GET /api/delivery/%s returns 400 without userId', async (path) => {
    const res = await request(app).get(`/api/delivery/${path}`);
    expect(res.status).toBe(400);
  });

  it.each([
    ['history', 'tasks'],
    ['orders', 'orders'],
    ['zones', 'zones'],
    ['earnings', 'earnings'],
    ['documents', 'documents'],
    ['reviews', 'reviews'],
  ])('GET /api/delivery/%s with userId is auth-gated (401 without token)', async (path) => {
    const res = await request(app).get(`/api/delivery/${path}?userId=${userId}`);
    expect([401, 403]).toContain(res.status);
  });

  it('GET /api/delivery/history shape check (auth-gated, no crash)', async () => {
    const res = await request(app).get(`/api/delivery/history?userId=${userId}`);
    // Without token this is 401; with future auth it should be {tasks:[]}.
    // Either way it must never be 500.
    expect(res.status).not.toBe(500);
  });
});
