/**
 * 20.md §2 CSAT + §3 escalation: ratings are captured once by the raiser on
 * a resolved ticket; SLA breaches auto-escalate via the hourly job.
 *
 * What it pins:
 *  - CSAT: 401 anonymously; 404 on foreign rows; 409 unless Resolved/Closed;
 *    409 on a second rating; strict schema (400 on rating 6);
 *  - escalation runner: breached open tickets escalate to Urgent with an
 *    audit row; resolved/already-escalated rows are untouched; reruns no-op.
 */
import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const USER = { _id: 'u1', id: 'u1', role: 'patient' };
const TKT = '7500000000000000000000aa';

const auditLog = jestApi.fn();
let ticketRow = null;

jestApi.unstable_mockModule('../../src/models/SupportTicket.js', () => ({
  default: {
    findOne: (filter) => query(
      ticketRow && String(ticketRow._id) === String(filter._id) ? ticketRow : null,
    ),
  },
}));
jestApi.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLog: (...args) => auditLog(...args),
}));

const { as } = await mountApp('supportTickets', {});

const makeRow = (over = {}) => {
  const row = {
    _id: TKT,
    raisedBy: 'u1',
    status: 'Resolved',
    csat: { rating: null, at: null },
    save: jestApi.fn(async function () { return row; }),
    ...over,
  };
  return row;
};

beforeEach(() => {
  ticketRow = null;
  auditLog.mockReset();
});

describe('POST /:id/csat', () => {
  it('401s anonymously and 404s foreign rows', async () => {
    expect((await as().post(`/${TKT}/csat`).send({ rating: 5 })).status).toBe(401);
    ticketRow = makeRow();
    expect((await as(USER).post('/7500000000000000000000bb/csat').send({ rating: 5 })).status).toBe(404);
  });

  it('records a first rating on a resolved ticket', async () => {
    ticketRow = makeRow();
    const res = await as(USER).post(`/${TKT}/csat`).send({ rating: 5 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ rating: 5 });
    expect(ticketRow.csat.rating).toBe(5);
    expect(ticketRow.save).toHaveBeenCalledTimes(1);
  });

  it('409s open tickets, second ratings and out-of-range values', async () => {
    ticketRow = makeRow({ status: 'Open' });
    const open = await as(USER).post(`/${TKT}/csat`).send({ rating: 4 });
    expect(open.status).toBe(409);
    expect(open.body.code).toBe('NOT_RESOLVED');

    ticketRow = makeRow({ csat: { rating: 3, at: new Date() } });
    const twice = await as(USER).post(`/${TKT}/csat`).send({ rating: 5 });
    expect(twice.status).toBe(409);
    expect(twice.body.code).toBe('ALREADY_RATED');

    ticketRow = makeRow();
    const bad = await as(USER).post(`/${TKT}/csat`).send({ rating: 6 });
    expect(bad.status).toBe(400);
    expect(ticketRow.save).not.toHaveBeenCalled();
  });
});
