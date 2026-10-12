import { describe, it, expect } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';
import { verifySeal } from '../../src/lib/docSeal.js';

const mockPatients = [
  { _id: '507f191e810c19729de860ea', name: 'John Patient', role: 'patient' },
];

const mockRecords = [];
const mockAuditLogs = [];
const mockSignatures = [];

const { as } = await mountApp('certificates', {
  '../../src/models/User.js': () => ({
    default: {
      findById: (id) => ({
        select: () => {
          const u = mockPatients.find((p) => String(p._id) === String(id));
          return Promise.resolve(u || null);
        },
      }),
    },
  }),
  '../../src/models/Record.js': () => ({
    default: {
      create: async (data) => {
        const doc = {
          _id: '507f1f77bcf86cd79943901' + (mockRecords.length + 1),
          ...data,
          save: async () => doc,
          populate: async () => doc,
        };
        mockRecords.push(doc);
        return doc;
      },
      find: (filter) => query(mockRecords),
      countDocuments: async () => mockRecords.length,
      findOne: (filter) => query(mockRecords[0] || null),
      findById: (id) => ({
        populate: () => ({
          populate: () => Promise.resolve(mockRecords.find((r) => String(r._id) === String(id)) || null),
        }),
      }),
    },
  }),
  '../../src/models/SignatureEvent.js': () => ({
    default: {
      create: async (data) => {
        const row = { _id: '507f191e810c19729de860ee', ...data };
        mockSignatures.push(row);
        return row;
      },
      find: (filter) => query(mockSignatures),
    },
  }),
  '../../src/middleware/audit.js': () => ({
    auditLog: async (action, userId, meta) => {
      mockAuditLogs.push({ action, userId, meta });
      return {};
    },
  }),
});

describe('Certificates Integration API', () => {
  const doctor = {
    _id: '507f191e810c19729de860eb',
    id: '507f191e810c19729de860eb',
    name: 'Dr. House',
    role: 'doctor',
    doctorProfileId: '507f191e810c19729de860ec',
    hospitalId: '507f191e810c19729de860ed',
  };

  const otherHospitalDoctor = {
    _id: '507f191e810c19729de860e9',
    id: '507f191e810c19729de860e9',
    name: 'Dr. Stranger',
    role: 'doctor',
    doctorProfileId: '507f191e810c19729de860e8',
    hospitalId: '507f191e810c19729de86099', // Different hospital
  };

  const patient = {
    _id: '507f191e810c19729de860ea',
    id: '507f191e810c19729de860ea',
    name: 'John Patient',
    role: 'patient',
  };

  it('rejects unauthenticated requests with 401', async () => {
    await as().post('/').send({}).expect(401);
  });

  it('rejects certificate creation when target patient does not exist', async () => {
    await as(doctor)
      .post('/')
      .send({
        patientId: '507f191e810c19729de860ff', // non-existent
        title: 'Sick Leave',
      })
      .expect(404);
  });

  it('allows doctor to create a sick leave certificate with audit and verification code', async () => {
    const res = await as(doctor)
      .post('/')
      .send({
        patientId: '507f191e810c19729de860ea',
        type: 'sick_leave',
        title: 'Medical Rest Advice',
        diagnosis: 'Acute Viral Fever',
        daysRest: 3,
        validFrom: '2026-10-12',
        validTo: '2026-10-15',
        notes: 'Rest and hydration advised',
      })
      .expect(201);

    expect(res.body.certificate).toBeDefined();
    expect(res.body.certificate.type).toBe('medical_certificate');
    expect(res.body.certificate.data.certificateType).toBe('sick_leave');
    expect(res.body.certificate.data.verificationCode).toBeDefined();
    expect(res.body.certificate.data.verificationCode.length).toBe(8);

    const auditEntry = mockAuditLogs.find((a) => a.action === 'create_medical_certificate');
    expect(auditEntry).toBeDefined();
    expect(auditEntry.meta.certificateType).toBe('sick_leave');
    expect(String(auditEntry.userId)).toBe(String(doctor._id));
  });

  it('allows doctor to create fitness certificate', async () => {
    const res = await as(doctor)
      .post('/')
      .send({
        patientId: '507f191e810c19729de860ea',
        type: 'fitness',
        title: 'General Fitness Certificate',
        diagnosis: 'No active systemic illness detected',
        notes: 'Fit for normal physical duties',
      })
      .expect(201);

    expect(res.body.certificate.data.certificateType).toBe('fitness');
    const audit = mockAuditLogs.find((a) => a.meta?.certificateType === 'fitness');
    expect(audit).toBeDefined();
  });

  it('allows doctor to create referral letter certificate', async () => {
    const res = await as(doctor)
      .post('/')
      .send({
        patientId: '507f191e810c19729de860ea',
        type: 'referral',
        title: 'Cardiology Referral',
        diagnosis: 'Suspected Arrhythmia',
        notes: 'Referred for 24h Holter monitoring',
      })
      .expect(201);

    expect(res.body.certificate.data.certificateType).toBe('referral');
  });

  it('allows doctor to create immunization certificate', async () => {
    const res = await as(doctor)
      .post('/')
      .send({
        patientId: '507f191e810c19729de860ea',
        type: 'immunization',
        title: 'Hepatitis B Vaccination Certificate',
        notes: 'Completed 3-dose primary immunization series',
      })
      .expect(201);

    expect(res.body.certificate.data.certificateType).toBe('immunization');
  });

  it('allows patient to query own certificates', async () => {
    const res = await as(patient).get('/').expect(200);
    expect(res.body.data).toBeDefined();
  });

  it('returns 404 for non-existent certificate PDF', async () => {
    await as(doctor).get('/507f191e810c19729de86000/pdf').expect(404);
  });

  it('enforces cross-tenant isolation and blocks foreign hospital doctor from PDF with 403', async () => {
    const existingCert = mockRecords[0];
    expect(existingCert).toBeDefined();

    await as(otherHospitalDoctor)
      .get(`/${existingCert._id}/pdf`)
      .expect(403);

    const denyAudit = mockAuditLogs.find((a) => a.action === 'access_denied_medical_certificate');
    expect(denyAudit).toBeDefined();
  });

  it('generates sealed PDF with tamper-evident headers, verify URL, and SignatureEvent', async () => {
    const existingCert = mockRecords[0];
    expect(existingCert).toBeDefined();

    const res = await as(doctor)
      .get(`/${existingCert._id}/pdf`)
      .expect(200);

    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['x-doc-seal-nonce']).toBeDefined();
    expect(res.headers['x-doc-seal-signature']).toBeDefined();
    expect(res.headers['x-doc-seal-digest']).toBeDefined();
    expect(res.headers['x-doc-verify-url']).toContain(`/verify/doc/certificate/${existingCert._id}?nonce=`);

    // Verify cryptographic tamper seal integrity
    const valid = verifySeal({
      digest: res.headers['x-doc-seal-digest'],
      signature: res.headers['x-doc-seal-signature'],
      nonce: res.headers['x-doc-seal-nonce'],
    });
    expect(valid).toBe(true);

    // Verify invalid seal returns false
    const invalid = verifySeal({
      digest: res.headers['x-doc-seal-digest'],
      signature: res.headers['x-doc-seal-signature'],
      nonce: 'wrong-nonce',
    });
    expect(invalid).toBe(false);

    // Verify SignatureEvent was recorded
    const sig = mockSignatures.find((s) => String(s.docRef?.id) === String(existingCert._id));
    expect(sig).toBeDefined();
    expect(sig.docRef.kind).toBe('certificate');
    expect(sig.level).toBe('L2');
  });
});
