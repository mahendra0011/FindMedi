import { describe, it, expect } from '@jest/globals';
import { mountApp } from '../helpers/appHarness.js';

const requests = [];
const policies = [];

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
      find: () => ({ lean: async () => policies }),
      findOne: (filter) => ({
        lean: async () => {
          if (filter?.key) {
            return policies.find((p) => p.key === filter.key) || null;
          }
          return policies[0] || null;
        },
      }),
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

  it('escalates requests based on custom ApprovalPolicy escalation tiers and handles expiration', async () => {
    policies.push({
      key: 'procurement-policy',
      slaHours: 20,
      escalation: [
        { afterPct: 30, toRole: 'procurement_lead' },
        { afterPct: 60, toRole: 'operations_director' },
        { afterPct: 90, toRole: 'cfo' },
      ],
    });

    const now = Date.now();
    // 35% elapsed of 20h window (7h elapsed) -> level 1: procurement_lead
    const customReq1 = {
      _id: 'cr1',
      status: 'pending',
      policyKey: 'procurement-policy',
      createdAt: new Date(now - 7 * 3600 * 1000),
      dueAt: new Date(now + 13 * 3600 * 1000),
      escalationLevel: 0,
      requiredRoles: ['buyer'],
      save: async function () { return this; },
    };

    // 65% elapsed of 20h window (13h elapsed) -> level 2: operations_director
    const customReq2 = {
      _id: 'cr2',
      status: 'pending',
      policyKey: 'procurement-policy',
      createdAt: new Date(now - 13 * 3600 * 1000),
      dueAt: new Date(now + 7 * 3600 * 1000),
      escalationLevel: 0,
      requiredRoles: ['buyer'],
      save: async function () { return this; },
    };

    // 95% elapsed of 20h window (19h elapsed) -> level 3: cfo
    const customReq3 = {
      _id: 'cr3',
      status: 'pending',
      policyKey: 'procurement-policy',
      createdAt: new Date(now - 19 * 3600 * 1000),
      dueAt: new Date(now + 1 * 3600 * 1000),
      escalationLevel: 0,
      requiredRoles: ['buyer'],
      save: async function () { return this; },
    };

    // Overdue by > 24 hours -> should expire
    const expiredReq = {
      _id: 'cr_exp',
      status: 'pending',
      policyKey: 'procurement-policy',
      createdAt: new Date(now - 50 * 3600 * 1000),
      dueAt: new Date(now - 26 * 3600 * 1000),
      escalationLevel: 0,
      requiredRoles: ['buyer'],
      save: async function () { return this; },
    };

    requests.push(customReq1, customReq2, customReq3, expiredReq);

    const res = await as(admin).post('/sweep').expect(200);
    expect(res.body.escalated).toBe(3);
    expect(res.body.expired).toBe(1);

    expect(customReq1.escalationLevel).toBe(1);
    expect(customReq1.requiredRoles).toContain('procurement_lead');

    expect(customReq2.escalationLevel).toBe(2);
    expect(customReq2.requiredRoles).toContain('operations_director');

    expect(customReq3.escalationLevel).toBe(3);
    expect(customReq3.requiredRoles).toContain('cfo');

    expect(expiredReq.status).toBe('expired');

    // Idempotent resweep
    const resweep = await as(admin).post('/sweep').expect(200);
    expect(resweep.body.escalated).toBe(0);
  });
});
