/**
 * DLM-06 / ADM-M-07: the DPDP erasure workflow.
 *
 * The property under test is NOT "a flag gets set". It is that a certificate of
 * erasure cannot be produced unless every step of the chain actually reported
 * success, and that a certificate already issued cannot survive the chain being
 * edited afterwards.
 *
 * The code this replaced was `User.status = 'blocked'`, which is to say there
 * was no chain at all - and a blocked account was indistinguishable from an
 * erased one. If these tests pass while the workflow quietly stops erasing
 * something, the certificate still says it did, which is the worst possible
 * failure mode for a compliance artefact. So the assertions below are about
 * refusal: what the system must NOT certify.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { KAFKA_TOPICS } from '../../src/config/kafka.js';

const deleteMany = jest.fn(async () => ({ deletedCount: 0 }));
jest.unstable_mockModule('../../src/models/RefreshToken.js', () => ({
  default: { deleteMany: (...a) => deleteMany(...a) },
}));

const findById = jest.fn();
const updateOne = jest.fn(async () => ({ matchedCount: 1, modifiedCount: 1 }));
jest.unstable_mockModule('../../src/models/User.js', () => ({
  default: {
    findById: (...a) => findById(...a),
    updateOne: (...a) => updateOne(...a),
  },
}));

const purgeUserFromSearch = jest.fn(async () => ({ status: 'ok', detail: 'purged 0 doc(s)', purged: {} }));
jest.unstable_mockModule('../../src/services/opensearchIndexer.js', () => ({
  purgeUserFromSearch: (...a) => purgeUserFromSearch(...a),
}));

// DP-M-04: executeDeletion now emits a user.deleted tombstone through the
// outbox. Mocked so the real OutboxEvent.create never buffers against a
// disconnected mongoose (10s stall per execute), and so the tombstone
// contract itself is assertable. Registered before deletionService loads.
const writeOutboxEvent = jest.fn(async () => ({ _id: 'outbox_dp_m_04' }));
jest.unstable_mockModule('../../src/lib/transactionalOutbox.js', () => ({
  writeOutboxEvent: (...a) => writeOutboxEvent(...a),
  executeWithOutbox: async (fn) => fn(null),
}));

// ─── Route-level harness ────────────────────────────────────────────────────
// The router is mounted on a bare express app rather than the real one: the
// chain of custody logic is what is under test, and the real app would pull in
// CSRF, rate limiting and the whole model graph for four assertions.
let currentUser = null;
jest.unstable_mockModule('../../src/middleware/auth.js', () => ({
  protect: (req, res, next) => {
    if (!currentUser) return res.status(401).json({ message: 'no user' });
    req.user = currentUser;
    return next();
  },
  superadminOnly: (req, res, next) =>
    currentUser?.role === 'superadmin' ? next() : res.status(403).json({ message: 'Not authorized' }),
}));

const auditLog = jest.fn(async () => {});
jest.unstable_mockModule('../../src/middleware/audit.js', () => ({ auditLog: (...a) => auditLog(...a) }));

/** In-memory stand-in for DeletionRequest; the schema is exercised separately. */
const store = new Map();
const mkDoc = (over) => {
  const doc = {
    _id: `req_${store.size + 1}`,
    status: 'pending',
    steps: [],
    attempts: 0,
    save: async () => doc,
    issueCertificate: DeletionRequest.prototype.issueCertificate,
    certificateIsValid: DeletionRequest.prototype.certificateIsValid,
    ...over,
  };
  return doc;
};

const findQuery = (pred) => {
  const q = {
    sort: () => q,
    limit: () => q,
    lean: async () => [...store.values()].filter(pred),
    then: (r) => Promise.resolve([...store.values()].filter(pred)).then(r),
  };
  return q;
};

const DeletionRequestMock = {
  findOne: async (filter) => {
    const rows = [...store.values()].filter((r) => {
      if (filter.status?.$in) return filter.status.$in.includes(r.status);
      if (filter.status) return r.status === filter.status;
      return true;
    });
    const hit = rows.find((r) => String(r.userId) === String(filter.userId));
    return hit || null;
  },
  find: (filter) => findQuery((r) => !filter.userId || String(r.userId) === String(filter.userId)),
  findById: (id) => {
    const found = store.get(String(id)) || null;
    return {
      lean: async () => found,
      then: (r) => Promise.resolve(found).then(r),
    };
  },
  create: async (data) => {
    const doc = mkDoc(data);
    store.set(String(doc._id), doc);
    return doc;
  },
};

