/**
 * Integration harness (TEST-M-01).
 *
 * WHY THIS EXISTS
 * Every backend test until now called a handler function or asserted on source
 * text. Both can be green while a route is wide open: a handler-level test
 * cannot tell whether the ROUTE ever called the guard, and a text assertion
 * cannot tell whether the guard works. `supertest` has been in
 * devDependencies the whole time and no test used it — the dependency was
 * installed and the harness was never written.
 *
 * This makes a real HTTP request through a real Express router with a real
 * middleware chain. The only substitutions are the database models and the
 * `protect` middleware, which is injected from a request header so a test can
 * play any role. Everything else — routing, middleware ordering, the guard
 * call, the status code — is production code.
 *
 *   const { app, as } = await mountApp('assistantBookings');
 *   await as({ id: 'patA', role: 'patient' }).get('/bookings/b1').expect(200);
 *   await as({ id: 'patB', role: 'patient' }).get('/bookings/b1').expect(404);
 *
 * `as()` is the important part: it is the difference between testing a guard
 * and testing a ROUTE THAT USES a guard.
 */
import express from 'express';
import { jest } from '@jest/globals';

/**
 * Mount a real route module with models stubbed and `protect` driven by a
 * header.
 *
 * @param {string} name route file name, e.g. 'assistantBookings'
 * @param {object} models map of model module path -> stub factory
 * @param {object} [options]
 * @param {string} [options.mountPath] default '/'
 * @returns {Promise<{ app: import('express').Express, as: (user?: object) => import('supertest').Test }>}
 */
