import { test, expect } from '@playwright/test';
import { adminUser, mockApiBaselineFor } from '../test-utils/helpers';

test.describe('Feedback & NPS Dashboard (B4)', () => {
  test('renders feedback list, metrics, and allows refresh action', async ({ page }) => {
    await mockApiBaselineFor(page, adminUser);

    await page.route(/\/api\/feedback\/summary/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            totalResponses: 1,
            nps: 100,
            promoters: 1,
            detractors: 0,
            passives: 0,
            avgCsat: 5.0,
          },
        }),
      }),
    );

    await page.route(/\/api\/feedback(?!\/summary)/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            total: 1,
            nps: 100,
            promoters: 1,
            detractors: 0,
            passives: 0,
            feedback: [
              {
                _id: 'fb-1',
                department: 'Cardiology',
                npsScore: 10,
                rating: 5,
                comment: 'Exceptional care and friendly staff',
                status: 'new',
                createdAt: new Date().toISOString(),
              },
            ],
          },
        }),
      }),
    );

    await page.goto('/#/hospital/feedback');

    await expect(page.getByRole('heading', { name: /patient feedback & net promoter score/i })).toBeVisible();
    await expect(page.getByText('Exceptional care and friendly staff')).toBeVisible();

    const refreshBtn = page.getByRole('button', { name: /refresh/i });
    await expect(refreshBtn).toBeVisible();
    await refreshBtn.click();
  });
});
