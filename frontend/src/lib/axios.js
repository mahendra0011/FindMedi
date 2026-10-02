import axios from 'axios';

/**
 * Normalize BASE API URL so that even if VITE_API_URL is configured without "/api"
 * (e.g. "https://findmedi-main.onrender.com" or "https://findmedi.online"),
 * or with trailing slashes, it will ALWAYS correctly end with "/api".
 */
export function getApiBaseUrl() {
  let url = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').trim();
  url = url.replace(/\/+$/, '');
  if (!url.endsWith('/api')) {
    url = `${url}/api`;
  }
  return url;
}

/**
 * Returns backend server origin without the "/api" suffix
 * (e.g. "https://findmedi-main.onrender.com" or "http://localhost:5001").
 */
export function getServerOrigin() {
  return getApiBaseUrl().replace(/\/api\/?$/, '');
}

const BASE = getApiBaseUrl();

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

/** Axios instance with base URL, timeout, and auto cookie-based auth */
const apiClient = axios.create({
  baseURL: BASE,
  timeout: 20000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// ─── FE-B-01: token storage ────────────────────────────────────────────────
//
// The server ALREADY sets both tokens as httpOnly cookies (`auth.js`:
// `res.cookie('token', { httpOnly: true, secure, sameSite })`). Every byte of
// JavaScript on the page — including any XSS payload and any compromised npm
// dependency — is therefore already unable to read them.
//
// Writing them to `localStorage` as well actively UNDID that protection: it
// created a second, script-readable copy of the refresh token, which is valid for
// weeks and can be exchanged for a fresh access token at leisure. It converted a
// contained XSS bug into permanent account takeover, and on a platform holding
// PHI that is the whole ballgame.
//
// The access token now lives ONLY in a module-scoped variable. That is a real
// trade-off and it is the right one: a page reload costs one silent
// `/auth/refresh` round-trip, which the app already performs on boot, and in
// exchange a token cannot be stolen by anything that can run script.
//
// The original comment claimed localStorage was needed because cross-origin
// httpOnly cookies get dropped by the browser. That is true only when the
// cookie lacks `SameSite=None; Secure` — which the server sets in production, and
// which the deployed origin now shares. localStorage was a workaround for a
// problem that is already solved at the correct layer.
let accessTokenCache = null;

// One-time migration: if a previous build left tokens in localStorage, delete
// them. Leaving them would keep the vulnerability alive for every user who has
// ever logged in, even though the new code never reads them.
(() => {
  try {
    if (typeof localStorage === 'undefined') return;
    for (const key of ['token', 'refreshToken']) {
      if (localStorage.getItem(key) !== null) {
        localStorage.removeItem(key);
        console.warn(
          `[security] removed legacy ${key} from localStorage — tokens are now httpOnly cookies.`
        );
      }
    }
  } catch { /* storage unavailable (private mode / SSR) */ }
})();

/** The in-memory access token, for socket handshakes and other non-axios reads. */
export const getAccessToken = () => accessTokenCache;

// ─── CSRF token bootstrap ──────────────────────────────────────────────────
//
// The server issues a double-submit cookie from `GET /api/auth/csrf-token` and
// REQUIRES it on every state-changing request:
//
//   if (!tokenFromCookie || !tokenFromHeader || cookie !== header)
//     return 403 'CSRF validation failed: missing token'
//
// Nothing in this app ever called that endpoint. The cookie was only ever set as
// a side effect of some OTHER request, so a first-time visitor — who has exactly
// the request that matters most, logging in — had no cookie, the interceptor
// attached no header, and login / register / forgot-password all failed with
// "CSRF validation failed: missing token".
//
// Fetched on demand rather than at app boot, because a boot-time fetch races
// every other request the app fires on load. `ensureCsrfToken` is also
// concurrency-safe: a burst of parallel writes shares ONE in-flight request
// rather than racing to mint several tokens and leaving the cookie disagreeing
// with the last header that was sent.
let csrfFetch = null;

async function ensureCsrfToken() {
  const existing = getCookie('csrf-token');
  if (existing) return existing;
  if (!csrfFetch) {
    csrfFetch = apiClient
      .get('/auth/csrf-token', { withCredentials: true })
      .then(() => getCookie('csrf-token'))
      .finally(() => { csrfFetch = null; });
  }
  return csrfFetch;
}

/**
 * Clear the CSRF cookie so the next `ensureCsrfToken()` actually refetches.
 *
 * It cannot set a past expiry with `document.cookie` on an httpOnly cookie —
 * this one is deliberately NOT httpOnly (the double-submit pattern requires
 * JavaScript to read it), so it CAN be deleted from script. Written for every
 * path shape rather than just `path=/` because a cookie set without an
 * explicit `Path` lands on the directory of the request that set it, and
 * browsers keep both.
 */
function expireCsrfToken() {
  if (typeof document === 'undefined') return;
  for (const path of ['/', window.location.pathname]) {
    document.cookie = `csrf-token=; Max-Age=0; path=${path}`;
    document.cookie = `csrf-token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`;
  }
}

// Warm the cookie so the first user action does not pay a round-trip. A failure
// is swallowed on purpose: `ensureCsrfToken` above is the real guarantee, this is
// only a latency optimisation, and a warm-up failure must not break the app.
if (typeof document !== 'undefined') {
  ensureCsrfToken().catch(() => {});
}

// ─── Request Interceptor: CSRF token + Authorization Header + FormData ──────
apiClient.interceptors.request.use(
  async (config) => {
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    // Attach Authorization header if token is available.
    // FE-B-01: read from memory only. The `localStorage` fallback is gone — that
    // was the vulnerability, and keeping it as a "just in case" would defeat the
    // entire change.
    if (accessTokenCache && !config.headers['Authorization']) {
      config.headers['Authorization'] = `Bearer ${accessTokenCache}`;
    }

    if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())) {
      const csrfToken = await ensureCsrfToken();
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Auto token refresh (401 → /auth/refresh → retry) ──────────────────────
let isRefreshing = false;
let refreshQueue = [];

const subscribeRefresh = (resolve, reject) => refreshQueue.push({ resolve, reject });
const onRefreshed = () => {
  refreshQueue.forEach(q => q.resolve());
  refreshQueue = [];
};
const onRefreshFailed = () => {
  refreshQueue.forEach(q => q.reject(new Error('Session refresh failed')));
  refreshQueue = [];
};

const delay = (ms) => new Promise(r => setTimeout(r, ms));

// Refresh with built-in retry — transient failures (backend restarting) are retried silently.
const refreshSession = async () => {
  let lastErr;
  for (let i = 0; i < 3; i++) {
    try {
      // FE-B-01: no token in the body. The refresh token is an httpOnly cookie
      // and is sent automatically by `withCredentials: true`. Sending a copy in
      // the request body would require having read it in JS — the exact thing
      // this change exists to prevent.
      const res = await apiClient.post('/auth/refresh');
      if (res.data?.token) {
        // Memory only. The server has also rotated the cookie by now.
        accessTokenCache = res.data.token;
      }
      return res.status === 200;
    } catch (err) {
      lastErr = err;
      if (err.response) throw err; // server answered → session is really dead, no retry
      await delay(700 * (i + 1));
    }
  }
  throw lastErr;
};

// FE-B-04: exported so raw `fetch` call sites (file previews) can force a refresh
// before retrying. A bare `fetch` does not pass through the axios interceptors, so
// it has no other way to recover from an expired access token.
export { refreshSession };

// Endpoints jo session par depend nahi karte — in par kabhi auto-refresh nahi karna.
// (/auth/me session-validated hai aur ISKO refresh karna zaroori hai, warna access
// token expire hone par HMR reload / page reload turant logout kar deta tha.)
const NO_AUTO_REFRESH_PATHS = [
  '/auth/login', '/auth/register', '/auth/google', '/auth/verify-otp',
  '/auth/resend-otp', '/auth/forgot-password', '/auth/reset-password',
  '/auth/doctor-setup', '/auth/ambulance-setup', '/auth/refresh', '/auth/logout',
];

const isNoAutoRefresh = (url = '') => NO_AUTO_REFRESH_PATHS.some(p => url.startsWith(p));

// ─── Response Interceptor: Unified error handling + auto-refresh ───────────
// FE-B-01: the access token is cached in memory only. The refresh token is never
// touched here — it lives entirely in an httpOnly cookie the browser manages.
apiClient.interceptors.response.use(
  (response) => {
    const url = response.config?.url || '';
    if (url.startsWith('/auth/login') || url.startsWith('/auth/verify-otp') ||
        url.startsWith('/auth/google') || url.startsWith('/auth/refresh')) {
      if (response.data?.token) {
        accessTokenCache = response.data.token;
      }
      // If `response.data.refreshToken` is still present on the wire, that is a
      // backend regression — the token must not be script-readable. Warn loudly
      // rather than silently persisting it.
      if (response.data?.refreshToken) {
        console.error(
          '[security] the API returned a refreshToken in the response body. It must '
          + 'be an httpOnly cookie only; please check backend/src/routes/auth.js.'
        );
      }
    }
    return response;
  },
  async (error) => {
    const original = error.config || {};
    const attempt = original._retryCount || 0;
    const method = (original.method || 'get').toLowerCase();

    // 1) Transient errors (backend restart / DB hiccup / brief network drop) → silent retry.
    //    - !error.response  → pure network failure (server down / restarting)
    //    - status 503       → "Service temporarily unavailable" (protect middleware DB hiccup)
    //    Sirf GET/HEAD retry karo — POST/PUT/DELETE ko retry karne se double-booking
    //    ya "slot already booked" jaisi galat errors aati thi (server ne request process
    //    kar li thi, sirf response kho gaya tha).
    const isTransient = !error.response || error.response?.status === 503;
    if (isTransient && !original._skipRetry && (method === 'get' || method === 'head') && attempt < 5) {
      original._retryCount = attempt + 1;
      await delay(400 * (attempt + 1));
      return apiClient(original);
    }

    // 1b) CSRF token rejected → mint a fresh one and replay the request ONCE.
    //
    // The request interceptor already fetches the token, so this should be
    // unreachable. It is here for the case the interceptor cannot cover: the
    // cookie is cleared or rotated between the header being read and the server
    // comparing it. `ensureCsrfToken` returns the EXISTING cookie without
    // refetching, so the token has to be expired explicitly before the retry.
    //
    // Retrying is safe because a CSRF rejection happens BEFORE the route
    // handler runs — the server never acted on the request, so there is nothing
    // to double-submit. Bounded to one replay, and never for the token endpoint
    // itself, which would otherwise loop.
    const isCsrfFailure = error.response?.status === 403 &&
      typeof error.response?.data?.message === 'string' &&
      error.response.data.message.startsWith('CSRF validation failed');

    if (isCsrfFailure && !original._csrfRetried && !String(original.url || '').includes('/auth/csrf-token')) {
      original._csrfRetried = true;
      expireCsrfToken();
      await ensureCsrfToken();
      return apiClient(original);
    }

    // 2) Access token expired → refresh via httpOnly refreshToken cookie, then retry.
    if (error.response?.status === 401 && !original._retried && !isNoAutoRefresh(original.url)) {
      original._retried = true;

      // Another request is already refreshing — wait for it and then retry.
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeRefresh(resolve, reject);
        });
      }

      isRefreshing = true;
      try {
        const ok = await refreshSession();
        if (ok) {
          onRefreshed();
          return apiClient(original);
        }
      } catch (refreshErr) {
        onRefreshFailed(); // release waiting requests so nothing hangs forever
        // If session is truly dead, clear stored tokens
        if (refreshErr.response && (refreshErr.response.status === 401 || refreshErr.response.status === 400 || refreshErr.response.status === 403)) {
          accessTokenCache = null;
          try {
            if (typeof localStorage !== 'undefined') {
              localStorage.removeItem('token');
              localStorage.removeItem('refreshToken');
            }
          } catch { /* ignore */ }

          // Only redirect if user is actively on a protected / dashboard route.
          // NEVER kick guest visitors on public routes (home, doctors, hospitals, medicines, signup, etc.) to login.
          const hash = window.location.hash || '';
          const isDashboardOrAdmin =
            hash.startsWith('#/dashboard') ||
            hash.startsWith('#/admin') ||
            hash.startsWith('#/superadmin') ||
            hash.startsWith('#/doctor') ||
            hash.startsWith('#/patient') ||
            hash.startsWith('#/clinic-admin') ||
            hash.startsWith('#/pharmacy-business') ||
            hash.startsWith('#/lab-business') ||
            hash.startsWith('#/settings') ||
            hash.startsWith('#/upload');

          if (isDashboardOrAdmin) {
            try { apiClient.post('/auth/logout'); } catch { /* ignore */ }
            window.location.hash = '#/login';
          }
        }
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response) {
      const { status, data } = error.response;
      const message = data?.message || data?.error || 'Request failed';

      const enhanced = new Error(message);
      enhanced.status = status;
      enhanced.data = data;
      // App me kayi jagah e.response?.data?.message / e.response?.status use hota
      // hai — .response field bina bane wo sab silently undefined padh rahe the.
      enhanced.response = { status, data };
      return Promise.reject(enhanced);
    }

    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error('Request timed out. Please try again.'));
    }

    return Promise.reject(new Error('Network error. Please check your connection.'));
  }
);

