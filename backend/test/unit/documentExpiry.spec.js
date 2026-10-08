/**
 * 2.md 5 / 8.md 2 / 8.md 14 — document expiry job.
 *
 * Three properties this suite pins, because each one is a bug the spec calls
 * out by name:
 *
 *   1. ONCE PER THRESHOLD — 60/30/7 + expiry each fire exactly once per
 *      document, however many times the daily sweep runs (the state lives on
 *      the ProviderDocument row, not in memory).
 *   2. SUSPEND ONCE — expiry + grace suspends the PARENT listing exactly once:
 *      the status write is conditional, so a second run, a second expired
 *      document or an already-suspended listing cannot produce a second audit
 *      row or a second notification.
 *   3. OPS ALERT (8.md 14) — a new expiry reaches the superadmins once per IST
 *      day, alongside the log line and the audit row.
 *
 * The collections are in-memory fakes that honour ONLY the query shapes the
 * job uses; an unsupported operator throws, so a query-shape change fails
 * loudly instead of passing against a mock that ignores filters.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import fs from 'node:fs';

// ── in-memory fakes ─────────────────────────────────────────────────────────

const docStore = [];
const providerStore = [];
const applicationStore = [];
const userStore = [];

const getPath = (o, p) => p.split('.').reduce((v, k) => (v == null ? undefined : v[k]), o);
const setPath = (o, p, val) => {
  const ks = p.split('.');
  let cur = o;
  for (const k of ks.slice(0, -1)) {
    if (cur[k] == null || typeof cur[k] !== 'object') cur[k] = {};
    cur = cur[k];
  }
  cur[ks[ks.length - 1]] = val;
};
// Mongo treats a missing field as null for equality/$ne purposes.
const norm = (v) => (v === undefined ? null : v);

const matchesCond = (val, cond) => {
  if (cond !== null && typeof cond === 'object' && !Array.isArray(cond) && !(cond instanceof Date)) {
    return Object.entries(cond).every(([op, arg]) => {
      switch (op) {
        case '$exists': return (val !== undefined) === arg;
        case '$in': return arg.map(String).includes(String(norm(val)));
        case '$nin': return !arg.map(String).includes(String(norm(val)));
        case '$ne': return norm(val) !== norm(arg);
        case '$lte': return val !== undefined && val !== null && val <= arg;
        case '$lt': return val !== undefined && val !== null && val < arg;
        case '$gte': return val !== undefined && val !== null && val >= arg;
        case '$gt': return val !== undefined && val !== null && val > arg;
        default: throw new Error(`documentExpiry fake: unsupported operator ${op}`);
      }
    });
  }
  return norm(val) === norm(cond);
};

const matchesFilter = (doc, filter) =>
  Object.entries(filter).every(([key, cond]) => {
    if (key === '$or') return cond.some((clause) => matchesFilter(doc, clause));
    if (key === '$and') return cond.every((clause) => matchesFilter(doc, clause));
    return matchesCond(getPath(doc, key), cond);
  });

const applyUpdate = (doc, update) => {
  for (const [k, v] of Object.entries(update.$set || {})) setPath(doc, k, v);
};

const chain = (value) => {
  const q = {
    select: () => q, lean: () => q, sort: () => q, limit: () => q, skip: () => q,
    then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
  };
  return q;
};

const collection = (store) => ({
  find: (filter) => chain(store.filter((d) => matchesFilter(d, filter))),
  findOneAndUpdate: async (filter, update) => {
    const doc = store.find((d) => matchesFilter(d, filter));
    if (!doc) return null;
    applyUpdate(doc, update);
    return doc;
  },
  updateOne: async (filter, update) => {
    const doc = store.find((d) => matchesFilter(d, filter));
    if (!doc) return { modifiedCount: 0 };
    applyUpdate(doc, update);
    return { modifiedCount: 1 };
  },
  countDocuments: async (filter) => store.filter((d) => matchesFilter(d, filter ?? {})).length,
});

// ── module mocks ────────────────────────────────────────────────────────────

const createNotification = jest.fn();
const auditLog = jest.fn();

jest.unstable_mockModule('../../src/models/ProviderDocument.js', () => ({ default: collection(docStore) }));
jest.unstable_mockModule('../../src/models/Provider.js', () => ({ default: collection(providerStore) }));
jest.unstable_mockModule('../../src/models/ProviderApplication.js', () => ({ default: collection(applicationStore) }));
jest.unstable_mockModule('../../src/models/User.js', () => ({ default: collection(userStore) }));
jest.unstable_mockModule('../../src/services/notificationService.js', () => ({
  default: {},
  createNotification,
}));
jest.unstable_mockModule('../../src/services/notificationDelivery.js', () => ({
  default: {},
  backoffMs: () => 60_000, // deterministic: no jitter in assertions
}));
jest.unstable_mockModule('../../src/middleware/audit.js', () => ({ auditLog }));

const job = await import('../../src/jobs/documentExpiry.job.js');
const {
  EXPIRY_THRESHOLDS, DEFAULT_GRACE_DAYS, LEASE_MS, MAX_ATTEMPTS,
  thresholdFor, configuredGraceDays, runDocumentExpiryOnce,
} = job;

// ── fixtures ────────────────────────────────────────────────────────────────

const DAY = 24 * 60 * 60 * 1000;
// Fixed clock: nothing in the suite reads wall time, so a host in any zone
// produces identical results.
const NOW = new Date('2026-10-01T12:00:00Z');

let docSeq = 0;
const seedDoc = (overrides = {}) => {
  docSeq += 1;
  const doc = {
    _id: `doc${docSeq}`,
    docType: 'drug_licence',
    status: 'verified',
    providerId: 'prov1',
    applicationId: null,
    uploadedBy: null,
    expiryDate: new Date(NOW.getTime() + 45 * DAY),
    expiryReminders: {},
    ...overrides,
  };
  docStore.push(doc);
  return doc;
};

const seedProvider = (overrides = {}) => {
  const provider = { _id: 'prov1', ownerUserId: 'owner1', status: 'live', name: 'Sunrise Pharmacy', ...overrides };
  providerStore.push(provider);
  return provider;
};

const callsWithDedup = (prefix) => createNotification.mock.calls
  .map((c) => c[0])
  .filter((arg) => String(arg.dedupKey || '').startsWith(prefix));

const auditActions = () => auditLog.mock.calls.map((c) => c[0]);

beforeEach(() => {
  docStore.length = 0;
  providerStore.length = 0;
  applicationStore.length = 0;
  userStore.length = 0;
  docSeq = 0;
  createNotification.mockReset().mockResolvedValue({ notification: { _id: 'n1' }, reason: null });
  auditLog.mockReset().mockResolvedValue(undefined);
});

// ── 1. threshold selection ──────────────────────────────────────────────────

describe('2.md 5 threshold selection', () => {
  it('maps an expiry date onto 60 / 30 / 7 / expired buckets', () => {
    expect(thresholdFor(new Date(NOW.getTime() + 45 * DAY), NOW)).toBe('d60');
    expect(thresholdFor(new Date(NOW.getTime() + 30 * DAY), NOW)).toBe('d30');
    expect(thresholdFor(new Date(NOW.getTime() + 31 * DAY), NOW)).toBe('d60');
    expect(thresholdFor(new Date(NOW.getTime() + 8 * DAY), NOW)).toBe('d30');
    expect(thresholdFor(new Date(NOW.getTime() + 7 * DAY), NOW)).toBe('d7');
    expect(thresholdFor(new Date(NOW.getTime() + 1 * DAY), NOW)).toBe('d7');
    expect(thresholdFor(new Date(NOW.getTime() - 1 * DAY), NOW)).toBe('expired');
    expect(thresholdFor(new Date(NOW.getTime() + 61 * DAY), NOW)).toBeNull();
  });

  it('only the CURRENT bucket fires — a licence 20 days out does not also send the 60-day copy', async () => {
    seedProvider();
    seedDoc({ expiryDate: new Date(NOW.getTime() + 20 * DAY) });
    const report = await runDocumentExpiryOnce(NOW);
    expect(report.sent).toBe(1);
    expect(callsWithDedup('doc-expiry:')).toHaveLength(1);
    expect(callsWithDedup('doc-expiry:')[0].dedupKey).toMatch(/:d30$/);
    expect(callsWithDedup('doc-expiry:')[0].title).toBe('Document expires in 30 days');
  });

  it('reads the grace period from DOC_EXPIRY_GRACE_DAYS and falls back to 7', () => {
    expect(configuredGraceDays({})).toBe(DEFAULT_GRACE_DAYS);
    expect(configuredGraceDays({ DOC_EXPIRY_GRACE_DAYS: '0' })).toBe(0);
    expect(configuredGraceDays({ DOC_EXPIRY_GRACE_DAYS: 'not-a-number' })).toBe(DEFAULT_GRACE_DAYS);
  });
});

// ── 2. one reminder per threshold, ever ─────────────────────────────────────

describe('2.md 5 reminders are recorded exactly once per threshold per document', () => {
  it('walks 60 -> 30 -> 7 -> expired and never repeats a threshold', async () => {
    seedProvider();
    seedDoc({ expiryDate: new Date(NOW.getTime() + 45 * DAY) });

    const r60 = await runDocumentExpiryOnce(NOW);
    expect(r60).toMatchObject({ scanned: 1, due: 1, sent: 1 });
    // Re-running the same day is the whole point of durable state.
    const again = await runDocumentExpiryOnce(NOW);
    expect(again).toMatchObject({ due: 0, sent: 0 });

    await runDocumentExpiryOnce(new Date(NOW.getTime() + 25 * DAY)); // 20d left -> d30
    await runDocumentExpiryOnce(new Date(NOW.getTime() + 40 * DAY)); // 5d left  -> d7
    await runDocumentExpiryOnce(new Date(NOW.getTime() + 50 * DAY)); // expired

    const keys = callsWithDedup('doc-expiry:').map((c) => c.dedupKey);
    expect(keys).toEqual([
      `doc-expiry:${docStore[0]._id}:d60`,
      `doc-expiry:${docStore[0]._id}:d30`,
      `doc-expiry:${docStore[0]._id}:d7`,
      `doc-expiry:${docStore[0]._id}:expired`,
    ]);

    // One more sweep changes nothing: four reminders is the ceiling.
    const after = await runDocumentExpiryOnce(new Date(NOW.getTime() + 51 * DAY));
    expect(after.sent).toBe(0);
    expect(callsWithDedup('doc-expiry:')).toHaveLength(4);
  });

  it('notifies the listing owner in-app with dedup + copy that carries no identity', async () => {
    seedProvider({ ownerUserId: 'owner1' });
    seedDoc({ expiryDate: new Date(NOW.getTime() + 5 * DAY) });

    await runDocumentExpiryOnce(NOW);
    const arg = callsWithDedup('doc-expiry:')[0];
    expect(arg.userId).toBe('owner1');
    expect(arg.type).toBe('reminder');
    expect(arg.title).toBe('Document expires in 7 days');
    expect(arg.message).toContain('drug licence');
    expect(arg.message).toContain('expires');
    // 2.md 14: no PII in notification copy.
    expect(arg.message).not.toMatch(/Sunrise|owner1/);
  });

  it('resolves the owner through the application when the document has no providerId yet', async () => {
    applicationStore.push({ _id: 'app1', providerId: 'prov1', applicantUserId: 'applicant9' });
    providerStore.push({ _id: 'prov1', ownerUserId: 'owner1', status: 'live' });
    seedDoc({ providerId: null, applicationId: 'app1', expiryDate: new Date(NOW.getTime() + 10 * DAY) });

    await runDocumentExpiryOnce(NOW);
    expect(callsWithDedup('doc-expiry:')[0].userId).toBe('owner1');
  });

  it('falls back to the applicant for an application that produced no listing', async () => {
    applicationStore.push({ _id: 'app2', providerId: null, applicantUserId: 'applicant9' });
    seedDoc({ providerId: null, applicationId: 'app2', expiryDate: new Date(NOW.getTime() + 10 * DAY) });

    await runDocumentExpiryOnce(NOW);
    expect(callsWithDedup('doc-expiry:')[0].userId).toBe('applicant9');
  });

  it('records a skip (never retries) when there is nobody to tell', async () => {
    seedDoc({ providerId: null, applicationId: null, uploadedBy: null });
    const report = await runDocumentExpiryOnce(NOW);
    expect(report).toMatchObject({ due: 1, skipped: 1, sent: 0 });
    expect(docStore[0].expiryReminders.d60.status).toBe('skipped');

    createNotification.mockClear();
    await runDocumentExpiryOnce(NOW);
    expect(createNotification).not.toHaveBeenCalled();
  });

  it('reclaims a stale lease from a crashed run but defers a fresh one', async () => {
    seedProvider();
    const doc = seedDoc({
      expiryDate: new Date(NOW.getTime() + 45 * DAY),
      expiryReminders: { d60: { status: 'sending', claimedAt: new Date(NOW.getTime() - LEASE_MS - 1000), attempts: 1 } },
    });
    const report = await runDocumentExpiryOnce(NOW);
    expect(report).toMatchObject({ due: 1, sent: 1 });
    expect(doc.expiryReminders.d60.status).toBe('sent');
    expect(doc.expiryReminders.d60.attempts).toBe(1); // attempts counts FAILURES only

    // fresh lease: a concurrent run owns it
    const doc2 = seedDoc({
      _id: 'docFresh',
      expiryDate: new Date(NOW.getTime() + 45 * DAY),
      expiryReminders: { d60: { status: 'sending', claimedAt: new Date(NOW.getTime() - 1000), attempts: 1 } },
    });
    const second = await runDocumentExpiryOnce(NOW);
    expect(second.deferred).toBe(1);
    expect(doc2.expiryReminders.d60.attempts).toBe(1);
  });

  it('parks a threshold after MAX_ATTEMPTS instead of retrying forever', async () => {
    seedProvider();
    seedDoc({
      expiryDate: new Date(NOW.getTime() + 45 * DAY),
      expiryReminders: { d60: { status: 'failed', attempts: MAX_ATTEMPTS, nextAttemptAt: new Date(NOW.getTime() - DAY) } },
    });
    const report = await runDocumentExpiryOnce(NOW);
    expect(report).toMatchObject({ due: 0, failed: 0, sent: 0 });
    expect(docStore[0].expiryReminders.d60.attempts).toBe(MAX_ATTEMPTS);
  });

  it('a transient suppression records a backoff and is retried once it lapses', async () => {
    seedProvider();
    seedDoc({ expiryDate: new Date(NOW.getTime() + 45 * DAY) });
    createNotification.mockResolvedValueOnce({ notification: null, reason: 'quiet-hours' });

    const first = await runDocumentExpiryOnce(NOW);
    expect(first.failed).toBe(1);
    expect(docStore[0].expiryReminders.d60.status).toBe('failed');
    expect(docStore[0].expiryReminders.d60.nextAttemptAt.getTime()).toBe(NOW.getTime() + 60_000);

    const beforeRetry = await runDocumentExpiryOnce(new Date(NOW.getTime() + 30_000));
    expect(beforeRetry).toMatchObject({ due: 1, deferred: 1 });
    expect(createNotification).toHaveBeenCalledTimes(1);

    const retried = await runDocumentExpiryOnce(new Date(NOW.getTime() + 61_000));
    expect(retried.sent).toBe(1);
    expect(docStore[0].expiryReminders.d60.status).toBe('sent');
    expect(docStore[0].lastReminderAt).toEqual(new Date(NOW.getTime() + 61_000));
  });

  it('ignores documents with no expiry date and rejected documents', async () => {
    seedProvider();
    seedDoc({ expiryDate: null });
    seedDoc({ status: 'rejected', expiryDate: new Date(NOW.getTime() + 10 * DAY) });
    const report = await runDocumentExpiryOnce(NOW);
    expect(report.scanned).toBe(0);
    expect(createNotification).not.toHaveBeenCalled();
  });
});

// ── 3. expiry -> suspension, exactly once ───────────────────────────────────

describe('2.md 12 / 8.md 2 auto-suspend on expiry + grace', () => {
  it('suspends the parent listing once, audits once, tells the owner once', async () => {
    const provider = seedProvider({ status: 'live' });
    seedDoc({ expiryDate: new Date(NOW.getTime() - 10 * DAY) }); // 10d ago > 7d grace

    const report = await runDocumentExpiryOnce(NOW);
    expect(report).toMatchObject({ expired: 1, suspended: 1 });
    expect(report.suspendedProviderIds).toEqual(['prov1']);
    expect(provider.status).toBe('suspended');
    expect(docStore[0].status).toBe('expired');

    expect(auditActions()).toContain('provider_suspended_document_expired');
    const audit = auditLog.mock.calls.find((c) => c[0] === 'provider_suspended_document_expired');
    expect(audit[2]).toMatchObject({ providerId: 'prov1', docType: 'drug_licence', graceDays: DEFAULT_GRACE_DAYS });
    expect(audit[2].reason).toContain('grace period ended');

    const ownerNotes = callsWithDedup('doc-expiry-suspended:');
    expect(ownerNotes).toHaveLength(1);
    expect(ownerNotes[0].userId).toBe('owner1');
    expect(ownerNotes[0].message).toContain('suspended');

    // Second sweep: still expired, still past grace, but NEVER twice.
    const second = await runDocumentExpiryOnce(NOW);
    expect(second.suspended).toBe(0);
    expect(auditActions().filter((a) => a === 'provider_suspended_document_expired')).toHaveLength(1);
    expect(callsWithDedup('doc-expiry-suspended:')).toHaveLength(1);
  });

  it('leaves a listing an admin already suspended alone (no second audit, no ping)', async () => {
    seedProvider({ status: 'suspended' });
    seedDoc({ expiryDate: new Date(NOW.getTime() - 10 * DAY) });
    const report = await runDocumentExpiryOnce(NOW);
    expect(report.suspended).toBe(0);
    expect(auditActions()).not.toContain('provider_suspended_document_expired');
    expect(callsWithDedup('doc-expiry-suspended:')).toHaveLength(0);
  });

  it('does not suspend a draft listing that has never gone live', async () => {
    seedProvider({ status: 'draft' });
    seedDoc({ expiryDate: new Date(NOW.getTime() - 10 * DAY) });
    const report = await runDocumentExpiryOnce(NOW);
    expect(report.suspended).toBe(0);
    expect(providerStore[0].status).toBe('draft');
  });

  it('honours the configurable grace window', async () => {
    seedProvider({ status: 'live' });
    seedDoc({ expiryDate: new Date(NOW.getTime() - 2 * DAY) }); // expired 2 days ago

    const duringGrace = await runDocumentExpiryOnce(NOW, { graceDays: 7 });
    expect(duringGrace.suspended).toBe(0);
    expect(providerStore[0].status).toBe('live');

    const noGrace = await runDocumentExpiryOnce(NOW, { graceDays: 0 });
    expect(noGrace.suspended).toBe(1);
    expect(providerStore[0].status).toBe('suspended');
  });

  it('two expired documents for the same listing still suspend it once', async () => {
    seedProvider({ status: 'live' });
    seedDoc({ docType: 'drug_licence', expiryDate: new Date(NOW.getTime() - 10 * DAY) });
    seedDoc({ docType: 'gst', expiryDate: new Date(NOW.getTime() - 3 * DAY) });

    const report = await runDocumentExpiryOnce(NOW);
    expect(report.expired).toBe(2);
    expect(report.suspended).toBe(1);
    expect(auditActions().filter((a) => a === 'provider_suspended_document_expired')).toHaveLength(1);
  });
});

// ── 4. ops alert (8.md 14) ──────────────────────────────────────────────────

describe('8.md 14 ops alert on licence expiry', () => {
  it('logs, audits and notifies every active superadmin once per IST day', async () => {
    userStore.push({ _id: 'sa1', role: 'superadmin', status: 'active' });
    userStore.push({ _id: 'sa2', role: 'superadmin', status: 'active' });
    userStore.push({ _id: 'sa3', role: 'superadmin', status: 'inactive' });
    seedProvider({ status: 'live' });
    seedDoc({ expiryDate: new Date(NOW.getTime() - 10 * DAY) });

    await runDocumentExpiryOnce(NOW);

    expect(auditActions()).toContain('document_expiry.ops_alert');
    const alerts = callsWithDedup('doc-expiry-ops:');
    expect(alerts).toHaveLength(2); // the two ACTIVE superadmins
    expect(alerts.map((a) => a.userId).sort()).toEqual(['sa1', 'sa2']);
    expect(alerts[0].title).toBe('Licence expiry alert');
    expect(new Set(alerts.map((a) => a.dedupKey)).size).toBe(1);

    // The same day again: dedup key is per IST day, so no second page.
    createNotification.mockClear();
    await runDocumentExpiryOnce(new Date(NOW.getTime() + 60 * 60 * 1000));
    expect(callsWithDedup('doc-expiry-ops:')).toHaveLength(0);
  });

  it('stays silent when a sweep finds nothing new', async () => {
    seedProvider({ status: 'live' });
    seedDoc({ expiryDate: new Date(NOW.getTime() + 45 * DAY) }); // only a 60-day reminder
    await runDocumentExpiryOnce(NOW);
    expect(auditActions()).not.toContain('document_expiry.ops_alert');
    expect(callsWithDedup('doc-expiry-ops:')).toHaveLength(0);
  });
});

// ── 5. wiring: a green job nobody schedules is the original bug again ────────

describe('wiring', () => {
  const indexSrc = fs.readFileSync(new URL('../../src/index.js', import.meta.url), 'utf8');
  const modelSrc = fs.readFileSync(new URL('../../src/models/ProviderDocument.js', import.meta.url), 'utf8');

  it('index.js starts the daily sweep', () => {
    expect(indexSrc).toContain('startDocumentExpiry');
    expect(indexSrc).toContain('documentExpiry.job.js');
  });

  it('the per-threshold reminder state lives on the ProviderDocument row', () => {
    expect(modelSrc).toMatch(/expiryReminders:/);
    expect(modelSrc).toMatch(/lastReminderAt:/);
  });

  it('exposes all three thresholds plus the expiry itself', () => {
    expect(EXPIRY_THRESHOLDS.map((t) => t.key)).toEqual(['d60', 'd30', 'd7', 'expired']);
  });
});
