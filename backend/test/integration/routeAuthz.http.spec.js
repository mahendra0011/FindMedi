/**
 * HTTP-level authorization tests (TEST-M-01).
 *
 * These are the first backend tests that make a real request through a real
 * Express router. Every other suite can stay green while a ROUTE forgets to call
 * its guard — `idor.spec.js` proves the guard denies, and a text assertion
 * proves the guard text exists, but neither proves the route is wired to it.
 * This does.
 *
 * `supertest` has been in devDependencies the whole time with no test using it.
 */
import { describe, it, expect, jest, beforeEach, beforeAll, afterAll } from '@jest/globals';
import { mountApp, query, setEnforceAuthorize } from '../helpers/appHarness.js';

const booking = {
  _id: 'b1',
  bookingNumber: 'AB-1',
  patientId: 'patA',
  assistantId: 'asstA',
  hospitalId: 'h1',
  status: 'requested',
};

const profileFindOne = jest.fn();
const bookingFindById = jest.fn();

jest.unstable_mockModule('../../src/models/AssistantProfile.js', () => ({
  default: { findOne: profileFindOne },
}));
jest.unstable_mockModule('../../src/models/AssistantBooking.js', () => ({
  default: { findById: bookingFindById },
}));
jest.unstable_mockModule('../../src/models/User.js', () => ({
  default: {
    findById: () => query({ _id: '507f191e810c19729de860ea', name: 'Patient A', role: 'patient' }),
    find: () => query([]),
  },
}));

// Mocks for B2 new route families:
jest.unstable_mockModule('../../src/models/Feedback.js', () => ({
  default: {
    find: () => query([]),
    create: async (d) => ({ _id: 'fb1', ...d }),
  },
}));

jest.unstable_mockModule('../../src/models/AmbulanceTrip.js', () => ({
  AmbulanceTrip: {
    find: () => query([]),
    create: async (d) => ({ _id: 'trip1', ...d }),
  },
  AmbulanceVehicleLog: {
    find: () => query([]),
    create: async (d) => ({ _id: 'log1', ...d }),
  },
  VEHICLE_LOG_TYPES: ['fuel', 'maintenance', 'inspection'],
}));

jest.unstable_mockModule('../../src/models/Ambulance.js', () => ({
  default: {
    findOne: () => query({ _id: '507f191e810c19729de860aa', hospitalId: 'h1' }),
  },
}));

jest.unstable_mockModule('../../src/models/GatePass.js', () => ({
  GatePass: {
    create: async (d) => ({ _id: '507f191e810c19729de860ea', passNo: 'GP-1', ...d }),
    findById: () => query({ _id: '507f191e810c19729de860ea', status: 'requested', passNo: 'GP-1', save: async () => {} }),
  },
  SecurityRound: {
    create: async (d) => ({ _id: '507f191e810c19729de860eb', roundNo: 'SR-1', ...d }),
    findById: () => query({ _id: '507f191e810c19729de860eb', status: 'open', roundNo: 'SR-1', checkpoints: [{ ok: true }], save: async () => {} }),
  },
  GATE_PASS_TYPES: ['material_outward', 'visitor', 'contractor'],
  GATE_PASS_STATUS: ['requested', 'approved', 'rejected', 'used', 'expired'],
}));

jest.unstable_mockModule('../../src/models/H1RegisterEntry.js', () => ({
  default: {
    find: () => ({ sort: () => ({ limit: () => ({ lean: async () => [] }) }) }),
    countDocuments: async () => 0,
  },
  REGISTER_SCHEDULES: ['h1', 'x', 'narcotic_ndps'],
  REGISTER_SCHEDULE_ALIASES: { schedule_h1: 'h1', schedule_x: 'x' },
}));

jest.unstable_mockModule('../../src/models/Record.js', () => ({
  default: {
    find: () => query([]),
    create: async (d) => ({ _id: 'rec1', ...d }),
  },
}));

jest.unstable_mockModule('../../src/models/BiomedicalAsset.js', () => ({
  default: {
    find: () => query([]),
    create: async (d) => ({ _id: 'bio1', ...d }),
  },
}));

jest.unstable_mockModule('../../src/models/BiomedicalWorkOrder.js', () => ({
  default: {
    find: () => query([]),
    create: async (d) => ({ _id: 'wo1', ...d }),
  },
}));

jest.unstable_mockModule('../../src/models/BmwBag.js', () => ({
  default: {
    find: () => query([]),
    create: async (d) => ({ _id: 'bmw1', ...d }),
  },
  BMW_COLOR_CATEGORIES: ['YELLOW', 'RED', 'WHITE', 'BLUE'],
}));

