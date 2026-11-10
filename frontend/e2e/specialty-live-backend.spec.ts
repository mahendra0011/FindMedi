import { test, expect } from '@playwright/test';

const backendBase = process.env.E2E_API_BASE || 'http://127.0.0.1:5001';

for (const locale of ['en', 'hi']) {
  test(`live specialty browse journey (${locale})`, async ({ page }) => {
    await page.addInitScript((lang) => localStorage.setItem('findmedi_lang', lang), locale);

    // These are read-only public catalog requests; no production data is changed.
    const treeResponse = await page.request.get(`${backendBase}/api/categories/specialties?tree=1`);
    expect(treeResponse.ok()).toBeTruthy();
    const tree = await treeResponse.json();
    const tiles = (tree.groups || []).flatMap((group: { tiles?: Array<{ code: string; children?: unknown[] }> }) => group.tiles || []);
    expect(tree.groups).toHaveLength(13);
    expect(tiles).toHaveLength(43);
    expect(tiles.every((tile: { children?: unknown[] }) => (tile.children || []).length > 0)).toBeTruthy();

    const detailResponse = await page.request.get(`${backendBase}/api/categories/specialties/SPEC.CARDIO`);
    expect(detailResponse.ok()).toBeTruthy();
    const detail = await detailResponse.json();
    expect(detail.subs.length).toBeGreaterThan(0);
    const countsResponse = await page.request.get(`${backendBase}/api/categories/specialties/SPEC.CARDIO/counts`);
    expect(countsResponse.ok()).toBeTruthy();

    await page.goto('/browse-specialties');
    await page.locator('a[href="#/browse-specialties/SPEC.CARDIO"]').click();
    await expect(page.getByRole('heading', { name: /cardiology/i }).first()).toBeVisible();
    await expect(page.getByText(detail.subs[0].name, { exact: true }).first()).toBeVisible();

    const tabs = page.getByRole('tab');
    await tabs.nth(1).click();
    await expect(page.getByRole('heading', { name: /Conditions treated|उपचार की जाने वाली स्थितियाँ/i })).toBeVisible();
    if (detail.meta?.conditions?.length) await expect(page.getByText(detail.meta.conditions[0], { exact: true })).toBeVisible();
    await tabs.nth(2).click();
    await expect(page.getByRole('heading', { name: /Common procedures|सामान्य प्रक्रियाएँ/i })).toBeVisible();
    if (detail.meta?.procedures?.length) await expect(page.getByText(detail.meta.procedures[0], { exact: true })).toBeVisible();
    await tabs.nth(3).click();
    await expect(page.getByRole('link', { name: /Browse Lab Tests|लैब टेस्ट देखें/i })).toBeVisible();
    await tabs.nth(4).click();
    await expect(page.getByRole('heading', { name: /Articles|लेख/i }).last()).toBeVisible();
  });
}
