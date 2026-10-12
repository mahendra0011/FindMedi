import { describe, it, expect } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const births = [
  {
    _id: '507f191e810c19729de860b1',
    hospitalId: '507f191e810c19729de860ed',
    motherId: '507f191e810c19729de860ea',
    sex: 'Female',
    weightKg: 3.2,
    timeOfBirth: new Date('2026-10-10T08:30:00.000Z'),
    deliveryType: 'Normal Vaginal',
    certificateNo: 'BC-2026-0001',
    toObject: function () { return this; },
  },
];

const { as } = await mountApp('maternity', {
  '../../src/models/BirthRecord.js': () => ({
    default: {
      findOne: (filter) => query(births[0]),
      find: (filter) => query(births),
      create: async (data) => ({ _id: '507f191e810c19729de860b2', ...data }),
    },
  }),
  '../../src/models/AntenatalRecord.js': () => ({
    default: {
      create: async () => ({ _id: 'anc1' }),
      updateOne: async () => ({}),
    },
  }),
  '../../src/models/LabourRecord.js': () => ({
    default: {
      create: async () => ({ _id: 'lab1' }),
      findById: async () => ({
        _id: 'lab1',
        patientId: '507f191e810c19729de860ea',
        hospitalId: '507f191e810c19729de860ed',
        save: async () => ({}),
      }),
    },
  }),
  '../../src/middleware/audit.js': () => ({
    auditLog: async () => ({}),
  }),
  '../../src/services/pdfService.js': () => ({
    generateBirthCertificatePDF: async () => Buffer.from('%PDF-1.4 Mock Birth Certificate PDF Stream'),
  }),
});

describe('Maternity & Statutory Birth Certificate Integration', () => {
  const doctor = {
    _id: '507f191e810c19729de860eb',
    id: '507f191e810c19729de860eb',
    role: 'doctor',
    hospitalId: '507f191e810c19729de860ed',
  };

  const patient = {
    _id: '507f191e810c19729de860ea',
    id: '507f191e810c19729de860ea',
    role: 'patient',
  };

  it('generates downloadable PDF for birth certificate', async () => {
    const res = await as(doctor)
      .get('/births/507f191e810c19729de860b1/certificate')
      .expect(200);

    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toContain('attachment');
  });

  it('rejects non-clinical staff for birth certificate route', async () => {
    await as(patient)
      .get('/births/507f191e810c19729de860b1/certificate')
      .expect(403);
  });

  it('exports CRS CSV records for civil registrar registry', async () => {
    const res = await as(doctor)
      .get('/crs-export')
      .expect(200);

    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('BirthRecordId,CertificateNo,Sex,WeightKg,TimeOfBirth');
    expect(res.text).toContain('BC-2026-0001');
  });
});
