import { describe, it, expect, jest } from '@jest/globals';
import { mountApp } from '../helpers/appHarness.js';

const vendorStore = {
  _id: '507f191e810c19729de860f1',
  name: 'Apex Pharma Supplies',
  hospitalId: '607f191e810c19729de860f2',
  kycStatus: 'Pending',
  complianceScore: 98,
  licenseExpiry: new Date('2027-12-31'),
  kycDocs: [],
  kycDecision: null,
  save: async function () { return this; },
};

const { as } = await mountApp('stores', {
  '../../src/models/Supplier.js': () => ({
    default: {
      findOne: (filter) => {
        if (filter?._id === vendorStore._id) {
          return {
            ...vendorStore,
            lean: async () => ({ ...vendorStore }),
            save: async function () {
              Object.assign(vendorStore, this);
              return vendorStore;
            },
          };
        }
        return null;
      },
    },
  }),
  '../../src/middleware/audit.js': () => ({
    auditLog: jest.fn().mockResolvedValue(true),
  }),
  '../../src/models/Store.js': () => ({ default: {} }),
  '../../src/models/Indent.js': () => ({ default: {} }),
  '../../src/models/GRN.js': () => ({ default: {} }),
  '../../src/models/StockLedger.js': () => ({ default: {} }),
}, { enforceAuthorize: true });

describe('T7: Vendor KYC Workflow & Documentation Integration Tests', () => {
  const managerToken = {
    role: 'hospital_admin',
    hospitalId: '607f191e810c19729de860f2',
    _id: '607f191e810c19729de860f3',
  };

  const patientToken = {
    role: 'patient',
    _id: '607f191e810c19729de860f4',
  };

  it('rejects unauthorized role attempting to verify vendor KYC with 403', async () => {
    const res = await as(patientToken)
      .put('/vendors/507f191e810c19729de860f1/kyc')
      .send({ kycStatus: 'Verified' });
    expect(res.status).toBe(403);
  });

  it('rejects invalid kycStatus option with 400', async () => {
    const res = await as(managerToken)
      .put('/vendors/507f191e810c19729de860f1/kyc')
      .send({ kycStatus: 'InvalidStatus' });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('kycStatus must be one of');
  });

  it('rejects Rejected status without reason with 400', async () => {
    const res = await as(managerToken)
      .put('/vendors/507f191e810c19729de860f1/kyc')
      .send({ kycStatus: 'Rejected' });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('reason is required');
  });

  it('approves vendor KYC with Verified status', async () => {
    const res = await as(managerToken)
      .put('/vendors/507f191e810c19729de860f1/kyc')
      .send({
        kycStatus: 'Verified',
        reason: 'All statutory licenses and GST verification clear',
      });
    expect(res.status).toBe(200);
    expect(res.body.kycStatus).toBe('Verified');
    expect(res.body.kycDecision.status).toBe('Verified');
  });

  it('validates required fields on POST /vendors/:id/kyc-docs', async () => {
    const res = await as(managerToken)
      .post('/vendors/507f191e810c19729de860f1/kyc-docs')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('docType and docNumber are required');
  });

  it('successfully uploads and stores a statutory KYC document', async () => {
    const res = await as(managerToken)
      .post('/vendors/507f191e810c19729de860f1/kyc-docs')
      .send({
        docType: 'DrugLicense',
        docNumber: 'DL-2026-MP-99881',
        expiry: '2028-06-30',
        docUrl: 'https://storage.findmedi.in/kyc/dl-99881.pdf',
      });
    expect(res.status).toBe(201);
    expect(res.body.kycDocsCount).toBeGreaterThanOrEqual(1);
    expect(res.body.kycDocs[0].docType).toBe('DrugLicense');
    expect(res.body.kycDocs[0].docNumber).toBe('DL-2026-MP-99881');
  });

  it('retrieves vendor performance and KYC compliance score', async () => {
    const res = await as(managerToken)
      .get('/vendors/507f191e810c19729de860f1/performance');
    expect(res.status).toBe(200);
    expect(res.body.vendorName).toBe('Apex Pharma Supplies');
    expect(res.body.complianceScore).toBe(98);
    expect(res.body.otifMetrics).toBeDefined();
    expect(res.body.isLicenseExpired).toBe(false);
  });
});
