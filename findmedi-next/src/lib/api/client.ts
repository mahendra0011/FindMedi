import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import type { ApiResponse, ApiError } from '@/types/api';

/**
 * Normalize BASE API URL so that even if NEXT_PUBLIC_API_URL is configured without "/api"
 * (e.g. "https://medicore-main.onrender.com" or "https://findmedi.online"),
 * or with trailing slashes, it will ALWAYS correctly end with "/api".
 */
export function getApiBaseUrl(): string {
  let url = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001').trim();
  url = url.replace(/\/+$/, '');
  if (!url.endsWith('/api')) {
    url = `${url}/api`;
  }
  return url;
}

/** Returns backend server origin without the "/api" suffix. */
export function getServerOrigin(): string {
  return getApiBaseUrl().replace(/\/api\/?$/, '');
}

const BASE_URL = getApiBaseUrl();

/** Read a value from localStorage safely (SSR-safe). */
export function getStorageItem(key: string): string | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Write a value to localStorage safely (SSR-safe). */
function setStorageItem(key: string, value: string): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function removeStorageItem(key: string): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match && match[2] ? decodeURIComponent(match[2]) : null;
}

/** Axios instance with base URL, timeout, and auto cookie-based auth */
export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// In-memory token cache — survives across requests but not page reloads
// (page reload reads from localStorage via the init below)
let accessTokenCache: string | null = getStorageItem('token');
let refreshTokenCache: string | null = getStorageItem('refreshToken');

/** Set auth tokens (both in-memory and localStorage). */
export function setAuthTokens(accessToken: string, refreshToken?: string): void {
  accessTokenCache = accessToken;
  if (refreshToken) {
    refreshTokenCache = refreshToken;
    setStorageItem('refreshToken', refreshToken);
  }
  setStorageItem('token', accessToken);
}

/** Clear auth tokens from both memory and localStorage. */
export function clearAuthTokens(): void {
  accessTokenCache = null;
  refreshTokenCache = null;
  removeStorageItem('token');
  removeStorageItem('refreshToken');
  removeStorageItem('user');
}

// ─── Request Interceptor: CSRF token + Authorization Header + FormData ──────
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    const token = accessTokenCache || getStorageItem('token');
    if (token && !config.headers['Authorization']) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    const method = (config.method || 'get').toLowerCase();
    if (['post', 'put', 'patch', 'delete'].includes(method)) {
      const csrfToken = getCookie('csrf-token');
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
    }
    return config;
  },
  (error: unknown) => Promise.reject(error),
);

// ─── Auto token refresh (401 → /auth/refresh → retry) ──────────────────────
let isRefreshing = false;
interface RefreshQueueItem {
  resolve: () => void;
  reject: (reason?: unknown) => void;
}

let refreshQueue: RefreshQueueItem[] = [];

const subscribeRefresh = (resolve: () => void, reject: (reason?: unknown) => void) => {
  refreshQueue.push({ resolve, reject });
};

const onRefreshed = () => {
  refreshQueue.forEach((q) => q.resolve());
  refreshQueue = [];
};

const onRefreshFailed = () => {
  refreshQueue.forEach((q) => q.reject(new Error('Session refresh failed')));
  refreshQueue = [];
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const refreshSession = async (): Promise<boolean> => {
  const currentRefresh = refreshTokenCache || getStorageItem('refreshToken');
  let lastErr: unknown;

  for (let i = 0; i < 3; i++) {
    try {
      const res = await apiClient.post('/auth/refresh', currentRefresh ? { refreshToken: currentRefresh } : {});
      if (res.data?.token) {
        accessTokenCache = res.data.token;
        setStorageItem('token', res.data.token);
      }
      if (res.data?.refreshToken) {
        refreshTokenCache = res.data.refreshToken;
        setStorageItem('refreshToken', res.data.refreshToken);
      }
      return true;
    } catch (err) {
      lastErr = err;
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr?.response) throw err;
      await delay(700 * (i + 1));
    }
  }
  throw lastErr;
};

// Paths that should NOT auto-refresh (auth endpoints themselves)
const NO_AUTO_REFRESH_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/google',
  '/auth/verify-otp',
  '/auth/resend-otp',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/doctor-setup',
  '/auth/refresh',
  '/auth/logout',
];

