import { test, expect } from '@playwright/test';

/**
 * Locale URLs (doc 21 §15: "localized alternates wired to real locale URLs").
 *
 * The locale lives in the query string (`?lang=hi`) so every locale of a
 * page has its own crawlable address, the sitemap can advertise it and the
 * head can point at it.
 */

test.describe('locale urls', () => {
  test('the url decides the language, not the stored preference', async ({ page }) => {
    // A stored English preference must not win over an explicit url.
    await page.addInitScript(() => localStorage.setItem('findmedi_lang', 'en'));
    await page.goto('/about?lang=hi');

    await expect(page.locator('html')).toHaveAttribute('lang', 'hi');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('findmedi_lang'))).toBe('hi');
  });

  test('the default locale keeps the clean url', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('findmedi_lang', 'en'));
    await page.goto('/about');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page).toHaveURL(/\/about$/);
  });

  test('an unknown locale parameter is ignored', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('findmedi_lang', 'en'));
    await page.goto('/about?lang=zz');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('switching the language from the public header rewrites the url', async ({ page }) => {
    await page.goto('/about');
    await page.getByRole('button', { name: /Select language/i }).click();
    await page.getByRole('option', { name: /Hindi/ }).click();

    await expect(page).toHaveURL(/lang=hi/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'hi');
  });

  test('the contact page is reachable and declares its own canonical', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.getByRole('heading', { name: /Contact FindMedi/i })).toBeVisible();
    await expect(page.getByText('contact@findmedi.in').first()).toBeVisible();

    const canonical = await page.locator('link[rel="canonical"]').first().getAttribute('href');
    expect(canonical).toContain('/contact');

    const alternates = await page.locator('link[rel="alternate"]').evaluateAll(
      (links) => links.map((l) => l.getAttribute('hreflang')),
    );
    expect(alternates).toContain('en');
    expect(alternates).toContain('hi');
  });
});
