import { test, expect } from '@playwright/test';
import { adminUser, mockApiBaselineFor } from '../test-utils/helpers';

// File 09 §10: TPA desk journey (mocked API) — pre-auth queue renders,
// create posts and refreshes the queue.
test.describe('tpa desk (mocked API)', () => {
  test('creates a pre-auth and sees it in queue', async ({ page }) => {
    await mockApiBaselineFor(page, adminUser);
    await page.route('**/api/tpa/insurers', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ insurers: [{ _id: 'ins-1', name: 'Star (demo)', type: 'Insurer' }] }),
      }),
    );
    let created = false;
    await page.route('**/api/tpa/preauth**', async (route) => {
      if (route.request().method() === 'POST') {
        created = true;
        return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'pa-1', status: 'Draft' }) });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          preauths: created
            ? [{ _id: 'pa-1', status: 'Draft', estimate: 50000, approvedAmount: 0 }]
            : [],
        }),
      });
    });
    await page.goto('/#/insurance/desk');
    await expect(page.getByRole('heading', { name: /tpa desk/i })).toBeVisible();
    await expect(page.getByText('Queue empty.')).toBeVisible();
    await page.getByPlaceholder('Admission ID').fill('ADM-E2E-9');
    await page.locator('select[aria-label="Insurer"]').selectOption('ins-1');
    await page.getByPlaceholder(/Estimate/).fill('50000');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByText('Queue empty.')).toBeHidden();
  });
});