function isNoAutoRefresh(url: string = ''): boolean {
  return NO_AUTO_REFRESH_PATHS.some((p) => url.startsWith(p));
}

// ─── Response Interceptor: Unified error handling + auto-refresh ───────────
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    const url = response.config?.url || '';

    // Capture tokens from auth responses
    if (
      url.startsWith('/auth/login') ||
      url.startsWith('/auth/verify-otp') ||
      url.startsWith('/auth/google') ||
      url.startsWith('/auth/refresh')
    ) {
      if (response.data?.token) {
        accessTokenCache = response.data.token;
        setStorageItem('token', response.data.token);
      }
      if (response.data?.refreshToken) {
        refreshTokenCache = response.data.refreshToken;
        setStorageItem('refreshToken', response.data.refreshToken);
      }
    }
    return response;
  },
  async (error: unknown) => {
    const err = error as {
      config?: InternalAxiosRequestConfig & { _retryCount?: number; _retried?: boolean };
      response?: { status: number; data: unknown };
      code?: string;
    };

    const original: InternalAxiosRequestConfig & { _retryCount?: number; _retried?: boolean; _skipRetry?: boolean } =
      err.config || ({} as InternalAxiosRequestConfig);
    const attempt = original._retryCount || 0;
    const method = (original.method || 'get').toLowerCase();

    // 1) Transient errors → silent retry (GET/HEAD only)
    const isTransient = !err.response || err.response?.status === 503;
    if (isTransient && !original._skipRetry && (method === 'get' || method === 'head') && attempt < 5) {
      original._retryCount = attempt + 1;
      await delay(400 * (attempt + 1));
      return apiClient(original);
    }

    // 2) Access token expired → refresh → retry
    if (err.response?.status === 401 && !original._retried && !isNoAutoRefresh(original.url || '')) {
      original._retried = true;

      if (isRefreshing) {
        return new Promise<void>((resolve, reject) => {
          subscribeRefresh(resolve, reject);
        }).then(() => apiClient(original));
      }

      isRefreshing = true;
      try {
        const ok = await refreshSession();
        if (ok) {
          onRefreshed();
          return apiClient(original);
        }
      } catch (refreshErr) {
        onRefreshFailed();
        const re = refreshErr as { response?: { status?: number } };
        if (re?.response && [401, 400, 403].includes(re.response.status!)) {
          clearAuthTokens();
        }
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    if (err.response) {
      const { status, data } = err.response;
      const message =
        (data as { message?: string; error?: string })?.message ||
        (data as { message?: string; error?: string })?.error ||
        'Request failed';

      const enhanced = new Error(message) as Error & { status: number; data: unknown; response: { status: number; data: unknown } };
      enhanced.status = status;
      enhanced.data = data;
      enhanced.response = { status, data: data as Record<string, unknown> };
      return Promise.reject(enhanced);
    }

    if (err.code === 'ECONNABORTED') {
      return Promise.reject(new Error('Request timed out. Please try again.'));
    }

    return Promise.reject(new Error('Network error. Please check your connection.'));
  },
);

/** Proactive silent token refresh (called by useProactiveTokenRefresh hook). */
export async function refreshAccessToken(): Promise<boolean | null> {
  try {
    const res = await apiClient.post('/auth/refresh', refreshTokenCache ? { refreshToken: refreshTokenCache } : {});
    return res.status === 200;
  } catch (err) {
    const e = err as { response?: { status?: number } };
    if (e?.response && [401, 400, 403].includes(e.response.status!)) {
      return false; // genuine logout needed
    }
    return null; // transient failure — try again next cycle
  }
}

/** Custom request options — `body` instead of Axios' `data`. */
export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Generic request wrapper with typed response.
 * Usage: `request<User>('/auth/me')`
 *
 * The `body` field is our own shorthand — it maps to Axios' `data`.
 * This keeps the endpoint definitions clean: { method: 'POST', body: JSON.stringify(...) }.
 */
export async function request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers: extraHeaders } = options;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  const response = await apiClient({
    url: path,
    method,
    data: body,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...extraHeaders,
    },
  });
  return response.data;
}

/** Download a file (PDF, image) as a blob URL. */
export async function downloadFile(path: string, filename: string): Promise<void> {
  const response = await apiClient.get(path, { responseType: 'blob' });
  const blob = new Blob([response.data]);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
