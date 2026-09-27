import type { Page, Route } from '@playwright/test';

export const API_GLOB = '**/api/**';

export const patientUser = {
  _id: 'e2e-patient-1',
  id: 'e2e-patient-1',
  name: 'E2E Patient',
  email: 'patient@e2e.test',
  phone: '9999999999',
  role: 'patient',
  status: 'active',
  isVerified: true,
  approvalStatus: 'approved',
  settings: { defaultDashboard: 'overview' },
};

const json = (body: unknown, status = 200) => ({
  status,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

/**
 * Sabse pehle catch-all route lagao — Playwright me routes reverse order me
 * match hote hain, isliye specific routes iske BAAD register karne hain.
 * Catch-all empty collection deta hai taaki dashboard ke saare incidental
 * GET calls bina backend ke chal jaayein.
 */
export async function mockApiBaseline(page: Page) {
  await page.route(API_GLOB, (route: Route) => route.fulfill(json({ success: true, data: [] })));
}

/** POST /auth/login mock — success ya failure. */
export async function mockLogin(
  page: Page,
  outcome: 'success' | 'failure' = 'success',
) {
  await page.route('**/api/auth/login', (route: Route) => {
    if (route.request().method() !== 'POST') return route.fulfill(json({ message: 'method not allowed' }, 405));
    if (outcome === 'failure') return route.fulfill(json({ message: 'Invalid credentials' }, 401));
    return route.fulfill(
      json({
        token: 'e2e-access-token',
        refreshToken: 'e2e-refresh-token',
        user: patientUser,
      }),
    );
  });
}

/** Token hone par initializeAuth GET /auth/me call karta hai. */
export async function mockMe(page: Page, loggedIn = true) {
  await page.route('**/api/auth/me', (route: Route) =>
    route.fulfill(loggedIn ? json(patientUser) : json({ message: 'Unauthorized' }, 401)),
  );
}

/** Login page par role + credentials bhar kar Sign In click karo. */
export async function loginViaUi(page: Page, email: string, password: string) {
  await page.getByPlaceholder('Enter your email').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
}
