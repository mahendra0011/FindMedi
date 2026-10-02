/**
 * DP-M-04 — GDPR/DPDP erasure propagation to analytics copies.
 *
 * Three layers under test:
 *   1. DELETE /api/users/:id used to be a raw findByIdAndDelete: sessions kept
 *      working, OpenSearch kept the docs, the lake was never told. It must now
 *      run the DLM-06 chain BEFORE the row goes away and report chain failures
 *      instead of hiding them.
 *   2. `purgeUserFromLakeManifests` — the lake handoff manifest has no user id
 *      column, so the join goes through Mongo (rider AND driver sides) and a
 *      line-level rewrite that keeps malformed lines rather than pretending it
 *      purged what it cannot parse.
 *   3. Consumer wiring — the `user.deleted` switch case and the topic
 *      subscription that fan the tombstone out (lag parity is pinned by
 *      opsHealth.spec, registry completeness by eventSchemaRegistry.spec).
 *
 * Route + lake live in one file deliberately: LAKE_MANIFEST_DIR is read at
 * module load, so the env scrub, the mocks and both dynamic imports have to be
 * sequenced in a single module scope.
 */
import { describe, it, expect, jest, beforeEach, afterAll } from '@jest/globals';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// ─── Lake env + model mocks (before any dynamic import) ──────────────────────
const MANIFEST_DIR = mkdtempSync(path.join(tmpdir(), 'findmedi-lake-dp-m-04-'));
process.env.LAKE_MANIFEST_DIR = MANIFEST_DIR;

let mockReadyState = 1;
jest.unstable_mockModule('mongoose', () => ({
  default: { connection: { get readyState() { return mockReadyState; } } },
}));

const rideFind = jest.fn();
jest.unstable_mockModule('../../src/models/RideBooking.js', () => ({
  default: { find: (...a) => rideFind(...a) },
}));

// ─── Route harness mocks ─────────────────────────────────────────────────────
let currentUser = null;
jest.unstable_mockModule('../../src/middleware/auth.js', () => ({
  protect: (req, res, next) => {
    if (!currentUser) return res.status(401).json({ message: 'no user' });
    req.user = currentUser;
    return next();
  },
  adminOnly: (req, res, next) =>
    currentUser && ['admin', 'superadmin'].includes(currentUser.role)
      ? next()
      : res.status(403).json({ message: 'Not authorized' }),
  superadminOnly: (req, res, next) =>
    currentUser?.role === 'superadmin' ? next() : res.status(403).json({ message: 'Not authorized' }),
}));

const auditLog = jest.fn(async () => {});
jest.unstable_mockModule('../../src/middleware/audit.js', () => ({ auditLog: (...a) => auditLog(...a) }));

const order = [];
const userFindById = jest.fn();
const userFindByIdAndDelete = jest.fn(async () => {
  order.push('delete');
  return {};
});
jest.unstable_mockModule('../../src/models/User.js', () => ({
  default: {
    findById: (...a) => userFindById(...a),
    findByIdAndDelete: (...a) => userFindByIdAndDelete(...a),
  },
}));

jest.unstable_mockModule('../../src/services/notificationService.js', () => ({
  sendAccountBlockedEmail: jest.fn(async () => {}),
}));

const executeDeletion = jest.fn(async () => {
  order.push('chain');
  return { steps: [], failed: [] };
});
jest.unstable_mockModule('../../src/services/deletionService.js', () => ({
  executeDeletion: (...a) => executeDeletion(...a),
  emitUserDeletedTombstone: jest.fn(async () => {}),
}));

// ─── Imports (dynamic, after mocks + env) ────────────────────────────────────
const express = (await import('express')).default;
const supertest = (await import('supertest')).default;
const { default: userRoutes } = await import('../../src/routes/users.js');
const { purgeUserFromLakeManifests } = await import('../../src/jobs/lakeOffload.job.js');

const app = express();
app.use(express.json());
app.use('/api/users', userRoutes);
const request = supertest(app);

const TARGET = '652f000000000000000000aa';
const ADMIN = { id: '652f000000000000000000ad', _id: '652f000000000000000000ad', role: 'admin' };

afterAll(() => {
  rmSync(MANIFEST_DIR, { recursive: true, force: true });
});

