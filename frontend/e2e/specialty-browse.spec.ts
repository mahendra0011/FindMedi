import { test, expect } from '@playwright/test';

test('specialty detail tabs load reviewed articles and specialty data', async ({ page }) => {
  await page.route('**/api/categories/specialties/SPEC.CARDIO', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      code: 'SPEC.CARDIO', name: 'Cardiology', aliases: [], sensitive: false,
      claimsRestricted: false,
      meta: { conditions: ['Chest pain'], procedures: ['ECG'] },
      subs: [{ code: 'SPEC.CARDIO.INTERVENTIONAL', name: 'Interventional Cardiology', aliases: [], meta: {} }],
    }),
  }));
  await page.route('**/api/categories/specialties/SPEC.CARDIO/counts**', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ doctors: 3, hospitals: 2 }),
  }));
  await page.route('**/api/platform-content?**', (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get('contentType') === 'article') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ contents: [{ key: 'cardio-basics', title: 'Understanding heart health', summary: 'Reviewed patient guide.', body: '', reviewedAt: '2026-10-01' }] }),
      });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ contents: [] }) });
  });

  await page.goto('/#/browse-specialties/SPEC.CARDIO');
  await expect(page.getByRole('heading', { name: 'Cardiology', exact: true })).toBeVisible();
  await expect(page.getByText('Interventional Cardiology')).toBeVisible();
  await page.getByRole('tab', { name: /articles/i }).click();
  await expect(page.getByRole('heading', { name: 'Understanding heart health' })).toBeVisible();
  await expect(page.getByText(/medically reviewed/i)).toBeVisible();
});
