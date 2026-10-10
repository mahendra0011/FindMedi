/**
 * File 22 P0-6: missing-model flows through real HTTP — enquiries, payouts
 * (TDS derived), asset maintenance, shift swaps (SoD), payslips (net derived).
 * Full CRUD + approve transitions + tenant isolation (foreign id -> 404).
 */
import { mountApp, query } from '../helpers/appHarness.js';

const mem = () => {
  const rows = [];
  const matchOne = (filter = {}) => rows.find((r) => (filter._id === undefined || String(r._id) === String(filter._id))
    && (!filter.hospitalId || String(r.hospitalId) === String(filter.hospitalId))
    && (filter.staffId === undefined || String(r.staffId) === String(filter.staffId))
    && (filter.userId === undefined || String(r.userId) === String(filter.userId)));
  const matchAll = (filter = {}) => rows.filter((r) => (!filter?.hospitalId || String(r.hospitalId) === String(filter.hospitalId))
    && (filter?.staffId === undefined || String(r.staffId) === String(filter.staffId))
    && (filter?.userId === undefined || String(r.userId) === String(filter.userId)));
  return {
    rows,
    find: (filter = {}) => query(matchAll(filter)),
    findById: (id) => query(rows.find((r) => String(r._id) === String(id)) || null),
    findOne: (filter = {}) => query(matchOne(filter) || null),
    findOneAndUpdate: async (filter, update) => {
      const row = matchOne(filter);
      if (!row) return null;
      Object.assign(row, update.$set);
      return row;
    },
    findOneAndDelete: async (filter) => {
      const row = matchOne(filter);
      if (!row) return null;
      rows.splice(rows.indexOf(row), 1);
      return row;
    },
    deleteOne: async (filter) => {
      const row = matchOne(filter);
      if (!row) return { deletedCount: 0 };
      rows.splice(rows.indexOf(row), 1);
      return { deletedCount: 1 };
    },
    create: async (doc) => {
      const row = {
        _id: `${Math.random().toString(36).slice(2)}`, status: 'Draft', ...doc,
        save: async function save() { return this; },
      };
      if (doc.earnings) {
        const e = doc.earnings, d = doc.deductions || {};
        row.gross = (e.basic || 0) + (e.hra || 0) + (e.allowances || 0) + (e.overtime || 0);
        row.totalDeductions = (d.pf || 0) + (d.esi || 0) + (d.pt || 0) + (d.tds || 0) + (d.advances || 0);
        row.net = row.gross - row.totalDeductions;
      }
      if (doc.gross != null && doc.tdsRate != null) {
        row.tds = +(doc.gross * doc.tdsRate / 100).toFixed(2);
        row.net = +(doc.gross - row.tds - (doc.otherDeductions || 0)).toFixed(2);
      }
      rows.push(row);
      return row;
    },
  };
};

const enquiries = mem();
const payouts = mem();
const maintenance = mem();
const swaps = mem();
const payslips = mem();
const staffDirectory = mem();
staffDirectory.rows.push({ _id: 'st9', userId: 'u-staff-1', hospitalId: 'h1' });

const auditStub = () => ({ default: { create: async () => ({}) } });

// frontoffice: Enquiry + AuditLog
const { as: asFront } = await mountApp('frontoffice', {
  '../../src/models/Enquiry.js': () => ({ default: enquiries }),
  '../../src/models/AuditLog.js': auditStub,
});

// finance: PayoutStatement (+ existing statics load real — untouched paths)
const { as: asFin } = await mountApp('finance', {
  '../../src/models/PayoutStatement.js': () => ({ default: payouts }),
  '../../src/models/AuditLog.js': auditStub,
});

// payoutStatements: complete CRUD + approve/pay over the same model
const { as: asPayout } = await mountApp('payoutStatements', {
  '../../src/models/PayoutStatement.js': () => ({ default: payouts }),
  '../../src/models/AuditLog.js': auditStub,
});

// enterprise: AssetMaintenance
const { as: asEnt } = await mountApp('enterprise', {
  '../../src/models/AssetMaintenance.js': () => ({ default: maintenance }),
  '../../src/models/AuditLog.js': auditStub,
});

// roster: ShiftSwap
const { as: asRoster } = await mountApp('roster', {
  '../../src/models/ShiftSwap.js': () => ({ default: swaps }),
  '../../src/models/Roster.js': () => ({ default: { find: () => query([]), findById: () => query(null), findOne: () => query(null) } }),
  '../../src/models/AuditLog.js': auditStub,
});

// staff: Payslip
const { as: asStaff } = await mountApp('staff', {
  '../../src/models/Payslip.js': () => ({ default: payslips }),
  '../../src/models/Staff.js': () => ({ default: staffDirectory }),
  '../../src/models/Billing.js': () => ({ default: { find: () => query([]) } }),
  '../../src/models/Notification.js': () => ({ default: { create: async () => ({}) } }),
  '../../src/models/AuditLog.js': auditStub,
});

