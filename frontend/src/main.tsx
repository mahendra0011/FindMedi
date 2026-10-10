import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App";
import "./index.css";
import { initFeatureFlags, initPostHog } from "./services/featureFlags";

// Sentry error tracking + performance (env-gated: no VITE_SENTRY_DSN = no-op)
// §6.4: never ship cookies/auth headers, query strings (tokens/PHI) or bodies.
if ((import.meta as any).env?.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: (import.meta as any).env.VITE_SENTRY_DSN,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    beforeSend(event) {
      try {
        if (event.request) {
          delete (event.request as any).cookies;
          delete (event.request as any).data;
          const headers = (event.request as any).headers;
          if (headers) {
            delete headers.authorization;
            delete headers.cookie;
            delete headers['x-csrf-token'];
          }
          if (typeof (event.request as any).url === 'string') {
            (event.request as any).url = ((event.request as any).url as string).split('?')[0];
          }
        }
        if (event.user) {
          delete (event.user as any).email;
          delete (event.user as any).ip_address;
          delete (event.user as any).username;
        }
      } catch { /* scrubbing must never drop the event */ }
      return event;
    },
  });
}

// Initialize feature flags and PostHog (env-gated)
// Initialize feature flags and PostHog (env-gated, skip during tests)
if (!(import.meta as any).env?.VITE_TEST_MODE) {
  initFeatureFlags();
  initPostHog();
}

// ─── HashRouter migration helper ──────────────────────────────────────────
// If a user hits https://findmedi.online/login or gets redirected without '#',
// seamlessly migrate the URL to https://findmedi.online/#/login so HashRouter routes correctly.
if (window.location.pathname && window.location.pathname !== '/' && window.location.pathname !== '/index.html' && !window.location.hash) {
  const path = window.location.pathname.replace(/^\/index\.html/, '');
  const search = window.location.search || '';
  if (path) {
    window.history.replaceState(null, '', `/#${path}${search}`);
  }
}

const root = createRoot(document.getElementById("root")!);
root.render(
  <Sentry.ErrorBoundary fallback={<p>Something went wrong. Please refresh and try again.</p>}>
    <App />
  </Sentry.ErrorBoundary>
);

// ─── Vite HMR boundary for the root App ────────────────────────────────────
if ((import.meta as any).hot) {
  (import.meta as any).hot.accept("./App", (newModule: any) => {
    if (newModule?.default) {
      root.render(<newModule.default />);
    }
  });
}

// File 22 P2-32: service worker registration (production only)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
