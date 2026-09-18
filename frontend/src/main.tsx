import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

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
root.render(<App />);

// ─── Vite HMR boundary for the root App ────────────────────────────────────
if ((import.meta as any).hot) {
  (import.meta as any).hot.accept("./App", (newModule: any) => {
    if (newModule?.default) {
      root.render(<newModule.default />);
    }
  });
}
