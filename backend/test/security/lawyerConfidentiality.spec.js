import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';

// Mock dependencies
const mockAuditLog = jest.fn().mockResolvedValue(true);
jest.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLog: mockAuditLog,
}));
jest.unstable_mockModule('../../src/config/logger.js', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const redisStore = new Map();
jest.unstable_mockModule('../../src/config/redis.js', () => ({
  redisClient: {
    isOpen: true,
    set: async (k, v, opts) => {
      if (opts?.NX && redisStore.has(k)) return null;
      redisStore.set(k, v);
      return 'OK';
    },
    get: async (k) => redisStore.get(k) ?? null,
    del: async (k) => redisStore.delete(k),
  },
  isRedisReady: () => true,
  redisPub: {}, redisSub: {}, connectRedis: jest.fn(),
  updateDeliveryBoyLocation: jest.fn(), setUserPresence: jest.fn(), removeUserPresence: jest.fn(),
  getOnlinePresence: jest.fn(), getOnlineDoctorsList: jest.fn(),
}));

jest.unstable_mockModule('../../src/middleware/auth.js', () => ({
  protect: (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Not authorized' });
    next();
  },
  authorize: () => (req, res, next) => next(),
  requireRole: () => (req, res, next) => next(),
  optionalAuth: (req, res, next) => next(),
}));

const bookingStore = {
  _id: '507f1f77bcf86cd799439011',
  userId: '507f1f77bcf86cd799439022', // Client patient
  lawyerId: '507f1f77bcf86cd799439033', // Assigned advocate
  fee: 1500,
  status: 'confirmed',
  bookingNumber: 'LAW-2026-001',
  caseDescription: 'Privileged Medico-legal consultation regarding surgical negligence',
};

jest.unstable_mockModule('../../src/models/LawyerBooking.js', () => ({
  default: {
    findById: jest.fn((id) => {
      if (String(id) !== String(bookingStore._id)) {
        return {
          populate: () => ({ populate: () => Promise.resolve(null) }),
          then: (cb) => Promise.resolve(null).then(cb),
        };
      }
      return {
        ...bookingStore,
        populate: (field) => ({
          populate: () => Promise.resolve({
            ...bookingStore,
            userId: { _id: bookingStore.userId, name: 'Patient Alice' },
            lawyerId: { _id: bookingStore.lawyerId, name: 'Advocate Bob' },
          }),
        }),
      };
    }),
  },
}));

jest.unstable_mockModule('../../src/models/LawyerProfile.js', () => ({
  default: {
    findOne: jest.fn().mockResolvedValue({ userId: bookingStore.lawyerId, barCouncilNumber: 'D/123/2015' }),
    findById: jest.fn().mockReturnValue({ select: () => ({ lean: () => Promise.resolve({ consultationFee: 1500 }) }) }),
  },
}));

jest.unstable_mockModule('../../src/models/User.js', () => ({
  default: {
    findById: jest.fn().mockResolvedValue({ _id: bookingStore.userId, name: 'Alice' }),
  },
}));

jest.unstable_mockModule('../../src/routes/demoPayment.js', () => ({
  holdDemoEscrow: jest.fn().mockResolvedValue({ payment: { _id: 'pay_escrow_1' }, newBalance: 5000 }),
}));

const testApp = express();
testApp.use(express.json());

testApp.use((req, res, next) => {
  const userHeader = req.get('x-test-user');
  if (userHeader) {
    req.user = JSON.parse(Buffer.from(userHeader, 'base64').toString('utf8'));
  }
  next();
});

const { default: lawyerBookingRoutes } = await import('../../src/routes/lawyerBookings.js');
testApp.use('/api/lawyer-booking', lawyerBookingRoutes);

describe('LAW-BUG-01 & LAW-BUG-02: Attorney-Client Privilege & Retainer Idempotency', () => {
  const encodeUser = (user) => Buffer.from(JSON.stringify(user)).toString('base64');

  beforeEach(() => {
    redisStore.clear();
  });

  it('allows the client patient to access their privileged consultation notes', async () => {
    const res = await request(testApp)
      .get(`/api/lawyer-booking/${bookingStore._id}`)
      .set('x-test-user', encodeUser({ _id: bookingStore.userId, role: 'patient' }));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.booking.bookingNumber).toBe('LAW-2026-001');
  });

  it('allows the retained lawyer to access the consultation case notes', async () => {
    const res = await request(testApp)
      .get(`/api/lawyer-booking/${bookingStore._id}`)
      .set('x-test-user', encodeUser({ _id: bookingStore.lawyerId, role: 'lawyer' }));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('allows superadmin to access the consultation for platform escalation', async () => {
    const res = await request(testApp)
      .get(`/api/lawyer-booking/${bookingStore._id}`)
      .set('x-test-user', encodeUser({ _id: 'admin_1', role: 'superadmin' }));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('rejects an unrelated foreign lawyer with 404 (IDOR guard)', async () => {
    const res = await request(testApp)
      .get(`/api/lawyer-booking/${bookingStore._id}`)
      .set('x-test-user', encodeUser({ _id: '507f1f77bcf86cd799439099', role: 'lawyer' }));

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Booking not found');
  });

  it('strictly excludes hospital_admin from privileged attorney-client consultation records (LAW-BUG-01)', async () => {
    const res = await request(testApp)
      .get(`/api/lawyer-booking/${bookingStore._id}`)
      .set('x-test-user', encodeUser({ _id: 'hosp_admin_1', role: 'hospital_admin' }));

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Booking not found');
  });

  it('enforces idempotency on retainer hold endpoint (LAW-BUG-02)', async () => {
    const idemKey = 'lawyer-retainer-test-key-1';

    const res1 = await request(testApp)
      .post(`/api/lawyer-booking/${bookingStore._id}/hold-retainer`)
      .set('x-test-user', encodeUser({ _id: bookingStore.userId, role: 'patient' }))
      .set('Idempotency-Key', idemKey)
      .send({});

    expect(res1.status).toBe(201);
    expect(res1.body.success).toBe(true);
    expect(res1.body.heldAmount).toBe(1500);

    // Concurrent / duplicate submit with same idempotency key: replayed without double-holding escrow
    const res2 = await request(testApp)
      .post(`/api/lawyer-booking/${bookingStore._id}/hold-retainer`)
      .set('x-test-user', encodeUser({ _id: bookingStore.userId, role: 'patient' }))
      .set('Idempotency-Key', idemKey)
      .send({});

    expect(res2.status).toBe(201);
    expect(res2.body).toEqual(res1.body);
  });
});
