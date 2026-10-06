import { jest } from '@jest/globals';

/**
 * ACCOUNT TAKEOVER / 2FA BYPASS SUITE
 * ===================================
 * These tests exercise the REAL express app (real middleware chain, real
 * routes) with the data layer stubbed, so they assert the security contract a
 * production deployment must honour:
 *
 *   AUTH-01  /api/auth/google-register must never mint a session for an
 *            existing account without proof of the Google identity.
 *   AUTH-02  An account with 2FA enabled must not receive a session from
 *            /api/auth/login without a valid TOTP/backup code.
 *
 * Both are written with `it.failing`, which PASSES while the vulnerability
 * exists and FAILS the moment the bug is fixed — that failure is the reminder
 * to flip the marker into a normal `it(...)`.
 */

const queryResult = (result) => {
  const api = {
    select: () => api,
    lean: () => Promise.resolve(result),
    populate: () => api,
    sort: () => api,
    limit: () => api,
    then: (onFulfilled, onRejected) => Promise.resolve(result).then(onFulfilled, onRejected),
    catch: (onRejected) => Promise.resolve(result).catch(onRejected),
  };
  return api;
};

const victimPatient = {
  _id: '507f1f77bcf86cd799439011',
  name: 'Victim Patient',
  email: 'victim@example.test',
  role: 'patient',
  status: 'active',
  isVerified: true,
  approvalStatus: 'not_required',
  tokenVersion: 0,
  settings: {},
  // The route calls user.save() on the existing-account branch — a real
  // mongoose doc has it, so the fixture must too for the flow to complete.
  save: async function save() { return this; },
};

const victimAdmin = {
  ...victimPatient,
  _id: '507f1f77bcf86cd799439012',
  name: 'Victim Hospital Admin',
  email: 'admin@example.test',
  role: 'hospital_admin',
  hospitalId: null,
};

const twoFactorUser = {
  ...victimPatient,
  _id: '507f1f77bcf86cd799439013',
  email: '2fa@example.test',
  twoFactorEnabled: true,
  comparePassword: async () => true,
};

let findByEmail = () => null;

jest.unstable_mockModule('../../src/models/User.js', () => {
  const Model = {
    findOne: jest.fn((filter = {}) => queryResult(findByEmail(filter?.email))),
    findById: jest.fn(() => queryResult(null)),
    create: jest.fn(async (doc) => ({ ...doc, _id: '507f1f77bcf86cd799439099' })),
    updateOne: jest.fn(async () => ({ acknowledged: true })),
    findByIdAndUpdate: jest.fn(() => queryResult(null)),
    find: jest.fn(() => queryResult([])),
    modelName: 'User',
  };
  // P2-11: routes/auth.js imports this named helper (history checks).
  return { default: Model, passwordMatchesHash: async () => ({ ok: false, legacy: false }), __esModule: true };
});
jest.unstable_mockModule('../../src/models/RefreshToken.js', () => ({
  default: {
    create: jest.fn(async () => ({})),
    getTokenKey: (t) => `key:${String(t).slice(0, 8)}`,
    deleteMany: jest.fn(async () => ({})),
  },
  __esModule: true,
}));
jest.unstable_mockModule('../../src/models/Patient.js', () => ({
  default: {
    create: jest.fn(async () => ({})),
    findOne: jest.fn(() => queryResult(null)),
    findById: jest.fn(() => queryResult(null)),
    find: jest.fn(() => queryResult([])),
  },
  __esModule: true,
}));
jest.unstable_mockModule('../../src/models/Doctor.js', () => ({
  default: {
    findOne: jest.fn(() => queryResult(null)),
    findById: jest.fn(() => queryResult(null)),
    find: jest.fn(() => queryResult([])),
  },
  __esModule: true,
}));

const supertest = (await import('supertest')).default;
const { app, csrfAgent, withCsrf } = await import('../helpers/app.js');