jest.unstable_mockModule('../../src/models/JobOpening.js', () => ({
  default: {
    find: () => query([]),
    create: async (d) => ({ _id: 'job1', ...d }),
  },
}));
jest.unstable_mockModule('../../src/models/Candidate.js', () => ({
  default: { find: () => query([]), create: async (d) => ({ _id: 'cand1', ...d }) },
}));
jest.unstable_mockModule('../../src/models/OnboardingTask.js', () => ({
  default: { find: () => query([]), create: async (d) => ({ _id: 'task1', ...d }) },
}));
jest.unstable_mockModule('../../src/models/Staff.js', () => ({
  default: { find: () => query([]), create: async (d) => ({ _id: 'st1', ...d }) },
}));

jest.unstable_mockModule('../../src/models/CanteenItem.js', () => ({
  default: {
    find: () => query([]),
    create: async (d) => ({ _id: 'item1', ...d }),
  },
}));
jest.unstable_mockModule('../../src/models/CanteenOrder.js', () => ({
  default: { find: () => query([]), create: async (d) => ({ _id: 'order1', ...d }) },
}));

jest.unstable_mockModule('../../src/models/ParkingTransaction.js', () => ({
  default: {
    find: () => query([]),
    create: async (d) => ({ _id: 'park1', ...d }),
  },
  VEHICLE_TYPES: ['TWO_WHEELER', 'FOUR_WHEELER', 'AMBULANCE', 'STAFF', 'VIP'],
}));

jest.unstable_mockModule('../../src/models/ClinicPackage.js', () => ({
  default: {
    find: () => query([]),
    create: async (d) => ({ _id: 'pkg1', ...d }),
    findOneAndUpdate: async () => ({ _id: 'pkg1' }),
    deleteOne: async () => ({ deletedCount: 1 }),
  },
}));

jest.unstable_mockModule('../../src/models/Encounter.js', () => ({
  default: {
    find: () => query([]),
    findOne: () => query({ _id: '507f191e810c19729de860e1', status: 'Open' }),
    findOneAndUpdate: async () => ({ _id: '507f191e810c19729de860e1', status: 'Open' }),
  },
}));
jest.unstable_mockModule('../../src/lib/encounter.js', () => ({
  closeEncounter: async () => ({ _id: '507f191e810c19729de860e1', status: 'Closed' }),
}));

jest.unstable_mockModule('../../src/models/Radiology.js', () => ({
  default: { findById: () => query(null) },
}));
jest.unstable_mockModule('../../src/models/ImagingModality.js', () => ({
  default: { find: () => query([]) },
}));
jest.unstable_mockModule('../../src/models/ImagingAppointment.js', () => ({
  default: { find: () => query([]) },
}));
jest.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLog: async () => {},
}));

const { as } = await mountApp('assistantBookings', {});
const feedbackApp = await mountApp('feedback', {}, { enforceAuthorize: true });
const ambulanceTripsApp = await mountApp('ambulanceTrips', {}, { enforceAuthorize: true });
const securityApp = await mountApp('security', {}, { enforceAuthorize: true });
const pharmacyApp = await mountApp('pharmacy', {}, { enforceAuthorize: true });
const certificatesApp = await mountApp('certificates', {}, { enforceAuthorize: true });
const biomedicalApp = await mountApp('biomedical', {}, { enforceAuthorize: true });
const bmwApp = await mountApp('bmw', {}, { enforceAuthorize: true });
const biometricApp = await mountApp('biometric', {}, { enforceAuthorize: true });
const recruitmentApp = await mountApp('recruitment', {}, { enforceAuthorize: true });
const canteenApp = await mountApp('canteen', {}, { enforceAuthorize: true });
const parkingApp = await mountApp('parking', {}, { enforceAuthorize: true });
const clinicPackagesApp = await mountApp('clinicPackages', {}, { enforceAuthorize: true });
const encountersApp = await mountApp('encounters', {}, { enforceAuthorize: true });
const radiologyApp = await mountApp('radiology', {}, { enforceAuthorize: true });

beforeEach(() => {
  profileFindOne.mockReset().mockReturnValue(query(null));
  bookingFindById.mockReset().mockReturnValue(query(booking));
});

