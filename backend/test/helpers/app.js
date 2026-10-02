/**
 * Shared test bootstrap.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * `src/index.js` only skips the Mongo/socket boot when NODE_ENV === 'test'
 * (see the `if (process.env.NODE_ENV !== 'test')` guard around
 * `mongoose.connect`), so every suite must force that value *before* the app
 * module is imported. Jest normally sets NODE_ENV=test itself, but
 * `dotenv.config()` inside src/index.js re-reads backend/.env and a stray
 * `NODE_ENV=development` there would otherwise flip the app into "connect to
 * Atlas" mode during tests.
 *
 * This module is imported first by every suite (`import '../helpers/app.js'`)
 * so the ordering is deterministic even when suites are re-ordered.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-do-not-use-outside-tests';
process.env.CSRF_TEST_BYPASS = process.env.CSRF_TEST_BYPASS || '';

import request from 'supertest';
import mongoose from 'mongoose';

// Suites mock the data layer, so any query that slips through un-mocked must
// fail in milliseconds instead of buffering for mongoose' default 10 s (which
// otherwise stalls whole suites — an audit-log write alone added 20 s once).
mongoose.set('bufferCommands', false);
mongoose.set('bufferTimeoutMS', 50);

const { default: app } = await import('../../src/index.js');

export { app };

/**
 * Supertest agent that holds the CSRF cookie, mirroring what a browser client
 * does (`frontend/src/lib/axios.js` sends the cookie value back in
 * `X-CSRF-Token`). Every state-changing request in these suites must use the
 * agent returned here, otherwise `csrfProtection` answers 403 — which is the
 * behaviour we actually want in production.
 */
export async function csrfAgent() {
  const agent = request.agent(app);
  const res = await agent.get('/api/auth/csrf-token');
  if (!res.body?.csrfToken) {
    throw new Error('could not obtain CSRF token from /api/auth/csrf-token');
  }
  agent.__csrfToken = res.body.csrfToken;
  return agent;
}

export function withCsrf(agent, method, path) {
  return agent[method](path).set('X-CSRF-Token', agent.__csrfToken);
}

/** Minimal unsigned JWT helper for tests (the app only verifies, never mints here). */
export function unsignedJwt(payload) {
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${b64({ alg: 'none', typ: 'JWT' })}.${b64(payload)}.`;
}
