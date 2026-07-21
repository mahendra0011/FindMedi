const fs = require('fs');

async function main() {
  const { chromium } = require('playwright');
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

  const viewports = [
    { name: 'desktop', width: 1366, height: 900 },
    { name: 'android', width: 460, height: 704 },
  ];

  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    for (const route of routes) {
      const page = await context.newPage();
      await page.goto(`http://127.0.0.1:8080${route.path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForSelector('.maplibregl-map', { timeout: 20000 });
      await page.locator('.maplibregl-map').scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
      await page.waitForSelector('.mapcn-marker', { timeout: 20000 });
      await page.waitForSelector('.maplibregl-popup', { timeout: 20000 });
      await page.waitForTimeout(900);

      const readBounds = async () => page.evaluate(() => {
        const map = document.querySelector('.maplibregl-map')?.getBoundingClientRect();
        const popup = document.querySelector('.maplibregl-popup')?.getBoundingClientRect();
        const card = document.querySelector('.medicore-map-popup .maplibregl-popup-content')?.getBoundingClientRect();
        const iconImages = [...document.querySelectorAll('.mapcn-marker img')].map((img) => {
          const rect = img.getBoundingClientRect();
          return {
            src: img.getAttribute('src'),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          };
        });
        return {
          map: map && { left: map.left, top: map.top, right: map.right, bottom: map.bottom, width: map.width, height: map.height },
          popup: popup && { left: popup.left, top: popup.top, right: popup.right, bottom: popup.bottom, width: popup.width, height: popup.height },
          card: card && { left: card.left, top: card.top, right: card.right, bottom: card.bottom, width: card.width, height: card.height },
          iconImages,
        };
      });

      const isWithin = (bounds) => {
        const pad = 1;
        const target = bounds.card || bounds.popup;
        return (
        bounds.map &&
        target &&
        target.left >= bounds.map.left - pad &&
        target.top >= bounds.map.top - pad &&
        target.right <= bounds.map.right + pad &&
        target.bottom <= bounds.map.bottom + pad
        );
      };

      const bounds = await readBounds();
      const hoverChecks = [];
      const markerCount = Math.min(await page.locator('.mapcn-marker').count(), 12);
      for (let index = 0; index < markerCount; index += 1) {
        const box = await page.locator('.mapcn-marker').nth(index).boundingBox({ timeout: 1500 }).catch(() => null);
        if (!box) continue;
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(300);
        const hoverBounds = await readBounds();
        hoverChecks.push({
          index,
          within: isWithin(hoverBounds),
          popup: hoverBounds.popup,
          card: hoverBounds.card,
          map: hoverBounds.map,
        });
      }

      const within = isWithin(bounds) && hoverChecks.every((check) => check.within);

      results.push({ route: route.name, viewport: viewport.name, within, hoverChecks, ...bounds });
      await page.close();
    }
    await context.close();
  }

  await browser.close();
  fs.writeFileSync('.codex/verify-map-popup-bounds-results.json', JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));

  if (results.some((result) => !result.within)) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
