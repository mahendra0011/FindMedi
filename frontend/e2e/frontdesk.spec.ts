import { test, expect } from '@playwright/test';
import { adminUser, mockApiBaselineFor } from '../test-utils/helpers';

// File 09 §10: front-desk search journey (mocked API) — type UHID/phone,
// row appears; empty result shows the register hint.
test.describe('front desk search (mocked API)', () => {
  test('finds a patient by query', async ({ page }) => {
    await mockApiBaselineFor(page, adminUser);
    await page.route('**/api/patients?**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [{ _id: 'p1', name: 'E2E Walker', uhid: 'UHID-E2E-1' }] }),
      }),
    );
    await page.goto('/#/frontdesk');
    await expect(page.getByRole('heading', { name: /front desk/i })).toBeVisible();
    await page.getByPlaceholder(/UHID \/ phone \/ name/i).fill('UHID-E2E-1');
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page.getByText('E2E Walker')).toBeVisible();
  });
});
