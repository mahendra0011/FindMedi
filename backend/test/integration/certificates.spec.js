import { describe, it, expect } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const mockPatients = [
  { _id: '507f191e810c19729de860ea', name: 'John Patient', role: 'patient' },
];

const mockRecords = [];

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
          _id: '507f1f77bcf86cd799439011',
          ...data,
          populate: async () => doc,
        };
        mockRecords.push(doc);
        return doc;
      },
      find: (filter) => query(mockRecords),
      countDocuments: async () => mockRecords.length,
      findOne: (filter) => query(mockRecords[0] || null),
    },
  }),
  '../../src/middleware/audit.js': () => ({
    auditLog: async () => ({}),
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
  });

  it('allows patient to query own certificates', async () => {
    const res = await as(patient).get('/').expect(200);
    expect(res.body.data).toBeDefined();
  });
});
