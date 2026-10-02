import { test, expect } from '@playwright/test';
import {
  patientUser,
  mockApiBaseline,
  mockLogin,
  mockMe,
  loginViaUi,
  setupAuth,
} from '../test-utils/helpers';

// E2E runs frontend-only with API mocks — no backend/Atlas needed
// (see playwright.config.ts webServer + CI job "Playwright E2E (frontend, mocked API)").

test.describe('smoke: public entry points', () => {
  test('home page renders without a session', async ({ page }) => {
    await mockApiBaseline(page);
    await page.goto('/');
    await expect(page).toHaveURL('/');
    // Page must have booted (React mounted) — title or a landmark heading.
    await expect(page.locator('body')).toBeVisible();
  });

  test('login page renders the credential form', async ({ page }) => {
    await mockApiBaseline(page);
    await page.goto('/login');
    await expect(page.getByPlaceholder('Enter your email')).toBeVisible();
    await expect(page.getByPlaceholder('Enter your password')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });
});

test.describe('smoke: authentication (mocked API)', () => {
  test('successful login stores the session and leaves /login', async ({ page }) => {
    await mockApiBaseline(page);
    await mockMe(page, true, patientUser);
    await mockLogin(page, 'success');
    await page.goto('/login');
    await loginViaUi(page, patientUser.email, 'whatever');
    await page.waitForFunction(() => Boolean(localStorage.getItem('token')), undefined, {
      timeout: 15_000,
    });
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBe('e2e-access-token');
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('failed login surfaces the server error and stays on /login', async ({ page }) => {
    await mockApiBaseline(page);
    await mockLogin(page, 'failure');
    await page.goto('/login');
    await loginViaUi(page, 'victim@e2e.test', 'wrong-password');
    await expect(page.getByText('Invalid credentials')).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('smoke: route guards', () => {
  test('protected patient route redirects to /login without a session', async ({ page }) => {
    await mockApiBaseline(page);
    await mockMe(page, false);
    await page.goto('/patient/records');
    await expect(page).toHaveURL(/\/login/);
  });

  test('protected patient route renders for an authenticated patient', async ({ page }) => {
    await mockApiBaseline(page);
    await mockMe(page, true, patientUser);
    await setupAuth(page, patientUser);
    await page.goto('/patient/records');
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('body')).toBeVisible();
  });
});
