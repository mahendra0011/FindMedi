/**
 * Supertest helper that reproduces the CSRF double-submit pair a real browser
 * client sends.
 *
 * The backend `csrfProtection` middleware (see src/middleware/csrf.js) now
 * requires `x-csrf-token` to match the `csrf-token` cookie on EVERY
 * state-changing request. It used to end in an unconditional `next()`, so any
 * request that carried an `Origin` header skipped the check entirely — which is
 * exactly what these suites were doing when they sent `.set('Origin', ...)` and
 * expected to reach Zod validation.
 *
 * Tests therefore need to fetch a token first and send it back as a header.
 * `request.agent()` persists the cookie, so pairing the agent with the header
 * satisfies the check the same way `frontend/src/lib/axios.js` does in the
 * browser.
 *
 * NOTE: assertions that specifically test the *absence* of a token must keep
 * using bare `request(app)` — see test/docs.test.js.
 */
import request from 'supertest';
import app from '../../src/index.js';

const agent = request.agent(app);
let cachedToken = null;

export async function setupCsrf() {
  const res = await agent.get('/api/auth/csrf-token');
  if (!res.body || !res.body.csrfToken) {
    throw new Error('CSRF helper: could not obtain a token from /api/auth/csrf-token');
  }
  cachedToken = res.body.csrfToken;
  return cachedToken;
}

function send(method, path) {
  if (!cachedToken) {
    throw new Error('CSRF helper: call await setupCsrf() in beforeAll() first');
  }
  return agent[method](path).set('X-CSRF-Token', cachedToken);
}

export const post = (path) => send('post', path);
export const put = (path) => send('put', path);
export const patch = (path) => send('patch', path);
export const del = (path) => send('delete', path);
export const get = (path) => agent.get(path);

export { agent };
