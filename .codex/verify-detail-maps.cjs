const fs = require('fs');

async function main() {
  let playwright;
  try {
    playwright = require('playwright');
  } catch (error) {
    console.error('PLAYWRIGHT_MISSING');
    console.error(error.message);
    process.exit(2);
  }

  const apiBase = 'http://127.0.0.1:5001/api';
  const getJson = async (path) => {
    const response = await fetch(`${apiBase}${path}`);
    if (!response.ok) throw new Error(`${path} returned ${response.status}`);
    const json = await response.json();
    return Array.isArray(json) ? json : json.data || json.facilities || json.hospitals || [];
  };

  const [hospitals, clinics, labs, pharmacies] = await Promise.all([
    getJson('/hospitals'),
    getJson('/facilities?type=clinic'),
    getJson('/facilities?type=lab'),
    getJson('/facilities?type=pharmacy'),
  ]);

  const firstId = (items, label) => {
    const item = items.find((entry) => entry?._id || entry?.id);
    if (!item) throw new Error(`No ${label} records found from API`);
    return item._id || item.id;
  };

  const routes = [
    { name: 'hospital', path: `/#/hospitals/${firstId(hospitals, 'hospital')}` },
    { name: 'clinic', path: `/#/clinic/${firstId(clinics, 'clinic')}` },
    { name: 'lab', path: `/#/lab/${firstId(labs, 'lab')}` },
    { name: 'pharmacy', path: `/#/buy-medicine/${firstId(pharmacies, 'pharmacy')}` },
  ];

  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 900 },
    permissions: ['geolocation'],
    geolocation: { longitude: 79.9501, latitude: 23.1765 },
  });
  const results = [];

  for (const route of routes) {
    console.log(`VERIFY_START ${route.name}`);
    const page = await context.newPage();
    const consoleMessages = [];
    const pageErrors = [];

    page.on('console', (message) => {
      const text = message.text();
      if (message.type() === 'error' || /Invalid LngLat|Error|error/i.test(text)) {
        consoleMessages.push(`${message.type()}: ${text}`);
      }
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));

    const url = `http://127.0.0.1:8080${route.path}`;
    try {
      await page.goto(url, { waitUntil: 'commit', timeout: 20000 });
      await page.waitForLoadState('domcontentloaded', { timeout: 20000 }).catch(() => {});
      await page.waitForSelector('text=Location & Route', { timeout: 20000 }).catch(() => {});
      await page.waitForSelector('.maplibregl-map', { timeout: 20000 }).catch(() => {});
      await page.waitForSelector('.mapcn-marker, .maplibregl-marker', { timeout: 20000 }).catch(() => {});
      await page.waitForSelector('button[title="Zoom in"]', { timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(1500);
      const marker = page.locator('.mapcn-marker').first();
      if ((await marker.count()) > 0) {
        await marker.hover({ timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(500);
        await marker.click({ timeout: 5000 }).catch(() => {});
      }
      const routeButton = page.getByRole('button', { name: /route/i }).first();
      if ((await routeButton.count()) > 0) {
        await routeButton.click({ timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(3500);
      }
      const bodyText = await page.locator('body').innerText({ timeout: 5000 }).catch(() => '');
      const hasMap = await page.locator('.maplibregl-map').count();
      const markerCount = await page.locator('.mapcn-marker, .maplibregl-marker').count();
      const popupCount = await page.locator('.maplibregl-popup, .mapcn-marker-popup, .mapcn-marker-tooltip').count();
      const controlButtonCount = await page.locator('button[title="Zoom in"], button[title="Zoom out"], button[title="Full map"], button[title="Current location"]').count();
      results.push({
        route: route.name,
        url,
        ok: pageErrors.length === 0 && !consoleMessages.some((item) => /Invalid LngLat|Uncaught Error/i.test(item)),
        hasLocationSection: bodyText.includes('Location & Route'),
        hasMap: hasMap > 0,
        markerCount,
        popupCount,
        controlButtonCount,
        routeSummaryVisible: /\d+(\.\d+)?\s*km/i.test(bodyText) || /route/i.test(bodyText),
        pageErrors,
        consoleMessages,
      });
      console.log(`VERIFY_DONE ${route.name}`);
    } catch (error) {
      results.push({
        route: route.name,
        url,
        ok: false,
        error: error.message,
        pageErrors,
        consoleMessages,
      });
      console.log(`VERIFY_FAIL ${route.name}: ${error.message}`);
    } finally {
      await page.close();
    }
  }

  await context.close();
  await browser.close();
  fs.writeFileSync('.codex/verify-detail-maps-results.json', JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));

  if (results.some((result) => !result.ok || !result.hasLocationSection || !result.hasMap || result.markerCount < 1 || result.popupCount < 1 || result.controlButtonCount < 4)) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
