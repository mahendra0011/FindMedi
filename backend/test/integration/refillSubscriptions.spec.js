import { jest } from '@jest/globals';
import { mountApp } from '../helpers/appHarness.js';

// Spec 2.3: refill subscriptions - self-scoped CRUD + due sweep + transitions.

const chain = (result) => {
  const q = {
    sort: () => q,
    limit: () => q,
    select: () => q,
    lean: () => Promise.resolve(result),
    then: (res, rej) => Promise.resolve(result).then(res, rej),
    catch: (rej) => Promise.resolve(result).catch(rej),
  };
  return q;
};

const makeDoc = (over = {}) => ({
  _id: '64b0000000000000000000aa',
  userId: 'pat1',
  status: 'active',
  intervalDays: 30,
  nextRefillAt: new Date('2026-11-01T00:00:00Z'),
  refillCount: 0,
  history: [],
  save: jest.fn(async function save() { return this; }),
  ...over,
});

const refillFind = jest.fn(() => chain([]));
const refillFindOne = jest.fn(() => chain(null));
const refillCreate = jest.fn(async (body) => makeDoc(body));
const rxFindOne = jest.fn(() => chain({ _id: 'rx1' }));
const auditLog = jest.fn().mockResolvedValue({});

jest.unstable_mockModule('../../src/models/RefillSubscription.js', () => ({
  __esModule: true,
  default: { find: refillFind, findOne: refillFindOne, create: refillCreate },
}));
jest.unstable_mockModule('../../src/models/Prescription.js', () => ({
  __esModule: true,
  default: { findOne: rxFindOne },
}));
jest.unstable_mockModule('../../src/middleware/audit.js', () => ({ auditLog }));

const { as } = await mountApp('refillSubscriptions');
const patient = { id: 'pat1', role: 'patient' };

const validCreate = {
  medicineName: 'Metformin 500mg',
  dosage: '1 tablet',
  frequency: 'Twice daily',
  quantityPerRefill: 60,
  intervalDays: 30,
  autoOrder: true,
};

describe('Spec 2.3: refill subscriptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    refillFind.mockReturnValue(chain([]));
    refillFindOne.mockReturnValue(chain(null));
  });

  test('creates a self-owned subscription with computed next refill', async () => {
    const res = await as(patient).post('/').send(validCreate).expect(201);
    expect(res.body.userId).toBe('pat1');
    expect(res.body.status).toBe('active');
    expect(res.body.history[0].action).toBe('created');
    expect(new Date(res.body.nextRefillAt).getTime()).toBeGreaterThan(Date.now());
    expect(auditLog).toHaveBeenCalledWith('create_refill_subscription', 'pat1', expect.any(Object));
  });

  test('rejects creating against someone else\u2019s prescription', async () => {
    rxFindOne.mockReturnValueOnce(chain(null));
    await as(patient).post('/').send({ ...validCreate, prescriptionId: '64b0000000000000000000bb' }).expect(404);
    expect(refillCreate).not.toHaveBeenCalled();
  });

  test('lists only the caller\u2019s subscriptions', async () => {
    await as(patient).get('/').expect(200);
    expect(refillFind).toHaveBeenCalledWith({ userId: 'pat1' });
  });

  test('pause/resume follow the transition table', async () => {
    const doc = makeDoc();
    refillFindOne.mockReturnValueOnce(chain(doc));
    const paused = await as(patient).patch('/64b0000000000000000000aa/pause').send({ reason: 'Travel' }).expect(200);
    expect(paused.body.status).toBe('paused');

    refillFindOne.mockReturnValueOnce(chain(doc));
    const resumed = await as(patient).patch('/64b0000000000000000000aa/resume').send({}).expect(200);
    expect(resumed.body.status).toBe('active');
  });

  test('refill is rejected before the due date unless early', async () => {
    const doc = makeDoc({ nextRefillAt: new Date(Date.now() + 5 * 86400000) });
    refillFindOne.mockReturnValueOnce(chain(doc));
    await as(patient).post('/64b0000000000000000000aa/refill').send({}).expect(409);

    refillFindOne.mockReturnValueOnce(chain(doc));
    const early = await as(patient).post('/64b0000000000000000000aa/refill').send({ early: true }).expect(200);
    expect(early.body.refillCount).toBe(1);
    expect(early.body.history.at(-1).action).toBe('refilled');
  });

  test('cancelled subscriptions cannot be resumed', async () => {
    refillFindOne.mockReturnValueOnce(chain(makeDoc({ status: 'cancelled' })));
    await as(patient).patch('/64b0000000000000000000aa/resume').send({}).expect(409);
  });
});
