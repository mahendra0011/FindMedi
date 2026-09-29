import request from 'supertest';
import app from '../src/index.js';
import { beforeAll } from '@jest/globals';
import { post, put, del, setupCsrf } from './helpers/csrf.js';

beforeAll(async () => {
  await setupCsrf();
});


describe('Pharmacy Order Endpoints', () => {
  it('should reject listing orders without authentication', async () => {
    const res = await request(app).get('/api/pharmacy/orders');
    expect(res.status).toBe(401);
  });

  it('should reject fetching a single order without authentication', async () => {
    const res = await request(app).get('/api/pharmacy/orders/64d9f8c2e1b2c3d4e5f6a7b8');
    expect([401, 404]).toContain(res.status);
  });

  it('should reject creating an order without authentication', async () => {
    const res = await post('/api/pharmacy/orders')
      .send({
        patientId: '64d9f8c2e1b2c3d4e5f6a7b8',
        patientName: 'Test Patient',
        items: [{ medicineId: '64d9f8c2e1b2c3d4e5f6a7b8', quantity: 1, price: 50 }],
        total: 50,
        paymentMethod: 'Cash',
      });
    expect(res.status).toBe(401);
  });

  it('should reject updating an order without authentication', async () => {
    const res = await put('/api/pharmacy/orders/64d9f8c2e1b2c3d4e5f6a7b8')
      .send({ status: 'Confirmed' });
    expect(res.status).toBe(401);
  });

  it('should reject deleting an order without authentication', async () => {
    const res = await del('/api/pharmacy/orders/64d9f8c2e1b2c3d4e5f6a7b8');
    expect(res.status).toBe(401);
  });

  it('should reject forwarding an order without authentication', async () => {
    const res = await post('/api/pharmacy/orders/64d9f8c2e1b2c3d4e5f6a7b8/forward')
      .send({ facilityId: '64d9f8c2e1b2c3d4e5f6a7b8' });
    expect(res.status).toBe(401);
  });

  it('should reject rejecting an order without authentication', async () => {
    const res = await put('/api/pharmacy/orders/64d9f8c2e1b2c3d4e5f6a7b8/reject')
      .send({ reason: 'Not in stock' });
    expect(res.status).toBe(401);
  });

  it('should reject refunding an order without authentication', async () => {
    const res = await post('/api/pharmacy/orders/64d9f8c2e1b2c3d4e5f6a7b8/refund')
      .send({ amount: 50, reason: 'Cancelled by patient' });
    expect(res.status).toBe(401);
  });

  it('should reject order verification endpoint without authentication', async () => {
    const res = await post('/api/pharmacy/orders/verify-prescriptions')
      .send({ order: { items: [] } });
    expect(res.status).toBe(401);
  });
});
