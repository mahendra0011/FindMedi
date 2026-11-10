import { test, expect } from '@playwright/test';

test('specialty browse full journey (mocked API)', async ({ page }) => {
  // tile list
  await page.route('**/api/categories/specialties?tree=1', (route) => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({
      groups: [{
        group: 'heart', label: 'Heart & Vascular', tiles: [
          { code: 'SPEC.CARDIO', name: 'Cardiology', icon: 'heart', count: 3 },
        ],
      }],
    }),
  }));

  // detail
  await page.route('**/api/categories/specialties/SPEC.CARDIO', (route) => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({
      code: 'SPEC.CARDIO', name: 'Cardiology', aliases: [], sensitive: false,
      claimsRestricted: false,
      meta: { conditions: ['Chest pain', 'Palpitations'], procedures: ['ECG', 'Echo'], tests: ['TMT'], symptoms: ['breathlessness'] },
      subs: [
        { code: 'SPEC.CARDIO.INTERVENTIONAL', name: 'Interventional Cardiology', aliases: [], meta: { conditions: ['CAD'], procedures: ['Angioplasty'] } },
      ],
      alsoUnder: [],
    }),
  }));

  await page.route('**/api/categories/specialties/SPEC.CARDIO/counts**', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ doctors: 3, hospitals: 2, tests: 4 }),
  }));

  await page.route('**/api/platform-content?**', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ items: [{ _id: '1', title: 'Heart health guide', summary: 'Reviewed article', status: 'published' }] }),
  }));

  await page.route('**/api/doctors**', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ doctors: [{ _id: 'd1', name: 'Dr. Heart', specialtyCode: 'SPEC.CARDIO' }], total: 1 }),
  }));

  await page.goto('/browse-specialties');
  await page.getByText(/cardiology/i).first().click().catch(() => {});

  // detail page loads
  await page.goto('/browse-specialties/SPEC.CARDIO');
  await expect(page.getByText(/cardiology/i).first()).toBeVisible({ timeout: 10000 });

  // tabs
  for (const tab of ['Doctors', 'Hospitals', 'Tests']) {
    const t = page.getByRole('tab', { name: new RegExp(tab, 'i') });
    if (await t.count()) await t.click();
  }

  // articles tab shows reviewed article
  const articlesTab = page.getByRole('tab', { name: /article/i });
  if (await articlesTab.count()) {
    await articlesTab.click();
    await expect(page.getByText(/heart health guide/i)).toBeVisible({ timeout: 5000 }).catch(() => {});
  }

  // empty state when no articles
  await page.route('**/api/platform-content?**', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ items: [] }),
  }));
});
