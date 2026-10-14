/**
 * Join draft expiry + purge job (platform-expansion-plan.md:189 — "drafts
 * expire 30 days"; 2.md join flow data minimisation).
 *
 * Four properties this suite pins:
 *
 *   1. EXPIRE ONCE — a draft idle past the TTL flips to `expired` exactly
 *      once, with exactly one applicant notification and one audit row, no
 *      matter how many times the daily sweep runs.
 *   2. THE CLOCK IS THE ROW — only `status: 'draft'` with `updatedAt` past
 *      the cutoff expires; fresh drafts and submitted/review lanes are never
 *      touched, so a resumed draft is not expired out from under the user.
 *   3. PURGE IN ORDER — expired past the purge window: payload scrubbed, the
 *      local file bytes unlinked, the ProviderDocument rows dropped, and only
 *      then `purgedAt` stamped (the row itself survives for audit). Inside
 *      the window nothing moves; remote-stored bytes are left to their owner.
 *   4. FAIL SOFT, RETRY LOUD — a failing notification never aborts the run
 *      (the expiry already committed durably).
 *
 * Collections are in-memory fakes honouring ONLY the query shapes the job
 * uses; an unsupported operator throws, so a shape change fails loudly
 * instead of passing against a mock that ignores filters (same pattern as
 * documentExpiry.spec.js). The file-bytes assertions use a real file in the
 * real APPLICATION_DOCUMENTS_DIR, created and removed by this suite.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

// ── in-memory fakes ─────────────────────────────────────────────────────────

const appStore = [];
const docStore = [];

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
        default: throw new Error(`joinDraftExpiry fake: unsupported operator ${op}`);
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
  updateOne: async (filter, update) => {
    const doc = store.find((d) => matchesFilter(d, filter));
    if (!doc) return { matchedCount: 0, modifiedCount: 0 };
    applyUpdate(doc, update);
    return { matchedCount: 1, modifiedCount: 1 };
  },
  deleteMany: async (filter) => {
    const keep = store.filter((d) => !matchesFilter(d, filter));
    const deletedCount = store.length - keep.length;
    store.length = 0;
    store.push(...keep);
    return { deletedCount };
  },
  countDocuments: async (filter) => store.filter((d) => matchesFilter(d, filter ?? {})).length,
});

// ── module mocks ────────────────────────────────────────────────────────────

const createNotification = jest.fn();
const auditLog = jest.fn();

jest.unstable_mockModule('../../src/models/ProviderApplication.js', () => ({ default: collection(appStore) }));
jest.unstable_mockModule('../../src/models/ProviderDocument.js', () => ({ default: collection(docStore) }));
jest.unstable_mockModule('../../src/services/notificationService.js', () => ({ default: {}, createNotification }));
jest.unstable_mockModule('../../src/middleware/audit.js', () => ({ auditLog }));

const job = await import('../../src/jobs/joinDraftExpiry.job.js');
const {
  DEFAULT_DRAFT_TTL_DAYS, DEFAULT_PURGE_DAYS, DAY_MS,
  configuredDraftTtlDays, configuredPurgeDays, runJoinDraftExpiryOnce,
} = job;
const { APPLICATION_DOCUMENTS_DIR } = await import('../../src/services/applicationDocumentStore.js');

// ── fixtures ────────────────────────────────────────────────────────────────

// Fixed clock: nothing in the suite reads wall time, so a host in any zone
// produces identical results.
const NOW = new Date('2026-10-01T12:00:00.000Z');
const daysAgo = (n) => new Date(NOW.getTime() - n * DAY_MS);

const mkApp = (over = {}) => ({
  _id: 'app1',
  applicationId: 'APP-1',
  applicantUserId: 'user1',
  typeKey: 'hospital',
  status: 'draft',
  updatedAt: daysAgo(31),
  purgedAt: null,
  draft: { stepData: { account: { ownerName: 'Priya Sharma' } } },
  ...over,
});

const mkDoc = (over = {}) => ({
  _id: 'doc1',
  applicationId: 'app1',
  fileRef: { key: '', storage: 'local' },
  ...over,
});

const filePath = (name) => path.join(APPLICATION_DOCUMENTS_DIR, name);
const fileExists = async (name) => {
  try { await fsp.access(filePath(name)); return true; } catch { return false; }
};
const writeLocal = async (name) => {
  await fsp.mkdir(APPLICATION_DOCUMENTS_DIR, { recursive: true });
  await fsp.writeFile(filePath(name), 'fake-bytes');
};
const removeLocal = async (name) => {
  try { await fsp.unlink(filePath(name)); } catch { /* already gone */ }
};
const tmpName = () => `joinexpiry-test-${randomUUID()}.bin`;