describe('HTTP - GET /:id is reachable only by a party to the booking', () => {
  it('200 for the owning patient', async () => {
    const r = await as({ _id: 'patA', role: 'patient' }).get('/b1');
    expect(r.status).toBe(200);
  });

  it('404 for a DIFFERENT patient — not 403', async () => {
    // 404 specifically: a 403 confirms the id exists, which turns this endpoint
    // into an oracle for harvesting live booking ids.
    const r = await as({ _id: 'patB', role: 'patient' }).get('/b1');
    expect(r.status).toBe(404);
  });

  it('404 for an unrelated rider', async () => {
    const r = await as({ _id: 'riderX', role: 'delivery_boy' }).get('/b1');
    expect(r.status).toBe(404);
  });

  it('200 for the assigned assistant', async () => {
    const r = await as({ _id: 'asstA', role: 'assistant' }).get('/b1');
    expect(r.status).toBe(200);
  });

  it('404 for a different assistant', async () => {
    const r = await as({ _id: 'asstB', role: 'assistant' }).get('/b1');
    expect(r.status).toBe(404);
  });

  it('200 for staff inside the booking hospital', async () => {
    const r = await as({ _id: 'adm1', role: 'hospital_admin', hospitalId: 'h1' }).get('/b1');
    expect(r.status).toBe(200);
  });

  it('404 for staff in another hospital', async () => {
    const r = await as({ _id: 'adm2', role: 'hospital_admin', hospitalId: 'h2' }).get('/b1');
    expect(r.status).toBe(404);
  });

  it('401 with no session at all', async () => {
    const r = await as().get('/b1');
    expect(r.status).toBe(401);
  });

  it('does not leak the patient record to a denied caller', async () => {
    // The status code alone is not the assertion that matters — a route could
    // 404 and still have serialized the row first.
    const r = await as({ _id: 'patB', role: 'patient' }).get('/b1');
    expect(JSON.stringify(r.body)).not.toMatch(/patA|asstA/);
  });

  it('the denial happens BEFORE the record is serialized', async () => {
    // Same check from the other side: the guard must run before the handler
    // builds a response body, not after.
    const denied = await as({ _id: 'patB', role: 'patient' }).get('/b1');
    const allowed = await as({ _id: 'patA', role: 'patient' }).get('/b1');
    expect(Object.keys(denied.body).length).toBeLessThan(Object.keys(allowed.body).length);
  });

  it('the receipt route is guarded on the same path as the detail route', async () => {
    // GET /:id/receipt had NO ownership check at all and generates a PDF
    // carrying the patient's name, phone, email and the fee breakdown — a
    // financial document that is also harder to revoke than a row read.
    const denied = await as({ _id: 'patB', role: 'patient' }).get('/b1/receipt');
    expect(denied.status).toBe(404);
    // And it must not have produced a PDF for a caller who does not own it.
    expect(denied.headers['content-type']).not.toMatch(/pdf/);
  });

  it('the broadcast-fallback route is guarded too', async () => {
    // This one REWRITES the booking and fans it out to every available
    // assistant, so an unguarded caller could strip an assistant off a job.
    const r = await as({ _id: 'patB', role: 'patient' }).post('/b1/broadcast-fallback');
    expect(r.status).toBe(404);
  });

  it('404 for an unknown booking id, so ids are not enumerable', async () => {
    bookingFindById.mockReturnValue(query(null));
    const r = await as({ _id: 'patA', role: 'patient' }).get('/does-not-exist');
    expect(r.status).toBe(404);
  });
});

