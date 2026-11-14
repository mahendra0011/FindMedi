import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App";
import "./index.css";
import i18n from "./i18n";
import { initFeatureFlags, initPostHog } from "./services/featureFlags";
import { captureUtmParams } from "./lib/track";
import { readLocaleFromQuery } from "./lib/localeUrl";

// Sentry error tracking + performance (env-gated: no VITE_SENTRY_DSN = no-op)
// §6.4: never ship cookies/auth headers, query strings (tokens/PHI) or bodies.
if ((import.meta as any).env?.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: (import.meta as any).env.VITE_SENTRY_DSN,
    tracesSampleRate: 0.1,
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

// BrowserRouter migration: no hash migration needed.

// Locale in the URL (`?lang=hi`) wins over the stored preference, so a
// shared / crawled url renders the locale it names. The stored preference
// is updated to match, otherwise the next visit would flip back.
const urlLocale = readLocaleFromQuery(window.location.search);
if (urlLocale) {
  try { window.localStorage.setItem('findmedi_lang', urlLocale); } catch { /* private mode */ }
  try { document.documentElement.lang = urlLocale; } catch { /* non-DOM */ }
  void i18n.changeLanguage(urlLocale);
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
