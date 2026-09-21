import axios from "axios";

const DEPLOYED_API_BASE = "https://mindsupport-uqms.onrender.com";

function defaultApiBase() {
    if (typeof window === "undefined")
        return "";
    const { hostname, port } = window.location;
    // Merged into FindMedi: local dev serves the MindSupport API on :8089
    // (see backend/mindsupport, MIND_PORT in backend/.env).
    if (hostname === "localhost" || hostname === "127.0.0.1")
        return "http://localhost:8089";
    if (port === "8080")
        return "";
    if (hostname === "mindsupport-uqms.onrender.com")
        return "";
    return DEPLOYED_API_BASE;
}

export const API_BASE = (import.meta?.env?.VITE_API_BASE_URL?.trim?.() || defaultApiBase()).replace(/\/+$/, "");

export function apiUrl(path) {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${API_BASE}${normalizedPath}`;
}

// ──────────────────────────────────────────────────────────────────────────────
// Axios Instance (no auth — authentication is handled by the FindMedi platform)
// ──────────────────────────────────────────────────────────────────────────────

const api = axios.create({
    baseURL: API_BASE,
    headers: { "Content-Type": "application/json" },
    timeout: 15000,
    withCredentials: true,
});

export { api };


