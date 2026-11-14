import { test, expect } from '@playwright/test';
import { patientUser, doctorUser, superadminUser, mockApiBaseline, mockApiBaselineFor, mockDoctorBooking, setupAuth, istToday } from '../test-utils/helpers';

/**
 * Release-critical journeys (QA plan 18-QA-and-Test-Plan.md section 7),
 * automated in English + Hindi.
 *
 * Covered here:
 *   1.  Patient signup (OTP) -> search -> provider detail -> book (in-person) -> pay -> confirmation
 *   11. SOS flow + offline fallback numbers
 *   12. Consent grant/revoke + access log
 *   13. Family profile switch + dependant booking + guardian consent
 *
 * These run frontend-only against mocked APIs (see playwright.config.ts).
 * Third-party and payment calls stay mocked; the backend suites own
 * persistence/settlement behaviour.
 */

const familyMember = {
  _id: 'fam-e2e-1',
  name: 'E2E Dependant',
  relation: 'Child',
  gender: 'Male',
  bloodGroup: 'B+',
  phone: '8888888888',
};

for (const locale of ['en', 'hi']) {
  test.describe(`journey 1: signup -> book -> pay -> confirmation (${locale})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((lang) => localStorage.setItem('findmedi_lang', lang), locale);
      await mockApiBaseline(page, 'anonymous');
    });

    test('signup captures the mandatory clinical + emergency fields', async ({ page }) => {
      let registerBody: Record<string, unknown> | null = null;
      await page.route('**/api/auth/register', async (route) => {
        registerBody = JSON.parse(route.request().postData() || '{}');
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, sentTo: registerBody.email }),
        });
      });

      await page.goto('/signup');

      await page.getByPlaceholder('Enter your full name').fill('E2E New Patient');
      await page.getByPlaceholder('Enter your email').fill('new.patient@e2e.test');
      await page.getByPlaceholder('Enter 10-digit mobile number').fill('9876543210');
      await page.locator('input[type="date"]').fill('1995-04-12');

      // Blood group + emergency contact are required by the signup contract.
      await page.locator('select').filter({ hasText: 'Select blood group' }).selectOption('B+');
      await page.getByPlaceholder('Emergency contact name').fill('E2E Emergency Contact');
      await page.getByPlaceholder('Enter 10-digit emergency contact number').fill('9876543211');

      await page.getByPlaceholder('Create a password').fill('E2eStrongPass!23');
      await page.getByPlaceholder('Confirm your password').fill('E2eStrongPass!23');
      await page.locator('input[type="checkbox"]').first().check();

      await page.getByRole('button', { name: /Create Account/i }).click();

      await expect(page).toHaveURL(/\/verify-otp\?/);
      expect(registerBody).toMatchObject({
        name: 'E2E New Patient',
        email: 'new.patient@e2e.test',
        phone: '9876543210',
        bloodGroup: 'B+',
        emergencyContactName: 'E2E Emergency Contact',
        emergencyContactPhone: '9876543211',
      });
    });

    test('OTP verification completes the signup and opens the dashboard', async ({ page }) => {
      await page.route('**/api/auth/verify-otp', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ token: 'e2e-otp-token', user: patientUser }),
        }));

      await page.goto('/verify-otp?email=new.patient%40e2e.test');
      await expect(page.getByRole('heading', { name: /Enter OTP/i })).toBeVisible();

      await page.getByLabel(/Enter 6-digit verification code/i).fill('123456');
      await page.getByRole('button', { name: /Verify/i }).click();

      await expect(page).toHaveURL(/\/dashboard/);
    });

    test('in-person booking reaches the paid confirmation screen', async ({ page }) => {
      await setupAuth(page, patientUser);
      // Registered after the baseline so the authenticated session wins for /auth/me.
      await page.route('**/api/auth/me*', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(patientUser) }));
      await mockDoctorBooking(page);

      let payBody: Record<string, unknown> | null = null;
      await page.route('**/api/billing/pay', async (route) => {
        payBody = JSON.parse(route.request().postData() || '{}');
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            transaction_id: 'txn-e2e-1',
            invoice_id: 'inv-e2e-1',
            appointmentStatus: 'Confirmed',
            appointment: { _id: 'appt-e2e-1', date: '2026-10-05', time: '09:00 AM' },
          }),
        });
      });

      await page.goto('/doctors/doctor-e2e');
      await page.getByRole('button', { name: /book appointment/i }).first().click();
      await expect(page.getByRole('heading', { name: /book appointment/i })).toBeVisible();

      await page.locator('input[type="date"]').fill('2026-10-05');
      await page.locator('select').first().selectOption({ label: '9 AM' });
      await page.getByRole('button', { name: /9:00.*available/i }).click();

      const next = page.getByRole('button', { name: /next: who is this for/i });
      await expect(next).toBeEnabled();
      await next.click();

      // Self booking: no guardian consent needed.
      await expect(page.getByRole('heading', { name: /Who is this appointment for/i })).toBeVisible();
      await page.getByRole('button', { name: /Next: Intake Form/i }).click();

      await expect(page.getByRole('heading', { name: /Patient Intake Form/i })).toBeVisible();
      await page.getByRole('combobox').first().click();
      await page.getByRole('option', { name: 'Headache' }).click();
      await page.getByRole('button', { name: /Review & Pay/i }).click();

      await expect(page.getByRole('heading', { name: /Payment Method/i })).toBeVisible();
      await page.getByRole('button', { name: /Next: Review Bill/i }).click();

      await expect(page.getByRole('heading', { name: /Review & Confirm/i })).toBeVisible();
      await page.getByRole('button', { name: /^Pay/i }).click();

      await expect(page.getByRole('heading', { name: /Booking Confirmed!/i })).toBeVisible();
      expect(payBody).toMatchObject({
        serviceType: 'appointment',
        method: 'card',
      });
    });
  });

  test.describe(`journey 10: refund / cancellation matrix (${locale})`, () => {
    test('patient side: cancelling a confirmed appointment is confirmed before it is sent', async ({ page }) => {
      await mockApiBaselineFor(page, patientUser);
      await setupAuth(page, patientUser);

      let updateBody: Record<string, unknown> | null = null;
      await page.route('**/api/appointments?*', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            appointments: [{
              _id: 'appt-cancel-e2e',
              doctor: 'Dr. Cancel E2E',
              date: '2099-10-05',
              time: '09:00 AM',
              status: 'Confirmed',
              mode: 'offline',
            }],
          }),
        }));
      await page.route('**/api/appointments/appt-cancel-e2e', async (route) => {
        if (route.request().method() !== 'PUT') return route.fallback();
        updateBody = JSON.parse(route.request().postData() || '{}');
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
      });

      await page.goto('/patient/appointments');
      await expect(page.getByRole('heading', { name: /my appointments/i })).toBeVisible();
      await expect(page.getByText('Dr. Cancel E2E')).toBeVisible();

      // The native confirm() blocks the page, so the click promise must NOT be
      // awaited before the dialog is handled.
      const firstDialog = page.waitForEvent('dialog');
      const firstClick = page.getByRole('button', { name: 'Cancel' }).first().click({ force: true });
      const confirmDialog = await firstDialog;
      expect(confirmDialog.message()).toContain('cancel this appointment');

      // Dismissing the browser confirm must NOT cancel anything.
      await confirmDialog.dismiss();
      await firstClick;
      await expect.poll(() => updateBody).toBeNull();

      // Accepting it sends the cancellation to the API.
      const secondDialog = page.waitForEvent('dialog');
      const secondClick = page.getByRole('button', { name: 'Cancel' }).first().click({ force: true });
      await (await secondDialog).accept();
      await secondClick;
      await expect.poll(() => updateBody ?? {}).toMatchObject({ status: 'Cancelled' });
    });

    test('provider side: rejecting a request demands an auditable reason', async ({ page }) => {
      await mockApiBaselineFor(page, doctorUser);
      await setupAuth(page, doctorUser);

      let updateBody: Record<string, unknown> | null = null;
      await page.route('**/api/appointments?*', (route) => {
        if (route.request().method() !== 'GET') return route.fallback();
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            appointments: [{
              _id: 'appt-reject-e2e',
              patient: 'E2E Reject Patient',
              date: '2099-10-05',
              time: '09:00 AM',
              status: 'Pending',
              appointmentMode: 'offline',
              type: 'clinic',
            }],
          }),
        });
      });
      await page.route('**/api/appointments/appt-reject-e2e', async (route) => {
        if (route.request().method() !== 'PUT') return route.fallback();
        updateBody = JSON.parse(route.request().postData() || '{}');
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
      });

      await page.goto('/doctor/appointments/approve');
      await expect(page.getByRole('heading', { name: /approve appointments/i })).toBeVisible();

      // Open the reject dialog from the request card.
      await page.getByTitle('Reject request').first().click();
      const rejectBtn = page.getByRole('button', { name: /^Reject$/ });
      await expect(rejectBtn).toBeDisabled();

      await page.getByPlaceholder(/Tell the reason for reject/i).fill('Short');
      await expect(rejectBtn).toBeDisabled();
      await expect(page.getByText(/Reason must be at least 10 characters/i)).toBeVisible();

      await page.getByPlaceholder(/Tell the reason for reject/i).fill('Slot unavailable - doctor on leave');
      await expect(rejectBtn).toBeEnabled();
      await rejectBtn.click();

      await expect.poll(() => updateBody ?? {}).toMatchObject({
        status: 'Cancelled',
        notes: 'Slot unavailable - doctor on leave',
      });
    });
  });

  test.describe(`journey 4: lab booking -> report ready -> patient views it (${locale})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((lang) => localStorage.setItem('findmedi_lang', lang), locale);
      await mockApiBaselineFor(page, patientUser);
      await setupAuth(page, patientUser);
    });

    test('a collected sample becomes a report the patient can open', async ({ page }) => {
      await page.route('**/api/lab/bookings*', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            bookings: [{
              _id: 'labbk-e2e-1',
              labName: 'E2E Diagnostics',
              facilityName: 'E2E Diagnostics',
              date: '2099-10-05',
              slot: '07:30 AM',
              status: 'Report Ready',
              tests: ['Complete Blood Count'],
              reportUrl: 'https://example.test/report.pdf',
            }],
          }),
        }));
      await page.route('**/api/appointments/my-appointments*', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) }));

      await page.goto('/patient/bookings');
      await expect(page.getByRole('heading', { name: /My Bookings & Appointments/i })).toBeVisible();
      await expect(page.getByText('E2E Diagnostics')).toBeVisible();
      await expect(page.getByText('Report Ready').first()).toBeVisible();

      // A ready report must offer the patient a way into the report.
      await page.getByRole('button', { name: /View Report/i }).click();
      await expect(page).toHaveURL(/\/patient\/reports/);
    });

    test('the uploaded lab report shows up in the patient report centre', async ({ page }) => {
      await page.route('**/api/records*', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [{
              _id: 'rec-e2e-1',
              type: 'lab_report',
              diagnosis: 'Complete Blood Count',
              date: '2099-10-05',
              reportUrl: 'https://example.test/cbc.pdf',
              doctorName: 'E2E Diagnostics',
            }],
          }),
        }));
      await page.route('**/api/lab/orders*', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ orders: [] }) }));

      await page.goto('/patient/reports');
      await page.getByRole('button', { name: /Lab Reports/i }).click();
      await expect(page.getByText('Complete Blood Count')).toBeVisible();
    });
  });

  test.describe(`journey 8: event / camp registration -> ticket visible (${locale})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((lang) => localStorage.setItem('findmedi_lang', lang), locale);
      await mockApiBaselineFor(page, patientUser);
      await setupAuth(page, patientUser);
    });

    test('a registered camp shows the attendee schedule and venue', async ({ page }) => {
      await page.route('**/api/patient/events*', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            registrations: [{
              _id: 'reg-e2e-1',
              status: 'Registered',
              eventId: {
                title: 'E2E Health Camp',
                organizerName: 'E2E Foundation',
                schedule: { start: '2099-10-05T09:00:00.000Z' },
                venue: { mode: 'offline', address: 'E2E Camp Ground, Jabalpur' },
              },
            }],
          }),
        }));

      await page.goto('/patient/events');
      await expect(page.getByRole('heading', { name: /Registered Health Camps & Events/i })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'E2E Health Camp' })).toBeVisible();
      await expect(page.getByText('E2E Foundation')).toBeVisible();
      await expect(page.getByText('Registered').first()).toBeVisible();
      await expect(page.getByText(/E2E Camp Ground/)).toBeVisible();
    });

    test('no registrations renders an empty state, never someone else camp', async ({ page }) => {
      await page.route('**/api/patient/events*', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ registrations: [], total: 0 }) }));

      await page.goto('/patient/events');
      await expect(page.getByText(/No camp registrations yet/i)).toBeVisible({ timeout: 30_000 });
    });
  });

  test.describe(`journey 2: video consult -> prescription saved to records (${locale})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((lang) => localStorage.setItem('findmedi_lang', lang), locale);
      await mockApiBaselineFor(page, doctorUser);
      await setupAuth(page, doctorUser);
    });

    test('the consult room opens the appointment and refuses a prescription without a diagnosis', async ({ page }) => {
      await page.route('**/api/appointments?**', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            appointments: [{
              _id: 'appt-video-e2e-1',
              patient: 'E2E Video Patient',
              patientId: { _id: 'pat-e2e-1', name: 'E2E Video Patient', gender: 'Female', dateOfBirth: '1994-02-03' },
              date: istToday(),
              time: '09:00 AM',
              status: 'Confirmed',
              appointmentMode: 'video',
              preConsultationDetails: { chiefComplaint: 'Headache' },
            }],
          }),
        }));

      let recordBody: Record<string, unknown> | null = null;
      await page.route('**/api/records', async (route) => {
        if (route.request().method() !== 'POST') return route.fallback();
        recordBody = JSON.parse(route.request().postData() || '{}');
        return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ success: true }) });
      });

      await page.goto('/doctor/video-call/appt-video-e2e-1');

      // The patient context is loaded into the room.
      await expect(page.getByText('E2E Video Patient').first()).toBeVisible();

      await page.getByRole('button', { name: /Write Prescription/i }).click({ force: true });

      // Saving without a diagnosis is refused - no record is written.
      await page.getByRole('button', { name: /Complete Call & Save Prescription/i }).click({ force: true });
      await expect(page.getByText(/Please enter a diagnosis/i)).toBeVisible();
      expect(recordBody).toBeNull();
    });

    test('the saved prescription reaches the patient record and completes the visit', async ({ page }) => {
      await page.route('**/api/appointments?**', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            appointments: [{
              _id: 'appt-video-e2e-2',
              patient: 'E2E Video Patient',
              patientId: { _id: 'pat-e2e-1', name: 'E2E Video Patient', gender: 'Female', dateOfBirth: '1994-02-03' },
              date: istToday(),
              time: '09:00 AM',
              status: 'Confirmed',
              appointmentMode: 'video',
              preConsultationDetails: { chiefComplaint: 'Headache' },
            }],
          }),
        }));

      let recordBody: Record<string, unknown> | null = null;
      await page.route('**/api/records', async (route) => {
        if (route.request().method() !== 'POST') return route.fallback();
        recordBody = JSON.parse(route.request().postData() || '{}');
        return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ success: true }) });
      });

      let updatedBody: Record<string, unknown> | null = null;
      await page.route('**/api/appointments/appt-video-e2e-2', async (route) => {
        if (route.request().method() !== 'PUT') return route.fallback();
        updatedBody = JSON.parse(route.request().postData() || '{}');
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
      });

      await page.goto('/doctor/video-call/appt-video-e2e-2');

      await page.getByRole('button', { name: /Write Prescription/i }).click({ force: true });

      await page.getByPlaceholder('E.g. Viral Pharyngitis').fill('E2E Viral Diagnosis');
      await page.getByPlaceholder('Medicine Name').fill('E2E Syrup');
      await page.getByPlaceholder('Dosage (e.g. 500mg)').fill('100mg');
      await page.getByPlaceholder('Freq (e.g. 1-0-1)').fill('1-0-1');
      await page.getByPlaceholder('Drink plenty of fluids...').fill('Rest and hydrate');

      await page.getByRole('button', { name: /Complete Call & Save Prescription/i }).click({ force: true });

      await expect.poll(() => recordBody ?? {}).toMatchObject({
        type: 'prescription',
        diagnosis: 'E2E Viral Diagnosis',
      });
      expect(String((recordBody ?? {}).prescription || '')).toContain('E2E Syrup - 100mg - 1-0-1');
      // Ending the consult completes the appointment.
      await expect.poll(() => updatedBody ?? {}).toMatchObject({ status: 'Completed' });
    });
  });

  test.describe(`journey 3: home visit listing + clinic route/ETA (${locale})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((lang) => localStorage.setItem('findmedi_lang', lang), locale);
      await mockApiBaselineFor(page, patientUser);
      await setupAuth(page, patientUser);
    });

    test('an in-person visit shows the token, clinic and queue status', async ({ page }) => {
      await page.route('**/api/appointments?**', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            appointments: [{
              _id: 'appt-visit-e2e-1',
              tokenNumber: 'A-12',
              doctor: 'E2E Home Doctor',
              department: 'General Physician',
              date: istToday(),
              time: '09:00 AM',
              status: 'Confirmed',
              appointmentMode: 'offline',
              hospitalId: { name: 'E2E City Clinic' },
              currentLocation: { lat: 23.2, lng: 77.4 },
              facilityId: { name: 'E2E City Clinic', location: { lat: 23.25, lng: 77.45 } },
            }],
          }),
        }));

      await page.goto('/patient/home-visit');
      await expect(page.getByText('Dr. E2E Home Doctor').first()).toBeVisible();
      await expect(page.getByText('#A-12').first()).toBeVisible();
      await expect(page.getByText('E2E City Clinic').first()).toBeVisible();
      await expect(page.getByText('Confirmed').first()).toBeVisible();
    });

    test('an online-only visit is never listed as an in-person visit', async ({ page }) => {
      await page.route('**/api/appointments?**', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            appointments: [{
              _id: 'appt-video-e2e-1',
              doctor: 'E2E Video Doctor',
              date: '2099-10-05',
              time: '09:00 AM',
              status: 'Confirmed',
              appointmentMode: 'video',
            }],
          }),
        }));

      await page.goto('/patient/home-visit');
      await expect(page.getByText('E2E Video Doctor')).toHaveCount(0);
    });
  });

  test.describe(`journey 6: equipment rental -> deposit escrow -> return (${locale})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((lang) => localStorage.setItem('findmedi_lang', lang), locale);
      await mockApiBaselineFor(page, patientUser);
      await setupAuth(page, patientUser);
    });

    test('an active rental shows the escrow deposit and the return pickup action', async ({ page }) => {
      await page.route('**/api/patient/rentals*', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            rentals: [{
              _id: 'rental-e2e-1',
              status: 'ACTIVE',
              rentalAmount: 2400,
              ratePerDay: 400,
              days: 6,
              deposit: 5000,
              endAt: '2099-10-11T00:00:00.000Z',
              assetUnitId: { serial: 'SN-E2E-1', productName: 'Oxygen Concentrator' },
              vendorId: { name: 'E2E Medical Vendor' },
              sanitisation: { performedAt: '2099-09-30T00:00:00.000Z' },
            }],
          }),
        }));

      await page.goto('/patient/rentals');
      await expect(page.getByRole('heading', { name: /Equipment Rentals & Returns/i })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Oxygen Concentrator' })).toBeVisible();
      await expect(page.getByText('S/N: SN-E2E-1')).toBeVisible();
      await expect(page.getByText(/Held in Escrow/i).first()).toBeVisible();
      await expect(page.getByText(/Certified/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /Schedule Return/i }).first()).toBeVisible();
    });

    test('a closed rental shows the refunded deposit instead of the escrow hold', async ({ page }) => {
      await page.route('**/api/patient/rentals*', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            rentals: [{
              _id: 'rental-e2e-2',
              status: 'DEPOSIT_REFUNDED',
              rentalAmount: 2400,
              deposit: 5000,
              depositRefundAmount: 5000,
              endAt: '2099-09-11T00:00:00.000Z',
              assetUnitId: { serial: 'SN-E2E-2', productName: 'Hospital Bed' },
              vendorId: { name: 'E2E Medical Vendor' },
            }],
          }),
        }));

      await page.goto('/patient/rentals');
      await expect(page.getByText(/Refunded .*5,000/i)).toBeVisible();
    });

    test('no rentals renders an empty state instead of a placeholder list', async ({ page }) => {
      await page.route('**/api/patient/rentals*', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ rentals: [] }) }));

      await page.goto('/patient/rentals');
      await expect(page.getByText(/No equipment rentals yet/i)).toBeVisible();
    });
  });

  test.describe(`journey 5: pharmacy order -> delivery tracking -> return request (${locale})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((lang) => localStorage.setItem('findmedi_lang', lang), locale);
      await mockApiBaselineFor(page, patientUser);
      await setupAuth(page, patientUser);
    });

    test('a delivered pharmacy order exposes tracking and a return path', async ({ page }) => {
      await page.route('**/api/pharmacy/orders?**', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            orders: [{
              _id: 'ord-e2e-1',
              orderId: 'ORD-9001',
              status: 'Delivered',
              paymentStatus: 'Paid',
              totalAmount: 480,
              items: [{ name: 'E2E Syrup', quantity: 2, price: 240 }],
              createdAt: '2099-10-01T00:00:00.000Z',
            }],
          }),
        }));

      await page.goto('/patient/medicine-orders');
      await expect(page.getByRole('heading', { name: /My Medicine Orders/i })).toBeVisible();
      await expect(page.getByRole('heading', { name: /Order #ORD-9001/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Track Order/i })).toBeVisible();
    });

    test('a return request needs a reason and is sent to the pharmacy service', async ({ page }) => {
      await page.route('**/api/pharmacy/orders?**', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            order: {
              _id: 'ord-e2e-2',
              orderId: 'ORD-9002',
              status: 'Delivered',
              paymentStatus: 'Paid',
              totalAmount: 480,
              items: [{ name: 'E2E Syrup', quantity: 2, price: 240 }],
              deliveryAddress: 'E2E Address',
              createdAt: '2099-10-01T00:00:00.000Z',
            },
          }),
        }));

      let returnBody: Record<string, unknown> | null = null;
      await page.route('**/api/pharmacy/returns', async (route) => {
        returnBody = JSON.parse(route.request().postData() || '{}');
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
      });

      await page.goto('/order-tracking/ord-e2e-2');
      // The delivered state must be reached from the server status, and the
      // order-actions panel must open before the return option is offered.
      await expect(page.getByText('Delivered!').first()).toBeVisible();
      await page.getByRole('button', { name: /Order Actions/i }).click();

      await page.getByRole('button', { name: /Return \/ Replace/i }).click();

      const submit = page.getByRole('button', { name: /Submit Request/i });
      await expect(submit).toBeDisabled();

      await page.getByRole('button', { name: 'Wrong item delivered' }).click();
      await expect(submit).toBeEnabled();
      await submit.click();

      await expect.poll(() => returnBody ?? {}).toMatchObject({
        orderId: 'ord-e2e-2',
        reason: 'Wrong item delivered',
        status: 'Requested',
      });
    });
  });

  test.describe(`journey 9: provider join (config-driven) -> application submitted (${locale})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((lang) => localStorage.setItem('findmedi_lang', lang), locale);
      await mockApiBaselineFor(page, patientUser);
      await setupAuth(page, patientUser);
    });

    test('the join wizard is driven by the provider-type config, not hardcoded steps', async ({ page }) => {
      await page.route('**/api/config/provider-types**', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            providerTypes: [{
              typeKey: 'e2e_clinic',
              label: 'E2E Clinic',
              group: 'facilities',
              steps: [
                { key: 'account', fields: [] },
                { key: 'business', fields: ['legal_name'] },
                { key: 'review', fields: ['declaration'] },
              ],
              fields: [{ key: 'legal_name', label: 'Registered Legal Name', type: 'text', required: true }],
              requiredDocs: [],
              optionalDocs: [],
            }],
          }),
        }));

      await page.route('**/api/join', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ application: { _id: 'app-e2e-join', applicationId: 'APP-E2E-1' } }),
        }));
      await page.route('**/api/join/**', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ application: { applicationId: 'APP-E2E-1' } }) }));

      await page.goto('/join/new?type=e2e_clinic');

      // Step 1 is the account step: the wizard's own contact fields, seeded
      // from the signed-in session.
      await expect(page.getByText('Step 1 of 3')).toBeVisible();
      await expect(page.getByText('Authorized Contact Name')).toBeVisible();
      await expect(page.getByText('Primary Mobile Number')).toBeVisible();
      await expect(page.getByText('Official Email Address')).toBeVisible();
      // Seeded from the signed-in session.
      await expect(page.getByRole('textbox').first()).toHaveValue('E2E Patient');
      await expect(page.getByRole('textbox', { name: '10-digit mobile number' })).toHaveValue('9999999999');
      await expect(page.getByRole('textbox', { name: 'official@domain.com' })).toHaveValue('patient@e2e.test');

      await page.getByRole('button', { name: /^Continue$/i }).click();

      // Step 2 comes from the config: the type's own business field.
      await expect(page.getByText('Step 2 of 3')).toBeVisible();
      await expect(page.getByText('Registered Legal Name')).toBeVisible();

      // A required config field must be filled before the wizard advances.
      await page.getByRole('button', { name: /^Continue$/i }).click();
      await expect(page.getByText('Step 2 of 3')).toBeVisible();

      await page.getByRole('textbox').last().fill('E2E Clinic Pvt Ltd');
      await page.getByRole('button', { name: /^Continue$/i }).click();

      // Step 3 is the review step: the declaration must be accepted.
      await expect(page.getByText('Step 3 of 3')).toBeVisible();

      // Submitting without the declaration is refused.
      await page.getByRole('button', { name: /Submit Application/i }).click();
      await expect(page.getByText(/accept all required declarations/i)).toBeVisible();

      await page.locator('input[type="checkbox"]').last().check();
      await page.getByRole('button', { name: /Submit Application/i }).click();

      await expect(page.getByText(/Application Submitted Successfully/i)).toBeVisible();
    });
  });

  test.describe(`journey 7: gym/yoga membership -> freeze -> check-in -> cancel (${locale})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((lang) => localStorage.setItem('findmedi_lang', lang), locale);
      await mockApiBaselineFor(page, patientUser);
      await setupAuth(page, patientUser);
    });

    test('the memberships list is the patient own terms, with a real lifecycle', async ({ page }) => {
      await page.route('**/api/memberships', (route) => {
        if (route.request().method() !== 'GET') return route.fallback();
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            memberships: [{
              _id: 'mem-e2e-1',
              status: 'ACTIVE',
              startAt: '2099-09-01T00:00:00.000Z',
              endAt: '2099-11-01T00:00:00.000Z',
              daysLeft: 44,
              creditsLeft: 8,
              autoRenew: true,
              checkIns: [{ at: '2099-09-10T00:00:00.000Z', method: 'qr' }],
              planId: { name: 'E2E Unlimited Yoga Pass', durationLabel: '2-Month Pass', category: 'Fitness / Yoga' },
              providerId: { name: 'E2E Studio' },
            }],
          }),
        });
      });

      await page.goto('/patient/programs');
      await expect(page.getByRole('heading', { name: /Programs & Memberships/i })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'E2E Unlimited Yoga Pass' })).toBeVisible();
      await expect(page.getByText('E2E Studio')).toBeVisible();
      await expect(page.getByText('44 days remaining')).toBeVisible();
      await expect(page.getByText('Active Subscriptions (1)')).toBeVisible();
    });

    test('freezing, checking in and cancelling all hit the membership API', async ({ page }) => {
      await page.route('**/api/memberships', (route) => {
        if (route.request().method() !== 'GET') return route.fallback();
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            memberships: [{
              _id: 'mem-e2e-2',
              status: 'ACTIVE',
              startAt: '2099-09-01T00:00:00.000Z',
              endAt: '2099-11-01T00:00:00.000Z',
              daysLeft: 44,
              creditsLeft: 8,
              checkIns: [],
              planId: { name: 'E2E Gym Pass', durationLabel: '2-Month Pass', category: 'Fitness / Yoga' },
              providerId: { name: 'E2E Studio' },
            }],
          }),
        });
      });

      const calls: Array<{ method: string; url: string; body: unknown }> = [];
      await page.route('**/api/memberships/**', async (route) => {
        calls.push({
          method: route.request().method(),
          url: route.request().url(),
          body: route.request().postData() ? JSON.parse(route.request().postData() || '{}') : null,
        });
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ membership: { _id: 'mem-e2e-2', status: 'FROZEN' } }),
        });
      });

      await page.goto('/patient/programs');
      await expect(page.getByRole('heading', { name: 'E2E Gym Pass' })).toBeVisible();

      await page.getByRole('button', { name: /Check in/i }).click();
      await expect.poll(() => calls.length).toBeGreaterThan(0);
      expect(calls[0].url).toContain('/api/memberships/mem-e2e-2/check-in');
      expect(calls[0].body).toMatchObject({ method: 'app' });

      await page.getByRole('button', { name: /Freeze Pass/i }).click();
      await expect.poll(() => calls.some((c) => c.url.includes('/freeze'))).toBe(true);
      const freezeCall = calls.find((c) => c.url.includes('/freeze'));
      expect(freezeCall?.body).toMatchObject({ days: 14 });

      await page.getByRole('button', { name: /Cancel/i }).click();
      await expect.poll(() => calls.some((c) => c.url.includes('/cancel'))).toBe(true);
    });

    test('no memberships renders an empty state, never a fixture row', async ({ page }) => {
      await page.route('**/api/memberships', (route) => {
        if (route.request().method() !== 'GET') return route.fallback();
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ memberships: [] }) });
      });

      await page.goto('/patient/programs');
      await expect(page.getByText(/No active memberships/i)).toBeVisible();
      await expect(page.getByText('Active Subscriptions (0)')).toBeVisible();
    });
  });

  test.describe(`journey 14: admin KYC / suspend / dispute / moderation (${locale})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((lang) => localStorage.setItem('findmedi_lang', lang), locale);
      // Baseline first: it keeps the CSRF bootstrap (GET /auth/csrf-token) from
      // failing, which would otherwise reject the request interceptor and block
      // every state-changing call. Later routes win for their URLs.
      await mockApiBaselineFor(page, superadminUser);
      await setupAuth(page, superadminUser);
    });

    test('KYC rejection is blocked without an audited reason', async ({ page }) => {
      await page.route('**/api/admin/applications/app-e2e-1', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            application: { _id: 'app-e2e-1', typeKey: 'hospital', status: 'submitted', providerId: 'prov-e2e-1' },
            documents: [],
            config: { requiredDocs: [], optionalDocs: [] },
          }),
        }));

      let decisionBody: Record<string, unknown> | null = null;
      await page.route('**/api/admin/applications/app-e2e-1/decision', async (route) => {
        decisionBody = JSON.parse(route.request().postData() || '{}');
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ application: { _id: 'app-e2e-1', status: 'rejected' } }),
        });
      });

      await page.goto('/superadmin/kyc-workspace/app-e2e-1');

      await page.getByRole('button', { name: /^Reject$/ }).click();
      await expect(page.getByText(/A rejection reason is required/i)).toBeVisible();
      expect(decisionBody).toBeNull();
    });

    test('high-risk KYC approval parks the application for a second reviewer', async ({ page }) => {
      await page.route('**/api/admin/applications/app-e2e-2', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            application: {
              _id: 'app-e2e-2',
              typeKey: 'ivf',
              status: 'submitted',
              providerId: 'prov-e2e-2',
              autoChecks: { verdict: 'conflict', forceTwoPerson: true, checks: [{ key: 'identity_dupe', status: 'flag', severity: 'conflict', note: 'duplicate identity' }] },
            },
            documents: [],
            config: { requiredDocs: [], optionalDocs: [] },
          }),
        }));

      await page.route('**/api/admin/applications/app-e2e-2/decision', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            awaitingSecondApprover: true,
            application: { _id: 'app-e2e-2', status: 'under_review', approvalState: { firstApprovedBy: 'e2e-superadmin-1' } },
          }),
        }));

      await page.goto('/superadmin/kyc-workspace/app-e2e-2');

      await expect(page.getByText(/two-person approval required/i)).toBeVisible();
      await page.getByRole('button', { name: /Approve/i }).click();
      await expect(page.getByText(/second, different reviewer must approve/i)).toBeVisible();
    });

    test('suspending a provider records the audited reason', async ({ page }) => {
      await page.route('**/api/providers/admin/list?*', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            providers: [{ _id: 'prov-e2e-1', name: 'E2E Provider', status: 'live', type: 'hospital' }],
          }),
        }));

      let statusBody: Record<string, unknown> | null = null;
      await page.route('**/api/providers/prov-e2e-1/status', async (route) => {
        statusBody = JSON.parse(route.request().postData() || '{}');
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
      });

      await page.goto('/superadmin/providers');
      await page.getByRole('button', { name: /Suspend/i }).first().click();

      await expect(page.getByRole('heading', { name: /Suspend Provider Listing/i })).toBeVisible();
      await page.getByPlaceholder(/Reason for suspension/i).fill('Repeated no-shows reported by patients');
      await page.getByRole('button', { name: /Confirm Suspension/i }).click();

      await expect(page.getByText(/Provider status updated to suspended/i)).toBeVisible();
      expect(statusBody).toMatchObject({
        status: 'suspended',
        reason: 'Repeated no-shows reported by patients',
      });
    });

    test('dispute resolution writes the resolution notes to the case', async ({ page }) => {
      await page.route('**/api/disputes?*', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            disputes: [{
              _id: 'disp-e2e-1',
              disputeId: 'DSP-101',
              status: 'Open',
              reason: 'Service not delivered',
              raisedByName: 'E2E Patient',
              againstName: 'E2E Provider',
              againstType: 'doctor',
            }],
          }),
        }));
      await page.route('**/api/disputes/stats', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ total: 1, open: 1, inReview: 0, resolved: 0, dismissed: 0 }) }));

      let resolvedBody: Record<string, unknown> | null = null;
      await page.route('**/api/disputes/disp-e2e-1/status', async (route) => {
        resolvedBody = JSON.parse(route.request().postData() || '{}');
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
      });

      await page.goto('/superadmin/disputes');
      const disputeRow = page.locator('div.rounded-xl', { hasText: 'Service not delivered' }).last();
      await disputeRow.getByRole('button').click();
      await page.getByPlaceholder(/Resolution notes/i).fill('Refund approved after provider did not show');
      await page.getByRole('button', { name: /^Resolve$/ }).click();

      await expect.poll(() => resolvedBody ?? {}).toMatchObject({
        status: 'Resolved',
        resolution: 'Refund approved after provider did not show',
      });
    });

    test('moderation action requires a justification and parks for a second reviewer', async ({ page }) => {
      await page.route('**/api/moderation?*', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            total: 1,
            items: [{
              _id: 'mod-e2e-1',
              targetType: 'review',
              targetId: 'target-e2e-1',
              severity: 'high',
              category: 'review',
              reason: 'Suspected fake health claim',
              source: 'patient_review',
              status: 'open',
              createdAt: '2026-10-01T00:00:00.000Z',
            }],
          }),
        }));

      let actionBody: Record<string, unknown> | null = null;
      await page.route('**/api/moderation/mod-e2e-1/action', async (route) => {
        actionBody = JSON.parse(route.request().postData() || '{}');
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ code: 'NEEDS_SECOND_REVIEWER', item: { _id: 'mod-e2e-1' } }),
        });
      });

      await page.goto('/superadmin/moderation');
      await page.getByText(/Suspected fake health claim/i).first().click();

      await page.getByRole('button', { name: /Remove Content/i }).click();
      await expect(page.getByText(/A note\/justification is required/i)).toBeVisible();
      expect(actionBody).toBeNull();

      await page.getByPlaceholder(/justification for audit trail/i).fill('Claim cites a treatment not on the provider licence');
      await page.getByRole('button', { name: /Remove Content/i }).click();
      await expect(page.getByText(/awaiting confirmation by a second, different reviewer/i)).toBeVisible();
      expect(actionBody).toMatchObject({ action: 'remove' });
    });
  });

  test.describe(`journey 11: SOS + offline fallback numbers (${locale})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((lang) => localStorage.setItem('findmedi_lang', lang), locale);
      await mockApiBaselineFor(page, patientUser);
      await setupAuth(page, patientUser);
    });

    test('emergency card exposes the always-available helplines', async ({ page }) => {
      await page.goto('/patient/emergency-card');

      await expect(page.getByRole('heading', { name: /Emergency \/ SOS/i })).toBeVisible();

      const ambulance = page.getByRole('link', { name: /Call 108/i });
      await expect(ambulance).toBeVisible();
      await expect(ambulance).toHaveAttribute('href', 'tel:108');

      const manas = page.getByRole('link', { name: /Tele-MANAS 14416/i });
      await expect(manas).toBeVisible();
      await expect(manas).toHaveAttribute('href', 'tel:14416');
    });

    test('responder directory failure keeps the offline helplines usable', async ({ page }) => {
      // Network failure for the responder lookup: the page must still render
      // the static helplines instead of crashing on the empty directory.
      await page.route('**/api/**first-responder**', (route) => route.abort('failed'));
      await page.goto('/patient/emergency-card');

      await expect(page.getByRole('link', { name: /Call 108/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /Tele-MANAS 14416/i })).toBeVisible();
      await expect(page.getByText(/Trained first responders near you/i)).toHaveCount(0);
    });
  });

  test.describe(`journey 12: consent grant/revoke + access log (${locale})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((lang) => localStorage.setItem('findmedi_lang', lang), locale);
      await mockApiBaselineFor(page, patientUser);
      await setupAuth(page, patientUser);
    });

    test('revoking a consent flips the ledger and is announced', async ({ page }) => {
      await page.goto('/patient/consents');

      await expect(page.getByRole('heading', { name: /Consent Manager & Data Access Log/i })).toBeVisible();

      const revoke = page.getByRole('button', { name: /Revoke Consent/i }).first();
      await expect(revoke).toBeVisible();
      await revoke.click();

      await expect(page.getByText(/Consent revoked immediately/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /Grant Consent/i }).first()).toBeVisible();

      // Re-granting puts the same consent back into the granted state.
      await page.getByRole('button', { name: /Grant Consent/i }).first().click();
      await expect(page.getByText(/Consent granted and updated in audit ledger/i)).toBeVisible();
    });

    test('access log starts empty and never invents fixture entries', async ({ page }) => {
      await page.goto('/patient/consents');
      await expect(page.getByText(/No record access yet/i)).toBeVisible();
    });

    test('privacy centre toggles consent preferences and masks in discreet mode', async ({ page }) => {
      await page.goto('/patient/privacy');

      await expect(page.getByRole('heading', { name: /Privacy Centre/i })).toBeVisible();

      const consent = page.getByTestId('consents').getByRole('checkbox').first();
      await expect(consent).toBeChecked();
      await consent.uncheck();
      await expect(consent).not.toBeChecked();

      // Access log is server-driven: with no audit rows it must stay empty.
      await expect(page.getByTestId('access-log').getByText(/No access recorded yet/i)).toBeVisible();

      const discreet = page.getByTestId('discreet-toggle').getByRole('switch');
      await expect(discreet).toHaveAttribute('aria-checked', 'false');
      await discreet.click();
      await expect(discreet).toHaveAttribute('aria-checked', 'true');
    });
  });

  test.describe(`journey 13: family profile switch + dependant booking (${locale})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((lang) => localStorage.setItem('findmedi_lang', lang), locale);
      await mockApiBaselineFor(page, patientUser);
      await setupAuth(page, patientUser);
    });

    test('family member can be added to the account', async ({ page }) => {
      let members: Array<typeof familyMember> = [];

      await page.route('**/api/patient/family', async (route) => {
        if (route.request().method() === 'POST') {
          const body = JSON.parse(route.request().postData() || '{}');
          members = [...members, { ...familyMember, _id: 'fam-new-1', name: body.name || 'New Member' }];
          return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
        }
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ members }) });
      });

      await page.goto('/patient/family');
      await expect(page.getByRole('heading', { name: /My Family/i })).toBeVisible();

      await page.getByRole('button', { name: /Add Member/i }).first().click();
      await page.getByPlaceholder(/Enter full name/i).fill('E2E New Member');
      await page.getByRole('button', { name: /Save Member/i }).click();

      await expect(page.getByRole('heading', { name: 'E2E New Member' })).toBeVisible();
    });

    test('booking for a dependant requires guardian consent', async ({ page }) => {
      await mockDoctorBooking(page);
      // Registered after mockDoctorBooking so it wins for this URL.
      await page.route('**/api/patient/family', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ members: [familyMember] }) }));

      await page.goto('/doctors/doctor-e2e');
      await page.getByRole('button', { name: /book appointment/i }).first().click();
      await expect(page.getByRole('heading', { name: /book appointment/i })).toBeVisible();

      await page.locator('input[type="date"]').fill('2026-10-05');
      await page.locator('select').first().selectOption({ label: '9 AM' });
      await page.getByRole('button', { name: /9:00.*available/i }).click();

      const next = page.getByRole('button', { name: /next: who is this for/i });
      await expect(next).toBeEnabled();
      await next.click();

      await expect(page.getByRole('heading', { name: /Who is this appointment for/i })).toBeVisible();

      // Switch the booking target from self to the linked dependant.
      await page.getByText('E2E Dependant').click();
      const guardian = page.getByRole('checkbox');
      await expect(guardian).toBeVisible();

      // Guardian consent is mandatory for a dependant booking.
      await page.getByRole('button', { name: /Next: Intake Form/i }).click();
      await expect(page.getByText(/Please confirm guardian consent to continue/i)).toBeVisible();

      await guardian.check();
      await page.getByRole('button', { name: /Next: Intake Form/i }).click();
      await expect(page.getByRole('heading', { name: /Patient Intake Form/i })).toBeVisible();
    });
  });
}
