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

export const doctorUser = {
  _id: 'e2e-doctor-1',
  id: 'e2e-doctor-1',
  name: 'Dr. E2E Doctor',
  email: 'doctor@e2e.test',
  role: 'doctor',
  status: 'active',
  isVerified: true,
  doctorApproved: true,
  approvalStatus: 'approved',
  settings: { defaultDashboard: 'overview' },
};

export const adminUser = {
  _id: 'e2e-admin-1',
  id: 'e2e-admin-1',
  name: 'E2E Admin',
  email: 'admin@e2e.test',
  role: 'hospital_admin',
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
export async function mockMe(page: Page, loggedIn = true, user = patientUser) {
  await page.route('**/api/auth/me', (route: Route) =>
    route.fulfill(loggedIn ? json(user) : json({ message: 'Unauthorized' }, 401)),
  );
}

/** Login page par role + credentials bhar kar Sign In click karo. */
export async function loginViaUi(page: Page, email: string, password: string) {
  await page.getByPlaceholder('Enter your email').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
}

/** Direct auth setup via localStorage — faster than UI login. */
export async function setupAuth(page: Page, user = patientUser) {
  await page.addInitScript((u) => {
    localStorage.setItem('token', 'e2e-access-token');
    localStorage.setItem('refreshToken', 'e2e-refresh-token');
    localStorage.setItem('user', JSON.stringify(u));
  }, user);
}

/** Hospital / facility APIs mock */
export async function mockHospital(page: Page, hospital = { _id: 'hosp-1', name: 'E2E Hospital', address: 'Test City' }) {
  await page.route('**/api/hospitals/*', (route: Route) => {
    if (route.request().url().includes('/tests')) return route.fulfill(json([]));
    if (route.request().url().includes('/doctors')) return route.fulfill(json([]));
    route.fulfill(json(hospital));
  });
}

/** Tests list mock */
export async function mockTests(page: Page, tests = [{ _id: 'test-1', name: 'CBC', price: 300, department: 'Pathology' }]) {
  await page.route('**/api/tests*', (route: Route) => route.fulfill(json({ data: tests })));
}

/** Booking creation mock */
export async function mockBookTestLab(page: Page, bookingId = 'booking-123') {
  await page.route('**/api/test-bookings', (route: Route) => {
    if (route.request().method() === 'POST') {
      route.fulfill(json({ bookingId, status: 'Pending', transactionId: 'txn-123' }));
    } else {
      route.fulfill(json({ data: [] }));
    }
  });
}

/** Payment mock */
export async function mockPayment(page: Page, transactionId = 'txn-456') {
  await page.route('**/api/payments*', (route: Route) => {
    if (route.request().method() === 'POST') {
      route.fulfill(json({ transactionId, status: 'Success', invoiceId: 'INV-001' }));
    } else {
      route.fulfill(json({ data: [] }));
    }
  });
}

/** Appointments mock for patient dashboard */
export async function mockAppointments(page: Page, appointments = [{ _id: 'appt-1', doctor: 'Dr. Smith', date: '2025-01-15', status: 'Confirmed' }]) {
  await page.route('**/api/appointments/my', (route: Route) => route.fulfill(json({ data: appointments })));
}

/** Lab bookings mock */
export async function mockLabBookings(page: Page, bookings = [{ _id: 'lab-1', facility: 'E2E Lab', date: '2025-01-15', status: 'Pending' }]) {
  await page.route('**/api/lab/bookings*', (route: Route) => route.fulfill(json({ bookings })));
}

/** Booking cancellation mock */
export async function mockCancelBooking(page: Page) {
  await page.route('**/api/appointments/*/cancel', (route: Route) => route.fulfill(json({ success: true })));
  await page.route('**/api/lab/bookings/*/cancel', (route: Route) => route.fulfill(json({ success: true })));
}