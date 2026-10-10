/**
 * File 22 P0-2: deceased/blacklisted hard stops through real HTTP.
 * Registration (linked userId) and billing (patientId) fail closed with
 * 409 PATIENT_HARD_STOP; clean identities pass through.
 */
import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const flaggedUser = '64b0000000000000000000f1';

const chain = (value) => {
  const q = {
    select: () => q, populate: () => q, sort: () => q, limit: () => q,
    skip: () => q, lean: () => q, exec: () => q,
    then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
    catch: (fn) => Promise.resolve(value).catch(fn),
  };
  return q;
};

const sharedPatient = () => ({
  default: {
    findOne: (filter) => (filter?.phone === '9876543210'
      ? chain({ _id: flaggedUser, name: 'Old Patient', uhid: '', userId: null })
      : chain(null)),
    findById: () => chain(null),
    find: () => chain([]),
    create: async (doc) => ({ _id: 'newPatient', userId: null, ...doc }),
  },
});

const sharedPatientFlag = () => ({
  default: {
    findOne: (filter) => (String(filter?.patient) === flaggedUser
      ? chain({ kind: 'blacklisted' })
      : chain(null)),
    find: () => chain([]),
    create: async (doc) => ({ _id: 'f1', ...doc }),
  },
});

// PatientFlag resolves a hit for the flagged user; Patient resolves no link.
const { as: asPatients } = await mountApp('patients', {
  '../../src/models/Patient.js': sharedPatient,
  '../../src/models/PatientFlag.js': sharedPatientFlag,
  '../../src/models/AuditLog.js': () => ({ default: { create: async () => ({}) } }),
});

const receptionist = { _id: 'r1', id: 'r1', role: 'receptionist', hospitalId: 'h1' };
const regBody = (userId) => ({
  name: 'Old Patient', age: 40, gender: 'Male', phone: '9876543210', ...(userId ? { userId } : {}),
});

describe('POST /patients registration hard-stop', () => {
  test('re-registering a blacklisted identity returns 409', async () => {
    const res = await asPatients(receptionist).post('/').send(regBody(flaggedUser));
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('PATIENT_HARD_STOP');
  });

  test('brand-new identity registers normally', async () => {
    const res = await asPatients(receptionist).post('/').send(regBody());
    expect(res.status).toBe(201);
  });
});

const billingCreate = jestApi.fn();
const { as: asBilling2 } = await mountApp('billing', {
  '../../src/models/Billing.js': () => ({ default: { create: (...a) => billingCreate(...a), findById: () => query(null) } }),
  '../../src/models/DiscountPolicy.js': () => ({ default: { findOne: () => query(null) } }),
  '../../src/models/ApprovalRequest.js': () => ({
    default: { findById: () => query(null), findOne: () => query(null), create: async (d) => ({ _id: 'x', ...d }) },
  }),
  '../../src/models/PatientFlag.js': sharedPatientFlag,
  '../../src/models/Patient.js': sharedPatient,
  '../../src/models/AuditLog.js': () => ({ default: { create: async () => ({}) } }),
});

const biller = { _id: 'recept1', id: 'recept1', role: 'receptionist', hospitalId: 'h1' };

describe('POST /billing hard-stop', () => {
  test('billing a deceased-linked patient returns 409', async () => {
    billingCreate.mockReset();
    const res = await asBilling2(biller).post('/').send({
      patient: 'Old', service: 'OPD', amount: 500, patientId: flaggedUser,
    });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('PATIENT_HARD_STOP');
    expect(billingCreate).not.toHaveBeenCalled();
  });

  test('billing a clean patient works', async () => {
    billingCreate.mockReset().mockResolvedValue({ _id: 'b9', invoiceId: 'INV-9' });
    const res = await asBilling2(biller).post('/').send({ patient: 'New', service: 'OPD', amount: 500 });
    expect(res.status).toBe(201);
  });
});

const istSlot = (hoursFromNow) => {
  const shifted = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000 + 5.5 * 60 * 60 * 1000);
  return {
    date: shifted.toISOString().slice(0, 10),
    time: `${String(shifted.getUTCHours()).padStart(2, '0')}:${String(shifted.getUTCMinutes()).padStart(2, '0')}`,
  };
};

const appointmentCreate = jestApi.fn();
const { as: asWalkIn } = await mountApp('appointments', {
  '../../src/middleware/audit.js': () => ({ auditLog: jestApi.fn(async () => {}) }),
  '../../src/services/socketService.js': () => ({
    emitAppointmentUpdate: jestApi.fn(async () => {}),
    getIO: jestApi.fn(() => null),
    notifyUser: jestApi.fn(async () => {}),
  }),
  '../../src/models/Appointment.js': () => ({
    default: {
      findOne: () => chain(null),
      findById: () => chain(null),
      find: () => chain([]),
      countDocuments: async () => 0,
      create: (...a) => appointmentCreate(...a),
    },
  }),
  '../../src/models/Patient.js': sharedPatient,
  '../../src/models/PatientFlag.js': sharedPatientFlag,
});

const walkInAdmin = { _id: 'adm1', id: 'adm1', role: 'hospital_admin', hospitalId: 'h1' };

describe('POST /appointments/walk-in hard-stop', () => {
  test('walk-in against a blacklisted patient returns 409', async () => {
    appointmentCreate.mockReset();
    const slot = istSlot(30);
    const res = await asWalkIn(walkInAdmin).post('/walk-in').send({
      patient: { name: 'Old Patient', phone: '9876543210' },
      department: 'General',
      date: slot.date,
      time: slot.time,
    });
    if (res.status !== 409) console.log('WALKIN DEBUG', res.status, JSON.stringify(res.body));
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('PATIENT_HARD_STOP');
    expect(appointmentCreate).not.toHaveBeenCalled();
  });

  test('walk-in against a clean patient books normally', async () => {
    appointmentCreate.mockReset().mockImplementation(async (doc) => ({ _id: 'appt-new', ...doc }));
    const slot = istSlot(31);
    const res = await asWalkIn(walkInAdmin).post('/walk-in').send({
      patient: { name: 'Clean Patient', phone: '9999999999' },
      department: 'General',
      date: slot.date,
      time: slot.time,
    });
    expect(res.status).toBe(201);
    expect(appointmentCreate).toHaveBeenCalledTimes(1);
  });
});
