/**
 * NOTIFICATION SCOPE / BLAST-RADIUS SUITE
 * =====================================
 * NOTIF-B-01/02/03 were a platform-wide blast radius:
 *
 *   getNotificationUserId() returned `req.query.userId || null` for a
 *   hospital_admin and every handler did `if (effectiveUserId) filter.userId = …`.
 *   With no `?userId=` the filter stayed EMPTY, so:
 *     GET    /api/notifications              -> every patient's notifications (PHI)
 *     GET    /api/notifications/unread-count -> whole-platform count
 *     PUT    /api/notifications/mark-all-read -> whole-platform read state
 *     DELETE /api/notifications/clear-all    -> deleteMany({}) == total wipe
 *
 * These tests drive the real express app with the data layer stubbed and assert
 * that every one of those handlers is now scoped to a single user.
 */
import { jest } from '@jest/globals';

const deleteManyCalls = [];
const countDocumentsCalls = [];
const updateManyCalls = [];
const paginatedCalls = [];
const userById = {};

jest.unstable_mockModule('../../src/models/Notification.js', () => {
  const Model = {
    findOne: jest.fn(() => ({ lean: async () => null })),
    findById: jest.fn(() => ({ lean: async () => null })),
    create: jest.fn(async (doc) => ({ ...doc, _id: 'notif-1' })),
    findByIdAndDelete: jest.fn(async () => ({})),
    deleteMany: jest.fn(async (filter) => { deleteManyCalls.push(filter); return { deletedCount: 1 }; }),
    countDocuments: jest.fn(async (filter) => { countDocumentsCalls.push(filter); return 7; }),
    updateMany: jest.fn(async (filter) => { updateManyCalls.push(filter); return { modifiedCount: 7 }; }),
    modelName: 'Notification',
  };
  return { default: Model, __esModule: true };
});

// `protect` awaits `User.findById(id).select('-password')`, so the stub must be
// a thenable whose resolution IS the user document.
const userQuery = (id) => {
  const api = {
    select: () => api,
    lean: async () => userById[String(id)] || null,
    then: (onFulfilled, onRejected) =>
      Promise.resolve(userById[String(id)] || null).then(onFulfilled, onRejected),
    catch: (onRejected) => Promise.resolve(null).catch(onRejected),
  };
  return api;
};

jest.unstable_mockModule('../../src/models/User.js', () => ({
  default: {
    findOne: jest.fn(() => ({ lean: async () => null })),
    findById: jest.fn((id) => userQuery(id)),
    findByIdAndUpdate: jest.fn(async () => ({})),
    updateOne: jest.fn(async () => ({ acknowledged: true })),
    create: jest.fn(async () => ({})),
    find: jest.fn(() => ({ lean: async () => [] })),
    modelName: 'User',
  },
  __esModule: true,
}));

jest.unstable_mockModule('../../src/models/Doctor.js', () => ({
  default: { findOne: jest.fn(() => null), findById: jest.fn(() => ({ lean: async () => null })) },
  __esModule: true,
}));

jest.unstable_mockModule('../../src/utils/pagination.js', () => ({
  paginatedResults: jest.fn(async (model, filter) => { paginatedCalls.push(filter); return { results: [], total: 0 }; }),
}));

// NOTE: neither `socketService` nor `notificationService` is mocked — the real
// modules load (with `io === null`, so every emit is a no-op) and the real
// createNotification() (NOTIF-B-05 dedup + per-user cap) is exercised against
// the stubbed Notification model.

const supertest = (await import('supertest')).default;
const { app, csrfAgent, withCsrf } = await import('../helpers/app.js');
const jwt = (await import('jsonwebtoken')).default;

const HOSPITAL_A = '507f1f77bcf86cd7994390a1';
const HOSPITAL_B = '507f1f77bcf86cd7994390b2';
const ADMIN_A = '507f1f77bcf86cd7994390c3';
const STAFF_A = '507f1f77bcf86cd7994390c4';
const PATIENT_B = '507f1f77bcf86cd7994390c5';

const tokenFor = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '10m' });

