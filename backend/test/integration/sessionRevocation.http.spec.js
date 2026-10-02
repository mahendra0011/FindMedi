/**
 * HTTP tests for per-session revocation (AUTH-M-02).
 *
 * Separate file from routeAuthz.http.spec.js on purpose: `auth.js` pulls in ten
 * models and a stack of services, and sharing one mock registry between two
 * routers produced a mock that belonged to neither. One router per file keeps
 * the stubs obvious.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const JTI_A = 'a1b2c3d4e5f60718293a4b5c';
const JTI_B = 'f0e1d2c3b4a5968778695a4b';

const refreshFind = jest.fn();
const refreshDeleteOne = jest.fn();
const auditLog = jest.fn(async () => {});
const stubModel = (extra = {}) => ({ default: { find: () => query([]), findById: () => query(null), updateOne: () => query({}), ...extra } });

jest.unstable_mockModule('../../src/models/RefreshToken.js', () => ({
  default: {
    find: refreshFind,
    deleteOne: refreshDeleteOne,
    deleteMany: jest.fn(async () => ({ deletedCount: 0 })),
    getTokenKey: (t) => `key-${String(t).length}`,
    create: jest.fn(async () => ({})),
  },
}));
jest.unstable_mockModule('../../src/models/User.js', () => stubModel());
jest.unstable_mockModule('../../src/models/Doctor.js', () => stubModel());
jest.unstable_mockModule('../../src/models/Facility.js', () => stubModel());
jest.unstable_mockModule('../../src/models/Hospital.js', () => stubModel());
jest.unstable_mockModule('../../src/models/Patient.js', () => stubModel());
jest.unstable_mockModule('../../src/models/Notification.js', () => stubModel());
jest.unstable_mockModule('../../src/models/Vehicle.js', () => stubModel());
jest.unstable_mockModule('../../src/models/RiderProfile.js', () => stubModel());
jest.unstable_mockModule('../../src/models/AssistantProfile.js', () => stubModel());
jest.unstable_mockModule('../../src/models/LawyerProfile.js', () => stubModel());
jest.unstable_mockModule('../../src/middleware/audit.js', () => ({ auditLog }));
jest.unstable_mockModule('../../src/services/socketService.js', () => ({ notifyUsers: jest.fn(async () => {}) }));
jest.unstable_mockModule('../../src/services/referralService.js', () => ({ referralService: {} }));
jest.unstable_mockModule('../../src/services/cloudinaryService.js', () => ({ uploadFileToCloudinary: jest.fn() }));

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-for-sessions';

const { as } = await mountApp('auth', {});
const alice = { _id: 'userAlice', role: 'patient' };
const bob = { _id: 'userBob', role: 'patient' };

beforeEach(() => {
  refreshFind.mockReset().mockReturnValue(query([]));
  refreshDeleteOne.mockReset().mockReturnValue(query({ deletedCount: 1 }));
  auditLog.mockClear();
});

describe('HTTP - DELETE /sessions/:jti revokes only your own session', () => {
  it('200 when the session is yours', async () => {
    const r = await as(alice).delete(`/sessions/${JTI_A}`);
    expect(r.status).toBe(200);
  });

  it('scopes the delete to the caller, never to the jti alone', async () => {
    // THE rule. A jti is 12 random bytes, so it is unguessable — which is
    // exactly why it must not be the ONLY thing between a caller and someone
    // else's session. Unguessable is not the same as unauthorized.
    await as(alice).delete(`/sessions/${JTI_A}`);
    expect(refreshDeleteOne).toHaveBeenCalledWith({ userId: alice._id, jti: JTI_A });
  });

  it('404 when the jti belongs to somebody else', async () => {
    // Same answer as "does not exist", so the route is not an existence oracle
    // for other accounts' session ids.
    refreshDeleteOne.mockReturnValue(query({ deletedCount: 0 }));
    const r = await as(bob).delete(`/sessions/${JTI_A}`);
    expect(r.status).toBe(404);
  });

  it('404 for a malformed jti, without confirming the real format', async () => {
    const r = await as(alice).delete('/sessions/not-a-jti');
    expect(r.status).toBe(404);
    expect(refreshDeleteOne).not.toHaveBeenCalled();
  });

  it('401 with no session', async () => {
    const r = await as().delete(`/sessions/${JTI_A}`);
    expect(r.status).toBe(401);
  });

  it('audits the revocation', async () => {
    await as(alice).delete(`/sessions/${JTI_A}`);
    expect(auditLog).toHaveBeenCalledWith('session_revoked', alice._id, expect.objectContaining({ jti: JTI_A }));
  });

  it('does NOT bump tokenVersion — that would sign out every device', async () => {
    // "Revoke this one" is not "log out everywhere"; logout-all is the hammer.
    await as(alice).delete(`/sessions/${JTI_A}`);
    expect(refreshDeleteOne).toHaveBeenCalledTimes(1);
  });
});

describe('HTTP - GET /sessions marks the current device', () => {
  it('scopes the list to the caller', async () => {
    await as(alice).get('/sessions');
    expect(refreshFind).toHaveBeenCalledWith({ userId: alice._id });
  });

  it('401 with no session', async () => {
    const r = await as().get('/sessions');
    expect(r.status).toBe(401);
  });

  it('marks nothing as current when no token was presented', async () => {
    // The harness sends no refresh cookie, so no row can be identified as the
    // caller's own device. Claiming otherwise would mark an arbitrary row.
    refreshFind.mockReturnValue(query([{ jti: JTI_A, userAgent: 'x' }]));
    const r = await as(alice).get('/sessions');
    expect(r.body.sessions[0].current).toBe(false);
  });
});
