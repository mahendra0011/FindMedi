import { paymentReplayConflict } from '../../src/services/paymentReplayService.js';

describe('completed payment replay ownership', () => {
  const payment = { patient_id: 'patient-1', serviceType: 'medicine' };

  it('allows the owning patient to replay the same service payment', () => {
    expect(paymentReplayConflict(payment, 'patient-1', 'medicine')).toBeNull();
  });

  it('hides a completed payment from a different patient', () => {
    expect(paymentReplayConflict(payment, 'patient-2', 'medicine'))
      .toEqual({ status: 404, message: 'Payment not found.' });
  });

  it('rejects replaying the same reference as a different service', () => {
    expect(paymentReplayConflict(payment, 'patient-1', 'appointment'))
      .toMatchObject({ status: 409 });
  });

  it('supports the schema alias when checking a lean payment object', () => {
    expect(paymentReplayConflict({ patientId: 'patient-1', serviceType: 'test' }, 'patient-1', 'test')).toBeNull();
  });
});
