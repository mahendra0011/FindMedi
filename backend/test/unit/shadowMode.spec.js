/**
 * File 23: "Shadow mode -> staged enforcement (mental health first)".
 *
 * Pins the gate contract that lets a new policy ship as audit-only before it
 * can deny traffic: shadow by default, 403 only when enforcement is switched
 * on globally (env or feature flag) or for a single rollout module.
 */
/* eslint-disable no-redeclare -- @jest/globals names shadow the configured test globals */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

const auditLog = jest.fn(async () => {});
const flags = {};

jest.unstable_mockModule('../../src/middleware/audit.js', () => ({ auditLog }));
jest.unstable_mockModule('../../src/services/featureFlags.js', () => ({
  isFeatureEnabled: (name) => Boolean(flags[name]),
}));

let shadowGate;

const makeReq = (overrides = {}) => ({
  user: { _id: 'user-1', role: 'superadmin' },
  originalUrl: '/api/ipd/admissions/abc',
  method: 'GET',
  ip: '127.0.0.1',
  ...overrides,
});

const makeRes = () => {
  const res = {
    statusCode: 200,
    body: null,
  };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
};

const callGate = async (moduleName, check, req = makeReq()) => {
  const next = jest.fn();
  const res = makeRes();
  await shadowGate(moduleName, check)(req, res, next);
  return { next, res };
};

beforeEach(async () => {
  jest.clearAllMocks();
  delete process.env.SHADOW_ENFORCE;
  delete process.env.SHADOW_ENFORCE_MODULES;
  for (const key of Object.keys(flags)) delete flags[key];
  ({ shadowGate } = await import('../../src/middleware/shadowMode.js'));
});

afterEach(() => {
  delete process.env.SHADOW_ENFORCE;
  delete process.env.SHADOW_ENFORCE_MODULES;
});

describe('shadowGate', () => {
  it('lets a passing check through without auditing', async () => {
    const { next, res } = await callGate('phi-platform', async () => true);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
    expect(auditLog).not.toHaveBeenCalled();
  });

  it('audits but allows a failing check in shadow mode (default)', async () => {
    const { next, res } = await callGate('phi-platform', async () => false);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
    expect(auditLog).toHaveBeenCalledTimes(1);
    expect(auditLog).toHaveBeenCalledWith(
      'shadow_violation',
      expect.objectContaining({ role: 'superadmin' }),
      expect.objectContaining({ module: 'phi-platform', mode: 'shadow' }),
    );
  });

  it('denies a failing check when SHADOW_ENFORCE=true', async () => {
    process.env.SHADOW_ENFORCE = 'true';

    const { next, res } = await callGate('phi-platform', async () => false);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body).toMatchObject({ code: 'SHADOW_DENIED', module: 'phi-platform' });
  });

  it('denies a failing check when the shadow_enforce feature flag is on', async () => {
    flags.shadow_enforce = true;

    const { next, res } = await callGate('phi-platform', async () => false);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });

  it('enforces per module from SHADOW_ENFORCE_MODULES only for that module', async () => {
    process.env.SHADOW_ENFORCE_MODULES = 'mental_health, records';

    const enforced = await callGate('mental_health', async () => false);
    expect(enforced.next).not.toHaveBeenCalled();
    expect(enforced.res.statusCode).toBe(403);

    const shadow = await callGate('phi-pharmacy', async () => false);
    expect(shadow.next).toHaveBeenCalledTimes(1);
    expect(shadow.res.statusCode).toBe(200);
  });

  it('fails open in shadow mode and closed (500) in enforce mode when the check throws', async () => {
    const shadowRun = await callGate('phi-platform', async () => { throw new Error('boom'); });
    expect(shadowRun.next).toHaveBeenCalledTimes(1);

    process.env.SHADOW_ENFORCE = 'true';
    const enforceRun = await callGate('phi-platform', async () => { throw new Error('boom'); });
    expect(enforceRun.next).not.toHaveBeenCalled();
    expect(enforceRun.res.statusCode).toBe(500);
  });
});
