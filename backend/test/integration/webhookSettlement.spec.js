import { jest } from '@jest/globals';

const mockPaymentFindOne = jest.fn();
const mockPaymentFindById = jest.fn();
const mockPaymentSave = jest.fn();
const mockAppointmentFindByIdAndUpdate = jest.fn();
const mockNotificationCreate = jest.fn();

jest.unstable_mockModule('../../src/models/Payment.js', () => ({
  __esModule: true,
  default: {
    findOne: (...args) => mockPaymentFindOne(...args),
    findById: (...args) => mockPaymentFindById(...args),
  },
}));

jest.unstable_mockModule('../../src/models/Appointment.js', () => ({
  __esModule: true,
  default: {
    findByIdAndUpdate: (...args) => mockAppointmentFindByIdAndUpdate(...args),
  },
}));

jest.unstable_mockModule('../../src/models/Notification.js', () => ({
  __esModule: true,
  default: {
    create: (...args) => mockNotificationCreate(...args),
  },
}));

jest.unstable_mockModule('../../src/lib/pgDualWrite.js', () => ({
  __esModule: true,
  mirrorPayment: jest.fn().mockResolvedValue(true),
}));

const { settlePaymentFromWebhook } = await import('../../src/services/paymentSettlement.js');

describe('Webhook Settlement Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('settles a pending payment and confirms referenced appointment atomically', async () => {
    const fakePayment = {
      _id: '507f1f77bcf86cd799439011',
      transaction_id: 'TXN-TEST-1',
      patient_id: 'user_pat_1',
      patient_name: 'Rohan Sharma',
      amount: 500,
      method: 'upi',
      status: 'pending',
      serviceType: 'appointment',
      referenceId: 'appt_123',
      gateway: 'razorpay',
      gatewayOrderId: 'order_rzp_123',
      attempts: [],
      save: mockPaymentSave.mockResolvedValue(true),
    };

    mockPaymentFindOne.mockResolvedValue(fakePayment);
    mockAppointmentFindByIdAndUpdate.mockResolvedValue({ _id: 'appt_123', status: 'confirmed' });

    const payload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_rzp_999',
            order_id: 'order_rzp_123',
            amount: 50000,
            currency: 'INR',
            status: 'captured',
            method: 'upi',
          },
        },
      },
    };

    const res = await settlePaymentFromWebhook({ provider: 'razorpay', payload });

    expect(res.ok).toBe(true);
    expect(res.settled).toBe(true);
    expect(res.status).toBe('completed');
    expect(fakePayment.status).toBe('completed');
    expect(fakePayment.gatewayPaymentId).toBe('pay_rzp_999');
    expect(fakePayment.settledAt).toBeDefined();
    expect(mockPaymentSave).toHaveBeenCalled();
    expect(mockAppointmentFindByIdAndUpdate).toHaveBeenCalledWith('appt_123', {
      paymentStatus: 'completed',
      status: 'confirmed',
    });
  });

  it('is idempotent on duplicate webhook delivery', async () => {
    const fakeCompletedPayment = {
      _id: '507f1f77bcf86cd799439012',
      transaction_id: 'TXN-TEST-DUP',
      patient_id: 'user_pat_1',
      status: 'completed',
      gatewayPaymentId: 'pay_rzp_dup_999',
      gatewayOrderId: 'order_rzp_dup',
    };

    mockPaymentFindOne.mockResolvedValue(fakeCompletedPayment);

    const payload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_rzp_dup_999',
            order_id: 'order_rzp_dup',
            amount: 60000,
            status: 'captured',
          },
        },
      },
    };

    const res = await settlePaymentFromWebhook({ provider: 'razorpay', payload });
    expect(res.ok).toBe(true);
    expect(res.alreadySettled).toBe(true);
    expect(mockPaymentSave).not.toHaveBeenCalled();
  });

  it('handles payment.failed events gracefully', async () => {
    const fakePayment = {
      _id: '507f1f77bcf86cd799439013',
      transaction_id: 'TXN-TEST-FAIL',
      status: 'pending',
      gatewayOrderId: 'order_rzp_fail',
      attempts: [],
      save: mockPaymentSave.mockResolvedValue(true),
    };

    mockPaymentFindOne.mockResolvedValue(fakePayment);

    const payload = {
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: 'pay_rzp_failed_001',
            order_id: 'order_rzp_fail',
            amount: 40000,
            status: 'failed',
          },
        },
      },
    };

    const res = await settlePaymentFromWebhook({ provider: 'razorpay', payload });
    expect(res.ok).toBe(true);
    expect(res.settled).toBe(false);
    expect(res.status).toBe('failed');
    expect(fakePayment.status).toBe('failed');
    expect(mockPaymentSave).toHaveBeenCalled();
  });
});
