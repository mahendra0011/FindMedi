import { describe, it, expect, beforeEach } from '@jest/globals';
import { mountApp } from '../helpers/appHarness.js';

const mockMedicines = [
  {
    _id: '64f000000000000000000001',
    name: 'Alprazolam 0.5mg',
    rxSchedule: 'h1',
    stock: 50,
  },
  {
    _id: '64f000000000000000000002',
    name: 'Morphine Sulfate 10mg',
    rxSchedule: 'narcotic_ndps',
    stock: 20,
  },
];

let adjustmentsStore = [];
let countsStore = [];
let h1EntriesStore = [];
let alertsStore = [];
let workTasksStore = [];
let existingAlert = null;
let existingTask = null;

const { as } = await mountApp('pharmacy', {
  '../../src/models/Medicine.js': () => ({
    default: {
      find: (filter) => ({
        select: () => ({
          lean: async () => mockMedicines,
        }),
      }),
      findById: async (id) => mockMedicines.find((m) => String(m._id) === String(id)) || null,
    },
  }),
  '../../src/models/H1RegisterEntry.js': () => ({
    default: {
      find: (filter) => ({
        sort: () => ({
          limit: () => ({
            lean: async () => h1EntriesStore,
          }),
        }),
        select: () => ({
          lean: async () => h1EntriesStore,
        }),
      }),
    },
    REGISTER_SCHEDULES: new Set(['h1', 'x', 'narcotic_ndps']),
    REGISTER_SCHEDULE_ALIASES: { H1: 'h1', X: 'x', NDPS: 'narcotic_ndps' },
  }),
  '../../src/models/NarcoticAdjustment.js': () => ({
    default: {
      create: async (data) => {
        const item = { _id: '64f0000000000000000000a1', at: new Date(), ...data };
        adjustmentsStore.push(item);
        return item;
      },
      find: (filter) => ({
        sort: () => ({
          limit: () => ({
            lean: async () => adjustmentsStore,
          }),
        }),
        lean: async () => adjustmentsStore,
      }),
    },
  }),
  '../../src/models/NarcoticCount.js': () => ({
    default: {
      create: async (data) => {
        const item = { _id: '64f0000000000000000000c1', at: new Date(), ...data };
        countsStore.push(item);
        return item;
      },
      findOne: (filter) => ({
        sort: () => ({
          lean: async () => countsStore[0] || null,
        }),
      }),
      find: () => ({
        sort: () => ({
          limit: () => ({
            lean: async () => countsStore,
          }),
        }),
      }),
    },
  }),
  '../../src/models/StockLedger.js': () => ({
    default: {
      find: () => ({
        lean: async () => [],
      }),
      create: async () => ({}),
    },
  }),
  '../../src/models/Facility.js': () => ({
    default: {
      findById: (id) => ({
        select: () => ({
          lean: async () => ({
            _id: id,
            name: 'Apollo Hospital',
            registrationNumber: 'DL-20-44910',
          }),
        }),
      }),
    },
  }),
  '../../src/models/User.js': () => ({
    default: {
      findById: (id) => ({
        select: () => ({
          lean: async () => {
            if (String(id) === '64f000000000000000000099') {
              return { _id: id, name: 'Dr. Verifier Singh', role: 'doctor' };
            }
            return null;
          },
        }),
      }),
    },
  }),
  '../../src/middleware/audit.js': () => ({
    auditLog: async () => ({}),
  }),
  '../../src/models/DashboardAlert.js': () => ({
    default: {
      findOne: () => ({
        select: () => ({
          lean: async () => existingAlert,
        }),
      }),
      create: async (data) => {
        const row = { _id: '64f0000000000000000000aa', createdAt: new Date(), ...data };
        alertsStore.push(row);
        return row;
      },
    },
  }),
  '../../src/services/socketService.js': () => ({
    getIO: () => ({ to: () => ({ emit: () => {} }) }),
    emitDashboardAlert: () => {},
  }),
  '../../src/models/WorkTask.js': () => ({
    default: {
      findOne: () => ({
        select: () => ({
          lean: async () => existingTask,
        }),
      }),
      create: async (data) => {
        const row = { _id: '64f0000000000000000000bb', createdAt: new Date(), ...data };
        workTasksStore.push(row);
        return row;
      },
    },
  }),
});

