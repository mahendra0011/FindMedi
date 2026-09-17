import request from 'supertest';
import app from '../index.js';

describe('Appointments Endpoints', () => {
  it('should reject fetching appointments without authentication', async () => {
    const res = await request(app).get('/api/appointments');
    expect(res.status).toBe(401);
  });

  it('should reject creating an appointment without authentication', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set('Origin', 'http://localhost:3000')
      .send({
        doctorId: '64d9f8c2e1b2c3d4e5f6a7b8',
        date: '2026-09-20',
        time: '10:00 AM',
      });
    expect(res.status).toBe(401);
  });

  it('should reject updating an appointment without authentication', async () => {
    const res = await request(app)
      .put('/api/appointments/64d9f8c2e1b2c3d4e5f6a7b8')
      .set('Origin', 'http://localhost:3000')
      .send({ status: 'Confirmed' });
    expect(res.status).toBe(401);
  });
});