describe('AUTH-01 · /api/auth/google-register must prove the Google identity', () => {
  it('refuses a malformed body (validation gate)', async () => {
    const agent = await csrfAgent();
    const res = await withCsrf(agent, 'post', '/api/auth/google-register').send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  it('must not issue a session for an existing PATIENT account without a Google credential', async () => {
    findByEmail = (email) => (email === victimPatient.email ? victimPatient : null);
    const agent = await csrfAgent();
    const res = await withCsrf(agent, 'post', '/api/auth/google-register').send({
      name: 'Attacker', email: victimPatient.email, role: 'patient',
    });
    // Desired: 401/403 — no verified Google id_token, no session.
    expect([401, 403]).toContain(res.status);
    expect(res.body?.token).toBeUndefined();
  });

  it('must not issue an ADMIN session for an existing hospital admin account', async () => {
    findByEmail = (email) => (email === victimAdmin.email ? victimAdmin : null);
    const agent = await csrfAgent();
    const res = await withCsrf(agent, 'post', '/api/auth/google-register').send({
      name: 'Attacker', email: victimAdmin.email, role: 'patient',
    });
    expect([401, 403]).toContain(res.status);
    expect(res.body?.token).toBeUndefined();
  });

  it('must not create a self-declared hospital_admin account from a bare email', async () => {
    findByEmail = () => null;
    const agent = await csrfAgent();
    const res = await withCsrf(agent, 'post', '/api/auth/google-register').send({
      name: 'Attacker Admin', email: 'new-admin@example.test', role: 'hospital_admin',
    });
    expect(res.status).not.toBe(201);
    expect(res.body?.token).toBeUndefined();
  });

describe('AUTH-02 · login must honour twoFactorEnabled', () => {
  it('rejects a wrong password with 401 (baseline)', async () => {
    findByEmail = () => ({ ...victimPatient, comparePassword: async () => false });
    const agent = await csrfAgent();
    const res = await withCsrf(agent, 'post', '/api/auth/login').send({
      email: victimPatient.email, password: 'WrongPass1!',
    });
    expect(res.status).toBe(401);
    expect(res.body.token).toBeUndefined();
  });

  it('must not return a session token before the TOTP step', async () => {
    findByEmail = () => twoFactorUser;
    const agent = await csrfAgent();
    const res = await withCsrf(agent, 'post', '/api/auth/login').send({
      email: twoFactorUser.email, password: 'CorrectPass1!',
    });
    // Desired: 401/403 with requiresTwoFactor:true and NO token.
    expect(res.body?.token).toBeUndefined();
    expect(res.body?.requiresTwoFactor).toBe(true);
  });
});

describe('unauthenticated surface', () => {
  it('rejects admin dispatch queues without a token', async () => {
    const agent = await csrfAgent();
    for (const path of ['/api/admin/riders/pending', '/api/admin/lawyers/pending', '/api/admin/assistants/pending']) {
      const res = await agent.get(path);
      expect([401, 403]).toContain(res.status);
    }
  });

  it('rejects protected patient data without a token', async () => {
    const agent = await csrfAgent();
    for (const path of ['/api/users', '/api/payments', '/api/records', '/api/chat/conversations']) {
      const res = await agent.get(path);
      expect([401, 403]).toContain(res.status);
    }
  });

  it('rejects a malformed bearer token', async () => {
    const agent = await csrfAgent();
    const res = await agent.get('/api/payments').set('Authorization', 'Bearer not.a.jwt');
    expect(res.status).toBe(401);
  });

  it('does not leak environment internals on /api/health', async () => {
    const agent = await csrfAgent();
    const res = await agent.get('/api/health');
    const body = JSON.stringify(res.body);
    expect(body).not.toMatch(/mongodb(\+srv)?:\/\//i);
    expect(body).not.toMatch(/JWT_SECRET|BREVO_API_KEY|CLOUDINARY_URL|GEMINI_API_KEY/i);
    expect(body).not.toMatch(/<username>|<password>/);
  });
});

describe('CSRF enforcement', () => {
  it('blocks a state-changing request with no double-submit token', async () => {
    const res = await supertest(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.test', password: 'whatever' });
    expect(res.status).toBe(403);
    expect(String(res.body.message)).toMatch(/CSRF/i);
  });

  it('blocks a request whose header token does not match the cookie', async () => {
    const agent = await csrfAgent();
    const res = await agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', 'deadbeef-not-the-cookie-value')
      .send({ email: 'a@b.test', password: 'whatever' });
    expect(res.status).toBe(403);
  });

  it('exempts safe methods (GET) from the token requirement', async () => {
    const agent = await csrfAgent();
    const res = await agent.get('/api/auth/csrf-token');
    expect(res.status).toBe(200);
    expect(res.body.csrfToken).toBeTruthy();
  });

  it('never accepts a client-supplied isEmergency flag as a CSRF bypass', async () => {
    const res = await supertest(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.test', password: 'whatever', isEmergency: true });
    expect(res.status).toBe(403);
  });
});

});
