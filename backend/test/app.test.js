import request from 'supertest';
import app from '../index.js';

describe('Server health check', () => {
  it('should return 200 on /api/health', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
  });

  it('should return 404 for unknown routes', async () => {
    const response = await request(app).get('/api/nonexistent');
    expect(response.status).toBe(404);
  });

  it('should return 401 for protected routes without token', async () => {
    const response = await request(app).get('/api/users');
    expect(response.status).toBe(401);
  });
});
