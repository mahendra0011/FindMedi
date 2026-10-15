/**
 * 20.md §3 escalation runner: breached tickets (slaDueAt passed, still open)
 * escalate exactly once — Urgent priority + escalated stamp + audit.
 */
import { jest as jestApi } from '@jest/globals';

const store = [];
const auditLog = jestApi.fn(async () => {});

const getPath = (o, p) => p.split('.').reduce((v, k) => (v == null ? undefined : v[k]), o);

const matchesCond = (val, cond) => {
  if (cond !== null && typeof cond === 'object' && !Array.isArray(cond) && !(cond instanceof Date)) {
    return Object.entries(cond).every(([op, arg]) => {
      switch (op) {
        case '$exists': return (val !== undefined) === arg;
        case '$in': return arg.includes(val ?? null);
        case '$ne': return (val ?? null) !== arg;
        case '$lt': return val != null && val < arg;
        case '$lte': return val != null && val <= arg;
        default: throw new Error(`ticket fake: unsupported operator ${op}`);
      }
    });
  }
  return (val ?? null) === (cond ?? null);
};

const matchesFilter = (doc, filter) =>
  Object.entries(filter).every(([key, cond]) => {
    if (key === '$or') return cond.some((clause) => matchesFilter(doc, clause));
    return matchesCond(getPath(doc, key), cond);
  });

const queryChain = (docs) => ({
  select: () => ({ limit: () => ({ lean: async () => docs }) }),
});

jestApi.unstable_mockModule('../../src/models/SupportTicket.js', () => ({
  default: {
    find: (filter) => queryChain(store.filter((d) => matchesFilter(d, filter))),
    findOneAndUpdate: async (filter, update) => {
      const doc = store.find((d) => matchesFilter(d, filter));
      if (!doc) return null;
      Object.assign(doc, update.$set);
      return doc;
    },
  },
}));
jestApi.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLog: (...args) => auditLog(...args),
}));

const { runTicketEscalationsOnce } = await import('../../src/jobs/ticketEscalation.job.js');

const NOW = new Date('2026-10-15T12:00:00Z');

beforeEach(() => {
  store.length = 0;
  // mockClear (not mockReset): the async implementation must survive, the
  // job chains .catch() on its return.
  auditLog.mockClear();
});

describe('runTicketEscalationsOnce', () => {
  it('escalates breached open tickets to Urgent with audit', async () => {
    store.push({
      _id: 't1', status: 'Open', priority: 'High', slaDueAt: new Date(NOW.getTime() - 3600 * 1000),
    });
    const out = await runTicketEscalationsOnce(NOW);
    expect(out).toMatchObject({ scanned: 1, escalated: 1 });
    expect(store[0].priority).toBe('Urgent');
    expect(store[0].escalated.reason).toBe('sla-breach');
    expect(auditLog).toHaveBeenCalledWith('ticket_escalated', null, expect.objectContaining({ reason: 'sla-breach' }));
  });

  it('leaves resolved and already-escalated rows alone, reruns no-op', async () => {
    store.push(
      { _id: 't1', status: 'Resolved', priority: 'High', slaDueAt: new Date(NOW.getTime() - 3600 * 1000) },
      { _id: 't2', status: 'Open', priority: 'Urgent', slaDueAt: new Date(NOW.getTime() - 7200 * 1000), escalated: { at: new Date(), reason: 'sla-breach', level: 'L2' } },
    );
    const out = await runTicketEscalationsOnce(NOW);
    expect(out).toMatchObject({ scanned: 0, escalated: 0 });
    expect(auditLog).not.toHaveBeenCalled();
  });
});
