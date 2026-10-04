import type { Page, Route } from '@playwright/test';

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

const apiOrigin = new URL(process.env.VITE_API_URL || 'http://localhost:5001/api').origin;

export async function mockApiBaseline(page: Page, session: 'authenticated' | 'anonymous' = 'anonymous') {
  await page.route('**/api/**', (route: Route) => {
    const url = route.request().url();
    if (url.includes('/auth/me') || url.includes('/auth/me?')) {
      return session === 'authenticated'
        ? route.fulfill(json(patientUser))
        : route.fulfill(json({ message: 'Unauthorized' }, 401));
    }
    return route.fulfill(json({ success: true, data: [] }));
  });
}

export async function mockLogin(page: Page, outcome: 'success' | 'failure' = 'success') {
  await page.route('**/api/auth/login', (route: Route) => {
    if (route.request().method() !== 'POST') {
      return route.fulfill(json({ message: 'method not allowed' }, 405));
    }
    if (outcome === 'failure') {
      return route.fulfill(json({ message: 'Invalid credentials' }, 401));
    }
    return route.fulfill(json({ token: 'e2e-access-token', user: patientUser }));
  });
}

export async function mockMe(page: Page, loggedIn = true, user = patientUser) {
  await page.route('**/api/auth/me*', (route: Route) => {
    if (!loggedIn) {
      return route.fulfill(json({ message: 'Unauthorized' }, 401));
    }
    return route.fulfill(json({ user }));
  });
}

export async function loginViaUi(page: Page, email: string, password: string, options: { timeout?: number } = {}) {
  const timeout = options.timeout ?? 10_000;
  await page.getByPlaceholder(/enter your email/i).fill(email, { timeout });
  await page.locator('input[type="password"]').first().fill(password, { timeout });
  await page.getByRole('button', { name: /log in|sign in/i }).click({ timeout });
}

export async function setupAuth(page: Page, user = patientUser) {
  await page.addInitScript((u) => {
    localStorage.setItem('user', JSON.stringify(u));
  }, user);
}

export async function mockHospital(
  page: Page,
  hospital = { _id: 'hosp-1', name: 'E2E Hospital', address: 'Test City' },
) {
  await page.route('**/api/hospitals/*', (route: Route) => {
    if (route.request().url().includes('/tests')) return route.fulfill(json([]));
    if (route.request().url().includes('/doctors')) return route.fulfill(json([]));
    return route.fulfill(json(hospital));
  });
}

export async function mockTests(
  page: Page,
  tests = [{ _id: 'test-1', name: 'CBC', price: 300, department: 'Pathology' }],
) {
  await page.route('**/api/tests*', (route: Route) => route.fulfill(json({ data: tests })));
}

export async function mockBookTestLab(page: Page, bookingId = 'booking-123') {
  await page.route('**/api/test-bookings', (route: Route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill(json({ bookingId, status: 'Pending', transactionId: 'txn-123' }));
    }
    return route.fulfill(json({ data: [] }));
  });
}

export async function mockPayment(page: Page, transactionId = 'txn-456') {
  await page.route('**/api/payments*', (route: Route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill(json({ transactionId, status: 'Success', invoiceId: 'INV-001' }));
    }
    return route.fulfill(json({ data: [] }));
  });
}

export async function mockAppointments(
  page: Page,
  appointments = [{ _id: 'appt-1', doctor: 'Dr. Smith', date: '2025-01-15', status: 'Confirmed' }],
) {
  await page.route('**/api/appointments/my', (route: Route) => route.fulfill(json({ data: appointments })));
}

export async function mockDoctorBooking(page: Page) {
  await page.route('**/api/doctors/doctor-e2e', (route: Route) => route.fulfill(json({
    _id: 'doctor-e2e',
    name: 'Dr. E2E Doctor',
    specialization: 'General Medicine',
    role: 'doctor',
    consultation_fees: 500,
    time_slots: ['09:00 AM'],
    appointmentModes: ['offline'],
    autoConfirmAppointment: true,
    approved: true,
  })));
  await page.route('**/api/appointments/booked-slots**', (route: Route) => route.fulfill(json({
    counts: {}, capacity: 1, fullSlots: [], lockedSlots: [], dateDisabled: [],
    bookingWindow: { unit: 'weeks', value: 2 }, pendingDisabledSlots: [],
  })));
  await page.route('**/api/patient/family', (route: Route) => route.fulfill(json({ members: [] })));
}


export async function mockLabBookings(
  page: Page,
  bookings = [{ _id: 'lab-1', facility: 'E2E Lab', date: '2025-01-15', status: 'Pending' }],
) {
  await page.route('**/api/lab/bookings*', (route: Route) => route.fulfill(json({ bookings })));
}

export async function mockCancelBooking(page: Page) {
  await page.route('**/api/appointments/*/cancel', (route: Route) => route.fulfill(json({ success: true })));
  await page.route('**/api/lab/bookings/*/cancel', (route: Route) => route.fulfill(json({ success: true })));
}

// ── Phase 5 role flows (TEST-B-02 + FE-M-01) ──────────────────────────────
// mockApiBaseline 'authenticated' hamesha patientUser deta hai; role flows ke
// liye session user parameterize karna padta hai (doctor/admin).

export async function mockApiBaselineFor(page: Page, user: typeof patientUser) {
  await page.route('**/api/**', (route: Route) => {
    const url = route.request().url();
    if (url.includes('/auth/me') || url.includes('/auth/me?')) {
      return route.fulfill(json(user));
    }
    return route.fulfill(json({ success: true, data: [] }));
  });
}

export function istToday() {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

export async function mockDoctorApproveList(page: Page, date: string) {
  const pending = {
    _id: 'appt-approve-e2e',
    patient: 'E2E Pending Patient',
    date,
    time: '09:00 AM',
    status: 'Pending',
    appointmentMode: 'offline',
    type: 'clinic',
  };
  await page.route('**/api/appointments?**', (route: Route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    return route.fulfill(json({ appointments: [pending] }));
  });
}

export async function mockAdminReports(page: Page) {
  await page.route('**/api/reports/**', (route: Route) =>
    route.fulfill(json({ data: [], summary: {} })),
  );
}
