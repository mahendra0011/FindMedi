import { test, expect } from '@playwright/test';
import type { Route } from '@playwright/test';
import { mockApiBaseline, mockMe, setupAuth, patientUser } from '@test-utils/helpers';

// Phase 5 (roadmap): prescription / medical-record download E2E (mocked API).
//
// The Medical History page groups records under appointments by date, so both
// mocks share the same 2025-01-15 visit date.

const json = (body: unknown, status = 200) => ({
  status,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

const visit = {
  _id: 'appt-1',
  date: '2025-01-15',
  time: '10:30',
  department: 'Cardiology',
  doctor: 'Dr. Smith',
  status: 'Completed',
};

const prescription = {
  _id: 'rec-1',
  date: '2025-01-15',
  type: 'prescription',
  diagnosis: 'Hypertension',
  prescription: 'Amlodipine 5mg - Once daily',
  data: {
    medications: [{ name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily' }],
    fileUrl: '/uploads/documents/rx-1.pdf',
  },
};

const labReport = {
  _id: 'rec-2',
  date: '2025-01-15',
  type: 'lab_report',
  diagnosis: 'CBC Panel',
  data: {
    tests: [{ name: 'Hemoglobin', result: '13.5', unit: 'g/dL', referenceRange: '12-16' }],
    fileUrl: '/uploads/documents/cbc-1.pdf',
  },
};

test.describe('Patient records & prescription download (mocked API)', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiBaseline(page);
    await setupAuth(page, patientUser);
    await mockMe(page, true, patientUser);

    await page.route('**/api/appointments*', (route: Route) =>
      route.fulfill(json({ appointments: [visit] })));
    await page.route('**/api/records*', (route: Route) =>
      route.fulfill(json({ records: [prescription, labReport] })));
    // Document "download" opens the stored file in a new tab — serve it.
    await page.route('**/uploads/**', (route: Route) =>
      route.fulfill({ status: 200, contentType: 'application/pdf', body: '%PDF-1.4 mock' }));
  });

  test('shows prescriptions and lab reports on the visit timeline', async ({ page }) => {
    await page.goto('/patient/records');

    await expect(page.getByRole('heading', { name: 'Medical History' })).toBeVisible();
    await expect(page.getByText('Visit History')).toBeVisible();
    await expect(page.getByText('Hypertension')).toBeVisible();
    await expect(page.getByText(/Amlodipine 5mg/)).toBeVisible();
    await expect(page.getByText('CBC Panel')).toBeVisible();

    // Category filter chips come from the record types.
    await expect(page.getByRole('button', { name: 'Prescriptions' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Lab Reports' })).toBeVisible();
  });

  test('opens record details and downloads the document', async ({ page }) => {
    await page.goto('/patient/records');

    await page.getByRole('button', { name: 'Details' }).first().click();

    // Detail modal: medications for the prescription record.
    await expect(page.getByText('Medications:')).toBeVisible();
    await expect(page.getByText('Amlodipine - 5mg - Once daily')).toBeVisible();

    // Download opens the file in a new tab (window.open).
    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: 'Download Document' }).click();
    const popup = await popupPromise;
    expect(popup).toBeTruthy();
    await popup.close();
  });
});
