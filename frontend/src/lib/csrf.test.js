/**
 * The CSRF bootstrap, which is what made login work at all.
 *
 * Regression context: the server issues a double-submit cookie from
 * `GET /api/auth/csrf-token` and returns 403 "CSRF validation failed: missing
 * token" on every state-changing request without it. NOTHING in this app called
 * that endpoint, so a first-time visitor had no cookie and could not log in,
 * register, or use forgot-password. The interceptor read a cookie that nothing
 * had ever set and silently attached no header.
 *
 * These tests pin the three properties that make the fix work: the token is
 * fetched when absent, parallel writes share one fetch, and a rejected token is
 * re-minted exactly once.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── A minimal document.cookie jar, since jsdom's is not the thing under test ──
let jar = {};

function installDocument() {
  jar = {};
  global.document = {
    get cookie() {
      return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
    },
    set cookie(str) {
      const [pair] = str.split(';');
      const idx = pair.indexOf('=');
      const name = pair.slice(0, idx).trim();
      const value = pair.slice(idx + 1).trim();
      // Max-Age=0 / a past `expires` is a deletion.
      if (/Max-Age=0|expires=Thu, 01 Jan 1970/i.test(str)) delete jar[name];
      else jar[name] = value;
    },
  };
  global.window = { location: { pathname: '/' } };
}

installDocument();

// Mock axios BEFORE importing the module under test, because the module creates
// its client and registers interceptors at import time.
const get = vi.fn();
const requestUse = vi.fn();
const responseUse = vi.fn();

vi.mock('axios', () => {
  // The retry path calls `apiClient(original)`, so the client must be CALLABLE,
  // not just an object with `.get` and `.interceptors`. The first version made it
  // a plain object and the one test that exercises the replay failed on
  // "apiClient is not a function" — a harness gap, not a product bug.
  const instance = Object.assign(
    vi.fn(async (config) => ({ data: {}, status: 200, config })),
    {
      get: (...a) => get(...a),
      interceptors: { request: { use: requestUse }, response: { use: responseUse } },
      defaults: { headers: { common: {} } },
    }
  );
  return { default: { create: vi.fn(() => instance) } };
});

/** Run the captured request interceptor against a config. */
const runRequestInterceptor = async (config) => requestUse.mock.calls[0][0](config);

/** Run the captured response-error interceptor. */

describe('CSRF · the token endpoint is actually called', () => {
  it('does not perform an eager network request when imported under Vitest', () => {
    // Browser bootstrap warms CSRF at startup; unit tests keep that network
    // side effect disabled and exercise ensureCsrfToken through request writes.
    expect(get).not.toHaveBeenCalled();
  });

  it('a warm-up failure does not throw at import time', async () => {
    vi.resetModules();
    installDocument();
    get.mockReset();
    get.mockRejectedValue(new Error('offline'));
    await expect(import('./axios')).resolves.toBeDefined();
  });
});

describe('CSRF · every state-changing request carries the header', () => {
  it('attaches X-CSRF-Token to a POST', async () => {
    const cfg = await runRequestInterceptor({ method: 'post', headers: {} });
    expect(cfg.headers['X-CSRF-Token']).toBeTruthy();
  });

  it('attaches it to PUT, PATCH and DELETE too', async () => {
    for (const method of ['put', 'patch', 'delete']) {
      const cfg = await runRequestInterceptor({ method, headers: {} });
      expect(cfg.headers['X-CSRF-Token']).toBeTruthy();
    }
  });

  it('does NOT attach it to a GET, and does not trigger a fetch', async () => {
    // A GET must stay free of the token round-trip.
    const before = get.mock.calls.length;
    const cfg = await runRequestInterceptor({ method: 'get', headers: {} });
    expect(cfg.headers['X-CSRF-Token']).toBeUndefined();
    expect(get.mock.calls.length).toBe(before);
  });

  it('fetches the token when the cookie is missing', async () => {
    delete jar['csrf-token'];
    const before = get.mock.calls.length;
    await runRequestInterceptor({ method: 'post', headers: {} });
    expect(get.mock.calls.length).toBe(before + 1);
  });

  it('reuses an existing cookie instead of refetching', async () => {
    jar['csrf-token'] = 'already-there';
    const before = get.mock.calls.length;
    const cfg = await runRequestInterceptor({ method: 'post', headers: {} });
    expect(cfg.headers['X-CSRF-Token']).toBe('already-there');
    expect(get.mock.calls.length).toBe(before);
  });
});

