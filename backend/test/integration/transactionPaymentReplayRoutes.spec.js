import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const paymentFindOne = jestApi.fn();
const appointmentFind = jestApi.fn();

jestApi.unstable_mockModule('../../src/middleware/idempotency.js', () => ({
  idempotencyGuard: () => (_req, _res, next) => next(),
}));

const { as } = await mountApp('transactions', {
  '../../src/models/Payment.js': () => ({ default: { findOne: (...args) => paymentFindOne(...args) } }),
  '../../src/models/Appointment.js': () => ({ default: { find: (...args) => appointmentFind(...args) } }),
});

const paid = {
  patient_id: 'patient-owner', serviceType: 'medicine', amount: 90,
  transaction_id: 'txn-secret', invoice_id: 'invoice-secret',
};

beforeEach(() => {
  paymentFindOne.mockReset().mockResolvedValue(paid);
  appointmentFind.mockReset().mockReturnValue(query([]));
});

describe('HTTP transaction payment replay boundary', () => {
  const requestBody = { serviceType: 'medicine', referenceId: 'order-ref', amount: 100, method: 'upi' };

  it('returns an owner replay before any booking mutation', async () => {
    const response = await as({ _id: 'patient-owner', id: 'patient-owner', role: 'patient' })
      .post('/pay').send(requestBody);
    expect(response.status).toBe(200);
    expect(response.body.alreadyPaid).toBe(true);
    expect(response.body.payment.transaction_id).toBe('txn-secret');
    expect(appointmentFind).not.toHaveBeenCalled();
  });

  it('hides a completed payment from another authenticated patient', async () => {
    const response = await as({ _id: 'patient-attacker', id: 'patient-attacker', role: 'patient' })
      .post('/pay').send(requestBody);
    expect(response.status).toBe(404);
    expect(JSON.stringify(response.body)).not.toContain('txn-secret');
    expect(paymentFindOne).toHaveBeenCalledWith({ referenceId: 'order-ref', status: 'completed' });
    expect(appointmentFind).not.toHaveBeenCalled();
  });

  it('does not replay the same reference under a different service type', async () => {
    const response = await as({ _id: 'patient-owner', id: 'patient-owner', role: 'patient' })
      .post('/pay').send({ ...requestBody, serviceType: 'appointment' });
    expect(response.status).toBe(409);
    expect(response.body).not.toHaveProperty('payment');
  });

  it('retires new client-settled payments on the legacy endpoint', async () => {
    paymentFindOne.mockResolvedValueOnce(null);
    const response = await as({ _id: 'patient-owner', id: 'patient-owner', role: 'patient' })
      .post('/pay').send(requestBody);
    expect(response.status).toBe(410);
    expect(response.body.code).toBe('LEGACY_PAYMENT_ENDPOINT_RETIRED');
    expect(appointmentFind).not.toHaveBeenCalled();
  });
});