describe('HTTP Authorization - New route families enforce 401 unauth and 403 wrong-role (B2)', () => {
  beforeAll(() => {
    setEnforceAuthorize(true);
  });
  afterAll(() => {
    setEnforceAuthorize(false);
  });

  const families = [
    {
      name: 'feedback',
      request: (client) => client.get('/summary'),
      as: feedbackApp.as,
      wrongRole: { _id: '507f191e810c19729de860e1', role: 'patient' },
      validRole: { _id: '507f191e810c19729de860e2', role: 'hospital_admin', hospitalId: '507f191e810c19729de860ed' },
    },
    {
      name: 'ambulance-trips',
      request: (client) => client.post('/trips').send({ fromLocation: 'Site A', toLocation: 'Hospital B' }),
      as: ambulanceTripsApp.as,
      wrongRole: { _id: '507f191e810c19729de860e1', role: 'patient' },
      validRole: { _id: '507f191e810c19729de860e2', role: 'ambulance', hospitalId: '507f191e810c19729de860ed' },
    },
    {
      name: 'security (gate-pass decide)',
      request: (client) => client.put('/gate-passes/507f191e810c19729de860ea/decide').send({ action: 'approve' }),
      as: securityApp.as,
      wrongRole: { _id: '507f191e810c19729de860e1', role: 'patient' },
      validRole: { _id: '507f191e810c19729de860e2', role: 'security', hospitalId: '507f191e810c19729de860ed' },
    },
    {
      name: 'security (rounds close)',
      request: (client) => client.put('/rounds/507f191e810c19729de860eb/close').send({}),
      as: securityApp.as,
      wrongRole: { _id: '507f191e810c19729de860e1', role: 'patient' },
      validRole: { _id: '507f191e810c19729de860e2', role: 'security_admin', hospitalId: '507f191e810c19729de860ed' },
    },
    {
      name: 'h1-register',
      request: (client) => client.get('/h1-register'),
      as: pharmacyApp.as,
      wrongRole: { _id: '507f191e810c19729de860e1', role: 'patient' },
      validRole: { _id: '507f191e810c19729de860e2', role: 'pharmacist', hospitalId: '507f191e810c19729de860ed' },
    },
    {
      name: 'certificates',
      request: (client) => client.post('/').send({
        patientId: '507f191e810c19729de860ea',
        title: 'Fitness Certificate',
        type: 'fitness',
      }),
      as: certificatesApp.as,
      wrongRole: { _id: '507f191e810c19729de860e1', role: 'patient' },
      validRole: { _id: '507f191e810c19729de860e2', role: 'doctor', hospitalId: '507f191e810c19729de860ed' },
    },
    {
      name: 'biomedical',
      request: (client) => client.get('/assets'),
      as: biomedicalApp.as,
      wrongRole: { _id: '507f191e810c19729de860e1', role: 'patient' },
      validRole: { _id: '507f191e810c19729de860e2', role: 'hospital_admin', hospitalId: '507f191e810c19729de860ed' },
    },
    {
      name: 'bmw',
      request: (client) => client.get('/bags'),
      as: bmwApp.as,
      wrongRole: { _id: '507f191e810c19729de860e1', role: 'patient' },
      validRole: { _id: '507f191e810c19729de860e2', role: 'hospital_admin', hospitalId: '507f191e810c19729de860ed' },
    },
    {
      name: 'biometric',
      request: (client) => client.get('/logs'),
      as: biometricApp.as,
      wrongRole: { _id: '507f191e810c19729de860e1', role: 'patient' },
      validRole: { _id: '507f191e810c19729de860e2', role: 'hospital_admin', hospitalId: '507f191e810c19729de860ed' },
    },
    {
      name: 'recruitment',
      request: (client) => client.get('/jobs'),
      as: recruitmentApp.as,
      wrongRole: { _id: '507f191e810c19729de860e1', role: 'patient' },
      validRole: { _id: '507f191e810c19729de860e2', role: 'hospital_admin', hospitalId: '507f191e810c19729de860ed' },
    },
    {
      name: 'canteen',
      request: (client) => client.get('/items'),
      as: canteenApp.as,
      wrongRole: { _id: '507f191e810c19729de860e1', role: 'patient' },
      validRole: { _id: '507f191e810c19729de860e2', role: 'hospital_admin', hospitalId: '507f191e810c19729de860ed' },
    },
    {
      name: 'parking',
      request: (client) => client.get('/vehicles'),
      as: parkingApp.as,
      wrongRole: { _id: '507f191e810c19729de860e1', role: 'patient' },
      validRole: { _id: '507f191e810c19729de860e2', role: 'hospital_admin', hospitalId: '507f191e810c19729de860ed' },
    },
    {
      name: 'clinicPackages',
      request: (client) => client.post('/').send({ name: 'Health Package', price: 999 }),
      as: clinicPackagesApp.as,
      wrongRole: { _id: '507f191e810c19729de860e1', role: 'patient' },
      validRole: { _id: '507f191e810c19729de860e2', role: 'hospital_admin', hospitalId: '507f191e810c19729de860ed' },
    },
    {
      name: 'encounters',
      request: (client) => client.get('/'),
      as: encountersApp.as,
      wrongRole: { _id: '507f191e810c19729de860e1', role: 'patient' },
      validRole: { _id: '507f191e810c19729de860e2', role: 'doctor', hospitalId: '507f191e810c19729de860ed' },
    },
    {
      name: 'dicom viewer-url',
      request: (client) => client.get('/dicom/viewer-url?studyUid=1.2.840.113619.2.55.3.60'),
      as: radiologyApp.as,
      wrongRole: { _id: '507f191e810c19729de860e1', role: 'patient' },
      validRole: { _id: '507f191e810c19729de860e2', role: 'radiologist', hospitalId: '507f191e810c19729de860ed' },
    },
  ];

  for (const tc of families) {
    describe(`${tc.name} authz gates`, () => {
      it('rejects unauthenticated caller with 401', async () => {
        const res = await tc.request(tc.as());
        expect(res.status).toBe(401);
      });

      it('rejects unauthorized role with 403', async () => {
        const res = await tc.request(tc.as(tc.wrongRole));
        expect(res.status).toBe(403);
      });

      it('allows authorized role past the security gate', async () => {
        const res = await tc.request(tc.as(tc.validRole));
        expect([401, 403]).not.toContain(res.status);
      });
    });
  }
});

