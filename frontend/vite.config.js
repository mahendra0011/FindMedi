import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
var __dirname = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({
    base: "./",
    server: {
        host: "::",
        port: 5173,
        hmr: {
            overlay: false,
        },
    },
    define: {
        'process.env': {},
    },
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
        dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
    },
    build: {
        outDir: path.resolve(__dirname, "dist"),
        emptyOutDir: true,
        sourcemap: false,
        rollupOptions: {
            output: {
                manualChunks: function (id) {
                    if (id.includes('maplibre-gl')) {
                        return 'maplibre-vendor';
                    }
                    if (id.includes('recharts')) {
                        return 'recharts-vendor';
                    }
                },
            },
        },
    },
    test: {
        environment: "jsdom",
        setupFiles: ["./src/setupTests.js"],
        globals: true
    }
});
