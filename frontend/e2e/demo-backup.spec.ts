/**
 * Investor demo recording — produces docs/pitch/demo-backup.webm
 * Usage: npx playwright test e2e/demo-backup.spec.ts
 */
import { test, expect } from '@playwright/test';

test.use({ video: 'on' });

test('record the investor demo flow', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 20_000 });

  const box = page.getByPlaceholder('Search doctors, clinics, tests, medicines...').first();
  await box.click();
  await box.fill('dental');
  await page.keyboard.press('Enter');
  await page.waitForLoadState('networkidle');

  // Click the verified card's primary action button ("Book Appointment")
  const book = page.getByRole('button', { name: /book appointment/i }).first();
  await expect(book).toBeVisible({ timeout: 20_000 });
  await book.click();
  await page.waitForLoadState('networkidle');

  // Stay on facility detail briefly then close booking sheet if it opened
  await page.waitForTimeout(1500);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
});
