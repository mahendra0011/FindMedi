/**
 * 2.md §6 — probation payout hold, through a real HTTP route.
 *
 * A provider listing is seeded `payoutHold: true` (applicationToProvider) and
 * an operator clears it via POST /providers/:id/probation. Money leaves the
 * platform through routes/commission.js: POST /payouts creates the payout,
 * PUT /payouts/:id/pay transfers it. Both resolve the linked listing through
 * lib/probation.js (Provider.commissionConfigId -> heldProviderForCommissionConfig)
 * and must refuse while `active && payoutHold`.
 *
 * What it pins:
 *  - create: held listing -> 403 PROBATION_PAYOUT_HOLD, NO Payout row;
 *  - create: no held listing -> 201 as before;
 *  - pay: held listing -> 403 and the payout STAYS `pending` (save never runs);
 *  - pay: hold cleared -> 200 and the payout goes `paid`;
 *  - both checks look up by commissionConfigId with the two probation flags.
 */
import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const chain = (value) => {
  const q = {
    select: () => q, populate: () => q, sort: () => q, limit: () => q,
    skip: () => q, lean: () => q, exec: () => q,
    then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
  };
  return q;
};

let heldProvider = null;
let providerFilters = [];
let configDoc = null;
let payoutDoc = null;
const createdPayouts = [];

jestApi.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLog: jestApi.fn(async () => {}),
}));
jestApi.unstable_mockModule('../../src/config/logger.js', () => ({
  default: { info: jestApi.fn(), warn: jestApi.fn(), error: jestApi.fn(), debug: jestApi.fn() },
}));
// idempotencyGuard is fail-closed on these routes: pretend the replay store is
// up so a request carrying an Idempotency-Key passes through.
jestApi.unstable_mockModule('../../src/config/redis.js', () => ({
  isRedisReady: () => true,
  redisClient: { isOpen: true, set: async () => 'OK', get: async () => null },
}));
jestApi.unstable_mockModule('../../src/lib/pgDualWrite.js', () => ({
  mirrorPayoutWithLedger: jestApi.fn(async () => {}),
  mirrorLedgerEntry: jestApi.fn(async () => {}),
  mirrorPaymentWithLedger: jestApi.fn(async () => {}),
}));
jestApi.unstable_mockModule('../../src/models/CommissionConfig.js', () => ({
  default: {
    find: () => chain([]),
    findOne: () => query(configDoc),
    aggregate: async () => [],
  },
}));
jestApi.unstable_mockModule('../../src/models/Payout.js', () => ({
  default: {
    findById: () => query(payoutDoc),
    find: () => chain([]),
    countDocuments: async () => 0,
    aggregate: async () => [],
    create: jestApi.fn(async (doc) => {
      const row = { _id: `pay-${createdPayouts.length + 1}`, approvals: [], ...doc };
      row.save = jestApi.fn(async function save() { return this; });
      createdPayouts.push(row);
      return row;
    }),
  },
}));
jestApi.unstable_mockModule('../../src/models/TransactionLedger.js', () => ({
  default: {
    find: () => chain([]),
    updateMany: jestApi.fn(async () => ({ matchedCount: 0 })),
    aggregate: async () => [],
  },
}));
jestApi.unstable_mockModule('../../src/models/Hospital.js', () => ({
  default: { find: () => chain([]), findOne: () => query(null) },
}));
jestApi.unstable_mockModule('../../src/models/Provider.js', () => ({
  default: {
    findOne: (filter) => {
      providerFilters.push(filter);
      return query(heldProvider);
    },
    findById: () => query(null),
  },
}));

const { as } = await mountApp('commission');

const SUPERADMIN = { _id: 'sa-1', id: 'sa-1', role: 'superadmin' };
const CFG_ID = '507f1f77bcf86cd7994390a1';
const FACILITY_ID = '507f1f77bcf86cd7994390b2';

const HELD = {
  _id: '507f1f77bcf86cd7994390c3',
  name: 'Smile Dental Studio',
  probation: { active: true, bookingCap: 10, payoutHold: true },
};

const idem = (req) => req.set('Idempotency-Key', `idem-${Math.random().toString(36).slice(2)}`);

beforeEach(() => {
  heldProvider = null;
  providerFilters = [];
  createdPayouts.length = 0;
  configDoc = {
    _id: CFG_ID,
    facilityId: FACILITY_ID,
    pendingPayout: 0,
    totalEarnings: 0,
    save: jestApi.fn(async function save() { return this; }),
  };
  payoutDoc = null;
});

describe('POST /payouts — 2.md §6 payout hold at create', () => {
  const create = () => idem(as(SUPERADMIN).post('/payouts')).send({
    facilityId: FACILITY_ID, periodStart: '2026-09-01', periodEnd: '2026-09-30',
  });

  it('403s the payout while the linked listing holds payouts', async () => {
    heldProvider = HELD;
    const res = await create();
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PROBATION_PAYOUT_HOLD');
    expect(res.body.message).toContain('Smile Dental Studio');
    expect(createdPayouts).toHaveLength(0);
  });

  it('creates the payout when no listing is held', async () => {
    heldProvider = null;
    const res = await create();
    expect(res.status).toBe(201);
    expect(createdPayouts).toHaveLength(1);
    expect(createdPayouts[0].facilityId).toBe(FACILITY_ID);
  });

  it('looks the listing up by commissionConfigId with both probation flags', async () => {
    heldProvider = null;
    await create();
    expect(providerFilters[0]).toMatchObject({
      commissionConfigId: CFG_ID,
      'probation.active': true,
      'probation.payoutHold': true,
    });
  });
});

describe('PUT /payouts/:id/pay — 2.md §6 payout hold at transfer', () => {
  const pay = () => idem(as(SUPERADMIN).put('/payouts/pay-1/pay')).send({ transactionRef: 'UTR123' });

  it('403s the transfer while held, leaving the payout pending', async () => {
    heldProvider = HELD;
    payoutDoc = {
      _id: 'pay-1',
      facilityId: FACILITY_ID,
      status: 'pending',
      netPayout: 500,
      commissionAmount: 50,
      approvals: [],
      save: jestApi.fn(async function save() { return this; }),
    };
    const res = await pay();
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PROBATION_PAYOUT_HOLD');
    expect(payoutDoc.save).not.toHaveBeenCalled();
    expect(payoutDoc.status).toBe('pending');
  });

  it('pays out once the hold is cleared', async () => {
    heldProvider = null;
    payoutDoc = {
      _id: 'pay-1',
      facilityId: FACILITY_ID,
      status: 'pending',
      netPayout: 500,
      commissionAmount: 50,
      approvals: [],
      save: jestApi.fn(async function save() { return this; }),
    };
    const res = await pay();
    expect(res.status).toBe(200);
    expect(payoutDoc.save).toHaveBeenCalled();
    expect(payoutDoc.status).toBe('paid');
    expect(configDoc.save).toHaveBeenCalled();
  });
});
