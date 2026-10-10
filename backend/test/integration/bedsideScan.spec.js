/**
 * File 22 P2-32: bedside barcode lookup (nursing /scan).
 * Read-only by design: a scan resolves an entity but never mutates state.
 */
import { mountApp, query } from '../helpers/appHarness.js';

const orders = [
  {
    orderId: 'LAB-1', accessionNo: 'ACC001', patientId: 'p1', patientName: 'Ram',
    status: 'In Process',
    tests: [{ testName: 'CBC', sampleId: 'SMP-1' }, { testName: 'LFT', sampleId: 'SMP-2' }],
  },
];
const units = [{ unitId: 'BU-77', bloodGroup: 'O+', status: 'Available', expiryDate: '2026-12-01' }];
const admissions = [
  { _id: 'adm1', patientId: 'p1', patientName: 'Ram', bedId: 'b9', wardId: 'w2', status: 'Admitted' },
];

const { as } = await mountApp('nursing', {
  '../../src/models/NursingChart.js': () => ({
    default: { find: () => query([]), countDocuments: async () => 0, create: async (d) => ({ _id: 'c1', ...d }) },
  }),
  '../../src/models/Admission.js': () => ({
    default: {
      find: () => query([]),
      countDocuments: async () => 0,
      findOne: (f) => {
        const or = f?.$or || [];
        const row = admissions.find((a) => or.some((c) => c.patientId === a.patientId || c._id === String(a._id)));
        return query(row || null);
      },
    },
  }),
  '../../src/models/LabOrder.js': () => ({
    default: {
      findOne: (f) => {
        const or = f?.$or || [];
        const row = orders.find((o) => or.some((c) => c.accessionNo === o.accessionNo
          || c.orderId === o.orderId
          || (c['tests.sampleId'] && o.tests.some((t) => t.sampleId === c['tests.sampleId']))));
        return query(row || null);
      },
    },
  }),
  '../../src/models/BloodBank.js': () => ({
    BloodUnit: { findOne: (f) => query(units.find((u) => u.unitId === f.unitId) || null) },
  }),
  '../../src/middleware/audit.js': () => ({ auditLog: async () => ({}), scrubAuditDetails: (v) => v }),
});

const nurse = { _id: 'n1', id: 'n1', role: 'nurse', hospitalId: 'h1' };

describe('P2-32 bedside scan', () => {
  test('rejects an unknown kind', async () => {
    const r = await as(nurse).post('/scan').send({ kind: 'weird', code: 'X' });
    expect(r.status).toBe(400);
  });

  test('rejects an empty code', async () => {
    const r = await as(nurse).post('/scan').send({ kind: 'sample', code: '   ' });
    expect(r.status).toBe(400);
  });

  test('unauthenticated caller is refused', async () => {
    const r = await as(null).post('/scan').send({ kind: 'sample', code: 'ACC001' });
    expect(r.status).toBe(401);
  });

  test('resolves a lab sample by accession number', async () => {
    const r = await as(nurse).post('/scan').send({ kind: 'sample', code: 'ACC001' });
    expect(r.status).toBe(200);
    expect(r.body.found).toBe(true);
    expect(r.body.entity.orderId).toBe('LAB-1');
    expect(r.body.entity.patientName).toBe('Ram');
  });

  test('resolves a lab sample by sample id', async () => {
    const r = await as(nurse).post('/scan').send({ kind: 'sample', code: 'SMP-2' });
    expect(r.status).toBe(200);
    expect(r.body.entity.test).toBe('LFT');
    expect(r.body.entity.sampleId).toBe('SMP-2');
  });

  test('404s on an unknown sample', async () => {
    const r = await as(nurse).post('/scan').send({ kind: 'sample', code: 'NOPE' });
    expect(r.status).toBe(404);
  });

  test('resolves a blood unit by unit id', async () => {
    const r = await as(nurse).post('/scan').send({ kind: 'blood', code: 'BU-77' });
    expect(r.status).toBe(200);
    expect(r.body.entity.bloodGroup).toBe('O+');
    expect(r.body.entity.status).toBe('Available');
  });

  test('404s on an unknown blood unit', async () => {
    const r = await as(nurse).post('/scan').send({ kind: 'blood', code: 'BU-00' });
    expect(r.status).toBe(404);
  });

  test('resolves an admitted patient for the MAR view', async () => {
    const r = await as(nurse).post('/scan').send({ kind: 'mar', code: 'p1' });
    expect(r.status).toBe(200);
    expect(r.body.entity.admissionId).toBe('adm1');
    expect(r.body.entity.bedId).toBe('b9');
  });

  test('404s when no admission matches the MAR card', async () => {
    const r = await as(nurse).post('/scan').send({ kind: 'mar', code: 'nobody' });
    expect(r.status).toBe(404);
  });
});
