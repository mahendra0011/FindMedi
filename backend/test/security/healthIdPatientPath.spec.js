/**
 * REC-M-04: revocation propagation through the patient-portal path.
 *
 * routes/patient.js owns `/health-id/generate` and `/health-id/settings` — the
 * two endpoints PatientHealthId.tsx actually calls — and it had drifted from
 * routes/healthId.js in both directions:
 *
 *   1. DEAD CARDS ON MINT: generate wrote only `qrToken`, never expiry or the
 *      rotation stamp. The scan path treats "no expiry, no rotation stamp" as
 *      REVOKED (HI-B-04), so a card minted through the shipped UI 404'd on its
 *      first scan — the UI looked fine and every printed QR was dead.
 *   2. REVOCATION THAT DEPENDED ON THE ROUTE: settings could flip `isEnabled`
 *      without revoking the token, so HI-B-04's guarantee held only if the
 *      client happened to call the other copy. Disabling now revokes through
 *      both paths (shared lib/healthIdCard.js helpers).
 *
 * Also pinned: the closed-enum settings schema (HI-B-03 parity) — a shareLevel
 * the schema cannot store is a 400, not a mongoose save-time 500.
 */
import { describe, it, expect, jest, beforeAll, beforeEach } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

let userRow;

const makeUser = (card = {}) => ({
  _id: '64b0000000000000000000aa',
  name: 'Portal Patient',
  healthIdCard: {
    isEnabled: true,
    shareLevel: 'full',
    qrToken: null,
    qrTokenExpiry: null,
    qrTokenRotatedAt: null,
    qrTokenRevokedAt: null,
    lastRotatedAt: null,
    ...card,
  },
  save: jest.fn(async function () { return this; }),
});

const userModule = { findById: () => query(userRow) };

let as;
beforeAll(async () => {
  ({ as } = await mountApp('patient', {
    '../../src/models/User.js': () => ({ default: userModule }),
  }));
});
beforeEach(() => {
  userRow = makeUser();
});

const me = { _id: '64b0000000000000000000aa', role: 'patient' };

describe('REC-M-04 patient-portal health-id path', () => {
  it('generate mints a token the scan path can actually read (expiry + rotation stamp present)', async () => {
    const res = await as(me).post('/health-id/generate').send({}).expect(200);
    const card = userRow.healthIdCard;
    expect(res.body.qrToken).toBeTruthy();
    expect(card.qrToken).toBe(res.body.qrToken);
    // The dead-card bug: without these two, the first scan revokes the token.
    expect(card.qrTokenExpiry).toBeInstanceOf(Date);
    expect(card.qrTokenExpiry.getTime()).toBeGreaterThan(Date.now());
    expect(card.qrTokenRotatedAt).toBeInstanceOf(Date);
    expect(userRow.save).toHaveBeenCalled();
  });

  it('disable REVOKES the token (revocation propagates through the route the UI calls)', async () => {
    userRow = makeUser({ qrToken: 'printed-card-token', qrTokenExpiry: new Date(Date.now() + 86400000), qrTokenRotatedAt: new Date() });
    await as(me).put('/health-id/settings').send({ isEnabled: false, shareLevel: 'minimal' }).expect(200);
    const card = userRow.healthIdCard;
    expect(card.isEnabled).toBe(false);
    // Nothing that printed or cached can resolve afterwards: the scan endpoint
    // looks the token up in the database and the token is gone.
    expect(card.qrToken).toBeUndefined();
    expect(card.qrTokenExpiry).toBeUndefined();
    expect(card.qrTokenRotatedAt).toBeUndefined();
    expect(card.qrTokenRevokedAt).toBeInstanceOf(Date);
  });

  it('re-enable mints a FRESH token with an expiry (not the revoked one)', async () => {
    userRow = makeUser({ isEnabled: false, qrToken: undefined, qrTokenRevokedAt: new Date() });
    await as(me).put('/health-id/settings').send({ isEnabled: true }).expect(200);
    const card = userRow.healthIdCard;
    expect(card.isEnabled).toBe(true);
    expect(card.qrToken).toBeTruthy();
    expect(card.qrTokenExpiry).toBeInstanceOf(Date);
    expect(card.qrTokenExpiry.getTime()).toBeGreaterThan(Date.now());
  });

  it('regenerate revokes the old token and mints a new one with an expiry', async () => {
    userRow = makeUser({ qrToken: 'old-printed-token', qrTokenExpiry: new Date(Date.now() + 86400000), qrTokenRotatedAt: new Date() });
    const res = await as(me).post('/health-id/generate').send({ regenerate: true }).expect(200);
    expect(res.body.qrToken).not.toBe('old-printed-token');
    expect(userRow.healthIdCard.lastRotatedAt).toBeInstanceOf(Date);
    expect(userRow.healthIdCard.qrTokenExpiry.getTime()).toBeGreaterThan(Date.now());
  });

  it('rejects a shareLevel the schema cannot store (400, not a save-time 500)', async () => {
    await as(me).put('/health-id/settings').send({ isEnabled: true, shareLevel: 'everything' }).expect(400);
    expect(userRow.save).not.toHaveBeenCalled();
  });

  it('requires a session', async () => {
    await as().post('/health-id/generate').send({}).expect(401);
    await as().put('/health-id/settings').send({ isEnabled: false }).expect(401);
  });
});