describe('CSRF · parallel writes share ONE token fetch', () => {
  it('does not mint a new token per request in a burst', async () => {
    // Three parallel POSTs with no cookie must not race to mint three tokens:
    // the last one to set the cookie would disagree with the header another
    // request already sent, which is a 403 waiting to happen.
    delete jar['csrf-token'];
    get.mockClear();
    await Promise.all([
      runRequestInterceptor({ method: 'post', headers: {} }),
      runRequestInterceptor({ method: 'post', headers: {} }),
      runRequestInterceptor({ method: 'post', headers: {} }),
    ]);
    expect(get.mock.calls.length).toBe(1);
  });
});

describe('CSRF · a rejected token is re-minted exactly once', () => {
  const csrfError = (overrides = {}) => ({
    response: { status: 403, data: { message: 'CSRF validation failed: missing token' } },
    config: { url: '/auth/login', method: 'post', headers: {}, ...overrides },
  });

  it('clears the cookie so the retry really refetches', async () => {
    jar['csrf-token'] = 'stale';
    await runResponseError(csrfError());
    // The replay re-runs the request interceptor, which must not be satisfied by
    // the very cookie the server just rejected.
    expect(jar['csrf-token']).not.toBe('stale');
  });

  it('does not retry the token endpoint itself', async () => {
    // Otherwise the retry would refetch a token, get 403 again, and loop.
    await expect(
      runResponseError(csrfError({ url: '/auth/csrf-token', method: 'get' }))
    ).rejects.toBeDefined();
  });

  it('replays at most once', async () => {
    await expect(runResponseError(csrfError({ _csrfRetried: true }))).rejects.toBeDefined();
  });

  it('leaves an unrelated 403 alone', async () => {
    // Authorization denials also return 403. Retrying one would mask a real
    // permission decision behind a token refetch.
    const err = {
      response: { status: 403, data: { message: 'Forbidden' } },
      config: { url: '/admin/thing', method: 'post', headers: {} },
    };
    await expect(runResponseError(err)).rejects.toBeDefined();
  });
});

const runResponseError = async (error) => responseUse.mock.calls[0][1](error);

beforeEach(async () => {
  vi.resetModules();
  get.mockReset();
  requestUse.mockReset();
  responseUse.mockReset();
  installDocument();
  // Each `get('/auth/csrf-token')` mints a cookie, the way the server does.
  get.mockImplementation(async () => {
    jar['csrf-token'] = `tok-${get.mock.calls.length}`;
    return { data: {} };
  });
  await import('./axios');
});

// ── FE-B-01 follow-up: the storage the fix was supposed to end ──────────────
describe('FE-B-01 · no token is ever written to script-readable storage', () => {
  const localStore = {};
  beforeEach(() => {
    for (const k of Object.keys(localStore)) delete localStore[k];
    global.localStorage = {
      getItem: (k) => (k in localStore ? localStore[k] : null),
      setItem: (k, v) => { localStore[k] = String(v); },
      removeItem: (k) => { delete localStore[k]; },
    };
  });

  it('importing the module does not re-create a token in localStorage', async () => {
    localStore.refreshToken = 'legacy-value';
    vi.resetModules();
    installDocument();
    get.mockReset();
    get.mockImplementation(async () => { jar['csrf-token'] = 't'; return { data: {} }; });
    await import('./axios');
    // The one-time migration must DELETE the old copy, not leave it.
    expect(localStore.refreshToken).toBeUndefined();
  });

  it('setAuthTokens stores nothing at all', async () => {
    const mod = await import('./axios');
    mod.setAuthTokens('access-abc', 'refresh-xyz');
    // The signature still accepts the second argument for call-site
    // compatibility, but it must be ignored, not persisted.
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
  });

  it('clearRefreshTokenCache nulls memory and wipes storage', async () => {
    const mod = await import('./axios');
    mod.setAuthTokens('access-abc');
    localStore.token = 'stale';
    localStore.refreshToken = 'stale';
    mod.clearRefreshTokenCache();
    expect(mod.getAccessToken()).toBeNull();
    expect(localStore.token).toBeUndefined();
    expect(localStore.refreshToken).toBeUndefined();
  });
});