const { executeDeletion } = await import('../../src/services/deletionService.js');
const { default: DeletionRequest } = await import('../../src/models/DeletionRequest.js');
jest.unstable_mockModule('../../src/models/DeletionRequest.js', () => ({ default: DeletionRequestMock }));

const express = (await import('express')).default;
const supertest = (await import('supertest')).default;
const { default: deletionRoutes } = await import('../../src/routes/deletionRequests.js');

const app = express();
app.use(express.json());
app.use('/api/deletion-requests', deletionRoutes);

/**
 * Chainable query stub for `User.findById(...).select(...)`.
 *
 * MUST expose `.select()` and only then resolve: returning a bare promise
 * (the obvious way to mock this) throws TypeError on `.select` and fails every
 * test in the file for a reason unrelated to the code under test.
 *
 * Module scope because two describe blocks below both use it - a const inside
 * one describe is not visible to the next.
 */
const userQuery = (doc) => ({ select: () => Promise.resolve(doc) });

/** A chain with every step recorded as ok, ready to certify. */
const cleanChain = () =>
  ['revoke_sessions', 'purge_search_index', 'anonymize_user_document', 'revoke_credentials'].map((name) => ({
    name,
    status: 'ok',
    detail: 'done',
    at: new Date(),
  }));

const request = (over = {}) =>
  new DeletionRequest({
    userId: '64b000000000000000000001',
    status: 'completed',
    executedAt: new Date(),
    steps: cleanChain(),
    ...over,
  });

