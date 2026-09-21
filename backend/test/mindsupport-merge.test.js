import request from 'supertest';
import app from '../src/index.js';

// Phase 13 (merge): regression tests for the MindSupport merge (backend/merge.md).
// These run WITHOUT a database (Jest sets NODE_ENV=test), so they assert
// routing/auth behaviour, not data.
describe('MindSupport merge', () => {
  it('exposes merge health at /api/mindsupport/health', async () => {
    const res = await request(app).get('/api/mindsupport/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', service: 'mindsupport' });
  });

  it('does not shadow the main /api/health endpoint', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });

  it('serves namespaced mind routes instead of 404 (no DB → 5xx allowed)', async () => {
    const res = await request(app).get('/api/mindsupport/counsellors');
    expect(res.status).not.toBe(404);
  });

  it('keeps hospital /api/mentalhealth/* behind auth (unchanged behaviour)', async () => {
    const res = await request(app).get('/api/mentalhealth/referrals');
    expect([401, 403]).toContain(res.status);
  });
});
