import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const paymentFindOne = jestApi.fn();
const doctorFindById = jestApi.fn();
const couponFindOne = jestApi.fn();

jestApi.unstable_mockModule('../../src/middleware/idempotency.js', () => ({
  idempotencyGuard: () => (_req, _res, next) => next(),
}));

const { as } = await mountApp('billing', {
  '../../src/models/Payment.js': () => ({ default: { findOne: (...args) => paymentFindOne(...args) } }),
  '../../src/models/Doctor.js': () => ({ default: { findById: (...args) => doctorFindById(...args) } }),
  '../../src/models/PlatformCoupon.js': () => ({ default: { findOne: (...args) => couponFindOne(...args) } }),
});

const completedPayment = {
  patient_id: 'patient-owner', serviceType: 'appointment',
  transaction_id: 'txn-private', invoice_id: 'invoice-private', amount: 100,
};

beforeEach(() => {
  paymentFindOne.mockReset().mockResolvedValue(completedPayment);
  doctorFindById.mockReset().mockReturnValue(query({ consultation_fees: 100 }));
  couponFindOne.mockReset();
});

describe('HTTP billing payment replay boundary', () => {
  const requestBody = {
    serviceType: 'appointment', referenceId: 'appointment-ref', amount: 100,
    method: 'upi', couponCode: 'SAVE10', appointment: { doctorId: 'doctor-1' },
  };

  it('replays the completed coupon payment to the same patient before coupon revalidation', async () => {
    const response = await as({ _id: 'patient-owner', id: 'patient-owner', role: 'patient' })
      .post('/pay').send(requestBody);
    expect(response.status).toBe(200);
    expect(response.body.alreadyPaid).toBe(true);
    expect(response.body.payment.transaction_id).toBe('txn-private');
    expect(couponFindOne).not.toHaveBeenCalled();
  });

  it("returns a neutral 404 for a foreign patient's completed reference", async () => {
    const response = await as({ _id: 'attacker', id: 'attacker', role: 'patient' })
      .post('/pay').send(requestBody);
    expect(response.status).toBe(404);
    expect(JSON.stringify(response.body)).not.toContain('txn-private');
    expect(JSON.stringify(response.body)).not.toContain('invoice-private');
  });

});
