import { test, expect } from '@playwright/test';
import { patientUser, doctorUser, adminUser, mockApiBaseline, mockApiBaselineFor, mockDoctorBooking, mockDoctorApproveList, mockAdminReports, mockLogin, loginViaUi, setupAuth, istToday } from '../test-utils/helpers';

// E2E runs frontend-only with API mocks — no backend/Atlas needed
// (see playwright.config.ts webServer + CI job "Playwright E2E (frontend, mocked API)").

test.describe('smoke: public entry points', () => {
  test('home page renders without a session', async ({ page }) => {
    await mockApiBaseline(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /findmedi healthcare solutions/i })).toBeVisible();
    // Page must have booted (React mounted) — title or a landmark heading.
    await expect(page.locator('body')).toBeVisible();
  });

  test('login page renders the credential form', async ({ page }) => {
    await mockApiBaseline(page);
    await page.goto('/#/login');
    await expect(page.getByPlaceholder(/enter your email/i)).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /log in|sign in/i })).toBeVisible();
  });
});

test.describe('smoke: authentication (mocked API)', () => {
  test('successful login stores the session and leaves /login', async ({ page }) => {
    await mockApiBaseline(page, 'anonymous');
    await mockLogin(page, 'success');
    await page.goto('/#/login');
    await loginViaUi(page, patientUser.email, 'whatever', { timeout: 10_000 });
    await expect(page).not.toHaveURL(/#\/login/);
  });

  test('failed login surfaces the server error and stays on /login', async ({ page }) => {
    await mockApiBaseline(page);
    await mockLogin(page, 'failure');
    await page.goto('/#/login');
    await loginViaUi(page, 'victim@e2e.test', 'wrong-password', { timeout: 10_000 });
    await expect(page.getByText('Invalid credentials')).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/#\/login/);
  });
});

test.describe('smoke: role guards', () => {
  test('patient-only records route does not render protected medical records when logged out', async ({ page }) => {
    await mockApiBaseline(page);
    await page.goto('/#/patient/records');
    await expect(page).toHaveURL(/#\/login/);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('patient-only records route renders for an authenticated patient', async ({ page }) => {
    await mockApiBaseline(page, 'authenticated');
    await setupAuth(page, patientUser);
    await page.goto('/#/patient/records');
    await expect(page).not.toHaveURL(/#\/login/);
    await expect(page.getByRole('button', { name: /emergency help/i })).toBeVisible();
  });
});

test.describe('appointment booking validation', () => {
  test('requires date and an available time slot before advancing', async ({ page }) => {
    await mockApiBaseline(page, 'authenticated');
    await mockDoctorBooking(page);
    await setupAuth(page, patientUser);
    await page.goto('/#/doctors/doctor-e2e');

    await page.getByRole('button', { name: /book appointment/i }).first().click();
    await expect(page.getByRole('heading', { name: /book appointment/i })).toBeVisible();
    const nextButton = page.getByRole('button', { name: /next: who is this for/i });
    await expect(nextButton).toBeDisabled();

    await page.locator('input[type="date"]').fill('2026-10-05');
    await page.locator('select').first().selectOption({ label: '9 AM' });
    await page.getByRole('button', { name: /9:00.*available/i }).click();
    await expect(nextButton).toBeEnabled();
    await nextButton.click();
    await expect(page.getByRole('heading', { name: /who is this appointment for/i })).toBeVisible();
  });

  test('cancellation asks for confirmation and refreshes the appointment list', async ({ page }) => {
    await mockApiBaseline(page, 'authenticated');
    await setupAuth(page, patientUser);
    const activeAppointment = {
      _id: 'appt-cancel-e2e', doctor: 'Dr. Cancel Test', date: '2099-10-05', time: '09:00 AM', status: 'Confirmed', mode: 'offline',
    };
    let currentAppointments = [activeAppointment];
    let updateCount = 0;
    await page.route('**/api/appointments?**', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ appointments: currentAppointments }),
    }));
    await page.route('**/api/appointments/waitlist/mine', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) }));
    await page.route('**/api/appointments/series/mine', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) }));
    await page.route('**/api/appointments/appt-cancel-e2e', async (route) => {
      if (route.request().method() === 'PUT') {
        updateCount += 1;
        currentAppointments = [];
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
      }
      return route.fulfill({ status: 405, body: '' });
    });
    await page.goto('/#/patient/appointments');
    await expect(page.getByRole('heading', { name: /my appointments/i })).toBeVisible();
    await expect(page.getByText('Dr. Cancel Test')).toBeVisible();

    const firstDialog = page.waitForEvent('dialog');
    const firstClick = page.getByRole('button', { name: 'Cancel' }).click({ force: true });
    const confirmDialog = await firstDialog;
    expect(confirmDialog.message()).toContain('cancel this appointment');
    await confirmDialog.dismiss();
    await firstClick;
    await expect.poll(() => updateCount).toBe(0);
    await expect(page.getByText('Dr. Cancel Test')).toBeVisible();

    const secondDialog = page.waitForEvent('dialog');
    const secondClick = page.getByRole('button', { name: 'Cancel' }).click({ force: true });
    await (await secondDialog).accept();
    await secondClick;
    await expect.poll(() => updateCount).toBe(1);
    await expect(page.getByText('No appointments found')).toBeVisible();
  });
});

