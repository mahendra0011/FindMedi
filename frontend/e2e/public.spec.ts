import { test, expect } from '@playwright/test';
import { mockApiBaseline } from '@test-utils/helpers';

test.describe('public pages', () => {
  test('home renders FindMedi hero', async ({ page }) => {
    await mockApiBaseline(page);
    await page.goto('/');
    await expect(page).toHaveTitle(/FindMedi/);
    await expect(page.getByRole('heading', { level: 1, name: /findmedi/i })).toBeVisible();
  });

  test('login page shows sign-in form', async ({ page }) => {
    await mockApiBaseline(page);
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.getByPlaceholder('Enter your email')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('hospital directory route renders for guests', async ({ page }) => {
    await mockApiBaseline(page);
    await page.goto('/hospitals');
    await expect(page).toHaveURL(/\/hospitals/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
