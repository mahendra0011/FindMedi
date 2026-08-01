import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

const root = createRoot(document.getElementById("root"));
root.render(<App />);

// ─── Vite HMR boundary for the root App ────────────────────────────────────
// Bina iske App.jsx (ya koi bhi component) edit karne par Vite poora page
// reload kar deta tha → initializeAuth dobara chalta tha → agar access token
// expire ho chuka tha to logout. HMR accept karne se sirf App component
// hot-swap hota hai, Redux state + auth session preserve rehta hai.
// Isliye real-world me "code change hone par logout" kabhi nahi hota.
if (import.meta.hot) {
  import.meta.hot.accept("./App.jsx", (newModule) => {
    if (newModule?.default) {
      root.render(<newModule.default />);
    }
  });
}
