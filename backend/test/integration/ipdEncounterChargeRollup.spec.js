/**
 * File 22 P0-4/P0-3: encounter-linked charges (lab orders, OT op-note lines)
 * must reach the IPD interim and final bills. ChargeItem store is shared
 * across the lab/OT routers (which POST charges) and the ipd router (which
 * rolls them up) — only storage is substituted.
 */
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
      for (const c of chargeItems.filter((r) => matchCharge(r, filter))) {
        Object.assign(c, update.$set || {});
      }
      return { n: chargeItems.length };
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

jest.unstable_mockModule('../../src/models/OperationTheatre.js', () => ({
  default: {
    findById: () => query({
      _id: 'ot-1', hospitalId: 'h1', patientId: 'pat-1', encounterId: ENC, admissionId: 'adm-1',
      procedure: 'Appendectomy', implants: [], consumables: [], teamFees: {},
      save: async () => {},
    }),
  },
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
const { as: asOt } = await mountApp('ot');

const PATIENT = { _id: 'pat-1', id: 'pat-1', role: 'patient' };
const ADMIN = { _id: 'adm-1', id: 'adm-1', role: 'hospital_admin', hospitalId: 'h1' };
const SURGEON = { _id: 'sur-1', id: 'sur-1', role: 'surgeon', hospitalId: 'h1' };

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

describe('lab order charges carry the encounter into IPD bills', () => {
  test('POST /orders stamps encounterId on the posted ChargeItem', async () => {
    await orderLabWithEncounter();
    expect(chargeItems).toHaveLength(1);
    expect(chargeItems[0]).toMatchObject({ source: 'lab', encounterId: ENC, amount: 250, status: 'Pending' });
  });

  test('discharge finalize rolls the encounter-linked charge into Billing.services', async () => {
    await orderLabWithEncounter();
    const res = await asIpd(ADMIN).post('/admissions/adm-1/discharge/finalize').send({});
    expect(res.status).toBe(200);
    expect(bills).toHaveLength(1);
    expect(bills[0].services).toEqual([{ name: 'Lab: CBC', price: 250, quantity: 1 }]);
    expect(bills[0].amount).toBe(250);
    expect(bills[0].billType).toBe('Final');
  });

  test('interim bill includes encounter-linked charges', async () => {
    await orderLabWithEncounter();
    const res = await asIpd(ADMIN).post('/admissions/adm-1/bills/interim').send({});
    expect(res.status).toBe(201);
    expect(res.body.amount).toBe(250);
    expect(bills[0].services).toEqual([{ name: 'Lab: CBC', price: 250, quantity: 1 }]);
  });

  test('finalize refuses when an encounter-linked charge is left unpaid', async () => {
    await orderLabWithEncounter();
    deposits = [];
    const res = await asIpd(ADMIN).post('/admissions/adm-1/discharge/finalize').send({});
    expect(res.status).toBe(409);
    expect(bills).toHaveLength(0);
  });
});

describe('OT op-note charges reach the admission account idempotently', () => {
  const opNote = {
    implants: [{ name: 'Titanium plate', price: 5000 }],
    consumables: [{ name: 'Suture kit', qty: 2, price: 100 }],
  };

  test('implants/consumables post with encounterId + admissionId', async () => {
    const res = await asOt(SURGEON).put('/surgeries/ot-1/op-note').send(opNote);
    expect(res.status).toBe(200);
    expect(res.body.chargedLines).toBe(2);
    expect(chargeItems).toHaveLength(2);
    for (const c of chargeItems) {
      expect(c).toMatchObject({ source: 'ot', encounterId: ENC, admissionId: 'adm-1', status: 'Pending' });
    }
    expect(chargeItems.map((c) => c.amount).sort((a, b) => a - b)).toEqual([200, 5000]);
  });

  test('re-saving the op note does not double-bill', async () => {
    await asOt(SURGEON).put('/surgeries/ot-1/op-note').send(opNote);
    const second = await asOt(SURGEON).put('/surgeries/ot-1/op-note').send(opNote);
    expect(second.status).toBe(200);
    expect(second.body.chargedLines).toBe(0);
    expect(chargeItems).toHaveLength(2);
  });

  test('OT charges appear on the interim bill via the encounter link', async () => {
    await asOt(SURGEON).put('/surgeries/ot-1/op-note').send(opNote);
    deposits = [{ type: 'Receive', amount: 5200 }];
    const res = await asIpd(ADMIN).post('/admissions/adm-1/bills/interim').send({});
    expect(res.status).toBe(201);
    expect(res.body.amount).toBe(5200);
  });
});
