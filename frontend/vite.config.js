import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import path from "path";
import { fileURLToPath } from "url";
var __dirname = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig(({ mode }) => ({
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
    plugins: [
        react(),
        // Bundle-size report, only on `npm run analyze` (mode "analyze") so
        // normal builds never pay for it and no stale report is committed.
        ...(mode === "analyze"
            ? [visualizer({ filename: "bundle-analysis.html", gzipSize: true, brotliSize: true })]
            : []),
    ],
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
        globals: true,
        // Playwright specs (e2e/) vitest se exclude — warna vitest unhe apna test samajh ke chalata hai.
        exclude: [...configDefaults.exclude, "e2e/**"],
    },
}));
