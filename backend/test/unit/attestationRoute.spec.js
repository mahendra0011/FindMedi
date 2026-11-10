import express from 'express';
import request from 'supertest';
import attestationRoutes from '../../src/routes/attestation.js';

const app = express();
app.use(express.json());
app.use(attestationRoutes);

describe('mobile attestation verification route', () => {
  it.each(['android', 'ios'])('fails closed for %s tokens until a verifier is configured', async (platform) => {
    const response = await request(app)
      .post('/verify')
      .send({ platform, token: 'unverified-token' });

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({ code: 'ATTESTATION_VERIFIER_UNAVAILABLE' });
    expect(response.body.verdict).toBeUndefined();
  });

  it('rejects unsupported platforms and empty tokens', async () => {
    const unsupported = await request(app).post('/verify').send({ platform: 'web', token: 'token' });
    const emptyToken = await request(app).post('/verify').send({ platform: 'android', token: ' ' });

    expect(unsupported.status).toBe(400);
    expect(emptyToken.status).toBe(400);
  });
});
