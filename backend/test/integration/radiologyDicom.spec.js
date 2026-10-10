/**
 * File 22 P2-29: DICOM/PACS wiring + radiation dose log.
 * The DIMSE client itself lives in lib/dicom.js; this spec proves the ROUTE
 * degrades to 503/502 instead of hanging when the PACS is down, and that the
 * dose ledger aggregates per modality.
 */
import { mountApp, query } from '../helpers/appHarness.js';

const doses = [];
let pingOk = true;

const { as } = await mountApp('radiology', {
  '../../src/models/Radiology.js': () => ({
    default: { find: () => query([]), countDocuments: async () => 0, findOne: () => query(null) },
  }),
  '../../src/models/Notification.js': () => ({ default: { create: async () => ({}) } }),
  '../../src/models/User.js': () => ({ default: { find: () => query([]) } }),
  '../../src/models/DoseLog.js': () => ({
    default: {
      create: async (d) => { const r = { _id: `d${doses.length}`, ...d }; doses.push(r); return r; },
      find: (f) => {
        let rows = doses;
        if (f?.modality) rows = rows.filter((r) => r.modality === f.modality);
        if (f?.at?.$gte) rows = rows.filter((r) => new Date(r.at) >= f.at.$gte);
        if (f?.at?.$lte) rows = rows.filter((r) => new Date(r.at) <= f.at.$lte);
        return query(rows);
      },
    },
  }),
  '../../src/lib/dicom.js': () => ({
    DicomClient: class {
      async ping() { return pingOk; }
      async find() { return pingOk ? [{ studyUid: '1.2.3', modality: 'CT' }] : []; }
    },
  }),
  '../../src/middleware/audit.js': () => ({ auditLog: async () => ({}), scrubAuditDetails: (v) => v }),
});

const admin = { _id: 'a1', id: 'a1', role: 'hospital_admin', hospitalId: 'h1' };
const nurse = { _id: 'n1', id: 'n1', role: 'nurse', hospitalId: 'h1' };

describe('P2-29 DICOM + dose log', () => {
  beforeEach(() => { doses.length = 0; pingOk = true; });

  test('GET /dicom/ping is admin-only', async () => {
    const r = await as(nurse).get('/dicom/ping');
    expect(r.status).toBe(403);
  });

  test('GET /dicom/ping reports reachability', async () => {
    const r = await as(admin).get('/dicom/ping');
    expect(r.status).toBe(200);
    expect(r.body.reachable).toBe(true);
    pingOk = false;
    const down = await as(admin).get('/dicom/ping');
    expect(down.status).toBe(200);
    expect(down.body.reachable).toBe(false);
  });

  test('GET /dicom/worklist 503s when the PACS is down instead of hanging', async () => {
    pingOk = false;
    const r = await as(admin).get('/dicom/worklist');
    expect(r.status).toBe(503);
    expect(r.body.studies).toEqual([]);
  });

  test('GET /dicom/worklist returns studies when reachable', async () => {
    const r = await as(admin).get('/dicom/worklist');
    expect(r.status).toBe(200);
    expect(r.body.count).toBe(1);
    expect(r.body.studies[0].modality).toBe('CT');
  });

  test('POST /dose is admin-only and appends a row', async () => {
    const denied = await as(nurse).post('/dose').send({ modality: 'CT' });
    expect(denied.status).toBe(403);

    const r = await as(admin).post('/dose').send({
      orderId: 'RAD-1', modality: 'CT', bodyPart: 'Chest', dlpMgycm: 420, dapGycm2: 12.5, deviceAe: 'CT1',
    });
    expect(r.status).toBe(201);
    expect(r.body.id).toBeTruthy();
    expect(doses).toHaveLength(1);
    expect(doses[0].dlpMgycm).toBe(420);
  });

  test('POST /dose coerces garbage dose numbers to null, not NaN', async () => {
    const r = await as(admin).post('/dose').send({ modality: 'CR', dapGycm2: 'not-a-number' });
    expect(r.status).toBe(201);
    expect(doses[0].dapGycm2).toBeNull();
  });

  test('GET /dose aggregates counts and totals per modality', async () => {
    await as(admin).post('/dose').send({ modality: 'CT', dlpMgycm: 100, dapGycm2: 10 });
    await as(admin).post('/dose').send({ modality: 'CT', dlpMgycm: 200 });
    await as(admin).post('/dose').send({ modality: 'CR', dapGycm2: 5 });

    const r = await as(admin).get('/dose?modality=ct');
    expect(r.status).toBe(200);
    expect(r.body.count).toBe(2);
    expect(r.body.byModality.CT).toBe(2);
    expect(r.body.totals.dlpMgycm).toBe(300);
    expect(r.body.totals.dapGycm2).toBe(10);
  });
});
