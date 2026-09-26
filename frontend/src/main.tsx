import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App";
import "./index.css";

// Sentry error tracking + performance (env-gated: no VITE_SENTRY_DSN = no-op)
if ((import.meta as any).env?.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: (import.meta as any).env.VITE_SENTRY_DSN,
    tracesSampleRate: 0.1,
  });
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
