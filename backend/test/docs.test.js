import request from 'supertest';
import app from '../src/index.js';
import { buildOpenApiDocument } from '../src/lib/openapi.js';

// Phase 4 contract tests: the OpenAPI doc is the API contract. These fail
// when a documented path drifts from the doc, or the doc itself is invalid.
describe('OpenAPI contract', () => {
  it('should serve a valid OpenAPI 3.0 document at /api/docs.json', async () => {
    const response = await request(app).get('/api/docs.json');
    expect(response.status).toBe(200);
    expect(response.body.openapi).toMatch(/^3\.0\./);
    expect(response.body.info.title).toBe('FindMedi API');
    expect(Object.keys(response.body.paths).length).toBeGreaterThan(15);
  });

  it('every documented operation must define responses', async () => {
    const doc = buildOpenApiDocument();
    for (const [path, item] of Object.entries(doc.paths)) {
      for (const [method, op] of Object.entries(item)) {
        expect(Object.keys(op.responses || {}).length).toBeGreaterThan(0);
      }
    }
  });

  it('every $ref must resolve inside the document', async () => {
    const doc = buildOpenApiDocument();
    const haystack = JSON.stringify(doc.components);
    const refs = JSON.stringify(doc.paths).match(/#\/components\/schemas\/\w+/g) || [];
    expect(refs.length).toBeGreaterThan(5);
    for (const ref of new Set(refs)) {
      const name = ref.split('/').pop();
      expect(haystack).toContain(`"${name}"`);
    }
  });

  it('critical money/auth flows must stay documented', async () => {
    const response = await request(app).get('/api/docs.json');
    const critical = [
      '/auth/login',
      '/auth/verify-otp',
      '/payments',
      '/payments/{id}/refund',
      '/transactions/pay',
      '/billing',
      '/insurance',
      '/commission/payouts',
    ];
    for (const p of critical) {
      expect(response.body.paths).toHaveProperty(p);
    }
  });

  it('auth contract: CSRF enforced (403), bad login shape is 400, no-token is 401', async () => {
    // No CSRF token at all → 403 (real csrfProtection contract)
    const noCsrf = await request(app).post('/api/auth/login').send({});
    expect(noCsrf.status).toBe(403);

    // With CSRF token but invalid body → 400/422 from Zod validation
    const agent = request.agent(app);
    const csrfRes = await agent.get('/api/auth/csrf-token');
    expect(csrfRes.status).toBe(200);
    const badLogin = await agent
      .post('/api/auth/login')
      .set('x-csrf-token', csrfRes.body.csrfToken)
      .send({});
    expect([400, 422]).toContain(badLogin.status);

    // Protected route without JWT → 401
    const noToken = await request(app).get('/api/payments');
    expect(noToken.status).toBe(401);
  });
});
