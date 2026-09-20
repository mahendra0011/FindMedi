import axios from "axios";

const DEPLOYED_API_BASE = "https://mindsupport-uqms.onrender.com";

function defaultApiBase() {
    if (typeof window === "undefined")
        return "";
    const { hostname, port } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1" || port === "8080")
        return "";
    if (hostname === "mindsupport-uqms.onrender.com")
        return "";
    return DEPLOYED_API_BASE;
}

export const API_BASE = (import.meta?.env?.VITE_API_BASE_URL?.trim?.() || defaultApiBase()).replace(/\/+$/, "");
export const AUTH_USER_KEY = "mindsupport_user";

let memoryToken = null;
let memoryRefreshToken = null;

export function getStoredToken() {
    return memoryToken;
}
let memoryUser = null;

export function getStoredUser() {
    return memoryUser;
}
export function getStoredRefreshToken() {
    return memoryRefreshToken;
}
export function storeSession(payload) {
    memoryToken = payload.token;
    memoryUser = payload.user;
    if (payload.refreshToken) memoryRefreshToken = payload.refreshToken;
}
export function clearSession() {
    memoryToken = null;
    memoryRefreshToken = null;
    memoryUser = null;
    fetch(apiUrl("/api/auth/logout"), { method: "POST", credentials: "include" }).catch(() => {});
}
export function apiUrl(path) {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${API_BASE}${normalizedPath}`;
}

// ──────────────────────────────────────────────────────────────────────────────
// Axios Instance with Interceptors
// ──────────────────────────────────────────────────────────────────────────────

const api = axios.create({
    baseURL: API_BASE,
    headers: { "Content-Type": "application/json" },
    timeout: 15000,
    withCredentials: true,
});

/**
 * Decode JWT payload to check expiry
 */
function isTokenExpired(token) {
    try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        return payload.exp * 1000 < Date.now();
    } catch {
        return true;
    }
}

/**
 * Request interceptor - automatically injects Bearer token
 * - Detects expired tokens (response interceptor handles refresh)
 */
api.interceptors.request.use(
    (config) => {
        const token = getStoredToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

/**
 * Response interceptor - global error handling
 * - Automatically handles 401 Unauthorized errors
 * - Attempts token refresh before clearing session
 */
let isRefreshing = false;
let failedQueue = [];

function processQueue(error, token = null) {
    failedQueue.forEach((prom) => {
        if (error) prom.reject(error);
        else prom.resolve(token);
    });
    failedQueue = [];
}

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
            const refreshToken = getStoredRefreshToken();
            if (!refreshToken) {
                clearSession();
                return Promise.reject(error);
            }
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then((token) => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return api(originalRequest);
                });
            }
            originalRequest._retry = true;
            isRefreshing = true;
            try {
                const { data } = await axios.post(apiUrl("/api/auth/refresh"), { refreshToken }, { withCredentials: true });
                storeSession(data);
                processQueue(null, data.token);
                originalRequest.headers.Authorization = `Bearer ${data.token}`;
                return api(originalRequest);
            } catch {
                processQueue(error);
                clearSession();
                return Promise.reject(error);
            } finally {
                isRefreshing = false;
            }
        }
        return Promise.reject(error);
    }
);

export { api };


