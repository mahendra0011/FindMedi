import request from 'supertest';
import app from '../src/index.js';
import { beforeAll } from '@jest/globals';
import { post, put, setupCsrf } from './helpers/csrf.js';

beforeAll(async () => {
  await setupCsrf();
});


describe('Prescription Endpoints', () => {
  it('should reject fetching prescriptions without authentication', async () => {
    const res = await request(app).get('/api/pharmacy/prescriptions');
    expect(res.status).toBe(401);
  });

  it('should reject fetching a single prescription without authentication', async () => {
    const res = await request(app).get('/api/pharmacy/prescriptions/64d9f8c2e1b2c3d4e5f6a7b8');
    expect([401, 404]).toContain(res.status);
  });

  it('should reject creating a prescription without authentication', async () => {
    const res = await post('/api/pharmacy/prescriptions')
      .send({
        patientId: '64d9f8c2e1b2c3d4e5f6a7b8',
        doctorName: 'Dr. Test',
        medicines: [{ name: 'Paracetamol', dosage: '500mg', frequency: 'bid', duration: '5d' }],
      });
    expect(res.status).toBe(401);
  });

  it('should reject dispensing medicine without authentication', async () => {
    const res = await put('/api/pharmacy/prescriptions/64d9f8c2e1b2c3d4e5f6a7b8/dispense')
      .send({ medicineIndex: 0 });
    expect(res.status).toBe(401);
  });

  it('should reject prescribing verification without authentication', async () => {
    const res = await put('/api/pharmacy/prescriptions/64d9f8c2e1b2c3d4e5f6a7b8/verify')
      .send({ verified: true });
    expect(res.status).toBe(401);
  });
});
