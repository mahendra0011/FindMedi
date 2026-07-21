async function main() {
  const { chromium } = require('playwright');
  const apiBase = 'http://127.0.0.1:5001/api';
  const getJson = async (path) => {
    const response = await fetch(`${apiBase}${path}`);
    if (!response.ok) throw new Error(`${path} returned ${response.status}`);
    const json = await response.json();
    return Array.isArray(json) ? json : json.data || json.facilities || json.hospitals || [];
  };

  const labs = await getJson('/facilities?type=lab');
  const lab = labs.find((entry) => entry?._id || entry?.id);
  if (!lab) throw new Error('No lab record found');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 460, height: 704 } });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:8080/#/lab/${lab._id || lab.id}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('.maplibregl-map', { timeout: 20000 });
  await page.locator('.maplibregl-map').scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
  await page.waitForSelector('.mapcn-marker', { timeout: 20000 });
  await page.waitForTimeout(900);

  const marker = page.locator('.mapcn-marker').nth(3);
  const box = await marker.boundingBox();
  if (!box) throw new Error('Marker box unavailable');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(1000);

  const result = await page.evaluate(() => {
    const map = document.querySelector('.maplibregl-map')?.getBoundingClientRect();
    const card = document.querySelector('.medicore-map-popup .maplibregl-popup-content')?.getBoundingClientRect();
    if (!map || !card) return null;
    const mapCenterX = map.left + map.width / 2;
    const mapCenterY = map.top + map.height / 2;
    const cardCenterX = card.left + card.width / 2;
    const cardCenterY = card.top + card.height / 2;
    return {
      map: { left: map.left, top: map.top, right: map.right, bottom: map.bottom, width: map.width, height: map.height },
      card: { left: card.left, top: card.top, right: card.right, bottom: card.bottom, width: card.width, height: card.height },
      deltaX: Math.round(cardCenterX - mapCenterX),
      deltaY: Math.round(cardCenterY - mapCenterY),
      within:
        card.left >= map.left &&
        card.top >= map.top &&
        card.right <= map.right &&
        card.bottom <= map.bottom,
    };
  });

  await browser.close();
  console.log(JSON.stringify(result, null, 2));
  if (!result || !result.within || Math.abs(result.deltaX) > 55 || Math.abs(result.deltaY) > 80) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