export default apiClient;

// FE-B-01: there is NO refresh-token cache, and deliberately so.
//
// `setAuthTokens` used to keep a module-level `refreshTokenCache` AND mirror
// both tokens into `localStorage`. Removing the `localStorage` copy (the actual
// vulnerability) left the variable's DECLARATION behind while every other
// reference to it survived — so assigning to it threw a `ReferenceError` in an
// ES module, and `setAuthTokens` wrote the tokens straight back to the
// script-readable store the change existed to eliminate. The security fix was
// half-applied and the half that was left broke the app.
//
// The refresh token is an httpOnly cookie now. The browser attaches it to
// `/auth/refresh` on its own; there is nothing for JavaScript to hold, and
// nothing for XSS to steal.
//
// The two exported helpers keep their names and signatures because call sites
// import them, but they now clear only what still exists in memory.

export function setAuthTokens(accessToken) {
  accessTokenCache = accessToken || null;
}

export function clearRefreshTokenCache() {
  accessTokenCache = null;
  // Belt-and-braces: an older build may have left copies behind. Removing them
  // costs nothing and closes the door on the migration above missing a build.
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    }
  } catch { /* storage unavailable (private mode / SSR) */ }
}

// ─── Proactive token refresh ───────────────────────────────────────────────
// Real-world apps access token expire hone se pehle hi background me refresh
// karte hain (reactive 401-trigger refresh nahi). Isse page reload / HMR reload
// ke waqt access token hamesha fresh rehta hai → /auth/me turant 200 deta hai
// → logout kabhi nahi hota code change par.
//
// No body: the refresh token rides as an httpOnly cookie, so `withCredentials`
// is the whole mechanism. Sending a copy in the body would require reading it in
// JS, which is exactly what FE-B-01 removed.
export async function refreshAccessToken() {
  try {
    const res = await apiClient.post('/auth/refresh');
    if (res?.data?.token) accessTokenCache = res.data.token;
    return res.status === 200;
  } catch (err) {
    // Network error / 5xx → transient, koi logout nahi
    // 401/400/403 → refresh token bhi dead, genuine logout (caller handle karega)
    if (err.response && [401, 400, 403].includes(err.response.status)) {
      return false;
    }
    return null; // transient failure — try again next cycle
  }
}