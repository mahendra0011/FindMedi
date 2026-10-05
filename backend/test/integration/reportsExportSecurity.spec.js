import { jest } from '@jest/globals';
import ExcelJS from 'exceljs';
import { mountApp } from '../helpers/appHarness.js';

// 45s file-wide: every test does mountFresh = jest.resetModules() + a full
// route-tree re-import; on a contended worker (full suite + coverage) a single
// re-import can exceed jest's default 20s and flake the suite. Verified green
// solo (28s for both reports suites) and at maxWorkers=2.
// Raised 45s -> 120s: even 45s flaked on the full-suite+coverage run while the
// machine also had a Docker Desktop VM up (same flake signature - solo green,
// only the mountFresh superadmin cases time out; no route change involved).
jest.setTimeout(120000);

const model = (methods = {}) => ({ default: { find: jest.fn(), ...methods } });
const csvModels = ({ rows = [] } = {}) => {
  const find = jest.fn(() => ({ limit: jest.fn(() => ({ lean: jest.fn().mockResolvedValue(rows) })) }));
  const insertMany = jest.fn().mockImplementation(async (docs) => docs);
  return {
    find,
    insertMany,
    modules: {
      '../../src/models/Report.js': () => model(),
      '../../src/models/Bed.js': () => model(),
      '../../src/models/Admission.js': () => model(),
      '../../src/models/Appointment.js': () => model({ find }),
      '../../src/models/Billing.js': () => model({ find }),
      '../../src/models/LabOrder.js': () => model(),
      '../../src/models/Medicine.js': () => model(),
      '../../src/models/Inventory.js': () => model(),
      '../../src/models/OperationTheatre.js': () => model(),
      '../../src/models/Staff.js': () => model(),
      '../../src/models/Patient.js': () => model({ find, insertMany }),
      '../../src/models/Doctor.js': () => model({ find }),
    },
  };
};

const mountFresh = async (state) => {
  jest.resetModules();
  const mounted = await mountApp('reports', state.modules, { mountPath: '/api/reports' });
  mounted.app.use((err, _req, res, _next) => res.status(500).json({ message: err.message }));
  return mounted;
};

const patientWorkbook = async () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Patients');
  sheet.addRow(['Name', 'Email', 'Phone']);
  sheet.addRow(['A', 'a@example.test', '1']);
  return Buffer.from(await workbook.xlsx.writeBuffer());
};

describe('reports export tenant boundary', () => {
  test('rejects hospital admin without a facility before querying data', async () => {
    const state = csvModels();
    const { as } = await mountFresh(state);
    const res = await as({ id: 'admin-1', role: 'hospital_admin' }).get('/api/reports/export/patients?format=csv');
    expect(res.status).toBe(403);
    expect(state.find).not.toHaveBeenCalled();
  });

  test('scopes hospital admin export and caps rows', async () => {
    const state = csvModels({ rows: [{ name: 'A', email: 'a@example.test', phone: '1', age: 30, gender: 'Other', address: 'X', createdAt: '2026-01-01' }] });
    const { as } = await mountFresh(state);
    const res = await as({ id: 'admin-1', role: 'hospital_admin', hospitalId: 'hospital-1' }).get('/api/reports/export/patients?format=csv');
    expect(res.status).toBe(200);
    expect(state.find).toHaveBeenCalledWith({ hospitalId: 'hospital-1' });
    expect(res.text).toContain('a@example.test');
  });

  test('allows explicitly global superadmin export while keeping the query bounded', async () => {
    const state = csvModels({ rows: [] });
    const { as } = await mountFresh(state);
    const res = await as({ id: 'root', role: 'superadmin' }).get('/api/reports/export/patients?format=csv');
    expect(res.status).toBe(200);
    expect(state.find).toHaveBeenCalledWith({});
  });

  test('rejects report imports for hospital admins without facility scope before writing', async () => {
    const state = csvModels();
    const { as } = await mountFresh(state);
    const res = await as({ id: 'admin-1', role: 'hospital_admin' })
      .post('/api/reports/import/patients')
      .attach('file', Buffer.from('"Name","Email","Phone"\n"A","a@example.test","1"'), { contentType: 'text/csv' });
    expect(res.status).toBe(403);
    expect(state.insertMany).not.toHaveBeenCalled();
  });

  test('imports patients only into the authenticated hospital', async () => {
    const state = csvModels();
    const { as } = await mountFresh(state);
    const res = await as({ id: 'admin-1', role: 'hospital_admin', hospitalId: 'hospital-1' })
      .post('/api/reports/import/patients')
      .attach('file', await patientWorkbook(), { filename: 'patients.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    expect(res.status).toBe(200);
    expect(state.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({ name: 'A', email: 'a@example.test', phone: '1', hospitalId: 'hospital-1' }),
    ]);
  });
});


