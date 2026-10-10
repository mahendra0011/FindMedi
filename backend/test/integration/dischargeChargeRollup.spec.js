import { jest } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const ENC = '64b000000000000000000e01';
const ADM = { _id: 'adm-1', admissionId: 'ADM-001', hospitalId: 'h1', patientId: 'pat-1', patientName: 'Test Patient', encounterId: ENC, status: 'Admitted', bedId: null, save: async () => {} };

let chargeItems = [];
let bills = [];
let deposits = [{ type: 'Receive', amount: 250 }];

const matchCharge = (doc, filter = {}) => Object.entries(filter).every(([key, want]) => {
  if (key === '$or') return want.some((sub) => matchCharge(doc, sub));
  const got = key.includes('.')
    ? key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), doc)
    : doc[key];
  if (want !== null && typeof want === 'object' && !(want instanceof RegExp)) {
    if ('$in' in want) return want.$in.some((x) => (x == null ? got == null : String(x) === String(got)));
    return String(got) === String(want);
  }
  return String(got) === String(want);
});

jest.unstable_mockModule('../../src/models/ChargeItem.js', () => ({
  default: {
    findOne: (filter) => query(chargeItems.find((c) => matchCharge(c, filter)) || null),
    find: (filter) => query(chargeItems.filter((c) => matchCharge(c, filter))),
    create: async (doc) => {
      const row = { _id: `ch-${chargeItems.length + 1}`, ...doc };
      chargeItems.push(row);
      return row;
    },
    updateMany: async (filter, update) => {
      let n = 0;
      for (const c of chargeItems.filter((r) => matchCharge(r, filter))) {
        Object.assign(c, update.$set || {});
        n += 1;
      }
      return { n };
    },
  },
}));

jest.unstable_mockModule('../../src/models/Admission.js', () => ({
  default: {
    findById: () => query(ADM),
    findOne: () => query(null),
  },
}));

jest.unstable_mockModule('../../src/models/DischargeWorkflow.js', () => ({
  default: {
    findOne: () => query({ state: 'BillingClear', approvals: [], summary: {}, save: async () => {} }),
  },
}));

jest.unstable_mockModule('../../src/models/IpdDeposit.js', () => ({
  default: { find: () => query(deposits) },
}));

jest.unstable_mockModule('../../src/models/Billing.js', () => ({
  default: {
    create: async (doc) => {
      const row = { _id: `bill-${bills.length + 1}`, ...doc };
      bills.push(row);
      return row;
    },
  },
}));

jest.unstable_mockModule('../../src/models/Housekeeping.js', () => ({
  default: { create: async () => ({}) },
}));

jest.unstable_mockModule('../../src/models/LabOrder.js', () => ({
  default: {
    create: async (doc) => ({ save: async () => {}, ...doc }),
    findOne: () => query(null),
    find: () => query([]),
  },
}));

jest.unstable_mockModule('../../src/models/Test.js', () => ({
  default: { findOne: () => query({ price: 250 }) },
}));

jest.unstable_mockModule('../../src/models/Notification.js', () => ({
  default: { insertMany: async () => [], create: async () => ({}) },
}));

jest.unstable_mockModule('../../src/middleware/audit.js', () => ({ auditLog: jest.fn(async () => {}) }));
jest.unstable_mockModule('../../src/services/notificationService.js', () => ({ createNotification: jest.fn(async () => ({})) }));
jest.unstable_mockModule('../../src/services/socketService.js', () => ({
  getIO: jest.fn(() => null), emitDeliveryStatus: jest.fn(), emitAppointmentUpdate: jest.fn(async () => {}),
}));

const userStub = () => ({
  default: {
    findById: () => query({ _id: 'u1', twoFactorEnabled: false }),
    find: () => query([]),
  },
});

const { as: asLab } = await mountApp('lab', { '../../src/models/User.js': userStub });
const { as: asIpd } = await mountApp('ipd');

const PATIENT = { _id: 'pat-1', id: 'pat-1', role: 'patient' };
const ADMIN = { _id: 'adm-1', id: 'adm-1', role: 'hospital_admin', hospitalId: 'h1' };

const LAB_LINE = [{ name: 'Lab: CBC', price: 250, quantity: 1 }];

const orderLabWithEncounter = async () => {
  const res = await asLab(PATIENT).post('/orders').send({
    patientId: 'pat-1', patientName: 'Test Patient',
    tests: [{ testName: 'CBC' }], encounterId: ENC,
  });
  expect(res.status).toBe(201);
  return res;
};

beforeEach(() => {
  chargeItems = [];
  bills = [];
  deposits = [{ type: 'Receive', amount: 250 }];
  Object.assign(ADM, { status: 'Admitted', bedId: null });
});

describe('P0-4 discharge bill rollup: lab line -> ChargeItem -> Billing.services', () => {
  test('lab order with encounterId posts one Pending encounter-only ChargeItem', async () => {
    await orderLabWithEncounter();
    expect(chargeItems).toHaveLength(1);
    expect(chargeItems[0]).toMatchObject({
      source: 'lab', encounterId: ENC, admissionId: null,
      amount: 250, status: 'Pending',
    });
  });

  test('interim bill lists the lab line and flips the encounter charge to Billed', async () => {
    await orderLabWithEncounter();
    const res = await asIpd(ADMIN).post('/admissions/adm-1/bills/interim').send({});
    expect(res.status).toBe(201);
    expect(bills).toHaveLength(1);
    expect(bills[0].billType).toBe('Interim');
    expect(bills[0].services).toEqual(LAB_LINE);
    expect(bills[0].amount).toBe(250);
    expect(chargeItems[0].status).toBe('Billed');
    expect(String(chargeItems[0].billId)).toBe(String(bills[0]._id));
  });

  test('discharge finalize lists the lab line and flips the encounter charge to Billed', async () => {
    await orderLabWithEncounter();
    const res = await asIpd(ADMIN).post('/admissions/adm-1/discharge/finalize').send({});
    expect(res.status).toBe(200);
    expect(bills).toHaveLength(1);
    expect(bills[0].billType).toBe('Final');
    expect(bills[0].services).toEqual(LAB_LINE);
    expect(bills[0].amount).toBe(250);
    expect(chargeItems[0].status).toBe('Billed');
    expect(String(chargeItems[0].billId)).toBe(String(bills[0]._id));
  });

  test('finalize after an interim bill does not recount the already-billed lab line', async () => {
    await orderLabWithEncounter();
    const interim = await asIpd(ADMIN).post('/admissions/adm-1/bills/interim').send({});
    expect(interim.status).toBe(201);
    expect(bills[0].services).toEqual(LAB_LINE);

    const finalize = await asIpd(ADMIN).post('/admissions/adm-1/discharge/finalize').send({});
    expect(finalize.status).toBe(200);
    expect(bills).toHaveLength(2);
    expect(bills[1].billType).toBe('Final');
    expect(bills[1].services).toEqual([]);
    expect(bills[1].amount).toBe(0);
    expect(chargeItems).toHaveLength(1);
    expect(chargeItems[0].status).toBe('Billed');
    expect(String(chargeItems[0].billId)).toBe(String(bills[0]._id));
  });

  test('a second interim after the first has nothing left to bill', async () => {
    await orderLabWithEncounter();
    await asIpd(ADMIN).post('/admissions/adm-1/bills/interim').send({});
    const second = await asIpd(ADMIN).post('/admissions/adm-1/bills/interim').send({});
    expect(second.status).toBe(409);
    expect(bills).toHaveLength(1);
  });
});
