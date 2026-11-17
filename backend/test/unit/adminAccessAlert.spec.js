/**
 * File 23 §5.2: admin-PHI access alerting. Mass-view and off-hours patterns
 * raise a deduped security_alert notification for DPO/security/super-admins;
 * everything else stays quiet. Detection only — reads are never blocked.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const aggregateMock = jest.fn();
const userFindMock = jest.fn();
const notifUpdateMock = jest.fn();
const auditLogMock = jest.fn();

jest.unstable_mockModule('../../src/models/AuditLog.js', () => ({
  default: { aggregate: (...a) => aggregateMock(...a) },
}));
jest.unstable_mockModule('../../src/models/User.js', () => ({
  default: { find: (...a) => userFindMock(...a) },
}));
jest.unstable_mockModule('../../src/models/Notification.js', () => ({
  default: { updateOne: (...a) => notifUpdateMock(...a) },
}));
jest.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLog: (...a) => auditLogMock(...a),
}));

const { runAdminAccessAlerts } = await import('../../src/jobs/adminAccessAlert.job.js');

const recipientsChain = (rows) => ({
  select: () => ({ limit: () => ({ lean: async () => rows }) }),
});

const DAY_NOON = new Date(2026, 10, 15, 12, 0, 0);   // 12:00 — business hours
const DAY_NIGHT = new Date(2026, 10, 15, 2, 0, 0);   // 02:00 — off hours

beforeEach(() => {
  aggregateMock.mockReset();
  userFindMock.mockReset();
  notifUpdateMock.mockReset();
  auditLogMock.mockReset();
  userFindMock.mockReturnValue(recipientsChain([{ _id: 'dpo1' }]));
  notifUpdateMock.mockResolvedValue({ upsertedCount: 1 });
});

describe('static adminAccessAlert job', () => {
  it('does nothing when no admin-PHI reads happen', async () => {
    aggregateMock.mockResolvedValue([]);
    const out = await runAdminAccessAlerts(DAY_NOON);
    expect(out).toEqual({ scanned: 0, flagged: 0, notified: 0, offHours: false });
    expect(notifUpdateMock).not.toHaveBeenCalled();
  });

  it('flags mass-view during business hours', async () => {
    aggregateMock.mockResolvedValue([{ _id: 'op1', count: 12, lastAt: DAY_NOON, lastIp: '1.2.3.4' }]);
    const out = await runAdminAccessAlerts(DAY_NOON, { massThreshold: 10 });
    expect(out.flagged).toBe(1);
    expect(out.notified).toBe(1);
    expect(notifUpdateMock).toHaveBeenCalledTimes(1);
    const [, update] = notifUpdateMock.mock.calls[0];
    expect(update.$setOnInsert.type).toBe('security_alert');
    expect(update.$setOnInsert.priority).toBe('critical');
    expect(update.$setOnInsert.dedupKey).toBe('adminphi:op1:2026-11-15');
    expect(auditLogMock).toHaveBeenCalledWith('admin_phi_access_alert', 'op1', expect.objectContaining({ reasons: ['mass-view'] }));
  });

  it('flags ANY admin-PHI access off-hours, even a single read', async () => {
    aggregateMock.mockResolvedValue([{ _id: 'op2', count: 1, lastAt: DAY_NIGHT, lastIp: '5.6.7.8' }]);
    const out = await runAdminAccessAlerts(DAY_NIGHT);
    expect(out.offHours).toBe(true);
    expect(out.flagged).toBe(1);
    expect(out.notified).toBe(1);
  });

  it('does NOT flag below threshold during business hours', async () => {
    aggregateMock.mockResolvedValue([{ _id: 'op3', count: 3, lastAt: DAY_NOON, lastIp: '9.9.9.9' }]);
    const out = await runAdminAccessAlerts(DAY_NOON, { massThreshold: 10 });
    expect(out.flagged).toBe(0);
    expect(notifUpdateMock).not.toHaveBeenCalled();
  });

  it('survives an aggregate failure without throwing', async () => {
    aggregateMock.mockRejectedValue(new Error('db down'));
    const out = await runAdminAccessAlerts(DAY_NOON);
    expect(out).toEqual({ scanned: 0, flagged: 0, notified: 0, reason: 'aggregate-failed' });
  });
});