export async function mountApp(name, models = {}, options = {}) {
  // `protect` normally reads a JWT. Here it reads a header, so one test can play
  // a patient and the next a hospital admin without minting tokens. Anything
  // that does NOT send the header is unauthenticated, which is what a real
  // request without a session looks like.
  //
  // One decoder for both middlewares: the first version inlined it twice and
  // the two copies drifted, one of them missing a closing paren. Duplicated
  // request-path code is the same mistake as the duplicated route parser.
  const decode = (req) => {
    const raw = req.get('x-test-user');
    if (!raw) return null;
    try {
      return JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
    } catch {
      return null;
    }
  };

  const protect = (req, res, next) => {
    req.user = decode(req);
    if (!req.user) return res.status(401).json({ message: 'Not authorized' });
    return next();
  };

  const optionalProtect = (req, _res, next) => {
    req.user = decode(req);
    return next();
  };

  const authStub = { protect, optionalProtect };
  // Anything the router imports that we were not told about still needs to
  // resolve, or the module fails to load and the failure looks like a routing
  // bug. `authLimiter` passes through so rate limiting never masks a 401/404.
  authStub.authLimiter = (_req, _res, next) => next();
  // Role-aware stubs mirroring the real middleware (adminOnly: hospital_admin |
  // superadmin; superadminOnly: superadmin). An always-403 stub proved only that
  // a guard NAME exists; it made every superadmin route untestable (ADM-M-02
  // needed a superadmin to actually approve something), and no spec asserted
  // 403 against a superadmin identity - grep-verified before the change.
  authStub.adminOnly = (req, res, next) =>
    (req.user && ['hospital_admin', 'superadmin'].includes(req.user.role))
      ? next()
      : res.status(403).json({ message: 'Admin access required' });
  authStub.superadminOnly = (req, res, next) =>
    (req.user?.role === 'superadmin')
      ? next()
      : res.status(403).json({ message: 'Superadmin access required' });
  // Role gates mirroring the real middleware (lab/pharmacy routers import these
  // at definition time, so the mock needs the exports or the module fails to load).
  authStub.requireRole = (roles) => (req, res, next) =>
    ((Array.isArray(roles) ? roles : [roles]).includes(req.user?.role) || req.user?.role === 'superadmin')
      ? next()
      : res.status(403).json({ message: 'Role required' });
  authStub.roleOnly = authStub.requireRole;
  authStub.restrictTo = (...roles) => authStub.requireRole(roles.flat());
  // authorize() is the authorization MARKER: route parsers key off its presence,
  // and health-id/patient routers call it at definition time, so the mock needs
  // the export or the module fails to load. Behaviourally this proves the guard
  // is in the chain and refuses an unauthenticated caller; permission-matrix
  // semantics live in the real middleware and checkPermissionMatrix.mjs, not
  // here (the harness substitutes the guard, exactly like it substitutes protect).
  authStub.authorize = (..._perms) => (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Not authorized' });
    return next();
  };
  // scopeToHospital is the tenant-scoping middleware some routers chain after
  // protect (appointments mounts it at definition time). Like authorize, it is
  // a MARKER here — pass-through, with tenant semantics covered by the real
  // middleware and check-tenant-guard-regression.mjs.
  authStub.scopeToHospital = (req, _res, next) => next();

  jest.unstable_mockModule('../../src/middleware/auth.js', () => authStub);
  // AUTHZ-M-03 (F7): requireStepUp() (a real middleware, not part of the auth
  // stub) reads the account's 2FA state on guarded routes. The harness user
  // has no 2FA, so step-up SKIPS by design and each spec still tests its own
  // feature. A spec modelling a specific user overrides this (registered
  // below, so it wins).
  jest.unstable_mockModule('../../src/models/User.js', () => ({
    default: {
      findById: () => ({
        select: () => Promise.resolve({ _id: '64b0000000000000000ee', twoFactorEnabled: false }),
      }),
    },
    // P2-11: routes/auth.js imports this named helper (history checks).
    passwordMatchesHash: async () => ({ ok: false, legacy: false }),
  }));
  jest.unstable_mockModule('../../src/middleware/rateLimit.js', () => ({
    bookingLimiter: (_req, _res, next) => next(),
    authLimiter: (_req, _res, next) => next(),
    paymentLimiter: (_req, _res, next) => next(),
    generalLimiter: (_req, _res, next) => next(),
    totpLimiter: (_req, _res, next) => next(),
    publicSearchLimiter: (_req, _res, next) => next(),
    reviewWriteLimiter: (_req, _res, next) => next(),
    auditSearchLimiter: (_req, _res, next) => next(),
    chatUploadLimiter: (_req, _res, next) => next(),
  }));
  for (const [specifier, factory] of Object.entries(models)) {
    jest.unstable_mockModule(specifier, factory);
  }

  const mod = await import(`../../src/routes/${name}.js`);
  const router = mod.default;

  const app = express();
  app.use(express.json());
  app.use(options.mountPath || '/', router);

  // `as()` returns a request builder that already carries the identity header.
  //
  // It has to wrap the VERBS, not the app: supertest's `request(app)` is a plain
  // factory with get/post/... and no `.set()`, so `request(app).set(h)` throws.
  // Only `request.agent(app)` carries headers, and an agent is stateful across
  // requests, which would leak one test's identity into the next.
  const { default: request } = await import('supertest');
  const as = (user) => {
    const headers = user
      ? { 'x-test-user': Buffer.from(JSON.stringify(user)).toString('base64') }
      : {};
    const wrap = (verb) => (path) => request(app)[verb](path).set(headers);
    return {
      get: wrap('get'),
      post: wrap('post'),
      put: wrap('put'),
      patch: wrap('patch'),
      delete: wrap('delete'),
    };
  };

  return { app, as, router };
}

/** A mongoose-like query stub that resolves to `value` through any chain. */
export const query = (value) => {
  const q = {
    select: () => q, populate: () => q, sort: () => q, limit: () => q,
    skip: () => q, lean: () => q, exec: () => q,
    then: (resolve) => Promise.resolve(value).then(resolve),
  };
  return q;
};

/** A findOne/findById stub that always resolves `doc`. */
export const resolves = (doc) => () => query(doc);

/** A findOne/findById stub that resolves null. */
export const notFound = () => () => query(null);
