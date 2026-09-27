import { test, expect } from '@playwright/test';
import { mockApiBaseline, mockLogin, mockMe, loginViaUi, patientUser } from './helpers';

test.describe('auth flow (mocked API)', () => {
  test('unauthenticated /dashboard redirects to /login', async ({ page }) => {
    await mockApiBaseline(page);
    await mockMe(page, false);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByPlaceholder('Enter your email')).toBeVisible();
  });

  test('failed login shows backend error and stays on /login', async ({ page }) => {
    await mockApiBaseline(page);
    await mockLogin(page, 'failure');
    await page.goto('/login');
    await loginViaUi(page, patientUser.email, 'wrong-password');
    await expect(page.getByText('Invalid credentials')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('successful login lands on dashboard and stores token', async ({ page }) => {
    await mockApiBaseline(page);
    await mockLogin(page, 'success');
    await page.goto('/login');
    await loginViaUi(page, patientUser.email, 'correct-password');
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByPlaceholder('Enter your email')).toHaveCount(0);
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBe('e2e-access-token');
  });

  test('returning user with valid token keeps session on /dashboard', async ({ page }) => {
    await mockApiBaseline(page);
    await mockMe(page, true);
    await page.addInitScript(() => localStorage.setItem('token', 'e2e-access-token'));
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByPlaceholder('Enter your email')).toHaveCount(0);
  });

  test('invalid session token forces logout back to /login', async ({ page }) => {
    await mockApiBaseline(page);
    await mockMe(page, false);
    await page.addInitScript(() => localStorage.setItem('token', 'expired-token'));
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});
