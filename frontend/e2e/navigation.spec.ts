import { test, expect } from '@playwright/test';
import type { Route } from '@playwright/test';
import { mockApiBaseline, mockMe, setupAuth, patientUser } from '@test-utils/helpers';

// Phase 7 (roadmap): guided turn-by-turn navigation E2E with a fake GPS fix.
//
// The session needs (a) a hospital with coordinates on the map, (b) a route,
// and (c) the /routing/navigation maneuver payload. (b) resolves through the
// built-in straight-line fallback (OpenRouteService/MapTiler calls are aborted
// below), so the test is deterministic without any external service.

const json = (body: unknown, status = 200) => ({
  status,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

const hospital = {
  _id: 'hosp-1',
  name: 'E2E Hospital',
  address: '123 Test Road, Jabalpur',
  city: 'Jabalpur',
  state: 'Madhya Pradesh',
  phone: '9999999999',
  location: { coordinates: [79.9864, 23.1815] },
};

test.use({
  // NOTE: the fake fix must NOT equal the hospital's own coordinates — with a
  // 0-metre haversine distance the route distance bar (which gates the Start
  // button) never renders. ~1.5 km away keeps the straight-line fallback > 0.
  geolocation: { latitude: 23.1680, longitude: 79.9720 },
  permissions: ['geolocation'],
});

test.describe('Turn-by-turn navigation (mocked APIs + fake GPS)', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiBaseline(page);
    await setupAuth(page, patientUser);
    await mockMe(page, true, patientUser);

    await page.route('**/api/hospitals/hosp-1', (route: Route) => route.fulfill(json(hospital)));
    await page.route('**/api/hospitals/hosp-1/tests', (route: Route) => route.fulfill(json([])));
    await page.route('**/api/hospitals/hosp-1/doctors', (route: Route) => route.fulfill(json([])));

    // Valhalla front door (backend route) — the maneuver list the HUD renders.
    await page.route('**/api/routing/navigation', (route: Route) =>
      route.fulfill(json({
        shape: '',
        distanceKm: 1.4,
        durationSeconds: 240,
        maneuvers: [
          { instruction: 'Turn left onto MG Road', lengthKm: 0.2, timeSeconds: 30, streetNames: ['MG Road'] },
          { instruction: 'You have arrived at your destination', lengthKm: 0, timeSeconds: 0, streetNames: [] },
        ],
        source: 'valhalla',
      })));

    // Deterministic fallback: kill external routing/geocoding calls.
    await page.route('**/api.openrouteservice.org/**', (route: Route) => route.abort());
    await page.route('**/api.maptiler.com/**', (route: Route) => route.abort());
  });

  test('starts a guided session and shows the turn-by-turn HUD', async ({ page }) => {
    await page.goto('/hospitals/hosp-1');

    // 1) Map control: ask for a route from the mocked GPS fix to the hospital.
    const routeButton = page.getByRole('button', { name: 'Route' });
    await expect(routeButton).toBeVisible({ timeout: 20_000 });
    await routeButton.click();

    // 2) Route resolved → distance bar carries the "Start" button.
    const startButton = page.getByRole('button', { name: /^Start$/ });
    await expect(startButton).toBeVisible({ timeout: 20_000 });
    await startButton.click();

    // 3) HUD: exit control, remaining-distance bar, and the maneuver banner
    //    (either the fetched instruction or the pre-fix fallback headline).
    await expect(page.getByRole('button', { name: 'Exit navigation' })).toBeVisible();
    await expect(page.getByText('Remaining')).toBeVisible();
    await expect(page.getByText('Turn left onto MG Road').or(page.getByText('Continue on route'))).toBeVisible();

    // 4) Exit returns to the plain map (Start button is offered again).
    await page.getByRole('button', { name: 'Exit navigation' }).click();
    await expect(page.getByRole('button', { name: 'Exit navigation' })).toBeHidden();
  });
});
