import request from 'supertest';
import app from '../index.js';

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
    const res = await request(app)
      .post('/api/pharmacy/prescriptions')
      .set('Origin', 'http://localhost:3000')
      .send({
        patientId: '64d9f8c2e1b2c3d4e5f6a7b8',
        doctorName: 'Dr. Test',
        medicines: [{ name: 'Paracetamol', dosage: '500mg', frequency: 'bid', duration: '5d' }],
      });
    expect(res.status).toBe(401);
  });

  it('should reject dispensing medicine without authentication', async () => {
    const res = await request(app)
      .put('/api/pharmacy/prescriptions/64d9f8c2e1b2c3d4e5f6a7b8/dispense')
      .set('Origin', 'http://localhost:3000')
      .send({ medicineIndex: 0 });
    expect(res.status).toBe(401);
  });

  it('should reject prescribing verification without authentication', async () => {
    const res = await request(app)
      .put('/api/pharmacy/prescriptions/64d9f8c2e1b2c3d4e5f6a7b8/verify')
      .set('Origin', 'http://localhost:3000')
      .send({ verified: true });
    expect(res.status).toBe(401);
  });
});
