import { describe, it, expect } from '@jest/globals';
import { mountApp } from '../helpers/appHarness.js';

const requests = [];

const { as } = await mountApp('approvals', {
  '../../src/models/ApprovalRequest.js': () => ({
    default: {
      find: (filter) => Promise.resolve(requests.filter((r) => r.status === 'pending')),
      updateMany: async (filter, update) => {
        let count = 0;
        const now = new Date();
        for (const r of requests) {
          if (r.status === 'pending' && filter.dueAt?.$lte && r.dueAt <= filter.dueAt.$lte) {
            r.status = 'expired';
            count += 1;
          }
        }
        return { modifiedCount: count };
      },
    },
  }),
  '../../src/models/ApprovalPolicy.js': () => ({
    default: {
      findOne: () => ({ lean: async () => null }),
    },
  }),
});

describe('Multi-level SLA Escalation Sweep', () => {
  const admin = {
    _id: '507f191e810c19729de860ea',
    id: '507f191e810c19729de860ea',
    role: 'hospital_admin',
    hospitalId: '507f191e810c19729de860ed',
    permissions: ['staff:manage'],
  };

  it('progressively escalates requests across 50%, 75% and 100% time bands', async () => {
    const now = Date.now();
    // 55% elapsed (should become level 1 -> billing_manager)
    const req1 = {
      _id: 'r1',
      status: 'pending',
      createdAt: new Date(now - 28 * 3600 * 1000),
      dueAt: new Date(now + 20 * 3600 * 1000), // 48h total, 28h elapsed = 58%
      escalationLevel: 0,
      requiredRoles: ['accountant'],
      save: async function () { return this; },
    };

    // 80% elapsed (should become level 2 -> hospital_admin)
    const req2 = {
      _id: 'r2',
      status: 'pending',
      createdAt: new Date(now - 40 * 3600 * 1000),
      dueAt: new Date(now + 8 * 3600 * 1000), // 48h total, 40h elapsed = 83%
      escalationLevel: 0,
      requiredRoles: ['nurse_head'],
      save: async function () { return this; },
    };

    // Overdue (105% elapsed, should become level 3 -> medical_director)
    const req3 = {
      _id: 'r3',
      status: 'pending',
      createdAt: new Date(now - 50 * 3600 * 1000),
      dueAt: new Date(now - 2 * 3600 * 1000),
      escalationLevel: 1,
      requiredRoles: ['billing_manager'],
      save: async function () { return this; },
    };

    requests.push(req1, req2, req3);

    const res = await as(admin).post('/sweep').expect(200);
    expect(res.body.escalated).toBe(3);

    expect(req1.escalationLevel).toBe(1);
    expect(req1.requiredRoles).toContain('billing_manager');

    expect(req2.escalationLevel).toBe(2);
    expect(req2.requiredRoles).toContain('hospital_admin');

    expect(req3.escalationLevel).toBe(3);
    expect(req3.requiredRoles).toContain('medical_director');
  });

  it('is idempotent on subsequent sweep without elapsed time jump', async () => {
    const res = await as(admin).post('/sweep').expect(200);
    expect(res.body.escalated).toBe(0);
  });
});
