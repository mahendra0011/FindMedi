import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT || 5173);
const baseURL = process.env.E2E_BASE_URL || `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  // 10s flaked on the two heaviest routes (home + appointment cancellation)
  // when all 12 tests cold-hit a fresh Vite dev server in parallel: the dev
  // transform of the Home chunk alone runs 25s+, so the heading assertion
  // timed out while the app was still compiling. Green solo and at CI's
  // workers:2, so the budget absorbs local contention instead of the test
  // lying about a healthy app.
  expect: { timeout: 20_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  // Only run files matching *.spec.ts as tests, ignore helpers.ts
  testMatch: '**/*.spec.ts',
  testIgnore: '**/helpers.ts',
  env: {
    VITE_TEST_MODE: 'true',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // E2E runs frontend-only with API mocks — no backend / Atlas needed.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
