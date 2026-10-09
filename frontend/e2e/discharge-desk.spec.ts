import { test, expect } from '@playwright/test';
import { adminUser, mockApiBaselineFor } from '../test-utils/helpers';

// File 09 §10 exit criteria: full IPD discharge journey on the desk UI
// (mocked API) — running bill → initiate → approve → 3 clears → finalize.
test.describe('discharge desk journey (mocked API)', () => {
  test('walks all six steps to a final bill', async ({ page }) => {
    await mockApiBaselineFor(page, adminUser);

    await page.route('**/api/ipd/admissions/ADM-E2E-1/running-bill', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ admissionId: 'ADM-E2E-1', charges: [], charged: 5000, deposited: 5000, balance: 0 }),
      }),
    );
    await page.route('**/api/ipd/admissions/ADM-E2E-1/discharge/**', (route) => {
      const url = route.request().url();
      const state = url.includes('finalize') ? 'Discharged'
        : url.includes('BillingClear') || url.includes('billing') ? 'BillingClear'
        : 'Initiated';
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ state, balance: 0 }),
      });
    });

    await page.goto('/#/ipd/discharges');
    await expect(page.getByRole('heading', { name: /discharge desk/i })).toBeVisible();
    await page.getByPlaceholder('Admission ID').fill('ADM-E2E-1');
    await page.getByRole('button', { name: 'Load' }).click();
    await expect(page.getByText(/Running bill/)).toBeVisible();

    for (const name of ['1. Initiate', '2. Doctor approve', '3. nursing clear', '4. pharmacy clear', '5. billing clear']) {
      await page.getByRole('button', { name }).click();
    }
    await page.getByRole('button', { name: /6\. Finalize/ }).click();
    await expect(page.getByText(/Discharged/)).toBeVisible();
  });
});
