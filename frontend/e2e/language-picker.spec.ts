import { test, expect } from '@playwright/test';
import { mockApiBaseline } from '../test-utils/helpers';

test.describe('public navbar language picker', () => {
  test('desktop button opens the dialog and changes the selected language', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await mockApiBaseline(page);
    await page.goto('/');

    const languageButton = page.getByRole('button', { name: 'Select language: English' });
    await expect(languageButton).toBeVisible();
    await languageButton.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('option', { name: /Hindi/ }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Hindi/ })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('findmedi_lang'))).toBe('hi');
  });

  test('mobile menu exposes the language picker without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockApiBaseline(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Open navigation menu' }).click();

    const languageButton = page.getByRole('button', { name: 'Select language: English' });
    await expect(languageButton).toBeVisible();
    await languageButton.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('option', { name: /Tamil/ })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
