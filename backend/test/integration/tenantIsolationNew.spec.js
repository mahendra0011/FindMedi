import { describe, it, expect } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

// Setup Mock Entities with strict Hospital Isolation
const hospitalA = '507f191e810c19729de8600a';
const hospitalB = '507f191e810c19729de8600b';

const mockAssets = [
  { _id: '507f191e810c19729de860a1', hospitalId: hospitalA, equipmentName: 'Ventilator A', status: 'OPERATIONAL' },
  { _id: '507f191e810c19729de860a2', hospitalId: hospitalB, equipmentName: 'Ventilator B', status: 'OPERATIONAL' },
];

const mockBags = [
  { _id: '507f191e810c19729de860b1', hospitalId: hospitalA, colorCategory: 'YELLOW', weightKg: 2 },
  { _id: '507f191e810c19729de860b2', hospitalId: hospitalB, colorCategory: 'RED', weightKg: 4 },
];

const mockJobs = [
  { _id: '507f191e810c19729de860c1', hospitalId: hospitalA, title: 'Staff Nurse Hospital A', department: 'ICU' },
  { _id: '507f191e810c19729de860c2', hospitalId: hospitalB, title: 'Staff Nurse Hospital B', department: 'NICU' },
];

const mockItems = [
  { _id: '507f191e810c19729de860d1', hospitalId: hospitalA, name: 'Hospital A Thali', category: 'Lunch', isAvailable: true },
  { _id: '507f191e810c19729de860d2', hospitalId: hospitalB, name: 'Hospital B Special', category: 'Dinner', isAvailable: true },
];

const mockVehicles = [
  { _id: '507f191e810c19729de860e1', hospitalId: hospitalA, vehicleNumber: 'MH-01-A1', paymentStatus: 'ACTIVE_PARKED' },
  { _id: '507f191e810c19729de860e2', hospitalId: hospitalB, vehicleNumber: 'MH-02-B1', paymentStatus: 'ACTIVE_PARKED' },
];

const mockPackages = [
  { _id: '507f191e810c19729de860f1', hospitalId: hospitalA, name: 'Cardiac Checkup Hospital A', price: 4999 },
  { _id: '507f191e810c19729de860f2', hospitalId: hospitalB, name: 'Executive Checkup Hospital B', price: 7999 },
];

const mockEncounters = [
  { _id: '507f191e810c19729de86101', hospitalId: hospitalA, patient: 'Patient A', status: 'In-Consultation' },
  { _id: '507f191e810c19729de86102', hospitalId: hospitalB, patient: 'Patient B', status: 'Waiting' },
];

const mockCerts = [
  { _id: '507f191e810c19729de86111', hospitalId: hospitalA, type: 'medical_certificate', title: 'Cert A' },
  { _id: '507f191e810c19729de86112', hospitalId: hospitalB, type: 'medical_certificate', title: 'Cert B' },
];

const mockOrders = [
  {
    _id: '507f191e810c19729de86121',
    hospitalId: hospitalA,
    orderId: 'RAD-001',
    modality: 'CT',
    bodyPart: 'Chest',
    save: async function () { return this; },
  },
];

const { as: asBiomedical } = await mountApp('biomedical', {
  '../../src/models/BiomedicalAsset.js': () => ({
    default: {
      find: (filter) => query(mockAssets.filter((a) => !filter.hospitalId || String(a.hospitalId) === String(filter.hospitalId))),
    },
  }),
});

const { as: asBmw } = await mountApp('bmw', {
  '../../src/models/BmwBag.js': () => ({
    default: {
      find: (filter) => ({
        populate: () => ({
          sort: () => ({
            limit: () => ({
              lean: async () => mockBags.filter((b) => !filter.hospitalId || String(b.hospitalId) === String(filter.hospitalId)),
            }),
          }),
        }),
      }),
    },
    BMW_COLOR_CATEGORIES: ['YELLOW', 'RED', 'WHITE', 'BLUE'],
  }),
});

