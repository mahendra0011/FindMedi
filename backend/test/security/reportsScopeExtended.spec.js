/**
 * ADM-B-01 / ADM-M-01 + DL-B-13 — reports import/export scope + export cap.
 *
 * Extends reportsExportSecurity.spec.js (untouched) with the still-open cases:
 *  - export row cap (5000) enforced on ALL four types, scoped + global
 *  - import without hospitalId is 403 for patients, doctors AND billing with
 *    zero writes
 *  - scoped imports land only inside the caller's hospital (doctors + billing)
 *  - getReportExportScope unit pins: superadmin global, scoped admin, null for
 *    tenant-less admin and non-admin roles
 */
import { jest } from '@jest/globals';
import { mountApp } from '../helpers/appHarness.js';
import { getReportExportScope, REPORT_EXPORT_ROW_CAP } from '../../src/routes/reports.js';

// 45s file-wide: every test re-imports the full route tree through
// mountFresh/jest.resetModules(); a contended worker (full suite + coverage)
// can blow jest's default 20s on a single re-import and flake the suite.
jest.setTimeout(45000);

const capturedLimits = [];
const model = (methods = {}) => ({ default: { find: jest.fn(), ...methods } });
const exportModels = ({ rows = [] } = {}) => {
  const find = jest.fn(() => ({
    limit: jest.fn((n) => {
      capturedLimits.push(n);
      return { lean: jest.fn().mockResolvedValue(rows) };
    }),
  }));
  const insertMany = jest.fn().mockImplementation(async (docs) => docs);
  const create = jest.fn().mockImplementation(async (doc) => doc);
  return {
    find, insertMany, create,
    modules: {
      '../../src/models/Report.js': () => model(),
      '../../src/models/Bed.js': () => model(),
      '../../src/models/Admission.js': () => model(),
      '../../src/models/Appointment.js': () => model({ find }),
      '../../src/models/Billing.js': () => model({ find, create }),
      '../../src/models/LabOrder.js': () => model(),
      '../../src/models/Medicine.js': () => model(),
      '../../src/models/Inventory.js': () => model(),
      '../../src/models/OperationTheatre.js': () => model(),
      '../../src/models/Staff.js': () => model(),
      '../../src/models/Patient.js': () => model({ find, insertMany }),
      '../../src/models/Doctor.js': () => model({ find, insertMany }),
    },
  };
};

const mountFresh = async (state) => {
  jest.resetModules();
  const mounted = await mountApp('reports', state.modules, { mountPath: '/api/reports' });
  mounted.app.use((err, _req, res, _next) => res.status(500).json({ message: err.message }));
  return mounted;
};

const csvBuf = (text) => Buffer.from(text, 'utf-8');
const ADMIN = (over = {}) => ({ id: 'admin-1', role: 'hospital_admin', ...over });

beforeEach(() => { capturedLimits.length = 0; });

describe('ADM-B-01 export cap on every type (seeded HTTP)', () => {
  it('caps all four export types at 5000 rows for a scoped admin', async () => {
    const state = exportModels({ rows: [] });
    const { as } = await mountFresh(state);
    for (const type of ['patients', 'doctors', 'billing', 'appointments']) {
      const res = await as(ADMIN({ hospitalId: 'hospital-1' })).get(`/api/reports/export/${type}?format=csv`);
      expect(res.status).toBe(200);
    }
    expect(capturedLimits).toEqual([5000, 5000, 5000, 5000]);
    expect(state.find).toHaveBeenCalledWith({ hospitalId: 'hospital-1' });
  });

  it('caps even the global superadmin export', async () => {
    const state = exportModels({ rows: [] });
    const { as } = await mountFresh(state);
    const res = await as({ id: 'root', role: 'superadmin' }).get('/api/reports/export/patients?format=csv');
    expect(res.status).toBe(200);
    expect(capturedLimits).toEqual([5000]);
    expect(state.find).toHaveBeenCalledWith({});
  });

  it('rejects an unknown export type without querying', async () => {
    const state = exportModels();
    const { as } = await mountFresh(state);
    const res = await as(ADMIN({ hospitalId: 'hospital-1' })).get('/api/reports/export/als?format=csv');
    expect(res.status).toBe(400);
    expect(state.find).not.toHaveBeenCalled();
  });

  it('pins the cap constant at 5000', () => {
    expect(REPORT_EXPORT_ROW_CAP).toBe(5000);
  });
});

describe('ADM-M-01 import scope on every writable type (seeded HTTP)', () => {
  it('rejects patients/doctors/billing imports for an admin without hospitalId before writing', async () => {
    const state = exportModels();
    const { as } = await mountFresh(state);
    for (const type of ['patients', 'doctors', 'billing']) {
      const res = await as(ADMIN())
        .post(`/api/reports/import/${type}`)
        .attach('file', csvBuf('"Name","Email","Phone"\n"A","a@example.test","1"'), { filename: 'data.csv', contentType: 'text/csv' });
      expect(res.status).toBe(403);
    }
    expect(state.insertMany).not.toHaveBeenCalled();
    expect(state.create).not.toHaveBeenCalled();
  });

  it('imports doctors only into the authenticated hospital', async () => {
    const state = exportModels();
    const { as } = await mountFresh(state);
    const res = await as(ADMIN({ hospitalId: 'hospital-9' }))
      .post('/api/reports/import/doctors')
      .attach('file', csvBuf('"Name","Specialization","Email"\n"Dr A","Cardiology","dra@example.test"'), { filename: 'doctors.csv', contentType: 'text/csv' });
    expect(res.status).toBe(200);
    expect(state.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({ name: 'Dr A', hospitalId: 'hospital-9' }),
    ]);
  });

  it('imports billing only into the authenticated hospital', async () => {
    const state = exportModels();
    const { as } = await mountFresh(state);
    const res = await as(ADMIN({ hospitalId: 'hospital-9' }))
      .post('/api/reports/import/billing')
      .attach('file', csvBuf('"Patient","Amount"\n"Pat A","500"'), { filename: 'billing.csv', contentType: 'text/csv' });
    expect(res.status).toBe(200);
    expect(state.create).toHaveBeenCalledWith(expect.objectContaining({ hospitalId: 'hospital-9' }));
  });

  it('rejects imports with no file', async () => {
    const state = exportModels();
    const { as } = await mountFresh(state);
    const res = await as(ADMIN({ hospitalId: 'hospital-1' })).post('/api/reports/import/patients');
    expect(res.status).toBe(400);
    expect(state.insertMany).not.toHaveBeenCalled();
  });
});

describe('ADM-B-01 getReportExportScope unit pins', () => {
  it('returns global scope for superadmin, tenant scope for linked admin, null otherwise', () => {
    expect(getReportExportScope({ role: 'superadmin' })).toEqual({});
    expect(getReportExportScope({ role: 'hospital_admin', hospitalId: 'h1' })).toEqual({ hospitalId: 'h1' });
    expect(getReportExportScope({ role: 'hospital_admin' })).toBeNull();
    expect(getReportExportScope({ role: 'doctor', hospitalId: 'h1' })).toBeNull();
    expect(getReportExportScope(null)).toBeNull();
  });
});
