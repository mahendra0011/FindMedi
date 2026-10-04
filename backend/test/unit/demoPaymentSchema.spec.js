import DemoPayment from '../../src/models/DemoPayment.js';

describe('DemoPayment emergency-doctor reference schema', () => {
  it('allows the emergency-doctor booking type', () => {
    expect(DemoPayment.schema.path('bookingType').enumValues).toContain('emergency_doctor');
  });

  it('stores typed doctor-request and assigned-doctor references', () => {
    expect(DemoPayment.schema.path('doctorRequestId').options.ref).toBe('EmergencyDoctorRequest');
    expect(DemoPayment.schema.path('doctorId').options.ref).toBe('Doctor');
  });

  it('keeps emergency-doctor payment details in the validated model shape', async () => {
    const payment = new DemoPayment({
      bookingType: 'emergency_doctor',
      doctorRequestId: '507f1f77bcf86cd799439001',
      doctorId: '507f1f77bcf86cd799439002',
      userId: '507f1f77bcf86cd799439003',
      amount: 100,
      method: 'cash',
      status: 'paid',
    });

    await expect(payment.validate()).resolves.toBeUndefined();
    expect(payment.toObject()).toMatchObject({ bookingType: 'emergency_doctor', amount: 100, status: 'paid' });
  });
});