const { as: asRecruitment } = await mountApp('recruitment', {
  '../../src/models/JobOpening.js': () => ({
    default: {
      find: (filter) => query(mockJobs.filter((j) => !filter.hospitalId || String(j.hospitalId) === String(filter.hospitalId))),
    },
  }),
});

const { as: asCanteen } = await mountApp('canteen', {
  '../../src/models/CanteenItem.js': () => ({
    default: {
      find: (filter) => query(mockItems.filter((m) => !filter.hospitalId || String(m.hospitalId) === String(filter.hospitalId))),
    },
  }),
});

const { as: asParking } = await mountApp('parking', {
  '../../src/models/ParkingTransaction.js': () => ({
    default: {
      find: (filter) => query(mockVehicles.filter((s) => !filter.hospitalId || String(s.hospitalId) === String(filter.hospitalId))),
    },
    VEHICLE_TYPES: ['TWO_WHEELER', 'FOUR_WHEELER', 'AMBULANCE', 'VIP_GOVT', 'COMMERCIAL'],
  }),
});

const { as: asPackages } = await mountApp('clinicPackages', {
  '../../src/models/ClinicPackage.js': () => ({
    default: {
      find: (filter) => ({
        lean: async () => mockPackages.filter((p) => !filter.hospitalId || String(p.hospitalId) === String(filter.hospitalId)),
      }),
    },
  }),
});

const { as: asEncounters } = await mountApp('encounters', {
  '../../src/models/Encounter.js': () => ({
    default: {
      find: (filter) => query(mockEncounters.filter((e) => !filter.hospitalId || String(e.hospitalId) === String(filter.hospitalId))),
    },
  }),
});

const { as: asBiometric } = await mountApp('biometric', {});

const { as: asCertificates } = await mountApp('certificates', {
  '../../src/models/Record.js': () => ({
    default: {
      find: (filter) => query(mockCerts.filter((c) => !filter.hospitalId || String(c.hospitalId) === String(filter.hospitalId))),
      countDocuments: async (filter) => mockCerts.filter((c) => !filter.hospitalId || String(c.hospitalId) === String(filter.hospitalId)).length,
    },
  }),
});

const { as: asRadiology } = await mountApp('radiology', {
  '../../src/models/Radiology.js': () => ({
    default: {
      findById: async (id) => mockOrders.find((o) => String(o._id) === String(id)) || null,
    },
  }),
});

