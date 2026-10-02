/**
 * ADM-M-02: the approval trail. Who approved/rejected/suspended whom, when,
 * and why - for the three provider queues that had NO audit wiring while
 * doctors, hospitals and facilities already had it.
 *
 * Behavioural leg (mounted router): adminRiders, chosen because its state
 * machine is representative of all three (pending -> active, reject-with-reason,
 * suspend/reactivate toggle). The lawyers and assistants handlers are pinned by
 * source in the same suite - their structure is line-for-line the same shape,
 * and mounting three near-identical routers would prove the same property three
 * times at three times the cost.
 *
 * Two properties carry the finding:
 *   - the row is written ONLY when a decision actually happened. A 409 from the
 *     state machine (already-active rider) must produce no trail entry, or the
 *     history starts recording attempts as outcomes.
 *   - details carry BOTH ids: the user (targetUserId - what a user-centric
 *     history query matches) and the profile (profileId - the id the
 *     PendingApprovals queue holds, which is what its History button links
 *     with). One id only would break one of the two entry points.
 *
 * ONE mount per file: harness mocks are registered per test-file registry.
 */
import { describe, it, expect, jest, beforeAll, beforeEach } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import { mountApp, query } from '../helpers/appHarness.js';

const SUPER_ID = '64b000000000000000000aa';
const PROFILE_ID = '64b000000000000000000d1';
const TARGET_USER_ID = '64b000000000000000000d2';

let riderRow;
let auditDb;

const makeRider = (over = {}) => ({
  _id: PROFILE_ID,
  userId: TARGET_USER_ID,
  riderStatus: 'pending_approval',
  vehicleId: null,
  isOnline: true,
  save: jest.fn(async function () { return this; }),
  ...over,
});

const makeAuditDb = () => ({
  create: jest.fn(async (payload) => ({ _id: 'audit-row', ...payload })),
  find: jest.fn(() => query([])),
});

const riderModule = { findById: () => query(riderRow) };
const auditModule = { create: (...a) => auditDb.create(...a), find: (...a) => auditDb.find(...a) };
const userModule = { findByIdAndUpdate: () => query({}), find: () => query([]) };
const notificationModule = { create: jest.fn(async () => ({})) };

let as;
beforeAll(async () => {
  ({ as } = await mountApp('adminRiders', {
    '../../src/models/RiderProfile.js': () => ({ default: riderModule }),
    '../../src/models/User.js': () => ({ default: userModule }),
    '../../src/models/Notification.js': () => ({ default: notificationModule }),
    '../../src/models/AuditLog.js': () => ({ default: auditModule }),
  }));
});
beforeEach(() => {
  riderRow = makeRider();
  auditDb = makeAuditDb();
});

const superadmin = { _id: SUPER_ID, role: 'superadmin' };

describe('ADM-M-02 rider approval trail (behavioural)', () => {
  it('requires a session', async () => {
    await as().put(`/${PROFILE_ID}/approve`).expect(401);
    expect(auditDb.create).not.toHaveBeenCalled();
  });

  it('refuses a non-superadmin before any decision (and writes nothing)', async () => {
    await as({ _id: SUPER_ID, role: 'hospital_admin' }).put(`/${PROFILE_ID}/approve`).expect(403);
    expect(auditDb.create).not.toHaveBeenCalled();
    expect(riderRow.save).not.toHaveBeenCalled();
  });

  it('approve records WHO approved WHOM with both ids + network context', async () => {
    await as(superadmin).put(`/${PROFILE_ID}/approve`)
      .set('User-Agent', 'FindMedi-Admin/9.9')
      .expect(200);

    expect(auditDb.create).toHaveBeenCalledTimes(1);
    const payload = auditDb.create.mock.calls[0][0];
    expect(payload.action).toBe('approve_rider');
    expect(payload.userId).toBe(SUPER_ID);
    expect(payload.details.targetUserId).toBe(TARGET_USER_ID);
    expect(payload.details.profileId).toBe(PROFILE_ID);
    expect(payload.details.ip).toBeDefined();
    // captured FROM the header, not fabricated - send one and it lands in the row.
    expect(payload.details.userAgent).toBe('FindMedi-Admin/9.9');
    expect(payload.details.reason).toBeUndefined();
  });

  it('reject records WHO rejected, when, and WHY', async () => {
    await as(superadmin).put(`/${PROFILE_ID}/reject`).send({ reason: 'Licence scan unreadable' }).expect(200);

    const payload = auditDb.create.mock.calls[0][0];
    expect(payload.action).toBe('reject_rider');
    expect(payload.details.reason).toBe('Licence scan unreadable');
    expect(payload.details.targetUserId).toBe(TARGET_USER_ID);
  });

  it('suspension records the DIRECTION (suspend vs reactivate), not just the state', async () => {
    await as(superadmin).put(`/${PROFILE_ID}/suspend`).send({ suspend: true }).expect(200);
    expect(auditDb.create.mock.calls[0][0].action).toBe('suspend_rider');

    auditDb = makeAuditDb();
    riderRow = makeRider({ riderStatus: 'suspended' });
    await as(superadmin).put(`/${PROFILE_ID}/suspend`).send({ suspend: false }).expect(200);
    expect(auditDb.create.mock.calls[0][0].action).toBe('reactivate_rider');
  });

  it('a refused decision (409 state machine) leaves NO trail entry', async () => {
    riderRow = makeRider({ riderStatus: 'active' });
    await as(superadmin).put(`/${PROFILE_ID}/approve`).expect(409);
    expect(auditDb.create).not.toHaveBeenCalled();
    expect(riderRow.save).not.toHaveBeenCalled();
  });
});

describe('ADM-M-02 lawyers + assistants + delivery are wired too (source pin)', () => {
  // The behavioural leg above proves the PATTERN works end-to-end. These pins
  // make sure the other three files did not get left behind - the original
  // finding was precisely that coverage was inconsistent across queues.
  const read = (f) => fs.readFileSync(path.join(process.cwd(), 'src', 'routes', f), 'utf8');

  it('adminLawyers audits approve / reject / reactivate-or-suspend', () => {
    const src = read('adminLawyers.js');
    expect(src).toMatch(/auditLog\('approve_lawyer'/);
    expect(src).toMatch(/auditLog\('reject_lawyer'/);
    expect(src).toMatch(/auditLog\(nextStatus === 'suspended' \? 'suspend_lawyer' : 'reactivate_lawyer'/);
    expect(src).toMatch(/profileId: String\(profile\._id\)/);
    expect(src).toMatch(/reason,/);
  });

  it('adminAssistants audits approve / reject / reactivate-or-suspend', () => {
    const src = read('adminAssistants.js');
    expect(src).toMatch(/auditLog\('approve_assistant'/);
    expect(src).toMatch(/auditLog\('reject_assistant'/);
    expect(src).toMatch(/auditLog\(suspend \? 'suspend_assistant' : 'reactivate_assistant'/);
    expect(src).toMatch(/profileId: String\(assistant\._id\)/);
  });

  it('deliveryPartners verify (the PendingApprovals delivery queue) audits too', () => {
    const src = read('deliveryPartners.js');
    expect(src).toMatch(/auditLog\(action === 'approve' \? 'approve_delivery_partner' : 'reject_delivery_partner'/);
    expect(src).toMatch(/profileId: String\(partner\._id\)/);
  });
});
