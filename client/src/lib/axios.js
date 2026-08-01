import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

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

// ─── Request Interceptor: CSRF token + FormData ────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
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
      const res = await apiClient.post('/auth/refresh');
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
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config || {};
    const attempt = original._retryCount || 0;
    const method = (original.method || 'get').toLowerCase();

    // 1) Transient network errors (backend restart / brief hiccup) → silent retry.
    //    Sirf GET/HEAD retry karo — POST/PUT/DELETE ko retry karne se double-booking
    //    ya "slot already booked" jaisi galat errors aati thi (server ne request process
    //    kar li thi, sirf response kho gaya tha).
    if (!error.response && !original._skipRetry && (method === 'get' || method === 'head') && attempt < 5) {
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
          if (!window.location.pathname.startsWith('/login')) {
            window.location.href = '/login';
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