import { jest } from '@jest/globals';
import { mountApp } from '../helpers/appHarness.js';

// Spec 2.4: sample courier rides the PharmacyDelivery fleet row with
// serviceType='lab_sample' - creation, tenant-scoped listing, assignment and
// OTP-gated handover.

const chain = (result) => {
  const q = {
    sort: () => q,
    limit: () => q,
    select: () => q,
    lean: () => Promise.resolve(result),
    then: (res, rej) => Promise.resolve(result).then(res, rej),
    catch: (rej) => Promise.resolve(result).catch(rej),
  };
  return q;
};

const makeTask = (over = {}) => ({
  _id: '64c0000000000000000000aa',
  serviceType: 'lab_sample',
  status: 'Pending Assignment',
  deliveryOtp: '123456',
  otpVerified: false,
  labBookingId: '64f0000000000000000000aa',
  trackingHistory: [],
  save: jest.fn(async function save() { return this; }),
  ...over,
});

const deliveryCreate = jest.fn(async (body) => makeTask(body));
const deliveryFindOne = jest.fn(() => chain(null));
const deliveryFind = jest.fn(() => chain([]));
const partnerFindOne = jest.fn(() => chain({ _id: '64d0000000000000000000aa', userId: 'riderUser' }));
const partnerUpdate = jest.fn().mockResolvedValue({});
const labBookingUpdate = jest.fn().mockResolvedValue({});
const auditLog = jest.fn().mockResolvedValue({});
const emit = jest.fn();
const io = { to: () => ({ emit }) };

jest.unstable_mockModule('../../src/models/PharmacyDelivery.js', () => ({
  __esModule: true,
  default: {
    create: deliveryCreate,
    findOne: deliveryFindOne,
    find: deliveryFind,
    findByIdAndUpdate: jest.fn().mockResolvedValue({}),
  },
}));
jest.unstable_mockModule('../../src/models/DeliveryPartner.js', () => ({
  __esModule: true,
  default: { findOne: partnerFindOne, findByIdAndUpdate: partnerUpdate },
}));
jest.unstable_mockModule('../../src/models/LabBooking.js', () => ({
  __esModule: true,
  default: { findByIdAndUpdate: labBookingUpdate },
}));
jest.unstable_mockModule('../../src/services/socketService.js', () => ({
  getIO: () => io, emitDeliveryStatus: jest.fn(),
}));
jest.unstable_mockModule('../../src/middleware/audit.js', () => ({
 auditLog,
  auditLogRequired: (...args) => (typeof auditLog === 'function' ? auditLog(...args) : Promise.resolve()),
}));

const { as } = await mountApp('sampleCourier');
const lab = { id: 'lab1', role: 'lab_owner', hospitalId: '64e0000000000000000000aa' };
const rider = { id: 'riderUser', role: 'delivery_boy' };

const payload = {
  orderId: 'LAB-SAMPLE-1',
  labBookingId: '64f0000000000000000000aa',
  pickupAddress: '12 MG Road, Indore',
  dropAddress: 'Patient home, Vijay Nagar',
  patientName: 'Asha',
};

describe('Spec 2.4: sample courier', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    deliveryFindOne.mockReturnValue(chain(null));
    partnerFindOne.mockReturnValue(chain({ _id: '64d0000000000000000000aa', userId: 'riderUser' }));
  });

  test('creates a lab_sample task with OTP and tenant stamp', async () => {
    const res = await as(lab).post('/').send(payload).expect(201);
    expect(res.body.task.serviceType).toBe('lab_sample');
    expect(res.body.task.status).toBe('Pending Assignment');
    expect(res.body.handoverOtp).toMatch(/^\d{6}$/);
    expect(deliveryCreate.mock.calls[0][0].hospitalId).toBe(lab.hospitalId);
  });

  test('patients cannot create courier tasks', async () => {
    await as({ id: 'p1', role: 'patient' }).post('/').send(payload).expect(403);
  });

  test('lists are tenant scoped for staff and rider-scoped for couriers', async () => {
    await as(lab).get('/').expect(200);
    expect(deliveryFind.mock.calls[0][0]).toMatchObject({ serviceType: 'lab_sample', facilityId: lab.hospitalId });

    await as(rider).get('/').expect(200);
    expect(deliveryFind.mock.calls[1][0]).toMatchObject({ serviceType: 'lab_sample', deliveryPartnerId: '64d0000000000000000000aa' });
  });

  test('assigns an approved partner and emits the rider push', async () => {
    deliveryFindOne.mockReturnValueOnce(chain(makeTask()));
    const res = await as(lab).put('/64c0000000000000000000aa/assign')
      .send({ deliveryPartnerId: '64d0000000000000000000aa' }).expect(200);
    expect(res.body.status).toBe('Assigned');
    expect(res.body.deliveryPartnerId).toBe('64d0000000000000000000aa');
    expect(emit).toHaveBeenCalled();
  });

  test('delivery requires OTP and proof photo', async () => {
    deliveryFindOne.mockReturnValueOnce(chain(makeTask({ status: 'Out for Delivery', deliveryPartnerId: '64d0000000000000000000aa' })));
    await as(rider).put('/64c0000000000000000000aa/status').send({ status: 'Delivered', otp: '000000' }).expect(400);

    deliveryFindOne.mockReturnValueOnce(chain(makeTask({ status: 'Out for Delivery', deliveryPartnerId: '64d0000000000000000000aa' })));
    await as(rider).put('/64c0000000000000000000aa/status').send({ status: 'Delivered', otp: '123456' }).expect(400);

    const done = makeTask({ status: 'Out for Delivery', deliveryPartnerId: '64d0000000000000000000aa' });
    deliveryFindOne.mockReturnValueOnce(chain(done));
    const res = await as(rider).put('/64c0000000000000000000aa/status')
      .send({ status: 'Delivered', otp: '123456', proofPhoto: 'https://cdn/x.jpg' }).expect(200);
    expect(res.body.status).toBe('Delivered');
    expect(res.body.otpVerified).toBe(true);
    expect(labBookingUpdate).toHaveBeenCalledWith('64f0000000000000000000aa', { status: 'Sample Collected' });
  });

  test('a rider cannot update someone else\u2019s task', async () => {
    deliveryFindOne.mockReturnValueOnce(chain(makeTask({ status: 'Assigned', deliveryPartnerId: '64d9999999999999999999aa' })));
    await as(rider).put('/64c0000000000000000000aa/status').send({ status: 'Picked Up' }).expect(403);
  });
});
