/**
 * File 22 P0-2: deceased/blacklisted hard stops through real HTTP.
 * Registration (linked userId) and billing (patientId) fail closed with
 * 409 PATIENT_HARD_STOP; clean identities pass through.
 */
import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const flaggedUser = '64b0000000000000000000f1';

// PatientFlag resolves a hit for the flagged user; Patient resolves no link.
const { as: asPatients } = await mountApp('patients', {
  '../../src/models/Patient.js': () => ({
    default: {
      create: async (doc) => ({ _id: 'newPatient', ...doc }),
      findOne: () => query(null),
      findById: () => query(null),
    },
  }),
  '../../src/models/PatientFlag.js': () => ({
    default: {
      findOne: (filter) => (String(filter?.patient) === flaggedUser
        ? query({ kind: 'blacklisted' })
        : query(null)),
      find: () => query([]),
      create: async (doc) => ({ _id: 'f1', ...doc }),
    },
  }),
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
  '../../src/models/PatientFlag.js': () => ({
    default: {
      findOne: (filter) => (String(filter?.patient) === flaggedUser
        ? query({ kind: 'deceased' })
        : query(null)),
      find: () => query([]),
    },
  }),
  '../../src/models/Patient.js': () => ({ default: { findOne: () => query(null) } }),
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
