/**
 * File 22 P2-36: async runs ledger (queued → done with embedded result).
 * Masking unit tests live in test/unit/reportMasking.spec.js (importing the
 * runner at top level here would poison the mock registry with real models).
 */
import { mountApp, query } from '../helpers/appHarness.js';

const runs = [];
const { as } = await mountApp('reportStudio', {
  '../../src/models/SavedView.js': () => ({ default: { find: () => query([]), findById: () => query(null) } }),
  '../../src/models/ReportSchedule.js': () => ({ default: { find: () => query([]) } }),
  '../../src/models/ReportRun.js': () => ({
    default: {
      create: async (d) => { const r = { _id: `run${runs.length}`, ...d }; runs.push(r); return r; },
      findOne: (f) => query(runs.find((r) => String(r._id) === String(f._id)) || null),
      findByIdAndUpdate: async (id, update) => {
        const r = runs.find((x) => String(x._id) === String(id));
        if (r) Object.assign(r, update.$set);
        return r || null;
      },
    },
  }),
  '../../src/models/ReportDefinition.js': () => ({
    default: {},
    REPORT_CATALOGUE: [
      { key: 'unpaid-bills', name: 'Unpaid bills', category: 'finance', dataset: 'bills_unpaid', roles: [] },
    ],
  }),
  // bills_unpaid dataset source (inline execution hits the real dataset fn).
  '../../src/models/Billing.js': () => ({
    default: {
      find: () => {
        const q = query([
          { _id: 'b1', invoiceId: 'INV-1', patient: 'Ramesh Kumar', amount: 1000, paid: 200, balance: 800, status: 'Pending' },
        ]);
        const withChain = { ...q, sort: () => withChain, limit: () => withChain };
        return withChain;
      },
    },
  }),
  '../../src/models/AuditLog.js': () => ({ default: { create: async () => ({}) } }),
});

const viewer = { _id: 'v1', id: 'v1', role: 'accountant', hospitalId: 'h1' };

describe('async runs', () => {
  test('run-async without Redis executes inline and lands done (masked for role)', async () => {
    const q = await as(viewer).post('/unpaid-bills/run-async').send({});
    expect(q.status).toBe(202);
    expect(q.body.status).toBe('queued');
    // Inline execution completes near-immediately; poll until terminal.
    let s = null;
    for (let i = 0; i < 20; i += 1) {
      await new Promise((t) => setTimeout(t, 250));
      // eslint-disable-next-line no-await-in-loop
      s = await as(viewer).get(`/runs/${q.body.id}`);
      if (['done', 'failed'].includes(s?.body?.run?.status)) break;
    }
    expect(s.status).toBe(200);
    expect(s.body.run.status).toBe('done');
    expect(s.body.run.rowCount).toBe(1);
    // Accountant sees masked PHI even in the stored result.
    expect(s.body.run.result.rows[0].patient).not.toBe('Ramesh Kumar');
    expect(s.body.run.result.rows[0].status).toBe('Pending');
  }, 15000);

  test('unknown run is 404', async () => {
    const s = await as(viewer).get('/runs/64b0000000000000000000aa');
    expect(s.status).toBe(404);
  });
});
