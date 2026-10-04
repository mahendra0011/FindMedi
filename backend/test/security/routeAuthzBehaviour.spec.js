/**
 * Behavioural regression tests for the authorization fixes made after the
 * re-audit.
 *
 * The tests in highPriorityGaps.spec.js assert on source TEXT, which cannot
 * catch a guard that is present but WRONG (scoped to the wrong field, running
 * after the mutation, or degrading to an unscoped query). These mount the real
 * route module and assert on the actual response.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

// Mocks are registered ONCE at module scope, and the mock functions are
// STABLE module-level references.
//
// Two earlier attempts failed here for the same underlying reason: calling
// `jest.unstable_mockModule` again inside each test re-registers a factory, but
// the module registry keeps serving the FIRST registration. The second test's
// `find` was therefore never wired up - the route called the first test's
// un-stubbed mock, got `undefined` back, and the route's own catch turned that
// into a 500. It surfaced as a 500 in an unrelated assertion, which is why the
// body is asserted on, not just the status.
//
// A Date.now() cache-buster is unsafe for the same class of reason: two tests in
// the same millisecond produce an identical query string, so the registry
// returns the previous module. With stable mocks no cache-buster is needed.
import { readFileSync } from 'node:fs';

const annFind = jest.fn();
const emgUserFind = jest.fn();
const emgCreate = jest.fn(async (d) => ({ _id: 'e1', ...d }));

jest.unstable_mockModule('../../src/models/Announcement.js', () => ({ default: { find: annFind } }));
jest.unstable_mockModule('../../src/models/User.js', () => ({ default: { find: emgUserFind } }));
jest.unstable_mockModule('../../src/models/Emergency.js', () => ({ default: { create: emgCreate } }));

const annMod = await import('../../src/routes/announcements.js');
const emgMod = await import('../../src/routes/emergency.js');

// A chainable thenable, so a test does not have to know whether the route calls
// .find().populate().sort() or .find().sort().populate().
const query = (value) => {
  const q = {
    sort: () => q,
    populate: () => q,
    select: () => q,
    lean: () => q,
    limit: () => q,
    then: (resolve) => Promise.resolve(value).then(resolve),
  };
  return q;
};

// `router.get()` REGISTERS a route; it is not the handler. Pull the real handler
// out of the layer stack instead of calling the registration function.
const handler = (router, path, method) => {
  const layer = router.stack.find((l) => l.route?.path === path && l.route?.methods?.[method]);
  if (!layer) throw new Error(`route ${method.toUpperCase()} ${path} not registered`);
  return layer.route.stack[layer.route.stack.length - 1].handle;
};

const res = () => ({
  statusCode: 200,
  status(c) { this.statusCode = c; return this; },
  json(b) { this.body = b; return this; },
});

beforeEach(() => {
  annFind.mockReset();
  emgUserFind.mockReset();
  emgCreate.mockClear();
});

describe('AUTHZ - announcements GET / does not fail open on a tenant-less caller', () => {
  const call = (user) => {
    const r = res();
    return { r, out: handler(annMod.default, '/', 'get')({ user }, r) };
  };

  it('403s instead of querying with an undefined hospitalId', async () => {
    // The regression: Mongoose STRIPS undefined keys from a filter, so
    // `find({ hospitalId: undefined })` degrades to `find({})` and returned
    // every tenants announcements to any account without a hospitalId.
    const { r, out } = call({ _id: 'u1', role: 'patient', hospitalId: undefined });
    await out;
    expect(r.statusCode).toBe(403);
    expect(annFind).not.toHaveBeenCalled();
  });

  it('still scopes to the caller hospital when one is present', async () => {
    annFind.mockReturnValue(query([]));
    const { r, out } = call({ _id: 'u1', role: 'nurse', hospitalId: 'h9' });
    await out;
    // Assert on the body as well as the status: the routes own catch turns a
    // broken mock into a 500, so a status-only assertion can hide a wiring
    // fault. This is how the mock-registration bug above was found.
    expect({ status: r.statusCode, body: r.body }).toEqual({ status: 200, body: [] });
    expect(annFind).toHaveBeenCalledWith(expect.objectContaining({ hospitalId: 'h9' }));
  });
});

describe('AUTHZ - emergency POST / notification fan-out is tenant-scoped', () => {
  const call = (user) => {
    const r = res();
    const req = { user, body: { condition: 'chest pain', severity: 'Critical', patientName: 'X' } };
    return { r, out: handler(emgMod.default, '/', 'post')(req, r) };
  };

  it('does not notify hospital_admins of unrelated tenants', async () => {
    // The regression: `User.find({ role: hospital_admin })` carried no tenant
    // predicate, so the clinical `condition` text was pushed into the admin
    // inboxes of every unrelated hospital on the platform.
    emgUserFind.mockReturnValue([]);
    const { out } = call({ _id: 'u1', role: 'patient', hospitalId: 'h1' });
    await out;
    expect(emgUserFind).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'hospital_admin', hospitalId: 'h1' })
    );
  });

  it('keeps the unscoped fan-out for superadmin only', async () => {
    emgUserFind.mockReturnValue([]);
    const { out } = call({ _id: 'u1', role: 'superadmin', hospitalId: undefined });
    await out;
    expect(emgUserFind).toHaveBeenCalledWith({ role: 'hospital_admin' });
  });

  it('sends NO cross-tenant notification for a tenant-less caller', async () => {
    // The subtle one. `User.find({ role, hospitalId: undefined })` is ALSO
    // fail-open: Mongoose strips the undefined key, so the filter degrades to
    // `{ role }` and returns every admin on the platform - the original bug,
    // reintroduced by a guard that looks correct. The fan-out must be skipped
    // outright instead.
    emgUserFind.mockReturnValue([]);
    const { r, out } = call({ _id: 'u1', role: 'patient', hospitalId: undefined });
    await out;
    expect(emgUserFind).not.toHaveBeenCalled();
    expect(r.statusCode).toBe(201);
  });

  it('stores the emergency under the caller hospital', async () => {
    emgUserFind.mockReturnValue([]);
    const { out } = call({ _id: 'u1', role: 'patient', hospitalId: 'h7' });
    await out;
    expect(emgCreate).toHaveBeenCalledWith(expect.objectContaining({ hospitalId: 'h7' }));
  });
});

describe('AUTHZ - triage recognises applyTenantScope as a real guard', () => {
  it('otherwise ten already-guarded pharmacy routes were flagged', () => {
    // The guard list moved to scripts/lib/routeScan.mjs when the two authz tools
    // were unified, so asserting on the triage script would have kept passing
    // while the pattern it was checking no longer lived there.
    expect(read('../../scripts/lib/routeScan.mjs')).toMatch(/applyTenantScope/);
    // Exact count, not a `> N` guess: a loose bound would keep passing even if
    // the helper were renamed and every call site silently stopped matching.
    const uses = (read('../../src/routes/pharmacy.js').match(/applyTenantScope\(/g) || []).length;
    expect(uses).toBe(11);
  });
});