const adminToken = () => tokenFor({ id: ADMIN_A, role: 'hospital_admin', hospitalId: HOSPITAL_A });

beforeEach(() => {
  deleteManyCalls.length = 0;
  countDocumentsCalls.length = 0;
  updateManyCalls.length = 0;
  paginatedCalls.length = 0;
  userById[ADMIN_A] = { _id: ADMIN_A, hospitalId: HOSPITAL_A, role: 'hospital_admin', status: 'active', isVerified: true };
  userById[STAFF_A] = { _id: STAFF_A, hospitalId: HOSPITAL_A, role: 'nurse', status: 'active', isVerified: true };
  userById[PATIENT_B] = { _id: PATIENT_B, hospitalId: HOSPITAL_B, role: 'patient', status: 'active', isVerified: true };
});


describe('NOTIF-B-01 · clear-all can never run with an empty filter', () => {
  it('scopes the delete to the caller when no ?userId= is given', async () => {
    const agent = await csrfAgent();
    const res = await withCsrf(agent, 'delete', '/api/notifications/clear-all')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(deleteManyCalls).toHaveLength(1);
    // NOTIF-B-01: an empty object here == total platform wipe.
    expect(deleteManyCalls[0]).toEqual({ userId: ADMIN_A });
    expect(Object.keys(deleteManyCalls[0])).not.toHaveLength(0);
  });

  it('deletes only the scoped user rows when ?userId= is supplied', async () => {
    const agent = await csrfAgent();
    const res = await withCsrf(agent, 'delete', `/api/notifications/clear-all?userId=${STAFF_A}`)
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(deleteManyCalls[0]).toEqual({ userId: STAFF_A });
  });
});

describe('NOTIF-B-02 · list/count/mark-all-read default to the caller', () => {
  it('GET / never queries the whole collection', async () => {
    const agent = await csrfAgent();
    const res = await withCsrf(agent, 'get', '/api/notifications')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(paginatedCalls[0]).toEqual({ userId: ADMIN_A });
  });

  it('GET /unread-count counts only the caller', async () => {
    const agent = await csrfAgent();
    const res = await withCsrf(agent, 'get', '/api/notifications/unread-count')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(countDocumentsCalls[0]).toEqual({ read: false, userId: ADMIN_A });
    expect(res.body.count).toBe(7);
  });

  it('PUT /mark-all-read updates only the caller rows', async () => {
    const agent = await csrfAgent();
    const res = await withCsrf(agent, 'put', '/api/notifications/mark-all-read')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(updateManyCalls[0]).toEqual({ read: false, userId: ADMIN_A });
  });
});

describe('NOTIF-B-03 · ?userId= cannot cross the hospital boundary', () => {
  it('allows scoping to a staff member of the same hospital', async () => {
    const agent = await csrfAgent();
    const res = await withCsrf(agent, 'get', `/api/notifications?userId=${STAFF_A}`)
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(paginatedCalls[0]).toEqual({ userId: STAFF_A });
  });

  it('rejects scoping to a user of another hospital (403, no data leak)', async () => {
    const agent = await csrfAgent();
    const res = await withCsrf(agent, 'get', `/api/notifications?userId=${PATIENT_B}`)
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(403);
    expect(paginatedCalls).toHaveLength(0);
  });

  it('rejects a cross-hospital clear-all too', async () => {
    const agent = await csrfAgent();
    const res = await withCsrf(agent, 'delete', `/api/notifications/clear-all?userId=${PATIENT_B}`)
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(403);
    expect(deleteManyCalls).toHaveLength(0);
  });

  it('a patient may never address another user via ?userId=', async () => {
    const patientToken = tokenFor({ id: PATIENT_B, role: 'patient' });
    const agent = await csrfAgent();
    const res = await withCsrf(agent, 'get', `/api/notifications?userId=${STAFF_A}`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(403);
    expect(paginatedCalls).toHaveLength(0);
  });

  it('rejects an unauthenticated request', async () => {
    const res = await supertest(app).delete('/api/notifications/clear-all');
    expect([401, 403]).toContain(res.status);
    expect(deleteManyCalls).toHaveLength(0);
  });
});
