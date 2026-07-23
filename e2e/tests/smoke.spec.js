import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  // Assuming dev server runs on 8080
  await page.goto('http://localhost:8080');
  
  // Basic smoke test - just check if the page loads and has a title
  await expect(page).toHaveTitle(/MediCore/i);
});
