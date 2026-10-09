import { test, expect } from '@playwright/test';
import { adminUser, mockApiBaselineFor } from '../test-utils/helpers';

// File 09 §10: roster journey (mocked API) — draft save refreshes entries.
test.describe('duty roster (mocked API)', () => {
  test('saves a draft entry', async ({ page }) => {
    await mockApiBaselineFor(page, adminUser);
    let saved = false;
    await page.route('**/api/roster**', async (route) => {
      if (route.request().method() === 'POST') {
        saved = true;
        return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'r-1', status: 'Draft' }) });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          rosters: saved ? [{ _id: 'r-1', month: '2026-10', status: 'Draft', entries: [{ date: '2026-10-09', shift: 'Morning', staffId: 'st-1' }] }] : [],
        }),
      });
    });
    await page.goto('/#/hr/roster');
    await expect(page.getByRole('heading', { name: /duty roster/i })).toBeVisible();
    await page.getByPlaceholder('Staff ID').fill('st-1');
    await page.locator('input[type="date"]').fill('2026-10-09');
    await page.getByRole('button', { name: 'Save draft' }).click();
    await expect(page.getByText('st-1')).toBeVisible();
  });
});
