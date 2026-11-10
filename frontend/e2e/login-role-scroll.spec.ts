import { test, expect } from '@playwright/test';
import { mockApiBaseline } from '../test-utils/helpers';

test('demo login role cards remain scrollable and the final role is reachable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockApiBaseline(page);
  await page.route('**/api/auth/login-roles', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ roles: [
      'patient', 'dietitian', 'physiotherapist', 'optician', 'lab_technician', 'radiology_scheduler',
      'hospital_admin', 'doctor', 'clinic_doctor', 'lab_owner', 'pathologist', 'pharmacy_owner',
      'nurse', 'radiologist', 'counsellor', 'psychiatrist', 'delivery_boy', 'ambulance',
    ] }),
  }));
  await page.goto('/#/login');

  const rolePanel = page.getByLabel('Demo role cards');
  await expect(rolePanel).toBeVisible();
  await expect(rolePanel.getByRole('button')).toHaveCount(173);
  await expect(rolePanel.getByRole('button', { name: /Doctor Portal/ })).toBeAttached();
  const dimensions = await rolePanel.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));
  expect(dimensions.scrollHeight).toBeGreaterThan(dimensions.clientHeight);

  await rolePanel.getByRole('button', { name: /Doctor Portal/ }).scrollIntoViewIfNeeded();
  await expect(rolePanel.getByRole('button', { name: /Doctor Portal/ })).toBeInViewport();
  await rolePanel.getByRole('button', { name: /Doctor Portal/ }).click();
  await expect(rolePanel.getByRole('button', { name: /Doctor Portal/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByPlaceholder('Enter your email')).toBeVisible();
  const pageOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(pageOverflow).toBeLessThanOrEqual(1);
});
