import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

/** Get stored auth token (same order as login) */
function getStoredAuthToken() {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem('hms_token') || localStorage.getItem('token');
}

/** Axios instance with base URL, timeout, and auto token injection */
const apiClient = axios.create({
  baseURL: BASE,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request Interceptor: Auto-attach token ────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    const token = getStoredAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // If FormData, let browser set Content-Type (with boundary)
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor: Unified error handling ──────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      const message = data?.message || data?.error || 'Request failed';

      // Auto-logout on 401 (token expired / invalid)
      if (status === 401) {
        localStorage.removeItem('hms_token');
        localStorage.removeItem('token');
        // Optionally redirect to login
        if (window.location.pathname !== '/login') {
          window.location.href = '/#/login';
        }
      }

      const enhanced = new Error(message);
      enhanced.status = status;
      enhanced.data = data;
      return Promise.reject(enhanced);
    }

    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error('Request timed out. Please try again.'));
    }

    return Promise.reject(new Error('Network error. Please check your connection.'));
  }
);

export default apiClient;