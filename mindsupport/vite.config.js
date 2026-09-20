import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Environment variable validation at build time
  const requiredEnvVars = ["VITE_API_BASE_URL"];
  const missing = requiredEnvVars.filter((key) => !process.env[key]);
  if (missing.length > 0 && mode === "production") {
    console.warn(`⚠ Missing env vars: ${missing.join(", ")}`);
  }
  return {
    server: {
        host: "::",
        port: 8080,
        proxy: {
            "/api": {
                target: "http://localhost:8089",
                changeOrigin: true,
            },
            "/socket.io": {
                target: "http://localhost:8089",
                ws: true,
            },
        },
    },
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
  };
});

