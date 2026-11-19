import base from './vite.config.js';
import { defineConfig } from 'vite';
export default defineConfig(async ({ mode }) => {
  const b = typeof base === 'function' ? await base({ mode }) : base;
  return {
    ...b,
    server: {
      ...(b.server ?? {}),
      port: 5174,
      proxy: {
        '/api': { target: 'http://localhost:5002', changeOrigin: true },
        '/uploads': { target: 'http://localhost:5002', changeOrigin: true },
        '/socket.io': { target: 'http://localhost:5002', changeOrigin: true, ws: true },
      },
    },
  };
});
