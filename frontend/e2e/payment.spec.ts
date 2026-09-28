import { test, expect } from '@playwright/test';
import type { Route } from '@playwright/test';
import { mockApiBaseline, mockMe, setupAuth, patientUser } from '@test-utils/helpers';

// Phase 5 (roadmap): payment-flow E2E. Everything is API-mocked, so this runs
// frontend-only — no backend/Atlas/payment provider required in CI.

const json = (body: unknown, status = 200) => ({
  status,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

const pendingBill = {
  _id: 'bill-1',
  invoiceId: 'INV-001',
  service: 'Cardiology Consultation',
  doctor: 'Dr. Smith',
  amount: 500,
  paid: 0,
  status: 'Pending',
  date: '2025-01-15',
};

const completedPayment = {
  _id: 'pay-1',
  transactionId: 'txn-456',
  invoiceId: 'INV-777',
  amount: 1200,
  method: 'card',
  status: 'completed',
};

test.describe('Patient payment flow (mocked API)', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiBaseline(page);
    await setupAuth(page, patientUser);
    await mockMe(page, true, patientUser);

    // Payment history + pending bills feed the two halves of the page.
    await page.route('**/api/payments*', (route: Route) =>
      route.fulfill(json({ payments: [completedPayment] })));
    await page.route('**/api/billing*', (route: Route) =>
      route.fulfill(json({ bills: [pendingBill] })));
    // Register LAST so it wins over the generic billing pattern above.
    await page.route('**/api/billing/bill-1/pay', (route: Route) => {
      if (route.request().method() !== 'POST') {
        return route.fulfill(json({ message: 'method not allowed' }, 405));
      }
      return route.fulfill(json({
        success: true,
        transactionId: 'txn-789',
        invoiceId: 'INV-001',
        status: 'completed',
      }));
    });
  });

  test('renders pending bills and payment history from the API', async ({ page }) => {
    await page.goto('/patient/payment');

    await expect(page.getByRole('heading', { name: 'Payments' })).toBeVisible();
    await expect(page.getByText('Pending Bills')).toBeVisible();
    await expect(page.getByText('INV-001')).toBeVisible();
    // The bill card renders ₹500 twice (total + balance due) — scope to first.
    await expect(page.getByText('₹500').first()).toBeVisible();

    // History side: invoice + amount + status from the payments endpoint.
    // (A sidebar link also says "Payment History" — scope to the heading.)
    await expect(page.getByRole('heading', { name: 'Payment History' })).toBeVisible();
    await expect(page.getByText('txn-456')).toBeVisible();
    // Total-paid stat card also shows ₹1,200 — scope to the history table cell.
    await expect(page.getByRole('cell', { name: '₹1,200' })).toBeVisible();
  });

  test('pays a pending bill and shows the success state', async ({ page }) => {
    await page.goto('/patient/payment');

    const payRequest = page.waitForRequest(
      (req) => req.url().includes('/api/billing/bill-1/pay') && req.method() === 'POST',
    );

    await page.getByRole('button', { name: 'Pay Now' }).click();
    await expect(page.getByRole('heading', { name: 'Make Payment' })).toBeVisible();

    // Default method is card; the modal button is labelled with the balance due.
    await page.getByRole('button', { name: /Pay ₹500/ }).click();

    // The exact payload is the contract the backend receives.
    const request = await payRequest;
    expect(JSON.parse(request.postData() || '{}')).toMatchObject({ amount: 500, method: 'card' });

    await expect(page.getByText('Payment Successful!')).toBeVisible({ timeout: 2000 });
  });
});
