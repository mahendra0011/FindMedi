import { describe, it, expect } from '@jest/globals';
import { mountApp } from '../helpers/appHarness.js';

const staffMembers = [
  {
    _id: '507f191e810c19729de860f1',
    hospitalId: '607f191e810c19729de860f2',
    employeeId: 'EMP-001',
    name: 'Dr. Sunita Sharma',
    role: 'Doctor',
    department: 'Cardiology',
    status: 'Active',
    verifiedDocs: [
      {
        _id: '507f191e810c19729de860d1',
        docType: 'MedicalCouncilReg',
        docNumber: 'MCI-12345',
        docUrl: 'https://cdn.findmedi.in/mci.pdf',
        status: 'Pending',
      },
      {
        _id: '507f191e810c19729de860d2',
        docType: 'PAN',
        docNumber: 'ABCDE1234F',
        status: 'Verified',
      },
    ],
    save: async function () { return this; },
  },
  {
    _id: '507f191e810c19729de860f9',
    hospitalId: '999f191e810c19729de86099', // Different tenant
    employeeId: 'EMP-999',
    name: 'Other Hospital Staff',
    verifiedDocs: [],
    save: async function () { return this; },
  },
];

const { as } = await mountApp('hr', {
  '../../src/models/Staff.js': () => ({
    default: {
      find: (filter) => {
        let list = [...staffMembers];
        if (filter?.hospitalId) {
          list = list.filter((s) => String(s.hospitalId) === String(filter.hospitalId));
        }
        if (filter?.['verifiedDocs.status']) {
          list = list.filter((s) => (s.verifiedDocs || []).some((d) => d.status === filter['verifiedDocs.status']));
        }
        return {
          select: () => ({
            limit: () => ({
              lean: async () => list,
            }),
          }),
        };
      },
      findOne: (filter) => {
        const found = staffMembers.find((s) => {
          if (filter?._id && String(s._id) !== String(filter._id)) return false;
          if (filter?.hospitalId && String(s.hospitalId) !== String(filter.hospitalId)) return false;
          return true;
        });
        if (!found) {
          return {
            lean: async () => null,
            then: (resolve) => resolve(null),
          };
        }
        return {
          ...found,
          lean: async () => ({ ...found }),
          then: (resolve) => resolve(found),
          save: async function () {
            Object.assign(found, this);
            return found;
          },
        };
      },
    },
  }),
}, { enforceAuthorize: true });

describe('Wave 4a / T8: HR Verification & Onboarding Integration Tests', () => {
  const hrManagerToken = {
    role: 'hr_manager',
    hospitalId: '607f191e810c19729de860f2',
    _id: '607f191e810c19729de860e1',
  };

  const patientToken = {
    role: 'patient',
    _id: '607f191e810c19729de860e2',
  };

  it('rejects unauthorized role attempting to access HR documents with 403', async () => {
    const res = await as(patientToken).get('/documents/verify');
    expect(res.status).toBe(403);
  });

  it('retrieves list of pending staff documents awaiting verification', async () => {
    const res = await as(hrManagerToken).get('/documents/verify');
    expect(res.status).toBe(200);
    expect(res.body.pendingCount).toBe(1);
    expect(res.body.documents[0].employeeId).toBe('EMP-001');
    expect(res.body.documents[0].docType).toBe('MedicalCouncilReg');
  });

  it('validates status enum on document verification decision', async () => {
    const res = await as(hrManagerToken)
      .put('/documents/verify/507f191e810c19729de860f1')
      .send({ docId: '507f191e810c19729de860d1', status: 'InvalidStatus' });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('status must be Verified or Rejected');
  });

  it('approves document verification with status=Verified', async () => {
    const res = await as(hrManagerToken)
      .put('/documents/verify/507f191e810c19729de860f1')
      .send({
        docId: '507f191e810c19729de860d1',
        status: 'Verified',
        remarks: 'MCI registration verified via state medical register portal',
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('Verified');
  });

  it('enforces tenant isolation: cannot verify or read staff of another hospital', async () => {
    const res = await as(hrManagerToken).get('/onboarding/507f191e810c19729de860f9');
    expect(res.status).toBe(404);
  });

  it('calculates onboarding progress metrics accurately', async () => {
    const res = await as(hrManagerToken).get('/onboarding/507f191e810c19729de860f1');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Dr. Sunita Sharma');
    expect(res.body.onboardingProgress.totalDocs).toBe(2);
    expect(res.body.onboardingProgress.verifiedDocs).toBe(2);
    expect(res.body.onboardingProgress.completionPct).toBe(100);
    expect(res.body.onboardingProgress.isFullyOnboarded).toBe(true);
  });

  it('records employee exit interview and transitions status to Resigned', async () => {
    const res = await as(hrManagerToken)
      .post('/exit-interview')
      .send({
        staffId: '507f191e810c19729de860f1',
        reasonForLeaving: 'Higher education / fellowship abroad',
        feedback: 'Great team and clinical environment',
        handoverCompleted: true,
        noDuesCleared: true,
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('Resigned');
    expect(res.body.exitInterview.handoverCompleted).toBe(true);
    expect(res.body.exitInterview.eligibleForRehire).toBe(true);
  });
});
