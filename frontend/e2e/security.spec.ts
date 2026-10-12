import { test, expect } from '@playwright/test';
import { adminUser, mockApiBaselineFor } from '../test-utils/helpers';

test.describe('Hospital Security & Gate Pass Ledger (B4)', () => {
  test('renders security passes ledger and opens new gate pass modal', async ({ page }) => {
    await mockApiBaselineFor(page, adminUser);

    await page.route(/\/api\/security\/gate-passes/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            passes: [
              {
                _id: 'gp-1',
                passNo: 'GP-2026-001',
                type: 'returnable',
                description: 'Ultrasound probe for vendor recalibration',
                itemCount: 1,
                carrierName: 'SecureMed Express',
                status: 'requested',
                createdAt: new Date().toISOString(),
              },
            ],
          },
        }),
      }),
    );

    await page.route(/\/api\/security\/rounds/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { rounds: [] } }),
      }),
    );

    await page.goto('/#/hospital/security');

    await expect(page.getByRole('heading', { name: /security desk & gate control/i })).toBeVisible();
    await expect(page.getByText('Ultrasound probe for vendor recalibration')).toBeVisible();

    const newPassBtn = page.getByRole('button', { name: /new gate pass/i });
    await expect(newPassBtn).toBeVisible();
    await newPassBtn.click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /request material gate pass/i })).toBeVisible();
  });
});
