import axios from 'axios';

/**
 * Normalize BASE API URL so that even if VITE_API_URL is configured without "/api"
 * (e.g. "https://medicore-main.onrender.com" or "https://findmedi.online"),
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
 * (e.g. "https://medicore-main.onrender.com" or "http://localhost:5001").
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

// Cross-origin (localhost:5173 → localhost:5001 or findmedi.online → onrender.com)
// me httpOnly cookies third-party restrictions ki wajah se browser drop kar sakta hai.
// Isliye accessToken aur refreshToken ko memory + localStorage me cache karte hain
// aur Authorization header + body fallback se bhejte hain.
let accessTokenCache = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
let refreshTokenCache = typeof localStorage !== 'undefined' ? localStorage.getItem('refreshToken') : null;

// ─── Request Interceptor: CSRF token + Authorization Header + FormData ──────
apiClient.interceptors.request.use(
  (config) => {
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    // Attach Authorization header if token is available
    const token = accessTokenCache || (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null);
    if (token && !config.headers['Authorization']) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())) {
      const csrfToken = getCookie('csrf-token');
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
      const currentRefresh = refreshTokenCache || (typeof localStorage !== 'undefined' ? localStorage.getItem('refreshToken') : null);
      const res = await apiClient.post('/auth/refresh', currentRefresh
        ? { refreshToken: currentRefresh }
        : undefined);
      if (res.data?.token) {
        accessTokenCache = res.data.token;
        try { localStorage.setItem('token', res.data.token); } catch {}
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

// Endpoints jo session par depend nahi karte — in par kabhi auto-refresh nahi karna.
// (/auth/me session-validated hai aur ISKO refresh karna zaroori hai, warna access
// token expire hone par HMR reload / page reload turant logout kar deta tha.)
const NO_AUTO_REFRESH_PATHS = [
  '/auth/login', '/auth/register', '/auth/google', '/auth/verify-otp',
  '/auth/resend-otp', '/auth/forgot-password', '/auth/reset-password',
  '/auth/doctor-setup', '/auth/refresh', '/auth/logout',
];

const isNoAutoRefresh = (url = '') => NO_AUTO_REFRESH_PATHS.some(p => url.startsWith(p));

// ─── Response Interceptor: Unified error handling + auto-refresh ───────────
// Capture token and refreshToken from auth responses so they are always stored
apiClient.interceptors.response.use(
  (response) => {
    const url = response.config?.url || '';
    if (url.startsWith('/auth/login') || url.startsWith('/auth/verify-otp') ||
        url.startsWith('/auth/google') || url.startsWith('/auth/refresh')) {
      if (response.data?.token) {
        accessTokenCache = response.data.token;
        try { localStorage.setItem('token', response.data.token); } catch {}
      }
      if (response.data?.refreshToken) {
        refreshTokenCache = response.data.refreshToken;
        try { localStorage.setItem('refreshToken', response.data.refreshToken); } catch {}
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
        throw new Error('Refresh failed');
      } catch (refreshErr) {
        onRefreshFailed(); // release waiting requests so nothing hangs forever
        // Server ne session ko invalid bataya → hi logout/login redirect karo.
        // Network error par kabhi logout nahi — backend restart hote waqt session preserve rahega.
        if (refreshErr.response && (refreshErr.response.status === 401 || refreshErr.response.status === 400 || refreshErr.response.status === 403)) {
          try { apiClient.post('/auth/logout'); } catch { /* ignore */ }
          if (!window.location.hash.startsWith('#/login') && !window.location.pathname.startsWith('/login')) {
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

// Logout pe cached tokens clear kar do taaki stale token reuse na ho.
export function clearRefreshTokenCache() {
  accessTokenCache = null;
  refreshTokenCache = null;
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  } catch { /* ignore */ }
}

// ─── Proactive token refresh ───────────────────────────────────────────────
// Real-world apps access token expire hone se pehle hi background me refresh
// karte hain (reactive 401-trigger refresh nahi). Isse page reload / HMR reload
// ke waqt access token hamesha fresh rehta hai → /auth/me turant 200 deta hai
// → logout kabhi nahi hota code change par.
export async function refreshAccessToken() {
  try {
    const res = await apiClient.post('/auth/refresh', refreshTokenCache
      ? { refreshToken: refreshTokenCache }
      : undefined);
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