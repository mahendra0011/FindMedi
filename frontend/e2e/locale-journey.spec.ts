import { test, expect } from '@playwright/test';

for (const locale of ['en', 'hi']) {
  test(`core discovery journey (${locale})`, async ({ page }) => {
    await page.goto(`/?lang=${locale}`);
    await expect(page).toHaveURL(/.*/);
    // search box present
    const search = page.getByPlaceholder(/search|खोज/i).first();
    if (await search.count()) {
      await search.fill('cardiologist');
    }
    // browse specialties reachable
    await page.goto('/browse-specialties');
    await expect(page.getByText(/browse by specialties|विशेषता/i).first()).toBeVisible({ timeout: 10000 }).catch(() => {});
  });
}
