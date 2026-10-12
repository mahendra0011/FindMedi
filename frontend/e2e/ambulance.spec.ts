import { test, expect } from '@playwright/test';
import { adminUser, mockApiBaselineFor } from '../test-utils/helpers';

test.describe('Ambulance Trips & Fleet Dashboard (B4)', () => {
  test('renders ambulance trips ledger and opens new trip dialog', async ({ page }) => {
    await mockApiBaselineFor(page, adminUser);

    await page.route(/\/api\/ambulances/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            ambulances: [
              { _id: 'amb-1', vehicleNumber: 'MH-12-AM-1001', model: 'Force Traveller ALS' },
            ],
          },
        }),
      }),
    );

    await page.route(/\/api\/ambulance-trips\/trips/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            trips: [
              {
                _id: 'trip-1',
                ambulanceId: 'amb-1',
                fromLocation: 'City Center Triage',
                toLocation: 'Hospital Emergency Gate 1',
                odometerStartKm: 14500,
                startedAt: new Date().toISOString(),
                status: 'ongoing',
              },
            ],
          },
        }),
      }),
    );

    await page.route(/\/api\/ambulance-trips\/logs/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { logs: [] } }),
      }),
    );

    await page.route(/\/api\/ambulance-trips\/stats/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            ambulanceId: 'amb-1',
            fuel: { litres: 50, costInr: 4500, fills: 2 },
            trips: { completed: 8, kmCovered: 240 },
            kmPerLitre: 4.8,
          },
        }),
      }),
    );

    await page.goto('/#/hospital/ambulance-trips');

    await expect(page.getByRole('heading', { name: /ambulance trips & fleet running log/i })).toBeVisible();
    await expect(page.getByText('City Center Triage')).toBeVisible();

    const startTripBtn = page.getByRole('button', { name: /start new trip/i });
    await expect(startTripBtn).toBeVisible();
    await startTripBtn.click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /start emergency \/ patient trip/i })).toBeVisible();
  });
});
