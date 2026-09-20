import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import App from "./App.jsx";
import "./index.css";
import { store } from "./store";

const requiredEnvVars = ["VITE_API_BASE_URL"];
const missing = requiredEnvVars.filter((key) => !import.meta.env[key]);
if (missing.length > 0) {
    console.error(`Missing required env vars: ${missing.join(", ")}`);
}

const pendingSpaRedirect = sessionStorage.getItem("mindsupport:spa-redirect");
if (pendingSpaRedirect) {
    sessionStorage.removeItem("mindsupport:spa-redirect");
    window.history.replaceState(null, "", pendingSpaRedirect);
}

createRoot(document.getElementById("root")).render(<Provider store={store}>
    <App />
  </Provider>);