describe('Narcotic & Schedule H1 Stock Reconciliation (T6)', () => {
  const pharmacist = {
    _id: '64f000000000000000000088',
    id: '64f000000000000000000088',
    name: 'Priya Pharmacist',
    role: 'pharmacist',
    hospitalId: '64f000000000000000000010',
    permissions: ['pharmacy:read', 'pharmacy:manage'],
  };

  beforeEach(() => {
    adjustmentsStore = [];
    countsStore = [];
    h1EntriesStore = [];
    alertsStore = [];
    workTasksStore = [];
    existingAlert = null;
    existingTask = null;
  });

  const settleAsyncAlerters = async () => {
    for (let i = 0; i < 24; i += 1) {
      await new Promise((r) => setTimeout(r, 25));
      if (alertsStore.length && workTasksStore.length) break;
    }
  };

  it('calculates reconciliation balances and returns zero variance when physical matches expected', async () => {
    const res = await as(pharmacist)
      .get('/narcotic-register/reconcile')
      .expect(200);

    expect(res.body.rows).toBeDefined();
    expect(res.body.rows.length).toBe(2);
    expect(res.body.rows[0].medicineName).toBe('Alprazolam 0.5mg');
    expect(res.body.rows[0].expectedClosing).toBe(50);
    expect(res.body.rows[0].variance).toBe(0);
  });

  it('raises critical alert and P1 reconciliation task on non-zero variance', async () => {
    countsStore = [{ countedQty: 48, at: new Date(), countedByName: 'X', witnessByName: 'Y' }];

    const res = await as(pharmacist)
      .get('/narcotic-register/reconcile')
      .expect(200);

    expect(res.body.varianceCount).toBe(2);
    await settleAsyncAlerters();

    expect(alertsStore.length).toBe(1);
    expect(alertsStore[0].code).toBe('narcotic-variance');
    expect(alertsStore[0].severity).toBe('critical');
    expect(alertsStore[0].entityRef).toMatchObject({ model: 'NarcoticCount' });
    expect(alertsStore[0].message).toMatch(/variance on 2 medicine/i);

    expect(workTasksStore.length).toBe(1);
    expect(workTasksStore[0].title).toMatch(/physical recount required/i);
    expect(workTasksStore[0].priority).toBe('P1');
    expect(workTasksStore[0].roleQueue).toBe('pharmacist');
    expect(workTasksStore[0].tags).toContain('narcotic-variance');
    expect(workTasksStore[0].entityRef).toMatchObject({ model: 'NarcoticCount' });
  });

  it('dedupes alert and task within the 24h window on repeat reconcile', async () => {
    countsStore = [{ countedQty: 48, at: new Date(), countedByName: 'X', witnessByName: 'Y' }];

    await as(pharmacist).get('/narcotic-register/reconcile').expect(200);
    await settleAsyncAlerters();
    expect(alertsStore.length).toBe(1);
    expect(workTasksStore.length).toBe(1);

    existingAlert = alertsStore[0];
    existingTask = workTasksStore[0];

    await as(pharmacist).get('/narcotic-register/reconcile').expect(200);
    await settleAsyncAlerters();

    expect(alertsStore.length).toBe(1);
    expect(workTasksStore.length).toBe(1);
  });

  it('rejects self-witnessed adjustment with 400', async () => {
    const res = await as(pharmacist)
      .post('/narcotic-register/adjustments')
      .send({
        medicineId: '64f000000000000000000001',
        medicineName: 'Alprazolam 0.5mg',
        qty: 2,
        type: 'breakage',
        reason: 'Ampoule dropped on counter',
        witnessBy: String(pharmacist._id), // Same user
      })
      .expect(400);

    expect(res.body.message).toMatch(/Witness must be a different authorized user/i);
  });

  it('creates narcotic adjustment with valid dual witness', async () => {
    const res = await as(pharmacist)
      .post('/narcotic-register/adjustments')
      .send({
        medicineId: '64f000000000000000000001',
        medicineName: 'Alprazolam 0.5mg',
        qty: 2,
        type: 'wastage',
        reason: 'Unusable broken blister foil',
        witnessBy: '64f000000000000000000099',
      })
      .expect(201);

    expect(res.body.adjustment).toBeDefined();
    expect(res.body.adjustment.qty).toBe(2);
    expect(res.body.adjustment.witnessByName).toBe('Dr. Verifier Singh');
    expect(res.body.adjustment.recordedByName).toBe('Priya Pharmacist');
  });

  it('creates physical stock count with dual witness', async () => {
    const res = await as(pharmacist)
      .post('/narcotic-register/counts')
      .send({
        medicineId: '64f000000000000000000002',
        medicineName: 'Morphine Sulfate 10mg',
        countedQty: 20,
        witnessBy: '64f000000000000000000099',
        notes: 'Monthly physical verification audit',
      })
      .expect(201);

    expect(res.body.count).toBeDefined();
    expect(res.body.count.countedQty).toBe(20);
    expect(res.body.count.witnessByName).toBe('Dr. Verifier Singh');
  });

  it('generates statutory inspector PDF register with %PDF header', async () => {
    h1EntriesStore = [
      {
        _id: '64f0000000000000000000e1',
        prescriptionNo: 'RX-1002',
        patientName: 'Ramesh Kumar',
        prescriberName: 'Dr. A. Gupta',
        medicineName: 'Alprazolam 0.5mg',
        rxSchedule: 'h1',
        quantity: 10,
        dispensedByName: 'Priya Pharmacist',
        dispensedAt: new Date(),
      },
    ];

    const res = await as(pharmacist)
      .get('/h1-register/pdf')
      .expect(200);

    expect(res.headers['content-type']).toMatch(/application\/pdf/);
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="h1-register/);
    const magic = Buffer.isBuffer(res.body)
      ? res.body.toString('utf8', 0, 4)
      : String(res.text || '').slice(0, 4);
    expect(magic).toBe('%PDF');
  });
});