describe('Multi-Tenant Isolation Matrix for New Modules', () => {
  const adminHospitalA = {
    _id: '507f191e810c19729de86011',
    id: '507f191e810c19729de86011',
    role: 'hospital_admin',
    hospitalId: hospitalA,
    permissions: [
      'inventory:read', 'operations:read', 'records:read', 'recruitment:read',
      'canteen:read', 'parking:read', 'packages:read', 'encounters:read',
      'radiology:write',
    ],
  };

  const adminHospitalB = {
    _id: '507f191e810c19729de86022',
    id: '507f191e810c19729de86022',
    role: 'hospital_admin',
    hospitalId: hospitalB,
    permissions: [
      'inventory:read', 'operations:read', 'records:read', 'recruitment:read',
      'canteen:read', 'parking:read', 'packages:read', 'encounters:read',
      'radiology:write',
    ],
  };

  it('prevents Hospital A user from reading Hospital B biomedical assets', async () => {
    const resA = await asBiomedical(adminHospitalA).get('/assets').expect(200);
    expect(resA.body.assets).toHaveLength(1);
    expect(resA.body.assets[0].equipmentName).toBe('Ventilator A');

    const resB = await asBiomedical(adminHospitalB).get('/assets').expect(200);
    expect(resB.body.assets).toHaveLength(1);
    expect(resB.body.assets[0].equipmentName).toBe('Ventilator B');
  });

  it('strictly partitions Biomedical Waste (BMW) bags across hospitals', async () => {
    const resA = await asBmw(adminHospitalA).get('/bags').expect(200);
    expect(resA.body.bags).toHaveLength(1);
    expect(resA.body.bags[0].colorCategory).toBe('YELLOW');

    const resB = await asBmw(adminHospitalB).get('/bags').expect(200);
    expect(resB.body.bags).toHaveLength(1);
    expect(resB.body.bags[0].colorCategory).toBe('RED');
  });

  it('strictly partitions recruitment jobs across hospitals', async () => {
    const resA = await asRecruitment(adminHospitalA).get('/jobs').expect(200);
    expect(resA.body.jobs).toHaveLength(1);
    expect(resA.body.jobs[0].title).toBe('Staff Nurse Hospital A');

    const resB = await asRecruitment(adminHospitalB).get('/jobs').expect(200);
    expect(resB.body.jobs).toHaveLength(1);
    expect(resB.body.jobs[0].title).toBe('Staff Nurse Hospital B');
  });

  it('strictly partitions canteen menus across hospitals', async () => {
    const resA = await asCanteen(adminHospitalA).get('/items').expect(200);
    expect(resA.body.items).toHaveLength(1);
    expect(resA.body.items[0].name).toBe('Hospital A Thali');

    const resB = await asCanteen(adminHospitalB).get('/items').expect(200);
    expect(resB.body.items).toHaveLength(1);
    expect(resB.body.items[0].name).toBe('Hospital B Special');
  });

  it('strictly partitions parking vehicles across hospitals', async () => {
    const resA = await asParking(adminHospitalA).get('/vehicles').expect(200);
    expect(resA.body.transactions).toHaveLength(1);
    expect(resA.body.transactions[0].vehicleNumber).toBe('MH-01-A1');

    const resB = await asParking(adminHospitalB).get('/vehicles').expect(200);
    expect(resB.body.transactions).toHaveLength(1);
    expect(resB.body.transactions[0].vehicleNumber).toBe('MH-02-B1');
  });

  it('strictly partitions clinic packages across hospitals', async () => {
    const resA = await asPackages(adminHospitalA).get('/').expect(200);
    expect(resA.body.packages).toHaveLength(1);
    expect(resA.body.packages[0].name).toBe('Cardiac Checkup Hospital A');

    const resB = await asPackages(adminHospitalB).get('/').expect(200);
    expect(resB.body.packages).toHaveLength(1);
    expect(resB.body.packages[0].name).toBe('Executive Checkup Hospital B');
  });

  it('strictly partitions patient encounters across hospitals', async () => {
    const resA = await asEncounters(adminHospitalA).get('/').expect(200);
    expect(resA.body.encounters).toHaveLength(1);
    expect(resA.body.encounters[0].patient).toBe('Patient A');

    const resB = await asEncounters(adminHospitalB).get('/').expect(200);
    expect(resB.body.encounters).toHaveLength(1);
    expect(resB.body.encounters[0].patient).toBe('Patient B');
  });

  it('strictly partitions biometric logs across hospitals', async () => {
    await asBiometric(adminHospitalA).post('/webauthn/verify-punch').send({ punchType: 'IN' }).expect(200);
    await asBiometric(adminHospitalB).post('/webauthn/verify-punch').send({ punchType: 'OUT' }).expect(200);

    const resA = await asBiometric(adminHospitalA).get('/logs').expect(200);
    expect(resA.body.logs.every((l) => String(l.hospitalId) === hospitalA)).toBe(true);

    const resB = await asBiometric(adminHospitalB).get('/logs').expect(200);
    expect(resB.body.logs.every((l) => String(l.hospitalId) === hospitalB)).toBe(true);
  });

  it('strictly partitions certificates across hospitals', async () => {
    const resA = await asCertificates(adminHospitalA).get('/').expect(200);
    expect(resA.body.data).toHaveLength(1);
    expect(resA.body.data[0].title).toBe('Cert A');

    const resB = await asCertificates(adminHospitalB).get('/').expect(200);
    expect(resB.body.data).toHaveLength(1);
    expect(resB.body.data[0].title).toBe('Cert B');
  });

  it('blocks foreign hospital user from linking DICOM PACS study with 403', async () => {
    await asRadiology(adminHospitalB)
      .post('/dicom/link')
      .send({
        orderId: '507f191e810c19729de86121',
        studyUid: '1.2.840.10008.1.1',
        seriesCount: 2,
      })
      .expect(403);
  });
});