describe('DP-M-04 · DELETE /api/users/:id runs the chain before the hard delete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    order.length = 0;
    currentUser = ADMIN;
    executeDeletion.mockImplementation(async () => {
      order.push('chain');
      return { steps: [], failed: [] };
    });
    userFindById.mockResolvedValue({ _id: TARGET, role: 'patient' });
    userFindByIdAndDelete.mockImplementation(async () => {
      order.push('delete');
      return {};
    });
  });

  it('revokes/purges/anonymises FIRST, then removes the row, then reports Deleted', async () => {
    const res = await request.delete(`/api/users/${TARGET}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Deleted');
    expect(res.body.erasureWarnings).toBeUndefined();
    // The whole point: the chain must not run against a row that is already
    // gone, and the row must not survive a chain that already ran.
    expect(order).toEqual(['chain', 'delete']);
    expect(executeDeletion).toHaveBeenCalledWith(TARGET, {
      reason: 'admin_delete',
      deletedBy: ADMIN.id,
    });
    expect(userFindByIdAndDelete).toHaveBeenCalledTimes(1);
  });

  it('surfaces chain failures as warnings instead of hiding them', async () => {
    executeDeletion.mockResolvedValue({ steps: [], failed: ['purge_search_index'] });

    const res = await request.delete(`/api/users/${TARGET}`);

    expect(res.status).toBe(200);
    expect(res.body.erasureWarnings).toEqual(['purge_search_index']);
    // auditLog(action, actorId, details) — details is the third argument.
    const [, , details] = auditLog.mock.calls[auditLog.mock.calls.length - 1];
    expect(details.erasureFailures).toEqual(['purge_search_index']);
  });

  it('refuses to delete your own account', async () => {
    currentUser = { ...ADMIN, id: TARGET };
    const res = await request.delete(`/api/users/${TARGET}`);

    expect(res.status).toBe(400);
    expect(executeDeletion).not.toHaveBeenCalled();
    expect(userFindByIdAndDelete).not.toHaveBeenCalled();
  });

  it('refuses a hospital admin deleting outside their tenant', async () => {
    currentUser = { ...ADMIN, hospitalId: 'H1' };
    userFindById.mockResolvedValue({ _id: TARGET, hospitalId: 'H2' });

    const res = await request.delete(`/api/users/${TARGET}`);

    expect(res.status).toBe(403);
    expect(executeDeletion).not.toHaveBeenCalled();
    expect(userFindByIdAndDelete).not.toHaveBeenCalled();
  });

  it('404s without touching the chain when the user is already gone', async () => {
    userFindById.mockResolvedValue(null);
    const res = await request.delete(`/api/users/${TARGET}`);

    expect(res.status).toBe(404);
    expect(executeDeletion).not.toHaveBeenCalled();
    expect(userFindByIdAndDelete).not.toHaveBeenCalled();
  });

  it('stays behind protect + adminOnly (authz pin)', () => {
    const src = readFileSync(new URL('../../src/routes/users.js', import.meta.url), 'utf8');
    expect(src).toMatch(/router\.delete\('\/:id',\s*protect,\s*adminOnly/);
  });
});

describe('DP-M-04 · lake manifest purge', () => {
  const line = (o) => JSON.stringify(o);
  const partition = (name) => path.join(MANIFEST_DIR, name);

  beforeEach(() => {
    jest.clearAllMocks();
    mockReadyState = 1;
    rideFind.mockImplementation(() => ({
      select: () => ({ lean: async () => [] }),
    }));
    rmSync(MANIFEST_DIR, { recursive: true, force: true });
    mkdirSync(MANIFEST_DIR, { recursive: true });
  });

  it('removes only the subject trips across partitions and keeps unparseable lines', async () => {
    // The subject appears as a RIDER in one partition and a DRIVER in another.
    rideFind.mockImplementation(() => ({
      select: () => ({ lean: async () => [{ _id: 't_r1' }, { _id: 't_d1' }] }),
    }));
    const a = partition('date_partition=2026-09-30.jsonl');
    const b = partition('date_partition=2026-10-01.jsonl');
    fs_write(a, [line({ trip_id: 't_r1' }), line({ trip_id: 't_other' }), 'not-json-at-all', ''].join('\n') + '\n');
    fs_write(b, [line({ trip_id: 't_d1' }), line({ trip_id: 't_other2' })].join('\n') + '\n');

    const r = await purgeUserFromLakeManifests('652f00000000000000000001');

    expect(r).toMatchObject({ purged: 2, partitions: 2, trips: 2 });
    const after = fs_read(a);
    expect(after).toContain('t_other');
    expect(after).not.toContain('t_r1');
    // A line we cannot parse is not a line we can claim to have purged.
    expect(after).toContain('not-json-at-all');
    expect(fs_read(b)).toContain('t_other2');
    expect(fs_read(b)).not.toContain('t_d1');
    // The join covers both sides of the trip.
    expect(rideFind.mock.calls[0][0]).toEqual({
      $or: [
        { userId: '652f00000000000000000001' },
        { driverId: '652f00000000000000000001' },
        { providerId: '652f00000000000000000001' },
      ],
    });
  });

  it('leaves manifests untouched when the subject owns no trips', async () => {
    const a = partition('date_partition=2026-09-30.jsonl');
    const before = line({ trip_id: 't_other' }) + '\n';
    fs_write(a, before);

    const r = await purgeUserFromLakeManifests('652f00000000000000000001');

    expect(r).toEqual({ purged: 0, trips: 0 });
    expect(fs_read(a)).toBe(before);
  });

  it('skips without touching the filesystem when the database is unavailable', async () => {
    mockReadyState = 0;
    const r = await purgeUserFromLakeManifests('652f00000000000000000001');

    expect(r).toEqual({ purged: 0, skipped: 'db_unavailable' });
    expect(rideFind).not.toHaveBeenCalled();
  });

  it('reports trips but purges nothing when the manifest dir does not exist', async () => {
    rideFind.mockImplementation(() => ({
      select: () => ({ lean: async () => [{ _id: 't_r1' }] }),
    }));
    rmSync(MANIFEST_DIR, { recursive: true, force: true });

    const r = await purgeUserFromLakeManifests('652f00000000000000000001');

    expect(r).toEqual({ purged: 0, trips: 1 });
    expect(existsSync(MANIFEST_DIR)).toBe(false);
  });
});

describe('DP-M-04 · consumer wiring', () => {
  const src = readFileSync(new URL('../../src/services/kafkaConsumerService.js', import.meta.url), 'utf8');

  it('subscribes to the tombstone topic and handles user.deleted', () => {
    expect(src).toContain('KAFKA_TOPICS.USER_TOMBSTONES');
    expect(src).toContain("case 'user.deleted'");
    expect(src).toContain('purgeUserFromLakeManifests');
    expect(src).toContain('purgeUserFromSearch');
  });
});

function fs_write(p, content) {
  writeFileSync(p, content);
}
function fs_read(p) {
  return readFileSync(p, 'utf8');
}
