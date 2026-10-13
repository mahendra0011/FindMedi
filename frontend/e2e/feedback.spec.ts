import { test, expect } from '@playwright/test';
import { adminUser, patientUser, mockApiBaselineFor, setupAuth } from '../test-utils/helpers';

test.describe('Feedback & NPS Dashboard (B4)', () => {
  test('renders feedback list, metrics, and allows refresh action', async ({ page }) => {
    await mockApiBaselineFor(page, adminUser);

    await page.route(/\/api\/feedback\/summary/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            totalResponses: 1,
            nps: 100,
            promoters: 1,
            detractors: 0,
            passives: 0,
            avgCsat: 5.0,
          },
        }),
      }),
    );

    await page.route(/\/api\/feedback(?!\/summary)/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            total: 1,
            nps: 100,
            promoters: 1,
            detractors: 0,
            passives: 0,
            feedback: [
              {
                _id: 'fb-1',
                department: 'Cardiology',
                npsScore: 10,
                rating: 5,
                comment: 'Exceptional care and friendly staff',
                status: 'new',
                createdAt: new Date().toISOString(),
              },
            ],
          },
        }),
      }),
    );

    await page.goto('/#/hospital/feedback');

    await expect(page.getByRole('heading', { name: /patient feedback & net promoter score/i })).toBeVisible();
    await expect(page.getByText('Exceptional care and friendly staff')).toBeVisible();

    const refreshBtn = page.getByRole('button', { name: /refresh/i });
    await expect(refreshBtn).toBeVisible();
    await refreshBtn.click();
  });

  test('patient rates a completed video visit: teleconsult context posted', async ({ page }) => {
    await mockApiBaselineFor(page, patientUser);
    await setupAuth(page, patientUser);

    await page.route(/\/api\/appointments\?/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          appointments: [
            {
              _id: 'appt-fb-1',
              doctor: 'Dr. Feedback Test',
              doctorName: 'Dr. Feedback Test',
              department: 'General Medicine',
              date: '2026-10-01',
              time: '10:00 AM',
              status: 'Completed',
              mode: 'video',
            },
          ],
        }),
      }),
    );

    let posted: any = null;
    await page.route(/\/api\/feedback/, async (route) => {
      const method = route.request().method();
      const url = route.request().url();
      if (method === 'POST') {
        posted = route.request().postDataJSON();
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }
      if (url.includes('/mine')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ hasSubmitted: false }),
        });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: {} }) });
    });

    await page.goto('/#/patient/appointments');
    await expect(page.getByRole('heading', { name: /my appointments/i })).toBeVisible();
    await page.getByRole('tab', { name: 'Past' }).click();
    await page.getByRole('button', { name: /rate experience/i }).click();

    const prompt = page.getByRole('region', { name: /patient feedback prompt/i });
    await expect(prompt).toBeVisible();
    await page.getByRole('radio', { name: 'Score 9 out of 10' }).click();
    await page.getByRole('button', { name: /submit feedback/i }).click();

    await expect(page.getByText('Thank you for sharing your experience')).toBeVisible();
    expect(posted).not.toBeNull();
    expect(posted.context).toBe('teleconsult');
    expect(posted.refModel).toBe('Appointment');
    expect(posted.refId).toBe('appt-fb-1');
    expect(posted.npsScore).toBe(9);
  });

  test('patient rates a verified lab order: lab context posted', async ({ page }) => {
    await mockApiBaselineFor(page, patientUser);
    await setupAuth(page, patientUser);

    await page.route(/\/api\/lab\/orders/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          orders: [
            {
              _id: 'lab-fb-1',
              orderId: 'LAB-FB-001',
              priority: 'Routine',
              createdAt: new Date('2026-10-01').toISOString(),
              doctorName: 'Dr. Lab Test',
              reportVersion: 1,
              tests: [
                { testName: 'CBC', status: 'Verified', resultValue: '12.5', unit: 'g/dL', flag: '', refLow: 10, refHigh: 16 },
              ],
            },
          ],
        }),
      }),
    );
    await page.route(/\/api\/records/, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) }),
    );

    let posted: any = null;
    await page.route(/\/api\/feedback/, async (route) => {
      const method = route.request().method();
      const url = route.request().url();
      if (method === 'POST') {
        posted = route.request().postDataJSON();
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }
      if (url.includes('/mine')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ hasSubmitted: false }),
        });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: {} }) });
    });

    await page.goto('/#/patient/reports');
    await expect(page.getByText('Pathology Lab Orders')).toBeVisible();
    await page.getByRole('button', { name: /LAB-FB-001/ }).click();
    await page.getByRole('button', { name: /^Rate$/ }).click();

    const prompt = page.getByRole('region', { name: /patient feedback prompt/i });
    await expect(prompt).toBeVisible();
    await page.getByRole('radio', { name: 'Score 7 out of 10' }).click();
    await page.getByRole('button', { name: /submit feedback/i }).click();

    await expect(page.getByText('Thank you for sharing your experience')).toBeVisible();
    expect(posted).not.toBeNull();
    expect(posted.context).toBe('lab');
    expect(posted.refModel).toBe('LabOrder');
    expect(posted.refId).toBe('lab-fb-1');
    expect(posted.npsScore).toBe(7);
  });
});
