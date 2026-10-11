import { test, expect } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { mockApiBaseline } from '../test-utils/helpers';

// Checklist item 5 (P2-38, e2e half): axe-core over real pages, not just the
// vitest UI-system gate. axe-core is injected from node_modules (no CDN —
// e2e runs offline against the mocked API). Only SERIOUS/CRITICAL violations
// block: moderate ones (colour-contrast nudges etc.) are tracked but do not
// flake the suite.

const axeSource = fs.readFileSync(
  path.join(__dirname, '..', 'node_modules', 'axe-core', 'axe.min.js'),
  'utf8',
);

type AxeNode = { id: string; impact?: string | null; nodes: unknown[] };

async function runAxe(page: import('@playwright/test').Page) {
  await page.addScriptTag({ content: axeSource });
  return page.evaluate(async () => {
    // axe is injected above; typed loosely because addScriptTag bypasses TS.
    const results = await (window as any).axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
    });
    return results.violations as AxeNode[];
  });
}

const assertNoSerious = (violations: AxeNode[]) => {
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const summary = serious
    .map((v) => `${v.id} (${v.impact}, ${v.nodes.length} node(s))`)
    .join(', ');
  expect(serious, `Serious/critical a11y violations: ${summary}`).toEqual([]);
};

test.describe('accessibility: axe-core on key pages', () => {
  test('home page has no serious a11y violations', async ({ page }) => {
    await mockApiBaseline(page);
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    // React must have mounted before axe runs, else it scans the shell only.
    await page.waitForTimeout(500);
    assertNoSerious(await runAxe(page));
  });

  test('login page has no serious a11y violations', async ({ page }) => {
    await mockApiBaseline(page);
    await page.goto('/#/login');
    await expect(page.getByPlaceholder(/enter your email/i)).toBeVisible();
    assertNoSerious(await runAxe(page));
  });
});
