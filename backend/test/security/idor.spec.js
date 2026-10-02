/**
 * IDOR suite (TEST-M-03) over the object-authorization helpers.
 *
 * Every test here is the same question asked with a different actor: *may this
 * caller reach a record that is not theirs?* A guard that is present but wrong
 * — scoped to the wrong field, or failing open when a tenant cannot be
 * determined — passes every "is the middleware wired up?" check and fails here.
 *
 * Mocks are registered once at module scope with stable references; see
 * routeAuthzBehaviour.spec.js for why a per-test re-registration silently wires
 * up the PREVIOUS test's mock.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const profileFindOne = jest.fn();
const userFindById = jest.fn();
const consentFindOne = jest.fn();
const patientFindById = jest.fn();

jest.unstable_mockModule('../../src/models/AssistantProfile.js', () => ({
  default: { findOne: profileFindOne },
}));
jest.unstable_mockModule('../../src/models/User.js', () => ({
  default: { findById: userFindById },
}));
jest.unstable_mockModule('../../src/models/ConsentRecord.js', () => ({
  default: { findOne: consentFindOne },
}));
jest.unstable_mockModule('../../src/models/Patient.js', () => ({
  default: { findById: patientFindById },
}));

const { assertCallParticipant, denyCallAccess } = await import('../../src/middleware/callAccess.js');
const { assertAssistantBookingAccess, denyAssistantBooking } =
  await import('../../src/middleware/assistantBookingAccess.js');
const { assertEhrSearchAccess } = await import('../../src/services/ehrSearchAccess.js');

// A chainable thenable, so the test does not have to know the call order the
// production code uses (`findOne().select().lean()` vs `findOne().lean()`).
// The first version returned a bare `{ lean }` and every assistant-booking case
// failed on `.select is not a function` — a mock that only supports one chain
// shape reports a harness bug as a security failure.
const lean = (v) => {
  const q = {
    select: () => q,
    lean: () => q,
    sort: () => q,
    limit: () => q,
    then: (resolve) => Promise.resolve(v).then(resolve),
  };
  return q;
};
const req = (user) => ({ user });

beforeEach(() => {
  profileFindOne.mockReset().mockReturnValue(lean(null));
  userFindById.mockReset().mockReturnValue(lean(null));
  consentFindOne.mockReset().mockReturnValue(lean(null));
  patientFindById.mockReset().mockReturnValue(lean(null));
});

describe('IDOR · call records are reachable only by a party to the call', () => {
  const call = { caller: 'uA', receiver: 'uB' };

  it('lets the caller in', () => {
    expect(assertCallParticipant(req({ _id: 'uA', role: 'patient' }), call).ok).toBe(true);
  });

  it('lets the receiver in', () => {
    expect(assertCallParticipant(req({ _id: 'uB', role: 'doctor' }), call).ok).toBe(true);
  });

  it('refuses a third party', () => {
    // The regression: POST /:id/recording and PUT /:id/status had NO check, so
    // any account could attach a recording to, or rewrite, someone else's call.
    expect(assertCallParticipant(req({ _id: 'uATTACKER', role: 'patient' }), call).ok).toBe(false);
  });

  it('refuses a user with no id at all', () => {
    expect(assertCallParticipant(req({ role: 'patient' }), call).ok).toBe(false);
  });

  it('resolves a populated participant reference', () => {
    const populated = { caller: { _id: 'uA', name: 'A' }, receiver: { _id: 'uB' } };
    expect(assertCallParticipant(req({ _id: 'uA' }), populated).ok).toBe(true);
  });

  it('refuses when the call does not exist', () => {
    expect(assertCallParticipant(req({ _id: 'uA' }), null).ok).toBe(false);
  });

  it('denies with 404, so a denied id is not confirmed to exist', () => {
    const res = { statusCode: 200, status(c) { this.statusCode = c; return this; }, json() { return this; } };
    denyCallAccess(res);
    expect(res.statusCode).toBe(404);
  });
});

describe('IDOR · assistant bookings are reachable only by the parties', () => {
  const booking = { patientId: 'patA', assistantId: 'asstA', hospitalId: 'h1' };

  it('lets the owning patient read it', async () => {
    expect((await assertAssistantBookingAccess(req({ _id: 'patA', role: 'patient' }), booking)).ok).toBe(true);
  });

  it('refuses a DIFFERENT patient', async () => {
    expect((await assertAssistantBookingAccess(req({ _id: 'patB', role: 'patient' }), booking)).ok).toBe(false);
  });

  it('lets the assigned assistant in', async () => {
    expect((await assertAssistantBookingAccess(req({ _id: 'asstA', role: 'assistant' }), booking)).ok).toBe(true);
  });

  it('refuses an assistant who is not on the booking', async () => {
    expect((await assertAssistantBookingAccess(req({ _id: 'asstB', role: 'assistant' }), booking)).ok).toBe(false);
  });

  it('lets same-tenant staff in', async () => {
    const d = await assertAssistantBookingAccess(
      req({ _id: 'adm1', role: 'hospital_admin', hospitalId: 'h1' }), booking
    );
    expect(d.ok).toBe(true);
  });

  it('refuses staff from ANOTHER tenant', async () => {
    const d = await assertAssistantBookingAccess(
      req({ _id: 'adm2', role: 'hospital_admin', hospitalId: 'h2' }), booking
    );
    expect(d.ok).toBe(false);
  });
  it('refuses a tenant-less staff account rather than trusting it', async () => {
    // "Cannot determine the tenant" must not read as "allow".
    const d = await assertAssistantBookingAccess(req({ _id: 'adm3', role: 'hospital_admin' }), booking);
    expect(d.ok).toBe(false);
  });

  it('refuses a booking with no tenant, even to same-tenant staff', async () => {
    const d = await assertAssistantBookingAccess(
      req({ _id: 'adm1', role: 'hospital_admin', hospitalId: 'h1' }),
      { patientId: 'patA', assistantId: 'asstA' }
    );
    expect(d.ok).toBe(false);
  });

  it('lets superadmin in', async () => {
    expect((await assertAssistantBookingAccess(req({ _id: 'root', role: 'superadmin' }), booking)).ok).toBe(true);
  });

  it('resolves a populated patient reference', async () => {
    const d = await assertAssistantBookingAccess(
      req({ _id: 'patA', role: 'patient' }),
      { patientId: { _id: 'patA', name: 'A' }, assistantId: 'asstA', hospitalId: 'h1' }
    );
    expect(d.ok).toBe(true);
  });
});

describe('IDOR - EHR search: the confused-deputy question', () => {
  it('lets a patient read their OWN record', async () => {
    expect((await assertEhrSearchAccess(req({ _id: 'patA', role: 'patient' }), 'patA')).ok).toBe(true);
  });

  it('refuses a different patient with NO consent anywhere', async () => {
    expect((await assertEhrSearchAccess(req({ _id: 'patB', role: 'patient' }), 'patA')).ok).toBe(false);
  });

  it('refuses a clinician whose consent is for a DIFFERENT patient', async () => {
    // THE regression. The old code asked "does a consent exist?" and never
    // "was it granted to THIS caller?", so any registered doctor could read any
    // patient's diagnosis history whenever that patient had consented to anyone.
    userFindById.mockReturnValue(lean({ role: 'doctor', hospitalId: 'h1' }));
    consentFindOne.mockReturnValue(lean(null));
    expect((await assertEhrSearchAccess(req({ _id: 'docX', role: 'doctor' }), 'patA')).ok).toBe(false);
  });

  it('allows the clinician named in a live consent for THIS patient', async () => {
    userFindById.mockReturnValue(lean({ role: 'doctor', hospitalId: 'h1' }));
    consentFindOne.mockReturnValue(lean({ consentId: 'c1', patientId: 'patA', doctorId: 'docOK' }));
    expect((await assertEhrSearchAccess(req({ _id: 'docOK', role: 'doctor' }), 'patA')).ok).toBe(true);
  });

  it('binds a supplied consentId to BOTH the patient and the caller', async () => {
    // Supplying a known consentId must not widen access to a different patient.
    // The filter is asserted directly: a wrong field here is the original bug,
    // and it is invisible from the return value alone.
    userFindById.mockReturnValue(lean({ role: 'doctor', hospitalId: 'h1' }));
    consentFindOne.mockReturnValue(lean(null));
    await assertEhrSearchAccess(req({ _id: 'docX', role: 'doctor' }), 'patA', 'c1');
    expect(consentFindOne).toHaveBeenCalledWith(
      expect.objectContaining({ patientId: 'patA', doctorId: 'docX', status: 'GRANTED' })
    );
  });

  it('requires the consent to be unexpired', async () => {
    // "Granted at some point" is not "granted now".
    userFindById.mockReturnValue(lean({ role: 'doctor', hospitalId: 'h1' }));
    await assertEhrSearchAccess(req({ _id: 'docOK', role: 'doctor' }), 'patA');
    expect(consentFindOne.mock.calls[0][0].$or).toEqual(
      expect.arrayContaining([{ expiresAt: { $gt: expect.any(Date) } }])
    );
  });

  it('lets same-tenant hospital staff read the patient', async () => {
    userFindById.mockReturnValue(lean({ role: 'hospital_admin', hospitalId: 'h1' }));
    patientFindById.mockReturnValue(lean({ hospitalId: 'h1' }));
    expect((await assertEhrSearchAccess(req({ _id: 'adm1', role: 'hospital_admin' }), 'patA')).ok).toBe(true);
  });

  it('refuses hospital staff from another tenant', async () => {
    userFindById.mockReturnValue(lean({ role: 'hospital_admin', hospitalId: 'h2' }));
    patientFindById.mockReturnValue(lean({ hospitalId: 'h1' }));
    expect((await assertEhrSearchAccess(req({ _id: 'adm2', role: 'hospital_admin' }), 'patA')).ok).toBe(false);
  });

  it('refuses a tenant-less staff account instead of guessing', async () => {
    userFindById.mockReturnValue(lean({ role: 'hospital_admin', hospitalId: null }));
    patientFindById.mockReturnValue(lean({ hospitalId: 'h1' }));
    expect((await assertEhrSearchAccess(req({ _id: 'adm3', role: 'hospital_admin' }), 'patA')).ok).toBe(false);
  });

  it('refuses a caller with no identity at all', async () => {
    expect((await assertEhrSearchAccess({ user: {} }, 'patA')).ok).toBe(false);
  });
});
