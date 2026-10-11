/**
 * Checklist L9: death + birth certificate PDFs.
 *
 * Real HTTP through the real routers (appHarness); only models are stubbed.
 * Asserts the statutory PDF bytes actually come out the other end — a
 * handler-level test cannot tell whether the route ever set the headers.
 */
import { mountApp } from '../helpers/appHarness.js';

const deathRow = {
  _id: 'd1', hospitalId: 'h1', patientName: 'Ramesh Kumar',
  timeOfDeath: '2026-01-15T10:30:00Z', causeIcd10: 'I21.9',
  causeText: 'Acute myocardial infarction', mortuaryTagNo: 'TAG-77',
  certificateNo: 'DC-2026-001', certifiedBy: 'u9', releasedTo: 'Sunita Devi',
};

const birthRow = {
  _id: 'b1', hospitalId: 'h1', motherId: 'u5', weightKg: 3.2, sex: 'Female',
  timeOfBirth: '2026-02-01T04:10:00Z', deliveryType: 'Normal', certificateNo: 'BC-2026-042',
};

const { as: asMort } = await mountApp('mortuary', {
  '../../src/models/DeathRecord.js': () => ({
    default: {
      find: () => ({ sort: () => ({ limit: () => ({ lean: async () => [deathRow] }) }) }),
      findOne: async (filter) => (String(filter._id) === 'd1'
        && (!filter.hospitalId || filter.hospitalId === deathRow.hospitalId) ? deathRow : null),
    },
  }),
  '../../src/models/User.js': () => ({
    default: { findById: () => ({ select: async () => ({ name: 'Dr. Mehta' }) }) },
  }),
  '../../src/models/AuditLog.js': () => ({ default: { create: async () => ({}) } }),
});

const { as: asMat } = await mountApp('maternity', {
  '../../src/models/AntenatalRecord.js': () => ({ default: { find: () => ({ sort: async () => [] }) } }),
  '../../src/models/LabourRecord.js': () => ({ default: {} }),
  '../../src/models/BirthRecord.js': () => ({
    default: {
      findOne: async (filter) => (String(filter._id) === 'b1'
        && (!filter.hospitalId || filter.hospitalId === birthRow.hospitalId) ? birthRow : null),
    },
  }),
  '../../src/models/User.js': () => ({
    default: { findById: () => ({ select: async () => ({ name: 'Sunita Devi' }) }) },
  }),
  '../../src/models/Hospital.js': () => ({
    default: { findById: () => ({ select: async () => ({ name: 'FindMedi Hospital' }) }) },
  }),
  '../../src/models/AuditLog.js': () => ({ default: { create: async () => ({}) } }),
});

const staff = { _id: 'n1', id: 'n1', role: 'nurse', hospitalId: 'h1' };
const otherTenant = { _id: 'n2', id: 'n2', role: 'nurse', hospitalId: 'h2' };
const patient = { _id: 'p1', id: 'p1', role: 'patient', hospitalId: 'h1' };

describe('L9 statutory certificate PDFs', () => {
  test('death certificate renders a real PDF', async () => {
    const r = await asMort(staff).get('/deaths/d1/certificate');
    expect(r.status).toBe(200);
    expect(r.headers['content-type']).toContain('application/pdf');
    expect(r.headers['content-disposition']).toContain('death-certificate-DC-2026-001.pdf');
    expect(Buffer.byteLength(r.body)).toBeGreaterThan(500);
  });

  test('death certificate is tenant-scoped', async () => {
    const r = await asMort(otherTenant).get('/deaths/d1/certificate');
    expect(r.status).toBe(404);
  });

  test('death certificate is closed to patients', async () => {
    const r = await asMort(patient).get('/deaths/d1/certificate');
    expect(r.status).toBe(403);
  });

  test('birth certificate renders a real PDF', async () => {
    const r = await asMat({ _id: 'dr1', id: 'dr1', role: 'doctor', hospitalId: 'h1' })
      .get('/births/b1/certificate');
    expect(r.status).toBe(200);
    expect(r.headers['content-type']).toContain('application/pdf');
    expect(r.headers['content-disposition']).toContain('birth-certificate-BC-2026-042.pdf');
    expect(Buffer.byteLength(r.body)).toBeGreaterThan(500);
  });

  test('birth certificate requires authentication', async () => {
    const r = await asMat().get('/births/b1/certificate');
    expect(r.status).toBe(401);
  });
});