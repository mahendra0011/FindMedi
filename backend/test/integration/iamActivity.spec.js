/**
 * File 25 §11/§12: activity & audit endpoints.
 *
 * The doors, in order of importance:
 *   /me       — self-view ONLY (the filter is the gate: patients read rows
 *               about themselves, staff read their own trail).
 *   /         — audit:read (enforced for real here via enforceAuthorize).
 *   /metrics  — audit:read, in-process §12 counters.
 */
import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const findMock = jestApi.fn();
const countMock = jestApi.fn();
const createMock = jestApi.fn();

const { as } = await mountApp('accessLog', {
  '../../src/models/IamAccessLog.js': () => ({
    default: {
      find: (...a) => findMock(...a),
      countDocuments: (...a) => countMock(...a),
      create: (...a) => createMock(...a),
    },
  }),
}, { enforceAuthorize: true });

const PATIENT = { id: '64b000000000000000000001', role: 'patient' };
const DOCTOR = { id: '64b000000000000000000002', role: 'doctor' };
const NURSE = { id: '64b000000000000000000003', role: 'nurse' };
const ADMIN = { id: '64b000000000000000000004', role: 'hospital_admin' };

beforeEach(() => {
  findMock.mockReset();
  countMock.mockReset();
  createMock.mockReset();
  findMock.mockReturnValue(query([]));
  countMock.mockResolvedValue(0);
});

describe('GET /me — self view (no permission beyond authentication)', () => {
  it('401s an unauthenticated caller', async () => {
    await as().get('/me').expect(401);
    expect(findMock).not.toHaveBeenCalled();
  });

  it('patients query rows WHERE patientId = themselves', async () => {
    findMock.mockReturnValue(query([{ _id: 'e1', action: 'records:read' }]));
    const res = await as(PATIENT).get('/me').expect(200);
    expect(findMock.mock.calls[0][0]).toEqual({ patientId: PATIENT.id });
    expect(res.body.entries).toHaveLength(1);
  });

  it('staff query rows WHERE actorId = themselves', async () => {
    await as(DOCTOR).get('/me').expect(200);
    expect(findMock.mock.calls[0][0]).toEqual({ actorId: DOCTOR.id });
  });
});

describe('GET / — full trail behind audit:read', () => {
  it('403s a role without audit:read (nurse)', async () => {
    const res = await as(NURSE).get('/');
    expect(res.status).toBe(403);
    expect(findMock).not.toHaveBeenCalled();
  });

  it('200s a hospital_admin and returns paginated shape', async () => {
    const res = await as(ADMIN).get('/').expect(200);
    expect(res.body).toEqual({ entries: [], total: 0, page: 1, limit: 50 });
  });

  it('passes filters through to the query (flagged/patient/action)', async () => {
    await as(ADMIN)
      .get('/?flagged=true&patientId=64b000000000000000000001&action=records:read&limit=20')
      .expect(200);
    expect(findMock.mock.calls[0][0]).toEqual({
      flagged: true,
      patientId: '64b000000000000000000001',
      action: 'records:read',
    });
  });

  it('caps limit at 200 even when asked for more', async () => {
    await as(ADMIN).get('/?limit=99999').expect(200);
    expect(countMock).toHaveBeenCalledWith({});
  });
});

describe('GET /metrics — §12 observability behind audit:read', () => {
  it('403s a nurse', async () => {
    await as(NURSE).get('/metrics').expect(403);
  });

  it('returns the counter surface', async () => {
    const res = await as(ADMIN).get('/metrics').expect(200);
    expect(res.body).toHaveProperty('writes');
    expect(res.body).toHaveProperty('allow');
    expect(res.body).toHaveProperty('deny');
    expect(res.body).toHaveProperty('flagged');
    expect(res.body).toHaveProperty('shadowMismatches');
    expect(typeof res.body.windowMs).toBe('number');
  });
});
