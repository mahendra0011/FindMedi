import { jest as jestApi } from '@jest/globals';
import { mountApp } from '../helpers/appHarness.js';

const demoPayment = { create: jestApi.fn() };
const assistantBooking = { findById: jestApi.fn() };
const lawyerBooking = { findById: jestApi.fn() };
const rideBooking = { findById: jestApi.fn() };
const emergencyRequest = { findById: jestApi.fn() };
const notification = { create: jestApi.fn() };
const user = { findOneAndUpdate: jestApi.fn(), findById: jestApi.fn() };
const assistantProfile = { findOneAndUpdate: jestApi.fn() };
const lawyerProfile = { findOneAndUpdate: jestApi.fn() };

jestApi.unstable_mockModule('../../src/middleware/idempotency.js', () => ({
  idempotencyGuard: () => (_req, _res, next) => next(),
}));

const { as } = await mountApp('demoPayment', {
  '../../src/models/DemoPayment.js': () => ({ default: demoPayment }),
  '../../src/models/AssistantBooking.js': () => ({ default: assistantBooking }),
  '../../src/models/AssistantProfile.js': () => ({ default: assistantProfile }),
  '../../src/models/LawyerBooking.js': () => ({ default: lawyerBooking }),
  '../../src/models/LawyerProfile.js': () => ({ default: lawyerProfile }),
  '../../src/models/RideBooking.js': () => ({ default: rideBooking }),
  '../../src/models/EmergencyDoctorRequest.js': () => ({ default: emergencyRequest }),
  '../../src/models/Notification.js': () => ({ default: notification }),
  '../../src/models/User.js': () => ({ default: user }),
  '../../src/services/socketService.js': () => ({ getIO: () => null }),
  '../../src/config/logger.js': () => ({ default: { info: jestApi.fn(), warn: jestApi.fn(), error: jestApi.fn() } }),
});
const { holdDemoEscrow } = await import('../../src/routes/demoPayment.js');

beforeEach(() => {
  jestApi.clearAllMocks();
  demoPayment.create.mockResolvedValue({ _id: 'payment-1', status: 'paid' });
  notification.create.mockResolvedValue({});
});

describe('demo payment booking ownership and canonical service settlement', () => {
  it.each([
    ['assistant', assistantBooking, { patientId: 'patient-owner', cost: { total: 100 }, assistantId: 'assistant-1' }],
    ['lawyer', lawyerBooking, { userId: 'patient-owner', fee: 100, lawyerId: 'lawyer-1' }],
    ['ride', rideBooking, { userId: 'patient-owner', fare: { total: 100 }, riderId: 'rider-1' }],
  ])('denies a foreign %s booking before creating payment or mutating balances', async (bookingType, model, booking) => {
    model.findById.mockResolvedValueOnce({ _id: 'booking-1', ...booking, save: jestApi.fn() });

    const response = await as({ _id: 'attacker', role: 'patient' }).post('/pay').send({
      bookingType,
      bookingId: 'booking-1',
      method: 'cash',
    });

    expect(response.status).toBe(404);
    expect(demoPayment.create).not.toHaveBeenCalled();
    expect(user.findOneAndUpdate).not.toHaveBeenCalled();
    expect(assistantProfile.findOneAndUpdate).not.toHaveBeenCalled();
    expect(lawyerProfile.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('records an owned assistant payment without a second provider wallet credit', async () => {
    const booking = {
      _id: 'booking-own', patientId: 'patient-1', assistantId: 'assistant-1', cost: { total: 100 },
      save: jestApi.fn().mockResolvedValue(undefined),
    };
    assistantBooking.findById.mockResolvedValueOnce(booking);

    const response = await as({ _id: 'patient-1', role: 'patient' }).post('/pay').send({
      bookingType: 'assistant', bookingId: 'booking-own', method: 'cash',
    });

    expect(response.status).toBe(200);
    expect(booking.payment.status).toBe('paid');
    expect(demoPayment.create).toHaveBeenCalledTimes(1);
    expect(user.findOneAndUpdate).not.toHaveBeenCalled();
    expect(assistantProfile.findOneAndUpdate).not.toHaveBeenCalled();
    expect(JSON.stringify(notification.create.mock.calls)).not.toMatch(/Net credit/);
  });

  it('records an owned lawyer payment without a second provider wallet credit', async () => {
    const booking = {
      _id: 'lawyer-own', userId: 'patient-1', lawyerId: 'lawyer-1', fee: 100,
      save: jestApi.fn().mockResolvedValue(undefined),
    };
    lawyerBooking.findById.mockResolvedValueOnce(booking);

    const response = await as({ _id: 'patient-1', role: 'patient' }).post('/pay').send({
      bookingType: 'lawyer', bookingId: 'lawyer-own', method: 'cash',
    });

    expect(response.status).toBe(200);
    expect(booking.payment.status).toBe('paid');
    expect(demoPayment.create).toHaveBeenCalledTimes(1);
    expect(user.findOneAndUpdate).not.toHaveBeenCalled();
    expect(lawyerProfile.findOneAndUpdate).not.toHaveBeenCalled();
    expect(JSON.stringify(notification.create.mock.calls)).not.toMatch(/Net credit/);
  });

  it('accepts an owned emergency-doctor payment through schema and stores its typed reference', async () => {
    const request = {
      _id: 'doctor-request-own', userId: 'patient-1', assignedDoctorId: 'doctor-1',
      pricing: { total: 100 }, save: jestApi.fn().mockResolvedValue(undefined),
    };
    emergencyRequest.findById.mockResolvedValueOnce(request);

    const response = await as({ _id: 'patient-1', role: 'patient' }).post('/pay').send({
      bookingType: 'emergency_doctor', doctorRequestId: 'doctor-request-own', method: 'cash',
    });

    expect(response.status).toBe(200);
    expect(demoPayment.create).toHaveBeenCalledWith(expect.objectContaining({
      bookingType: 'emergency_doctor', doctorRequestId: 'doctor-request-own', doctorId: 'doctor-1', userId: 'patient-1',
    }));
    expect(request.payment.status).toBe('paid');
  });

  it('denies foreign emergency-doctor payment before creating a payment record', async () => {
    emergencyRequest.findById.mockResolvedValueOnce({ _id: 'doctor-request-foreign', userId: 'victim' });

    const response = await as({ _id: 'attacker', role: 'patient' }).post('/pay').send({
      bookingType: 'emergency_doctor', doctorRequestId: 'doctor-request-foreign', method: 'cash',
    });

    expect(response.status).toBe(404);
    expect(demoPayment.create).not.toHaveBeenCalled();
  });

  it('blocks all demo payment mutations in production before database writes', async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      for (const path of ['/pay', '/hold', '/confirm/payment-1', '/fail/payment-1', '/refund/payment-1']) {
        const response = await as({ _id: 'patient-1', role: 'patient' }).post(path).send({
          bookingType: 'assistant', bookingId: 'booking-own', method: 'cash', amount: 100,
        });
        expect(response.status).toBe(503);
        expect(response.body.code).toBe('DEMO_PAYMENTS_DISABLED');
      }
      await expect(holdDemoEscrow({ userId: 'patient-1', amount: 100 })).rejects.toMatchObject({ statusCode: 503 });
      expect(assistantBooking.findById).not.toHaveBeenCalled();
      expect(lawyerBooking.findById).not.toHaveBeenCalled();
      expect(rideBooking.findById).not.toHaveBeenCalled();
      expect(demoPayment.create).not.toHaveBeenCalled();
      expect(user.findOneAndUpdate).not.toHaveBeenCalled();
    } finally {
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnv;
    }
  });
});
