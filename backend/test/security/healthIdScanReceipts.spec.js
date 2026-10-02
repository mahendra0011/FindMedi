/**
 * REC-M-04: health-ID scan receipts + revocation propagation (public scan side).
 *
 * The finding: QR scans were "audited" (REC-008) but the patient could not see
 * who scanned their card, and a revoked/disabled card's responses could be held
 * by caches. Building the receipts endpoint exposed two latent defects that are
 * pinned here:
 *
 *   1. THE AUDIT ROWS NEVER EXISTED. auditLog() was called with userId
 *      'public', and AuditLog.userId is an ObjectId — every scan write died in
 *      the cast and survived only as a pino error line. The row is now written
 *      under the CARD OWNER's id (details.actor records the anonymous scanner),
 *      which is exactly what makes GET /scans queryable. This suite asserts the
 *      create payload carries the owner's ObjectId, so 'public' cannot come back.
 *   2. NOTHING MAY CACHE THIS RESPONSE. no-store on the public scan and on the
 *      receipts: disable the card and the next read must be a database read, not
 *      a replay from a browser/proxy/CDN that predates the revocation.
 *
 * Scoping: GET /scans filters on the caller's own id — there is no parameter
 * that can reach another patient's receipts (asserted via the find filter).
 * The scanner is anonymous by design (no login on a paramedic's phone), so a
 * receipt records what the network saw: time, IP, user-agent, share level.
 *
 * ONE mount per file: the harness registers module mocks, and a route module
 * already imported is not re-evaluated by a second mountApp call. The mock
 * factories below close over mutable per-test state instead.
 */
import { describe, it, expect, jest, beforeAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import { mountApp, query } from '../helpers/appHarness.js';

const OWNER_ID = new mongoose.Types.ObjectId();

let userRow;
let auditDb;

const makeUser = (card = {}) => ({
  _id: OWNER_ID,
  name: 'Priya Patient',
  gender: 'female',
  bloodGroup: 'O+',
  dateOfBirth: Date.parse('1995-04-04'),
  allergies: [{ allergen: 'Penicillin', reaction: 'rash', severity: 'moderate' }],
  knownConditions: [],
  emergencyContact: { name: 'Ravi Patient', phone: '9999999999' },
  healthIdCard: {
    isEnabled: true,
    shareLevel: 'minimal',
    qrToken: 'live-token',
    qrTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
    qrTokenRotatedAt: new Date(),
    qrTokenRevokedAt: null,
    abhaNumber: '',
    ...card,
  },
  save: jest.fn(async function () { return this; }),
});

const makeAuditLog = () => ({
  create: jest.fn(async (payload) => ({
    _id: new mongoose.Types.ObjectId(),
    timestamp: payload.timestamp ?? new Date(),
    ...payload,
  })),
  find: jest.fn(() => query([])),
});

const userModule = { findOne: () => query(userRow), findById: () => query(userRow) };
const auditModule = { create: (...a) => auditDb.create(...a), find: (...a) => auditDb.find(...a) };

let as;
beforeAll(async () => {
  ({ as } = await mountApp('healthId', {
    '../../src/models/User.js': () => ({ default: userModule }),
    '../../src/models/AuditLog.js': () => ({ default: auditModule }),
  }));
});
beforeEach(() => {
  userRow = makeUser();
  auditDb = makeAuditLog();
});

describe('REC-M-04 public scan (healthId)', () => {
  it('scan resolves, is never cacheable, and writes the audit row under the card OWNER', async () => {
    const res = await as().get('/live-token').expect(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body.name).toBe('Priya Patient');

    expect(auditDb.create).toHaveBeenCalledTimes(1);
    const payload = auditDb.create.mock.calls[0][0];
    expect(payload.action).toBe('health_id_qr_scan');
    // The regression that made every receipt impossible: userId was 'public'.
    expect(payload.userId).toBe(OWNER_ID);
    expect(payload.userId).toBeInstanceOf(mongoose.Types.ObjectId);
    expect(payload.details.actor).toBe('public');
    expect(payload.details.shareLevel).toBe('minimal');
    expect(payload.details.ip).toBeDefined();
  });

  it('a disabled card 404s without a receipt and without a cacheable response', async () => {
    userRow = makeUser({ isEnabled: false });
    const res = await as().get('/live-token').expect(404);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(auditDb.create).not.toHaveBeenCalled();
  });

  it('a token with no expiry AND no rotation stamp is revoked on read (legacy rows cannot live forever)', async () => {
    userRow = makeUser({ qrTokenExpiry: null, qrTokenRotatedAt: null });
    await as().get('/live-token').expect(404);
    expect(userRow.healthIdCard.qrToken).toBeUndefined();
    expect(userRow.healthIdCard.qrTokenRevokedAt).toBeInstanceOf(Date);
    expect(userRow.save).toHaveBeenCalled();
    expect(auditDb.create).not.toHaveBeenCalled();
  });
});

describe('REC-M-04 GET /scans receipts', () => {
  it('requires a session', async () => {
    await as().get('/scans').expect(401);
  });

  it('returns ONLY the caller’s own receipts, mapped, sorted newest-first, no-store', async () => {
    const seen = new Date('2026-10-01T10:00:00Z');
    const rows = [
      { timestamp: seen, ip: '203.0.113.9', userAgent: 'AmbulanceApp/2.1', details: { shareLevel: 'minimal' } },
      { timestamp: new Date('2026-09-30T08:00:00Z'), ip: null, userAgent: null, details: {} },
    ];
    const chain = {
      sort: jest.fn(() => chain),
      limit: jest.fn(() => chain),
      then: (onF, onR) => Promise.resolve(rows).then(onF, onR),
    };
    auditDb.find = jest.fn(() => chain);

    const me = { _id: '64b000000000000000000001', role: 'patient' };
    const res = await as(me).get('/scans?limit=5000').expect(200);

    // Isolation is the filter: the query can only ever be scoped to the caller.
    expect(auditDb.find).toHaveBeenCalledWith({
      action: 'health_id_qr_scan',
      userId: me._id,
    });
    expect(chain.sort).toHaveBeenCalledWith({ timestamp: -1 });
    expect(chain.limit).toHaveBeenCalledWith(100); // clamped, not 5000

    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body.receipts).toHaveLength(2);
    expect(res.body.receipts[0]).toEqual({
      scannedAt: seen.toISOString(),
      ip: '203.0.113.9',
      userAgent: 'AmbulanceApp/2.1',
      shareLevel: 'minimal',
    });
    expect(res.body.receipts[1].ip).toBeNull();
    expect(res.body.receipts[1].shareLevel).toBeNull();
  });

  it('the receipts route wins over /:qrToken (route order)', async () => {
    auditDb.find = jest.fn(() => query([]));
    const res = await as({ _id: '64b000000000000000000001', role: 'patient' }).get('/scans').expect(200);
    expect(res.body).toHaveProperty('receipts');
  });
});