describe('DLM-06 certificate refuses to overstate what happened', () => {
  it('issues a certificate when the whole chain is clean', () => {
    // NOTE: the same document has to be reused. `request()` builds a fresh
    // model each call, so asserting on a second one would check a document
    // that never had a certificate minted and fail for the wrong reason.
    const doc = request();
    const cert = doc.issueCertificate();
    expect(cert).toBeTruthy();
    expect(cert.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(cert.scope).toEqual(['revoke_sessions', 'purge_search_index', 'anonymize_user_document', 'revoke_credentials']);
    expect(doc.certificateIsValid()).toBe(true);
  });

  it('refuses a certificate if ANY single step failed', () => {
    // The core fail-closed rule: one failure anywhere and there is no cert.
    for (const name of ['revoke_sessions', 'purge_search_index', 'anonymize_user_document', 'revoke_credentials']) {
      const steps = cleanChain().map((s) => (s.name === name ? { ...s, status: 'failed', detail: 'boom' } : s));
      const doc = request({ steps });
      expect(doc.issueCertificate()).toBeNull();
      expect(doc.certificateIsValid()).toBe(false);
    }
  });

  it('refuses when the chain is empty rather than certifying nothing', () => {
    expect(request({ steps: [] }).issueCertificate()).toBeNull();
  });

  it('invalidates a certificate if a step is edited AFTER it was issued', () => {
    const doc = request();
    const cert = doc.issueCertificate();
    expect(doc.certificateIsValid()).toBe(true);

    // This is the tampering case: the certificate exists, is presented as
    // valid, and only fails because the hash is recomputed over the chain.
    const tampered = doc.steps.find((s) => s.name === 'purge_search_index');
    tampered.status = 'failed';
    tampered.detail = 'purge never ran';

    expect(doc.certificate.sha256).toBe(cert.sha256); // still looks intact
    expect(doc.certificateIsValid()).toBe(false); // but is not
  });

  it('invalidates if a step DETAIL is edited, not only its status', () => {
    const doc = request();
    doc.issueCertificate();
    doc.steps[0].detail = 'actually 0 sessions were ever revoked';
    expect(doc.certificateIsValid()).toBe(false);
  });

  it('records a skipped step as a skip, not as work performed', () => {
    // OpenSearch not configured: there is nothing to purge, but the
    // certificate must not claim a search-tier erasure.
    const steps = cleanChain().map((s) =>
      s.name === 'purge_search_index' ? { ...s, status: 'skipped', detail: 'opensearch_not_configured' } : s,
    );
    const cert = request({ steps }).issueCertificate();

    expect(cert).toBeTruthy(); // nothing FAILED, so a cert is fair
    expect(cert.scope).not.toContain('purge_search_index');
    // Projected to plain objects: `skipped` is a mongoose subdocument array,
    // and toEqual against a plain literal compares mongoose's internal
    // properties too - the values match but the assertion does not.
    expect(cert.skipped.map((s) => ({ name: s.name, reason: s.reason }))).toEqual([
      { name: 'purge_search_index', reason: 'opensearch_not_configured' },
    ]);
  });

  it('contains no PII about the erased person', () => {
    const doc = request();
    const cert = doc.issueCertificate();
    // The certificate is handed out as proof; it must not itself become a
    // record that names the person it says was erased.
    const serialised = JSON.stringify(cert);
    expect(serialised).not.toContain(String(doc.userId));
    expect(serialised).not.toContain(String(doc._id));
    // Only step NAMES (a fixed vocabulary) and counts may appear.
    expect(serialised).not.toMatch(/"requestedBy"|"reason"|"email"|"phone"/);
  });
});

describe('DLM-06 executor', () => {
  // `userQuery` lives at module scope: two describe blocks here both need it,
  // and a const declared inside one describe is not visible to the other.
  const query = (doc) => ({ select: () => Promise.resolve(doc) });

  beforeEach(() => {
    jest.clearAllMocks();
    findById.mockImplementation(() =>
      query({
        _id: '64b000000000000000000001',
        email: 'real@example.com',
      }),
    );
    updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
    deleteMany.mockResolvedValue({ deletedCount: 2 });
    purgeUserFromSearch.mockResolvedValue({ status: 'ok', detail: 'purged 3 doc(s)', purged: {} });
  });

  const USER = '64b000000000000000000001';

  it('reports every step and names any that failed', async () => {
    const { steps, failed } = await executeDeletion(USER);
    expect(steps.map((s) => s.name)).toEqual([
      'revoke_sessions',
      'purge_search_index',
      'anonymize_user_document',
      'revoke_credentials',
    ]);
    expect(failed).toEqual([]);
  });

  it('does NOT stop at the first failure - later steps still run', async () => {
    // The tempting design is to bail out when the purge fails, but that leaves
    // Mongo holding the PII too. Partial erasure that is honestly reported
    // beats partial erasure hidden behind an early return.
    deleteMany.mockRejectedValue(new Error('mongo unavailable'));

    const { steps, failed } = await executeDeletion(USER);

    expect(failed).toEqual(['revoke_sessions']);
    // Everything after the failure still executed:
    expect(purgeUserFromSearch).toHaveBeenCalled();
    expect(updateOne).toHaveBeenCalled();
    expect(steps).toHaveLength(4);
    // And the one that failed is recorded as failed, not omitted:
    expect(steps[0]).toMatchObject({ name: 'revoke_sessions', status: 'failed' });
  });

  it('treats an unconfigured OpenSearch as SKIPPED, not as work done', async () => {
    purgeUserFromSearch.mockResolvedValue({ status: 'skipped', detail: 'opensearch_not_configured', purged: {} });

    const { steps, failed } = await executeDeletion(USER);
    const purge = steps.find((s) => s.name === 'purge_search_index');

    expect(failed).toEqual([]);
    expect(purge.status).toBe('skipped');
    expect(purge.detail).toBe('opensearch_not_configured');
    // The distinction that matters: an unconfigured index is NOT an ok purge.
    expect(purge.status).not.toBe('ok');
  });

  it('treats a purge that THROWS as failed', async () => {
    purgeUserFromSearch.mockRejectedValue(new Error('opensearch purge failed: 503'));

    const { failed } = await executeDeletion(USER);
    expect(failed).toEqual(['purge_search_index']);
  });

  it('emits a user.deleted tombstone after the chain, even when steps failed (DP-M-04)', async () => {
    // A partial erasure is an argument for propagating HARDER, not quieter:
    // the certificate already refuses to overstate the chain, but the
    // analytics copies must still be told the subject is going away.
    purgeUserFromSearch.mockRejectedValue(new Error('opensearch purge failed: 503'));

    const { failed } = await executeDeletion(USER);
    expect(failed).toEqual(['purge_search_index']);

    expect(writeOutboxEvent).toHaveBeenCalledTimes(1);
    const [arg] = writeOutboxEvent.mock.calls[0];
    expect(arg.eventType).toBe('user.deleted');
    expect(arg.destinationTopic).toBe(KAFKA_TOPICS.USER_TOMBSTONES);
    expect(arg.aggregateType).toBe('User');
    expect(arg.aggregateId).toBe(USER);
    expect(arg.payload).toMatchObject({ userId: USER, reason: 'erasure', deletedBy: null });
    expect(typeof arg.payload.deletedAt).toBe('string');
  });

  it('carries the admin actor and reason through to the tombstone (DP-M-04)', async () => {
    // DELETE /api/users/:id runs the same chain with reason=admin_delete so
    // downstream stores can distinguish an admin removal from a DPDP erasure.
    await executeDeletion(USER, { reason: 'admin_delete', deletedBy: '64b0000000000000000000fe' });

    const [arg] = writeOutboxEvent.mock.calls[0];
    expect(arg.payload.reason).toBe('admin_delete');
    expect(arg.payload.deletedBy).toBe('64b0000000000000000000fe');
  });

  it("keeps status 'blocked' so the sixteen existing guards still match", async () => {
    // The security regression this guards against: an 'erased' enum value
    // would satisfy the schema while every `status === 'blocked'` check in
    // auth.js / assistants.js / riders.js / lawyers.js silently stopped
    // matching - granting the person we just erased full access back.
    await executeDeletion(USER);

    const set = updateOne.mock.calls[0][1].$set;
    expect(set.status).toBe('blocked');
    expect(['active', 'blocked']).toContain(set.status);
    // Erasure is distinguished by a timestamp, not by weakening the guard.
    expect(set.erasedAt).toBeInstanceOf(Date);
  });

  it('unsets the date of birth instead of blanking it', async () => {
    // Mongoose DROPS `undefined` from $set, so the naive version of this
    // update is a silent no-op and the birth date survives erasure.
    await executeDeletion(USER);

    const update = updateOne.mock.calls[0][1];
    expect(update.$unset).toHaveProperty('dateOfBirth');
    expect(update.$unset).toHaveProperty('uhid');
    expect(update.$unset).toHaveProperty('currentLocation');
    expect(update.$set).not.toHaveProperty('dateOfBirth');
    expect(update.$set).not.toHaveProperty('uhid');
  });

  it('uses a per-user unique placeholder email', async () => {
    await executeDeletion(USER);
    // email is `unique`; a shared placeholder would collide and strand the
    // account holding its real PII.
    expect(updateOne.mock.calls[0][1].$set.email).toBe(`erased+${USER}@invalid.local`);
  });

  it('scrubs identity fields to constants rather than derived fingerprints', async () => {
    await executeDeletion(USER);
    const set = updateOne.mock.calls[0][1].$set;

    expect(set.name).toBe('Erased User');
    expect(set.phone).toBe('');
    expect(set.twoFactorSecret).toBe('');
    expect(set.twoFactorBackupCodes).toEqual([]);
    expect(set.driveTokens).toBeNull();

    // Nothing derived from the person's own PII: a hash of their email would
    // survive erasure and be reversible for low-entropy inputs.
    expect(JSON.stringify(set)).not.toMatch(/real@example\.com/);
    for (const value of Object.values(set)) {
      if (typeof value === 'string') expect(value).not.toMatch(/^[0-9a-f]{32,}$/);
    }
  });

  it('is safe to run twice', async () => {
    await executeDeletion(USER);
    findById.mockImplementation(() => userQuery(null)); // second run: already gone

    const { steps, failed } = await executeDeletion(USER);
    expect(failed).toEqual([]);
    expect(steps.find((s) => s.name === 'anonymize_user_document').detail).toContain('already absent');
  });
});

describe('ADM-M-07 chain of custody authorisation', () => {
  const OWNER = '64b0000000000000000000aa';
  const OTHER = '64b0000000000000000000bb';

  beforeEach(() => {
    store.clear();
    jest.clearAllMocks();
    currentUser = null;
    findById.mockImplementation((id) => userQuery({ _id: id }));
    updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
    deleteMany.mockResolvedValue({ deletedCount: 1 });
    purgeUserFromSearch.mockResolvedValue({ status: 'ok', detail: 'purged 0 doc(s)', purged: {} });
  });

  const asOwner = { id: OWNER, role: 'patient' };
  const asOther = { id: OTHER, role: 'patient' };
  const asSuper = { id: '64b000000000000000000cc', role: 'superadmin' };

  const seed = (over = {}) => {
    const doc = mkDoc({ userId: OWNER, ...over });
    store.set(String(doc._id), doc);
    return doc;
  };

  it('refuses an unauthenticated request', async () => {
    const res = await supertest(app).post('/api/deletion-requests').send({ reason: 'x' });
    expect(res.status).toBe(401);
  });

  it('lets a user request only their OWN erasure', async () => {
    currentUser = asOwner;
    const res = await supertest(app).post('/api/deletion-requests').send({ reason: 'I want out' });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('pending');
    // The id comes from the session, never from the body - otherwise a forged
    // `userId` field would let one person file erasure for another.
    expect(String(store.get(res.body.id).userId)).toBe(OWNER);
  });

  it('blocks a second open request rather than queuing duplicates', async () => {
    currentUser = asOwner;
    seed({ status: 'pending' });
    const res = await supertest(app).post('/api/deletion-requests').send({ reason: 'again' });
    expect(res.status).toBe(409);
  });

  it('hides someone else\'s request behind a 404, not a 403', async () => {
    const mine = seed({ userId: OWNER });
    currentUser = asOther;

    const res = await supertest(app).get(`/api/deletion-requests/${mine._id}`);
    // 404 rather than 403: a 403 would confirm that the guessed id exists.
    expect(res.status).toBe(404);
  });

  it('hides someone else\'s CERTIFICATE too', async () => {
    const mine = seed({ userId: OWNER, status: 'completed', certificate: { sha256: 'a'.repeat(64) } });
    currentUser = asOther;

    const res = await supertest(app).get(`/api/deletion-requests/${mine._id}/certificate`);
    expect(res.status).toBe(404);
  });

  it('refuses approve/execute to anyone who is not a superadmin', async () => {
    const doc = seed({ status: 'approved' });

    for (const who of [asOwner, { ...asOwner, role: 'admin' }, asOther]) {
      currentUser = who;
      expect((await supertest(app).post(`/api/deletion-requests/${doc._id}/approve`)).status).toBe(403);
      expect((await supertest(app).post(`/api/deletion-requests/${doc._id}/execute`)).status).toBe(403);
    }
  });

  it('refuses to approve a request that is not pending', async () => {
    // The state machine: approving out of `completed` would queue a second
    // erasure against a person whose data is already gone.
    const doc = seed({ status: 'completed' });
    currentUser = asSuper;

    const res = await supertest(app).post(`/api/deletion-requests/${doc._id}/approve`);
    expect(res.status).toBe(409);
    expect(doc.status).toBe('completed');
  });

  it('refuses to execute a request that was never approved', async () => {
    const doc = seed({ status: 'pending' });
    currentUser = asSuper;

    const res = await supertest(app).post(`/api/deletion-requests/${doc._id}/execute`);
    expect(res.status).toBe(409);
    expect(doc.attempts).toBe(0);
  });

  it('issues no certificate when execution reports a failed step', async () => {
    const doc = seed({ status: 'approved' });
    currentUser = asSuper;
    deleteMany.mockRejectedValue(new Error('mongo unavailable'));

    const res = await supertest(app).post(`/api/deletion-requests/${doc._id}/execute`);

    expect(res.status).toBe(500);
    expect(res.body.certificate).toBeNull();
    expect(res.body.failed).toEqual(['revoke_sessions']);
    expect(doc.status).toBe('failed');
    expect(doc.certificate).toBeUndefined();
  });

  it('issues a certificate on a clean chain and can serve it back', async () => {
    const doc = seed({ status: 'approved' });
    currentUser = asSuper;

    const exec = await supertest(app).post(`/api/deletion-requests/${doc._id}/execute`);
    expect(exec.status).toBe(200);
    expect(exec.body.certificate.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(doc.status).toBe('completed');

    const cert = await supertest(app).get(`/api/deletion-requests/${doc._id}/certificate`);
    expect(cert.status).toBe(200);
    expect(cert.body.certificate.sha256).toBe(exec.body.certificate.sha256);
  });

  it('rejects a certificate whose chain was edited after issuance', async () => {
    const doc = seed({ status: 'approved' });
    currentUser = asSuper;

    await supertest(app).post(`/api/deletion-requests/${doc._id}/execute`);
    // Tamper: flip a recorded success to a failure after the fact.
    doc.steps.find((s) => s.name === 'purge_search_index').status = 'failed';

    const res = await supertest(app).get(`/api/deletion-requests/${doc._id}/certificate`);
    expect(res.status).toBe(500);
    expect(res.body.message).toMatch(/does not match/);
  });

  it('returns 404 for a request that has no certificate yet', async () => {
    const doc = seed({ status: 'pending' });
    currentUser = asOwner;

    const res = await supertest(app).get(`/api/deletion-requests/${doc._id}/certificate`);
    expect(res.status).toBe(404);
  });
});