const admin = { _id: 'a1', id: 'a1', role: 'hospital_admin', hospitalId: 'h1' };
const admin2 = { _id: 'a2', id: 'a2', role: 'hospital_admin', hospitalId: 'h1' };
const otherHospitalAdmin = { _id: 'b1', id: 'b1', role: 'hospital_admin', hospitalId: 'h2' };

describe('P0-6 flows', () => {
  test('enquiry create + convert', async () => {
    const c = await asFront(admin).post('/enquiries').send({ name: 'Sita', phone: '9812345678', interest: 'Dental' });
    expect(c.status).toBe(201);
    const p = await asFront(admin).patch(`/enquiries/${c.body.id}`).send({ status: 'Converted', convertedPatientId: '64b0000000000000000000f1' });
    expect(p.status).toBe(200);
    expect(p.body.status).toBe('Converted');
  });

  test('enquiry get-by-id, delete, and tenant isolation', async () => {
    const c = await asFront(admin).post('/enquiries').send({ name: 'Gita', phone: '9833333333' });
    const g = await asFront(admin).get(`/enquiries/${c.body.id}`);
    expect(g.status).toBe(200);
    expect(g.body.name).toBe('Gita');
    const foreign = await asFront(otherHospitalAdmin).get(`/enquiries/${c.body.id}`);
    expect(foreign.status).toBe(404);
    const foreignDel = await asFront(otherHospitalAdmin).delete(`/enquiries/${c.body.id}`);
    expect(foreignDel.status).toBe(404);
    const d = await asFront(admin).delete(`/enquiries/${c.body.id}`);
    expect(d.status).toBe(200);
    expect(enquiries.rows.find((r) => r._id === c.body.id)).toBeUndefined();
  });

  test('payout derives TDS+net; self-approve blocked; other approves', async () => {
    const c = await asFin(admin).post('/payouts').send({ doctorId: '64b0000000000000000000d1', period: '2026-09', gross: 100000, tdsRate: 10 });
    expect(c.status).toBe(201);
    expect(c.body.tds).toBe(10000);
    expect(c.body.net).toBe(90000);
    payouts.rows[0].status = 'Draft';
    payouts.rows[0].createdBy = 'a1';
    const self = await asFin(admin).post(`/payouts/${c.body.id}/state`).send({ state: 'Approved' });
    expect(self.status).toBe(403);
    const other = await asFin(admin2).post(`/payouts/${c.body.id}/state`).send({ state: 'Approved' });
    expect(other.status).toBe(200);
  });

  test('payoutStatements router: get, approve/pay transitions, draft-only delete', async () => {
    const c = await asPayout(admin).post('/').send({ doctorId: '64b0000000000000000000d2', period: '2026-10', gross: 50000, tdsRate: 10 });
    expect(c.status).toBe(201);
    expect(c.body.net).toBe(45000);
    const g = await asPayout(admin).get(`/${c.body.id}`);
    expect(g.status).toBe(200);
    expect(g.body.period).toBe('2026-10');
    const self = await asPayout(admin).post(`/${c.body.id}/approve`).send({});
    expect(self.status).toBe(403);
    const approved = await asPayout(admin2).post(`/${c.body.id}/approve`).send({});
    expect(approved.status).toBe(200);
    expect(approved.body.status).toBe('Approved');
    const paid = await asPayout(admin2).post(`/${c.body.id}/pay`).send({});
    expect(paid.status).toBe(200);
    expect(paid.body.status).toBe('Paid');
    const del = await asPayout(admin).delete(`/${c.body.id}`);
    expect(del.status).toBe(409);
  });

  test('payoutStatements delete removes a Draft; foreign tenant 404s', async () => {
    const c = await asPayout(admin).post('/').send({ doctorId: '64b0000000000000000000d3', period: '2026-08', gross: 20000, tdsRate: 10 });
    const foreign = await asPayout(otherHospitalAdmin).get(`/${c.body.id}`);
    expect(foreign.status).toBe(404);
    const foreignApprove = await asPayout(otherHospitalAdmin).post(`/${c.body.id}/approve`).send({});
    expect(foreignApprove.status).toBe(404);
    const d = await asPayout(admin).delete(`/${c.body.id}`);
    expect(d.status).toBe(200);
    expect(payouts.rows.find((r) => r._id === c.body.id)).toBeUndefined();
  });

  test('asset maintenance create + overdue filter', async () => {
    const c = await asEnt(admin).post('/maintenance').send({ equipmentName: 'X-Ray', kind: 'preventive', dueDate: '2020-01-01' });
    expect(c.status).toBe(201);
    const o = await asEnt(admin).get('/maintenance?overdue=1');
    expect(o.status).toBe(200);
    expect(o.body.maintenance.length).toBe(1);
  });

  test('asset maintenance get-by-id, done rows refuse delete, drafts delete', async () => {
    const c = await asEnt(admin).post('/maintenance').send({ equipmentName: 'Ventilator', kind: 'calibration' });
    const g = await asEnt(admin).get(`/maintenance/${c.body.id}`);
    expect(g.status).toBe(200);
    expect(g.body.equipmentName).toBe('Ventilator');
    const foreign = await asEnt(otherHospitalAdmin).get(`/maintenance/${c.body.id}`);
    expect(foreign.status).toBe(404);
    const done = await asEnt(admin).patch(`/maintenance/${c.body.id}`).send({ status: 'Done' });
    expect(done.status).toBe(200);
    const delDone = await asEnt(admin).delete(`/maintenance/${c.body.id}`);
    expect(delDone.status).toBe(409);
    const sched = await asEnt(admin).post('/maintenance').send({ equipmentName: 'Autoclave', kind: 'repair' });
    const del = await asEnt(admin).delete(`/maintenance/${sched.body.id}`);
    expect(del.status).toBe(200);
  });

  test('shift swap request + SoD decide', async () => {
    const s1 = '64b0000000000000000000s1';
    const s2 = '64b0000000000000000000s2';
    const c = await asRoster(admin).post('/swaps').send({ fromStaffId: s1, toStaffId: s2, shiftDate: '2026-10-20' });
    expect(c.status).toBe(201);
    swaps.rows[0].status = 'Pending';
    swaps.rows[0].createdBy = 'a1';
    const self = await asRoster(admin).post(`/swaps/${c.body.id}/decide`).send({ decision: 'Approved' });
    expect(self.status).toBe(403);
    const other = await asRoster(admin2).post(`/swaps/${c.body.id}/decide`).send({ decision: 'Approved' });
    expect(other.status).toBe(200);
  });

  test('shift swap get, withdraw pending, decided swaps refuse delete, tenant 404', async () => {
    const c = await asRoster(admin).post('/swaps').send({ fromStaffId: '64b0000000000000000000s3', toStaffId: '64b0000000000000000000s4', shiftDate: '2026-10-21' });
    swaps.rows.find((r) => r._id === c.body.id).status = 'Pending';
    const g = await asRoster(admin).get(`/swaps/${c.body.id}`);
    expect(g.status).toBe(200);
    const foreign = await asRoster(otherHospitalAdmin).get(`/swaps/${c.body.id}`);
    expect(foreign.status).toBe(404);
    const foreignDel = await asRoster(otherHospitalAdmin).delete(`/swaps/${c.body.id}`);
    expect(foreignDel.status).toBe(404);
    const d = await asRoster(admin).delete(`/swaps/${c.body.id}`);
    expect(d.status).toBe(200);
    const decided = await asRoster(admin).post('/swaps').send({ fromStaffId: '64b0000000000000000000s5', toStaffId: '64b0000000000000000000s6', shiftDate: '2026-10-22' });
    swaps.rows.find((r) => r._id === decided.body.id).status = 'Approved';
    const delDecided = await asRoster(admin).delete(`/swaps/${decided.body.id}`);
    expect(delDecided.status).toBe(409);
  });

  test('payslip derives gross/net; self-release blocked', async () => {
    const c = await asStaff(admin).post('/payslips').send({
      staffId: '64b0000000000000000000e1', month: '2026-09',
      earnings: { basic: 40000, hra: 16000 }, deductions: { pf: 1800, tds: 2000 },
    });
    expect(c.status).toBe(201);
    expect(c.body.gross).toBe(56000);
    expect(c.body.net).toBe(52200);
    payslips.rows[0].status = 'Draft';
    payslips.rows[0].createdBy = 'a1';
    const self = await asStaff(admin).post(`/payslips/${c.body.id}/release`).send({});
    expect(self.status).toBe(403);
    const other = await asStaff(admin2).post(`/payslips/${c.body.id}/release`).send({});
    expect(other.status).toBe(200);
  });

  test('payslip get-by-id, mine self-service, draft-only delete, tenant isolation', async () => {
    const created = await asStaff(admin).post('/payslips').send({
      staffId: 'st9', month: '2026-10', earnings: { basic: 30000 }, deductions: {},
    });
    expect(created.status).toBe(201);
    const g = await asStaff(admin).get(`/payslips/${created.body.id}`);
    expect(g.status).toBe(200);
    expect(g.body.net).toBe(30000);
    const foreign = await asStaff(otherHospitalAdmin).get(`/payslips/${created.body.id}`);
    expect(foreign.status).toBe(404);
    const staffUser = { _id: 'u-staff-1', id: 'u-staff-1', role: 'ward_nurse', hospitalId: 'h1' };
    const mine = await asStaff(staffUser).get('/payslips/mine');
    expect(mine.status).toBe(200);
    expect(mine.body.payslips.length).toBe(1);
    expect(mine.body.payslips[0].month).toBe('2026-10');
    const delReleased = await asStaff(admin).delete(`/payslips/${payslips.rows[0]._id}`);
    expect(delReleased.status).toBe(409);
    const del = await asStaff(admin).delete(`/payslips/${created.body.id}`);
    expect(del.status).toBe(200);
    expect(payslips.rows.find((r) => r._id === created.body.id)).toBeUndefined();
  });
});
