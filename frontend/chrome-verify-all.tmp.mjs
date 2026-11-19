import { chromium } from 'playwright';

const BASE = 'http://localhost:5174';
const SHOTS = 'C:/Users/mahen/AppData/Local/Temp/opencode/shots2';

const PUBLIC_PAGES = [
  { path: '/', name: 'home', expect: 'Find' },
  { path: '/browse-specialties', name: 'browse-specialties', expect: 'Cardiology' },
  { path: '/browse-specialties/SPEC.CARDIO', name: 'spec-cardio', expect: 'Cardiology' },
  { path: '/facility/6aff2736eccecdf209b69474', name: 'facility-detail', expect: 'Demo General' },
  { path: '/hospitals/6aff2736eccecdf209b69474', name: 'hospital-profile', expect: 'Demo General' },
  { path: '/join', name: 'join-platform', expect: 'provider' },
  { path: '/search?q=hospital', name: 'search', expect: null },
  { path: '/terms', name: 'terms', expect: null },
  { path: '/privacy', name: 'privacy', expect: null },
  { path: '/grievance', name: 'grievance', expect: null },
  { path: '/refund-policy', name: 'refund-policy', expect: null },
  { path: '/disclaimer', name: 'disclaimer', expect: null },
  { path: '/community-guidelines', name: 'community-guidelines', expect: null },
  { path: '/patient-rights', name: 'patient-rights', expect: null },
  { path: '/telemedicine-consent', name: 'telemedicine-consent', expect: null },
  { path: '/provider-agreement', name: 'provider-agreement', expect: null },
  { path: '/cookies', name: 'cookies', expect: null },
  { path: '/contact', name: 'contact', expect: null },
];

const browser = await chromium.launch({ headless: true });
const results = [];

// ---- public pages ----
for (const t of PUBLIC_PAGES) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 220)); });
  page.on('pageerror', (err) => pageErrors.push(String(err).slice(0, 220)));
  try {
    const resp = await page.goto(`${BASE}${t.path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3500);
    const bodyText = await page.innerText('body');
    const title = await page.title();
    const notFound = /404|page not found/i.test(bodyText);
    const expectOk = t.expect ? bodyText.toLowerCase().includes(t.expect.toLowerCase()) : true;
    await page.screenshot({ path: `${SHOTS}/${t.name}.png` });
    results.push({ name: t.name, status: resp?.status(), title: title.slice(0, 80), expectFound: expectOk, notFound, consoleErrors: consoleErrors.length, pageErrors: pageErrors.length, sample: consoleErrors.slice(0, 3) });
  } catch (err) {
    results.push({ name: t.name, error: String(err).slice(0, 250), consoleErrors: consoleErrors.length, pageErrors: pageErrors.length });
  }
  await ctx.close();
}

// ---- login-gated: patient dashboard ----
{
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();
  page.on('console', () => {});
  try {
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const email = page.locator('input[type="email"]');
    const pass = page.locator('input[type="password"]');
    await email.click(); await email.fill('patient@findmedi.com');
    await pass.click(); await pass.fill('password');
    await pass.press('Enter');
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 25000 });
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const bodyText = await page.innerText('body');
    await page.screenshot({ path: `${SHOTS}/patient-dashboard.png` });
    results.push({ name: 'patient-dashboard', expectFound: /appointment|book/i.test(bodyText), notFound: /404|not found/i.test(bodyText), url: page.url() });
  } catch (err) {
    results.push({ name: 'patient-dashboard', error: String(err).slice(0, 250) });
  }
  await ctx.close();
}

// ---- booking modal opens on facility page ----
{
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();
  try {
    await page.goto(`${BASE}/facility/6aff2736eccecdf209b69474`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2500);
    const bookBtn = page.locator('button:has-text("Book")').first();
    const count = await bookBtn.count();
    if (count > 0) {
      await bookBtn.click();
      await page.waitForTimeout(2000);
      const bodyText = await page.innerText('body');
      const modalOpen = /consultation|book appointment|select doctor|choose/i.test(bodyText);
      await page.screenshot({ path: `${SHOTS}/booking-modal.png` });
      results.push({ name: 'booking-modal', expectFound: modalOpen });
    } else {
      results.push({ name: 'booking-modal', expectFound: false, note: 'no Book button visible' });
    }
  } catch (err) {
    results.push({ name: 'booking-modal', error: String(err).slice(0, 250) });
  }
  await ctx.close();
}

// ---- manifest served ----
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const resp = await page.goto(`${BASE}/manifest.webmanifest`, { timeout: 15000 });
  results.push({ name: 'manifest', status: resp?.status(), contentType: resp?.headers()['content-type'] });
  await ctx.close();
}

await browser.close();
console.log(JSON.stringify(results, null, 2));
