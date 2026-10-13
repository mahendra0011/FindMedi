/**
 * File 25 §12: activity-log service — append-only writer that can never break
 * a clinical request, the sliding-window snooping detector (env-tunable so
 * tests don't need 60 fabricated reads), and the metrics counters behind
 * GET /access-log/metrics + GET /iam/metrics.
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

const createMock = jest.fn();

jest.unstable_mockModule('../../src/models/IamAccessLog.js', () => ({
  default: { create: (...a) => createMock(...a) },
}));

const svc = await import('../../src/services/iamAccessLogService.js');

const T0 = 1_700_000_000_000; // fixed epoch for window math

beforeEach(() => {
  svc.resetIamAccessLogState();
  createMock.mockReset();
  createMock.mockImplementation(async (doc) => ({ _id: 'log1', ...doc }));
  delete process.env.IAM_RESTRICTED_VOLUME_LIMIT;
  delete process.env.IAM_PHI_VOLUME_LIMIT;
});

afterEach(() => {
  delete process.env.IAM_RESTRICTED_VOLUME_LIMIT;
  delete process.env.IAM_PHI_VOLUME_LIMIT;
});

describe('PHI action classification', () => {
  it('counts clinical/financial reads, ignores everything else', () => {
    expect(svc.isPhiAction('records:read')).toBe(true);
    expect(svc.isPhiAction('prescriptions:read')).toBe(true);
    expect(svc.isPhiAction('billing:invoice:read')).toBe(true);
    expect(svc.isPhiAction('chat:read')).toBe(false);
    expect(svc.isPhiAction(undefined)).toBe(false);
  });
});

describe('snooping detector (sliding 15-min window)', () => {
  it('flags a burst of restricted PHI reads past the limit', () => {
    process.env.IAM_RESTRICTED_VOLUME_LIMIT = '2';
    const entry = { actorId: 'u1', action: 'records:read', sensitivity: 'restricted' };
    expect(svc.detectSnooping(entry, T0)).toBeNull();
    expect(svc.detectSnooping(entry, T0 + 10)).toBeNull();
    const flag = svc.detectSnooping(entry, T0 + 20);
    expect(flag).toMatch(/^restricted-volume:/);
  });

  it('flags a general PHI volume burst even without restricted labels', () => {
    process.env.IAM_PHI_VOLUME_LIMIT = '3';
    const entry = { actorId: 'u2', action: 'records:read', sensitivity: 'standard' };
    expect(svc.detectSnooping(entry, T0)).toBeNull();
    expect(svc.detectSnooping(entry, T0 + 1)).toBeNull();
    expect(svc.detectSnooping(entry, T0 + 2)).toBeNull();
    expect(svc.detectSnooping(entry, T0 + 3)).toMatch(/^phi-volume:/);
  });

  it('forgets events once they age out of the window', () => {
    process.env.IAM_RESTRICTED_VOLUME_LIMIT = '1';
    const entry = { actorId: 'u3', action: 'records:read', sensitivity: 'restricted' };
    expect(svc.detectSnooping(entry, T0)).toBeNull();
    expect(svc.detectSnooping(entry, T0 + 1)).toMatch(/^restricted-volume:/);
    // Beyond 15 min: both earlier events prune, count restarts at 1.
    expect(svc.detectSnooping(entry, T0 + 15 * 60 * 1000 + 2)).toBeNull();
  });

  it('ignores non-PHI actions and actorless entries', () => {
    process.env.IAM_RESTRICTED_VOLUME_LIMIT = '1';
    expect(svc.detectSnooping({ actorId: 'u4', action: 'chat:read', sensitivity: 'restricted' }, T0)).toBeNull();
    expect(svc.detectSnooping({ action: 'records:read', sensitivity: 'restricted' }, T0)).toBeNull();
  });

  it('keys buckets per actor — one noisy user never flags another', () => {
    process.env.IAM_RESTRICTED_VOLUME_LIMIT = '1';
    const a = { actorId: 'noisy', action: 'records:read', sensitivity: 'restricted' };
    const b = { actorId: 'calm', action: 'records:read', sensitivity: 'restricted' };
    svc.detectSnooping(a, T0);
    expect(svc.detectSnooping(a, T0 + 1)).toMatch(/^restricted-volume:/);
    expect(svc.detectSnooping(b, T0 + 2)).toBeNull();
  });
});

describe('logAccess — never throws, always counts', () => {
  it('stores a normalized allow row and bumps counters', async () => {
    const stored = await svc.logAccess({
      actorId: 'u1', action: 'records:read', decision: 'allow',
      reason: 'legacy-allow', accessReason: 'follow-up visit',
    });
    expect(stored).not.toBeNull();
    expect(createMock).toHaveBeenCalledTimes(1);
    const doc = createMock.mock.calls[0][0];
    expect(doc.decision).toBe('allow');
    expect(doc.flagged).toBe(false);
    expect(doc.accessReason).toBe('follow-up visit');
    const m = svc.getIamMetrics();
    expect(m.writes).toBe(1);
    expect(m.allow).toBe(1);
    expect(m.deny).toBe(0);
  });

  it('survives a dead database: returns null, counts the error, never rejects', async () => {
    createMock.mockImplementation(async () => { throw new Error('mongo down'); });
    const out = await svc.logAccess({ actorId: 'u1', action: 'records:read', decision: 'deny', reason: 'consent' });
    expect(out).toBeNull();
    const m = svc.getIamMetrics();
    expect(m.writeErrors).toBe(1);
    expect(m.deny).toBe(1);
  });

  it('flags + stores flagged=true on a restricted burst', async () => {
    process.env.IAM_RESTRICTED_VOLUME_LIMIT = '1';
    const base = { actorId: 'u5', action: 'records:read', sensitivity: 'restricted', decision: 'allow' };
    await svc.logAccess(base);
    const second = await svc.logAccess(base);
    expect(second.flagged).toBe(true);
    expect(second.flagReason).toMatch(/^restricted-volume:/);
    const m = svc.getIamMetrics();
    expect(m.flagged).toBe(1);
    expect(m.writes).toBe(2);
  });

  it('truncates oversized reason fields to schema caps', async () => {
    await svc.logAccess({
      actorId: 'u1', action: 'records:read', decision: 'allow',
      reason: 'r'.repeat(500), accessReason: 'a'.repeat(900),
    });
    const doc = createMock.mock.calls[0][0];
    expect(doc.reason.length).toBe(200);
    expect(doc.accessReason.length).toBe(300);
  });
});

describe('metrics surface', () => {
  it('exposes counters + detector config (§12 observability)', () => {
    svc.noteShadowMismatch();
    svc.noteShadowMismatch();
    const m = svc.getIamMetrics(T0);
    expect(m.shadowMismatches).toBe(2);
    expect(m.writes).toBe(0);
    expect(m.windowMs).toBe(15 * 60 * 1000);
    expect(m.phiVolumeLimit).toBe(60);
    expect(typeof m.at).toBe('string');
  });

  it('resetIamAccessLogState clears counters AND buckets', () => {
    process.env.IAM_RESTRICTED_VOLUME_LIMIT = '1';
    svc.detectSnooping({ actorId: 'u9', action: 'records:read', sensitivity: 'restricted' }, T0);
    svc.noteShadowMismatch();
    svc.resetIamAccessLogState();
    const m = svc.getIamMetrics();
    expect(m.shadowMismatches).toBe(0);
    expect(m.windows).toBe(0);
    // Bucket really cleared: same actor starts fresh past the limit again.
    expect(svc.detectSnooping({ actorId: 'u9', action: 'records:read', sensitivity: 'restricted' }, T0)).toBeNull();
  });
});
