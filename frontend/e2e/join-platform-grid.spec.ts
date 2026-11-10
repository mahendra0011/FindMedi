import { test, expect } from '@playwright/test';
import { mockApiBaseline } from '../test-utils/helpers';
import providerTypes from '../src/data/providerTypeCatalogFallback.json' with { type: 'json' };

test.describe('Join Platform provider type cards', () => {
  test('shows compact six-column cards on a wide desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await mockApiBaseline(page);
    await page.route('**/api/config/provider-types**', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ providerTypes }),
    }));
    await page.goto('/#/join-platform');

    await expect(page.getByRole('button', { name: new RegExp(`All Categories \\(${providerTypes.length}\\)`) })).toBeVisible();
    const firstGrid = page.locator('section .grid').first();
    await expect(firstGrid.locator('button', { hasText: 'Get Started' }).first()).toBeVisible();
    const columns = await firstGrid.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length);
    expect(columns).toBe(6);
    const firstCard = firstGrid.locator('> div').first();
    const cardPadding = await firstCard.locator('> div').last().evaluate((element) => getComputedStyle(element).paddingLeft);
    expect(cardPadding).toBe('14px');
    const artwork = firstCard.locator('img');
    await expect(artwork).toBeVisible();
    await expect(artwork).toHaveAttribute('src', /\/join-types\/hospital\.(jpg|png|webp)$/);
    await expect.poll(() => artwork.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    const imageSources = await page.locator('section img').evaluateAll((images) => images.map((image) => (image as HTMLImageElement).getAttribute('src')));
    expect(new Set(imageSources).size).toBe(providerTypes.length);
    await expect(artwork).toHaveJSProperty('complete', true);
    await page.screenshot({ path: 'test-results/join-platform-polished.png' });
  });

  test('keeps provider cards within a narrow mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockApiBaseline(page);
    await page.route('**/api/config/provider-types**', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ providerTypes }),
    }));
    await page.goto('/#/join-platform');

    await expect(page.getByRole('button', { name: new RegExp(`All Categories \\(${providerTypes.length}\\)`) })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
