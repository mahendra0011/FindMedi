import axios from "axios";

// ─── Phase 8 (merge): MindSupport API client → merged FindMedi backend ───────
// Merged mode (default): requests go to the MAIN server origin and every
// `/api/*` path is rewritten to `/api/mindsupport/*` by the interceptor below,
// so all existing call sites (`api.get("/api/counsellors")`, …) keep working.
// Legacy standalone mode: set VITE_API_BASE_URL (e.g. http://localhost:8089)
// to talk to the old standalone server with NO path rewrite.

const LEGACY_BASE = (import.meta?.env?.VITE_API_BASE_URL?.trim?.() || "").replace(/\/+$/, "");
const IS_LEGACY = LEGACY_BASE.length > 0;

function mainServerOrigin() {
    if (typeof window === "undefined") return "http://localhost:5001";
    // Same convention as frontend/src/lib/axios.js (VITE_API_URL ends with /api).
    const configured = (import.meta?.env?.VITE_API_URL?.trim?.() || "").replace(/\/+$/, "");
    if (configured) return configured.replace(/\/api\/?$/, "") || configured;
    const { protocol, hostname } = window.location;
    const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
    if (isLocal) return `${protocol}//${hostname}:5001`;
    // Production (findmedi.online served): same origin as the page.
    return `${protocol}//${hostname}`;
}

function defaultApiBase() {
    if (IS_LEGACY) return LEGACY_BASE;
    return mainServerOrigin();
}

export const API_BASE = defaultApiBase();
export const IS_MERGED_API = !IS_LEGACY;
export const MINDSUPPORT_PREFIX = "/api/mindsupport";

export function toMergedPath(path) {
    if (IS_LEGACY) return path;
    if (path.startsWith(MINDSUPPORT_PREFIX + "/") || path === MINDSUPPORT_PREFIX) return path;
    if (path.startsWith("/api/")) return `${MINDSUPPORT_PREFIX}${path.slice(4)}`;
    return path;
}

export function apiUrl(path) {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${API_BASE}${toMergedPath(normalizedPath)}`;
}

function getCookie(name) {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
    return match ? decodeURIComponent(match[2]) : null;
}

// ──────────────────────────────────────────────────────────────────────────────
// Axios Instance (FindMedi platform auth: Bearer token + CSRF, like main client)
// ──────────────────────────────────────────────────────────────────────────────

const api = axios.create({
    baseURL: API_BASE,
    headers: { "Content-Type": "application/json" },
    timeout: 20000,
    withCredentials: true,
});

api.interceptors.request.use((config) => {
    if (!IS_LEGACY && typeof config.url === "string" && config.url.startsWith("/api/")) {
        config.url = toMergedPath(config.url);
    }
    if (config.data instanceof FormData) {
        delete config.headers["Content-Type"];
    }
    // Same FindMedi session as the main app: localStorage token → Bearer.
    try {
        const token = typeof localStorage !== "undefined" ? localStorage.getItem("token") : null;
        if (token && !config.headers["Authorization"]) {
            config.headers["Authorization"] = `Bearer ${token}`;
        }
    } catch { /* storage unavailable */ }
    const method = (config.method || "get").toLowerCase();
    if (["post", "put", "patch", "delete"].includes(method)) {
        const csrfToken = getCookie("csrf-token");
        if (csrfToken) config.headers["X-CSRF-Token"] = csrfToken;
    }
    return config;
});

export { api };
