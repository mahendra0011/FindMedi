/**
 * File 22 P0-1: approval wiring through real HTTP + middleware chain.
 * Models stubbed via the harness; every assertion is a status code on the
 * wire, not a handler call.
 */
import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

// ─── approvals: self-approval block ─────────────────────────────────────────
// NOTE: unstable_mockModule is per-FILE, so both mounts below share ONE
// ApprovalRequest stub (a second registration does not replace the first).
const approvalFindById = jestApi.fn();
const approvalFindOne = jestApi.fn();
const approvalCreate = jestApi.fn();

const approvalRequestStub = () => ({
  default: {
    findById: (...a) => approvalFindById(...a),
    findOne: (...a) => approvalFindOne(...a),
    find: () => query([]),
    create: (...a) => approvalCreate(...a),
    updateMany: async () => ({ modifiedCount: 0 }),
  },
});

const { as: asApprovals } = await mountApp('approvals', {
  '../../src/models/ApprovalRequest.js': approvalRequestStub,
  '../../src/models/ApprovalPolicy.js': () => ({ default: { findOne: () => query(null), find: () => query([]) } }),
  '../../src/models/Delegation.js': () => ({ default: { findOne: () => query(null), find: () => query([]) } }),
  '../../src/models/AuditLog.js': () => ({ default: { create: async () => ({}) } }),
});

const pendingRequest = (requestedBy) => {
  const row = {
    _id: 'ap1', status: 'pending', requestedBy, policyKey: 'billing-discount', amount: 1000,
    steps: [{ step: 0, role: 'hospital_admin', status: 'pending' }],
    save: async function save() {
      if (!this.steps.some((s) => s.status === 'pending')) this.status = 'approved';
      return this;
    },
  };
  return row;
};

const adminA = { _id: 'adminA', id: 'adminA', role: 'hospital_admin', hospitalId: 'h1' };
const adminB = { _id: 'adminB', id: 'adminB', role: 'hospital_admin', hospitalId: 'h1' };

describe('POST /requests/:id/decide self-approval block', () => {
  test('requester deciding own request gets 403 SELF_APPROVAL', async () => {
    approvalFindById.mockReset().mockResolvedValue(pendingRequest('adminA'));
    approvalFindOne.mockReset().mockReturnValue(query(null));
    const res = await asApprovals(adminA).post('/requests/ap1/decide').send({ decision: 'approved' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('SELF_APPROVAL');
  });

  test('a different approver can approve', async () => {
    approvalFindById.mockReset().mockResolvedValue(pendingRequest('adminA'));
    approvalFindOne.mockReset().mockReturnValue(query(null));
    const res = await asApprovals(adminB).post('/requests/ap1/decide').send({ decision: 'approved' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('approved');
  });
});

// ─── billing: over-policy discount gate ─────────────────────────────────────
const billingCreate = jestApi.fn();
const discountPolicyFindOne = jestApi.fn();

const { as: asBilling } = await mountApp('billing', {
  '../../src/models/Billing.js': () => ({ default: { create: (...a) => billingCreate(...a), findById: () => query(null) } }),
  '../../src/models/DiscountPolicy.js': () => ({ default: { findOne: (...a) => discountPolicyFindOne(...a) } }),
  '../../src/models/ApprovalRequest.js': approvalRequestStub,
  '../../src/models/AuditLog.js': () => ({ default: { create: async () => ({}) } }),
});

const biller = { _id: 'recept1', id: 'recept1', role: 'receptionist', hospitalId: 'h1' };
const billBody = (discount) => ({ patient: 'Ram', service: 'OPD', amount: 1000, discount });

describe('POST / billing discount gate', () => {
  test('15% discount without approvalId returns 409 NEEDS_APPROVAL + approval id', async () => {
    discountPolicyFindOne.mockReset().mockReturnValue(query(null)); // no policy -> default 10%
    approvalCreate.mockReset().mockResolvedValue({ _id: 'needAppr' });
    const res = await asBilling(biller).post('/').send(billBody(150));
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('NEEDS_APPROVAL');
    expect(res.body.approvalId).toBe('needAppr');
    expect(billingCreate).not.toHaveBeenCalled();
  });

  test('5% discount sails through with no approval', async () => {
    discountPolicyFindOne.mockReset().mockReturnValue(query(null));
    approvalCreate.mockClear();
    billingCreate.mockReset().mockResolvedValue({ _id: 'b1', invoiceId: 'INV-1' });
    const res = await asBilling(biller).post('/').send(billBody(50));
    expect(res.status).toBe(201);
    expect(approvalCreate).not.toHaveBeenCalled();
  });

  test('15% with an approved request creates the bill with approvalRef', async () => {
    discountPolicyFindOne.mockReset().mockReturnValue(query(null));
    const appr = {
      _id: 'ap9', policyKey: 'billing-discount', status: 'approved', amount: 1000,
      hospitalId: 'h1', consumedAt: null,
      save: async function save() { return this; },
    };
    approvalFindById.mockReset().mockResolvedValue(appr);
    billingCreate.mockReset().mockImplementation(async (doc) => ({ _id: 'b2', ...doc }));
    const res = await asBilling(biller).post('/').send({ ...billBody(150), approvalId: 'ap9' });
    expect(res.status).toBe(201);
    expect(String(billingCreate.mock.calls[0][0].approvalRef)).toBe('ap9');
    expect(appr.consumedAt).not.toBeNull();
  });

  test('replaying the same approvalId fails closed', async () => {
    discountPolicyFindOne.mockReset().mockReturnValue(query(null));
    approvalFindById.mockReset().mockResolvedValue({
      _id: 'ap9', policyKey: 'billing-discount', status: 'approved', amount: 1000,
      hospitalId: 'h1', consumedAt: new Date(), save: async function save() { return this; },
    });
    billingCreate.mockReset();
    const res = await asBilling(biller).post('/').send({ ...billBody(150), approvalId: 'ap9' });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('APPROVAL_REPLAY');
    expect(billingCreate).not.toHaveBeenCalled();
  });
});
