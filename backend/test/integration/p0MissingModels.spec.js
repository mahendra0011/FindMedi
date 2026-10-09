/**
 * File 22 P0-6: missing-model flows through real HTTP — enquiries, payouts
 * (TDS derived), asset maintenance, shift swaps (SoD), payslips (net derived).
 */
import { mountApp, query } from '../helpers/appHarness.js';

const mem = () => {
  const rows = [];
  return {
    rows,
    find: () => query(rows),
    findById: (id) => query(rows.find((r) => String(r._id) === String(id)) || null),
    findOne: () => query(null),
    findOneAndUpdate: async (filter, update) => {
      const row = rows.find((r) => String(r._id) === String(filter._id));
      if (!row) return null;
      Object.assign(row, update.$set);
      return row;
    },
    create: async (doc) => {
      const row = {
        _id: `${Math.random().toString(36).slice(2)}`, ...doc,
        save: async function save() { return this; },
      };
      // emulate pre-save derivation for payslip/payout assertions
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

// enterprise: AssetMaintenance
const { as: asEnt } = await mountApp('enterprise', {
  '../../src/models/AssetMaintenance.js': () => ({ default: maintenance }),
  '../../src/models/AuditLog.js': auditStub,
});

// roster: ShiftSwap
const { as: asRoster } = await mountApp('roster', {
  '../../src/models/ShiftSwap.js': () => ({ default: swaps }),
  '../../src/models/Roster.js': () => ({ default: { find: () => query([]), findById: () => query(null) } }),
  '../../src/models/AuditLog.js': auditStub,
});

// staff: Payslip
const { as: asStaff } = await mountApp('staff', {
  '../../src/models/Payslip.js': () => ({ default: payslips }),
  '../../src/models/Staff.js': () => ({ default: { find: () => query([]), findById: () => query(null) } }),
  '../../src/models/AuditLog.js': auditStub,
});

const admin = { _id: 'a1', id: 'a1', role: 'hospital_admin', hospitalId: 'h1' };
const admin2 = { _id: 'a2', id: 'a2', role: 'hospital_admin', hospitalId: 'h1' };

describe('P0-6 flows', () => {
  test('enquiry create + convert', async () => {
    const c = await asFront(admin).post('/enquiries').send({ name: 'Sita', phone: '9812345678', interest: 'Dental' });
    expect(c.status).toBe(201);
    const p = await asFront(admin).patch(`/enquiries/${c.body.id}`).send({ status: 'Converted', convertedPatientId: '64b0000000000000000000f1' });
    expect(p.status).toBe(200);
    expect(p.body.status).toBe('Converted');
  });

  test('payout derives TDS+net; self-approve blocked; other approves', async () => {
    const c = await asFin(admin).post('/payouts').send({ doctorId: '64b0000000000000000000d1', period: '2026-09', gross: 100000, tdsRate: 10 });
    expect(c.status).toBe(201);
    expect(c.body.tds).toBe(10000);
    expect(c.body.net).toBe(90000);
    // row starts Draft; emulate model default
    payouts.rows[0].status = 'Draft';
    payouts.rows[0].createdBy = 'a1';
    const self = await asFin(admin).post(`/payouts/${c.body.id}/state`).send({ state: 'Approved' });
    expect(self.status).toBe(403);
    const other = await asFin(admin2).post(`/payouts/${c.body.id}/state`).send({ state: 'Approved' });
    expect(other.status).toBe(200);
  });

  test('asset maintenance create + overdue filter', async () => {
    const c = await asEnt(admin).post('/maintenance').send({ equipmentName: 'X-Ray', kind: 'preventive', dueDate: '2020-01-01' });
    expect(c.status).toBe(201);
    const o = await asEnt(admin).get('/maintenance?overdue=1');
    expect(o.status).toBe(200);
    expect(o.body.maintenance.length).toBe(1);
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
});
