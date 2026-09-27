import { test, expect } from '@playwright/test';
import {
  mockApiBaseline,
  mockHospital,
  mockTests,
  mockBookTestLab,
  mockPayment,
  mockLogin,
  mockMe,
  mockAppointments,
  mockLabBookings,
  mockCancelBooking,
  loginViaUi,
  setupAuth,
  patientUser,
  doctorUser,
  adminUser,
} from './helpers';

test.describe('Hospital Test Booking Flow (mocked API)', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiBaseline(page);
    await mockLogin(page, 'success');
    await mockMe(page, true, patientUser);
    await mockHospital(page);
    await mockTests(page);
    await mockPayment(page);
  });

  test('patient can navigate to hospital test booking page', async ({ page }) => {
    await page.goto('/book-test/hosp-1');
    await expect(page).toHaveURL(/\/book-test\/hosp-1/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('patient can navigate to booking page and see tests', async ({ page }) => {
    await page.goto('/book-test/hosp-1');
    await expect(page.locator('body')).toBeVisible();
    // Should have some test content
    await expect(page.locator('body')).toContainText('CBC');
  });
});

test.describe('Patient Appointments Dashboard (mocked)', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiBaseline(page);
    await setupAuth(page, patientUser);
    await mockMe(page, true, patientUser);
    await mockAppointments(page);
    await mockLabBookings(page);
  });

  test('patient can navigate to appointments dashboard', async ({ page }) => {
    await page.goto('/patient/bookings');
    await expect(page).toHaveURL(/\/patient\/bookings/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('patient can navigate to booking history', async ({ page }) => {
    await page.goto('/patient/booking-history');
    await expect(page).toHaveURL(/\/patient\/booking-history/);
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Role-specific dashboards (mocked)', () => {
  test('patient dashboard loads after login', async ({ page }) => {
    await mockApiBaseline(page);
    await setupAuth(page, patientUser);
    await mockMe(page, true, patientUser);

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('doctor dashboard loads after login', async ({ page }) => {
    await mockApiBaseline(page);
    await setupAuth(page, doctorUser);
    await mockMe(page, true, doctorUser);

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('admin dashboard loads after login', async ({ page }) => {
    await mockApiBaseline(page);
    await setupAuth(page, adminUser);
    await mockMe(page, true, adminUser);

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('unauthenticated user redirected to login', async ({ page }) => {
    await mockApiBaseline(page);
    await mockMe(page, false);

    await page.goto('/dashboard');
    // Wait for redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});

test.describe('Public pages (mocked)', () => {
  test('home page loads', async ({ page }) => {
    await mockApiBaseline(page);
    await page.goto('/');
    await expect(page).toHaveURL('/');
    await expect(page.locator('body')).toBeVisible();
  });

  test('login page loads', async ({ page }) => {
    await mockApiBaseline(page);
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('hospital directory loads', async ({ page }) => {
    await mockApiBaseline(page);
    await mockHospital(page);
    await page.goto('/hospitals');
    await expect(page).toHaveURL(/\/hospitals/);
    await expect(page.locator('body')).toBeVisible();
  });
});