import type { CapacitorConfig } from '@capacitor/cli';

// SITE-CAP 1.12: android shell wraps the built SPA (dist). The webDir must be
// the vite build output; API calls go to VITE_API_URL baked at build time, and
// the android scheme is https-only (mixed content is blocked by default).
const appId = 'com.findmedi.app';

const config: CapacitorConfig = {
  appId,
  appName: 'Findmedi',
  webDir: 'dist',
  android: {
    // Deep links (scheme findmedi://) and https app links are configured in
    // the native manifest once the signing key exists.
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
  },
  server: {
    // Only set ANDROID_SERVER_URL during local dev (`npx cap run android` with
    // a dev server). Never ship with a live-reload override.
    ...(process.env.ANDROID_SERVER_URL ? { url: process.env.ANDROID_SERVER_URL, cleartext: true } : {}),
  },
};

export default config;