// ── suite ───────────────────────────────────────────────────────────────────

describe('configuration', () => {
  it('defaults to the spec number and honours valid env overrides', () => {
    expect(DEFAULT_DRAFT_TTL_DAYS).toBe(30);
    expect(DEFAULT_PURGE_DAYS).toBe(30);
    expect(configuredDraftTtlDays({})).toBe(30);
    expect(configuredDraftTtlDays({ JOIN_DRAFT_TTL_DAYS: '10' })).toBe(10);
    expect(configuredDraftTtlDays({ JOIN_DRAFT_TTL_DAYS: 'abc' })).toBe(30);
    expect(configuredDraftTtlDays({ JOIN_DRAFT_TTL_DAYS: '-5' })).toBe(30);
    expect(configuredPurgeDays({})).toBe(30);
    expect(configuredPurgeDays({ JOIN_DRAFT_PURGE_DAYS: '7' })).toBe(7);
  });
});

describe('runJoinDraftExpiryOnce', () => {
  beforeEach(() => {
    appStore.length = 0;
    docStore.length = 0;
    createNotification.mockReset();
    createNotification.mockResolvedValue({ notification: { _id: 'n1' }, reason: null });
    auditLog.mockReset();
    auditLog.mockResolvedValue(undefined);
  });

  it('expires an idle draft once: status flip, one notification, one audit row', async () => {
    appStore.push(mkApp());

    const first = await runJoinDraftExpiryOnce(NOW);
    expect(first.expired).toBe(1);
    expect(first.expiredIds).toEqual(['app1']);
    expect(first.notified).toBe(1);
    expect(appStore[0].status).toBe('expired');
    expect(appStore[0].updatedAt).toEqual(NOW);
    expect(createNotification).toHaveBeenCalledTimes(1);
    expect(createNotification.mock.calls[0][0]).toMatchObject({
      userId: 'user1',
      dedupKey: 'join-draft-expired:app1',
      actor: 'joinDraftExpiryJob',
      type: 'system',
    });
    expect(auditLog).toHaveBeenCalledTimes(1);
    expect(auditLog.mock.calls[0][0]).toBe('join_draft.expired');
    expect(auditLog.mock.calls[0][1]).toBe('system');
    expect(auditLog.mock.calls[0][2]).toMatchObject({ count: 1, ttlDays: 30 });

    // Second sweep: nothing left to claim, nothing re-sent.
    const second = await runJoinDraftExpiryOnce(NOW);
    expect(second.expired).toBe(0);
    expect(second.notified).toBe(0);
    expect(createNotification).toHaveBeenCalledTimes(1);
    expect(auditLog).toHaveBeenCalledTimes(1);
  });

  it('leaves a draft touched inside the TTL alone', async () => {
    appStore.push(mkApp({ updatedAt: daysAgo(5) }));

    const report = await runJoinDraftExpiryOnce(NOW);
    expect(report.expired).toBe(0);
    expect(appStore[0].status).toBe('draft');
    expect(createNotification).not.toHaveBeenCalled();
    expect(auditLog).not.toHaveBeenCalled();
  });

  it('never expires submitted or in-review lanes, however old', async () => {
    appStore.push(
      mkApp({ _id: 'app2', status: 'submitted', updatedAt: daysAgo(40) }),
      mkApp({ _id: 'app3', status: 'needs_info', updatedAt: daysAgo(40) }),
      mkApp({ _id: 'app4', status: 'under_review', updatedAt: daysAgo(90) }),
    );

    const report = await runJoinDraftExpiryOnce(NOW);
    expect(report.expired).toBe(0);
    expect(appStore.map((a) => a.status)).toEqual(['submitted', 'needs_info', 'under_review']);
    expect(createNotification).not.toHaveBeenCalled();
  });

  it('purges an expired application in order: scrub, unlink, drop rows, stamp purgedAt', async () => {
    const key = tmpName();
    await writeLocal(key);
    try {
      appStore.push(mkApp({ status: 'expired', updatedAt: daysAgo(31) }));
      docStore.push(mkDoc({ fileRef: { key, storage: 'local' } }));

      const report = await runJoinDraftExpiryOnce(NOW);
      expect(report.purged).toBe(1);
      expect(report.purgedIds).toEqual(['app1']);
      expect(report.documentsDeleted).toBe(1);
      expect(report.filesDeleted).toBe(1);
      expect(report.purgeFailed).toBe(0);

      // Row survives for audit; payload and document rows do not — and the
      // blind indexes over that payload go with it (data minimisation).
      expect(appStore[0].status).toBe('expired');
      expect(appStore[0].draft.stepData).toEqual({});
      expect(appStore[0].phiIndexes).toEqual({ pan: null, gstin: null, registration_number: null });
      expect(appStore[0].applicationId).toBe('APP-1');
      expect(appStore[0].purgedAt).toEqual(NOW);
      expect(docStore).toHaveLength(0);
      expect(await fileExists(key)).toBe(false);
      expect(auditLog).toHaveBeenCalledTimes(1);
      expect(auditLog.mock.calls[0][0]).toBe('join_draft.purged');
      expect(auditLog.mock.calls[0][2]).toMatchObject({ count: 1, purgeDays: 30, documentsDeleted: 1, filesDeleted: 1 });

      // purgedAt is the claim: the same row is never purged (or re-audited) again.
      const again = await runJoinDraftExpiryOnce(NOW);
      expect(again.purged).toBe(0);
      expect(auditLog).toHaveBeenCalledTimes(1);
    } finally {
      await removeLocal(key);
    }
  });

  it('holds an expired application for the purge grace window', async () => {
    const key = tmpName();
    await writeLocal(key);
    try {
      appStore.push(mkApp({ status: 'expired', updatedAt: daysAgo(10) }));
      docStore.push(mkDoc({ fileRef: { key, storage: 'local' } }));

      const report = await runJoinDraftExpiryOnce(NOW);
      expect(report.purged).toBe(0);
      expect(appStore[0].draft.stepData).toEqual({ account: { ownerName: 'Priya Sharma' } });
      expect(appStore[0].purgedAt).toBeNull();
      expect(docStore).toHaveLength(1);
      expect(await fileExists(key)).toBe(true);
      expect(auditLog).not.toHaveBeenCalled();
    } finally {
      await removeLocal(key);
    }
  });

  it('never purges an application that already carries purgedAt', async () => {
    const key = tmpName();
    await writeLocal(key);
    try {
      appStore.push(mkApp({ status: 'expired', updatedAt: daysAgo(60), purgedAt: daysAgo(30) }));
      docStore.push(mkDoc({ fileRef: { key, storage: 'local' } }));

      const report = await runJoinDraftExpiryOnce(NOW);
      expect(report.purged).toBe(0);
      expect(docStore).toHaveLength(1);
      expect(await fileExists(key)).toBe(true);
    } finally {
      await removeLocal(key);
    }
  });

  it('drops the document row but leaves remote-stored bytes where they are', async () => {
    const key = tmpName();
    await writeLocal(key);
    try {
      appStore.push(mkApp({ status: 'expired', updatedAt: daysAgo(31) }));
      docStore.push(mkDoc({ fileRef: { key, storage: 'remote' } }));

      const report = await runJoinDraftExpiryOnce(NOW);
      expect(report.purged).toBe(1);
      expect(report.filesDeleted).toBe(0);
      expect(docStore).toHaveLength(0);
      expect(await fileExists(key)).toBe(true);
    } finally {
      await removeLocal(key);
    }
  });

  it('a failing notification never aborts the expiry that already committed', async () => {
    createNotification.mockRejectedValueOnce(new Error('delivery down'));
    appStore.push(mkApp());

    const report = await runJoinDraftExpiryOnce(NOW);
    expect(report.expired).toBe(1);
    expect(report.notified).toBe(0);
    expect(appStore[0].status).toBe('expired');
    expect(auditLog).toHaveBeenCalledTimes(1);
    expect(auditLog.mock.calls[0][0]).toBe('join_draft.expired');
  });
});