// Phase 5 role-specific flows (TEST-B-02 + FE-M-01): patient book, provider
// accept, admin report. Frontend-only, API mocked — persistence/settlement
// server behavior cover nahi karte (wo backend suites ka kaam hai).
test.describe('role flows: patient book → provider accept → admin report', () => {
  test('patient books: slot + who-is-this-for advances the journey', async ({ page }) => {
    await mockApiBaselineFor(page, patientUser);
    await mockDoctorBooking(page);
    await setupAuth(page, patientUser);
    await page.goto('/#/doctors/doctor-e2e');

    await page.getByRole('button', { name: /book appointment/i }).first().click();
    await expect(page.getByRole('heading', { name: /book appointment/i })).toBeVisible();
    const nextButton = page.getByRole('button', { name: /next: who is this for/i });
    await page.locator('input[type="date"]').fill('2026-10-05');
    await page.locator('select').first().selectOption({ label: '9 AM' });
    await page.getByRole('button', { name: /9:00.*available/i }).click();
    await expect(nextButton).toBeEnabled();
    await nextButton.click();
    await expect(page.getByRole('heading', { name: /who is this appointment for/i })).toBeVisible();
    // self is the default booking target — continuing must stay in-flow
    await expect(page.getByRole('button', { name: /next|continue|confirm|pay/i }).first()).toBeVisible();
  });

  test('provider accepts: pending appointment confirms via PUT', async ({ page }) => {
    const today = istToday();
    await mockApiBaselineFor(page, doctorUser);
    await mockDoctorApproveList(page, today);
    await setupAuth(page, doctorUser);

    let confirmed = 0;
    await page.route('**/api/appointments/appt-approve-e2e', (route) => {
      if (route.request().method() === 'PUT') {
        confirmed += 1;
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }
      return route.fallback();
    });

    await page.goto('/#/doctor/appointments/approve');
    await expect(page.getByRole('heading', { name: /approve appointments/i })).toBeVisible();
    await expect(page.getByText('E2E Pending Patient').first()).toBeVisible();
    await page.getByRole('button', { name: /^confirm$/i }).first().click();
    await expect.poll(() => confirmed).toBe(1);
  });

  test('admin reports: category select exposes export', async ({ page }) => {
    await mockApiBaselineFor(page, adminUser);
    await mockAdminReports(page);
    await setupAuth(page, adminUser);
    await page.goto('/#/analytics-reports');
    await expect(page.getByRole('heading', { name: /reports & analytics/i })).toBeVisible();
    await page.getByRole('button', { name: /opd count/i }).click();
    await expect(page.getByRole('button', { name: /export pdf/i })).toBeVisible();
  });

  test('mobile viewport: home boots without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockApiBaseline(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /findmedi healthcare solutions/i })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
