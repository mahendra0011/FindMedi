import { test, expect } from '@playwright/test';
import { adminUser, mockApiBaselineFor } from '../test-utils/helpers';

test.describe('Pharmacy H1 / Narcotic Register (B4)', () => {
  test('renders H1 narcotic register ledger and triggers refresh', async ({ page }) => {
    await mockApiBaselineFor(page, adminUser);

    await page.route(/\/api\/pharmacy\/h1-register(?!\/gaps)/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            total: 1,
            rows: [
              {
                _id: 'h1-1',
                prescriptionNo: 'RX-2026-901',
                patientName: 'Devendra Joshi',
                prescriberName: 'Dr. Neha Kulkarni',
                medicineName: 'Alprazolam 0.5mg',
                rxSchedule: 'h1',
                quantity: 10,
                dispensedByName: 'Chief Pharmacist',
                dispensedAt: new Date().toISOString(),
              },
            ],
          },
        }),
      }),
    );

    await page.route(/\/api\/pharmacy\/h1-register\/gaps/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { gaps: [] } }),
      }),
    );

    await page.goto('/#/pharmacy/h1-register');

    await expect(page.getByRole('heading', { name: /pharmacy h1 \/ narcotic statutory register/i })).toBeVisible();
    await expect(page.getByText('Devendra Joshi')).toBeVisible();
    await expect(page.getByText('Alprazolam 0.5mg')).toBeVisible();

    const refreshBtn = page.getByRole('button', { name: /refresh/i });
    await expect(refreshBtn).toBeVisible();
    await refreshBtn.click();
  });
});
